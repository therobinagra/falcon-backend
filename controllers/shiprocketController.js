const crypto = require('crypto')
const axios = require('axios')
const Order = require('../models/Order')
const Product = require('../models/Product')
const Category = require('../models/Category')
const { shiprocketPost, shiprocketGet } = require('../config/shiprocket')
const {
  ensureProductSkus,
  ensureCategorySkus,
  toSrcProduct,
  toSrcCollection,
  pagination,
} = require('../utils/catalog')

const SRC_BASE = process.env.SHIPROCKET_CHECKOUT_BASE_URL || 'https://checkout-api.shiprocket.com'

let cachedSrcToken = null
let cachedSrcTokenExpiry = null

const getCheckoutAccessToken = async () => {
  if (cachedSrcToken && cachedSrcTokenExpiry && Date.now() < cachedSrcTokenExpiry) {
    return cachedSrcToken
  }

  const apiKey = process.env.SHIPROCKET_CHECKOUT_API_KEY
  const apiSecret = process.env.SHIPROCKET_CHECKOUT_API_SECRET
  if (!apiKey || !apiSecret) {
    throw new Error('SHIPROCKET_CHECKOUT_API_KEY and SHIPROCKET_CHECKOUT_API_SECRET must be set')
  }

  const res = await axios.post(`${SRC_BASE}/api/v1/access-token/checkout`, {
    api_key: apiKey,
    api_secret: apiSecret,
  })

  cachedSrcToken = res.data.token || res.data.access_token
  cachedSrcTokenExpiry = Date.now() + 8 * 24 * 60 * 60 * 1000
  return cachedSrcToken
}

const getCheckoutToken = async (req, res) => {
  try {
    const { orderId, redirectUrl } = req.body
    if (!orderId) {
      return res.status(400).json({ message: 'orderId is required' })
    }

    const order = await Order.findById(orderId)
    if (!order) {
      return res.status(404).json({ message: 'Order not found' })
    }

    const srcToken = await getCheckoutAccessToken()

    const items = order.items.map((item) => ({
      sku: item.product.toString(),
      quantity: item.qty,
      name: item.name,
      image: item.image || '',
      price: item.price,
    }))

    const checkoutRes = await axios.post(
      `${SRC_BASE}/api/v1/checkout`,
      {
        token: srcToken,
        order_id: order._id.toString(),
        customer_email: order.customer.email,
        customer_phone: order.customer.phone,
        customer_name: order.customer.name,
        billing_address: order.address.line,
        billing_city: order.address.city,
        billing_state: order.address.state,
        billing_pincode: order.address.pincode,
        billing_country: 'India',
        shipping_is_billing: true,
        items,
        sub_total: order.itemsPrice,
        total: order.totalPrice,
        payment_method: 'Prepaid',
        redirect_url: redirectUrl || '',
      },
      { headers: { 'Content-Type': 'application/json' } }
    )

    const token = checkoutRes.data.token || checkoutRes.data.checkout_token || ''
    const checkoutUrl = checkoutRes.data.checkout_url || ''

    res.status(200).json({ token, checkout_url: checkoutUrl, result: checkoutRes.data })
  } catch (error) {
    console.error('Checkout token error:', error.message)
    res.status(500).json({ message: error.message || 'Failed to generate checkout token' })
  }
}

const confirmPaymentStatus = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
    if (!order) {
      return res.status(404).json({ message: 'Order not found' })
    }

    order.paymentStatus = 'Paid'
    order.status = 'Confirmed'
    await order.save()

    processOrderAfterPayment(order._id).catch((err) => {
      console.error('Background SR processing after confirm failed:', err.message)
    })

    res.status(200).json(order)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

const getShippingRates = async (req, res) => {
  try {
    const { pickup_pincode, delivery_pincode, weight, cod } = req.query

    if (!pickup_pincode || !delivery_pincode || !weight) {
      return res.status(400).json({ message: 'pickup_pincode, delivery_pincode and weight are required' })
    }

    const response = await shiprocketGet('/courier/serviceability/', {
      pickup_pincode,
      delivery_pincode,
      weight,
      cod: cod === 'true' ? 1 : 0,
    })

    res.status(200).json(response.data)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

const createShiprocketOrder = async (order) => {
  const productIds = order.items.map((i) => i.product)
  const products = await Product.find({ _id: { $in: productIds } }).lean()
  const skuByProduct = new Map(products.map((p) => [p._id.toString(), p.sku]))

  const payload = {
    order_id: order._id.toString(),
    order_date: new Date(order.createdAt).toISOString().split('T')[0],
    pickup_location: 'Primary',
    billing_customer_name: order.customer.name,
    billing_last_name: '',
    billing_address: order.address.line,
    billing_city: order.address.city,
    billing_pincode: parseInt(order.address.pincode),
    billing_state: order.address.state,
    billing_country: 'India',
    billing_email: order.customer.email,
    billing_phone: parseInt(order.customer.phone),
    shipping_is_billing: true,
    order_items: order.items.map((item) => ({
      name: item.name,
      sku: skuByProduct.get(item.product.toString()) || item.product.toString(),
      units: item.qty,
      selling_price: item.price,
      discount: 0,
      tax: 0,
      hsn: 0,
    })),
    payment_method: 'Prepaid',
    sub_total: order.itemsPrice,
    length: 15,
    breadth: 10,
    height: 5,
    weight: 0.5,
  }

  const response = await shiprocketPost('/orders/create/adhoc', payload)
  return response.data
}

const assignCourier = async (shiprocketOrderId) => {
  const response = await shiprocketPost('/courier/assign', {
    order_id: shiprocketOrderId,
  })
  return response.data
}

const generateLabel = async (shiprocketOrderId) => {
  const response = await shiprocketPost('/courier/generate/label', {
    order_id: shiprocketOrderId,
  })
  return response.data
}

const schedulePickup = async (shiprocketOrderId) => {
  const response = await shiprocketPost('/courier/generate/pickup', {
    order_id: shiprocketOrderId,
  })
  return response.data
}

const trackShipment = async (awb) => {
  const response = await shiprocketGet(`/courier/track/awb/${awb}`)
  return response.data
}

const getEstimateDelivery = async (req, res) => {
  try {
    const { pickup_pincode, delivery_pincode, weight } = req.query
    const response = await shiprocketGet('/courier/estimate/', {
      pickup_pincode,
      delivery_pincode,
      weight,
    })
    res.status(200).json(response.data)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

const webhookHandler = async (req, res) => {
  try {
    const payload = req.body
    const orderId = payload.order_id
    const awb = payload.awb
    const status = payload.current_status

    if (!orderId) {
      return res.status(200).json({ message: 'No order_id in webhook' })
    }

    const order = await Order.findById(orderId)
    if (!order) {
      return res.status(200).json({ message: 'Order not found' })
    }

    if (awb && !order.awbNumber) {
      order.awbNumber = awb
    }

    const statusMap = {
      'Delivered': 'Delivered',
      'Returned': 'Cancelled',
      'RTO': 'Cancelled',
      'Shipped': 'Shipped',
      'In Transit': 'Shipped',
      'Out For Delivery': 'Shipped',
    }

    const mappedStatus = statusMap[status]
    if (mappedStatus) {
      order.status = mappedStatus
      if (mappedStatus === 'Delivered') {
        order.paymentStatus = 'Paid'
      }
    }

    order.trackingData = order.trackingData || []
    order.trackingData.push({
      status,
      timestamp: new Date(),
      location: payload.current_location || '',
    })

    await order.save()
    res.status(200).json({ message: 'Webhook processed' })
  } catch (error) {
    console.error('Shiprocket webhook error:', error.message)
    res.status(200).json({ message: 'Webhook received' })
  }
}

const getNumericProducts = async (req, res) => {
  try {
    const filter = {}
    if (req.query.collection_id) {
      const collection = await Category.findOne({
        sku: Number(req.query.collection_id),
      }).lean()
      if (collection) filter.category = collection.name
    } else if (req.query.category && req.query.category !== 'All Products') {
      filter.category = req.query.category
    }

    const { page, limit } = pagination(req.query, 100)
    const total = await Product.countDocuments(filter)
    const products = await ensureProductSkus(
      await Product.find(filter)
        .sort({ createdAt: 1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean()
    )

    res.status(200).json({
      data: {
        total,
        products: products.map((p) => toSrcProduct(p, req)),
      },
    })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

const getNumericCollections = async (req, res) => {
  try {
    const { page, limit } = pagination(req.query, 100)
    const filter = { isActive: true }
    const total = await Category.countDocuments(filter)
    const collections = await ensureCategorySkus(
      await Category.find(filter)
        .sort({ name: 1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean()
    )

    const categoryImages = await Product.aggregate([
      { $match: { category: { $ne: null }, image: { $ne: '' } } },
      { $group: { _id: '$category', image: { $first: '$image' } } },
    ])
    const imageByCategory = new Map(categoryImages.map((r) => [r._id, r.image]))

    res.status(200).json({
      data: {
        total,
        collections: collections.map((c) =>
          toSrcCollection(c, req, imageByCategory.get(c.name))
        ),
      },
    })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

const processOrderAfterPayment = async (orderId) => {
  const order = await Order.findById(orderId)
  if (!order) return null

  try {
    const srOrder = await createShiprocketOrder(order)
    order.shiprocketOrderId = srOrder.order_id.toString()

    const courier = await assignCourier(srOrder.order_id)
    if (courier?.data?.response?.data?.awb_code) {
      order.awbNumber = courier.data.response.data.awb_code
      order.courierName = courier.data.response.data.courier_name
      order.status = 'Confirmed'

      try {
        await schedulePickup(srOrder.order_id)
      } catch (e) {
        console.error('Pickup scheduling failed:', e.message)
      }
    }

    await order.save()
    return order
  } catch (error) {
    console.error('Shiprocket order processing error:', error.message)
    order.status = 'Confirmed'
    await order.save()
    return order
  }
}

module.exports = {
  getNumericProducts,
  getNumericCollections,
  getShippingRates,
  getCheckoutToken,
  confirmPaymentStatus,
  createShiprocketOrder,
  assignCourier,
  generateLabel,
  schedulePickup,
  trackShipment,
  getEstimateDelivery,
  webhookHandler,
  processOrderAfterPayment,
}
