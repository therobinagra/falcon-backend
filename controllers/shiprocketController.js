const Product = require('../models/Product')
const Category = require('../models/Category')
const Order = require('../models/Order')
const checkout = require('../config/checkout')
const {
  hydrateProductSkus,
  hydrateCategorySkus,
  toSrcProduct,
  toSrcCollection,
  pagination,
  categoryImageMap,
} = require('../utils/catalog')
const { decreaseStock, restoreStock } = require('../utils/stock')

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
    const products = await hydrateProductSkus(
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
    const collections = await hydrateCategorySkus(
      await Category.find(filter)
        .sort({ name: 1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean()
    )

    const imageByCategory = await categoryImageMap()

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

    const productIds = order.items.map((i) => i.product)
    const products = await hydrateProductSkus(await Product.find({ _id: { $in: productIds } }).lean())
    const skuByProduct = new Map(products.map((p) => [p._id.toString(), p.sku]))

    const items = order.items.map((item) => {
      const sku = skuByProduct.get(item.product.toString())
      const variantId = sku && Number(sku) > 0 ? Number(sku) * 10 + 1 : sku || item.product.toString()
      return { variant_id: variantId, quantity: item.qty }
    })

    const clientUrl = process.env.CLIENT_URL || 'https://www.falconayurveda.in'
    const finalRedirectUrl = redirectUrl || `${clientUrl}/?order=${order._id.toString()}`

    const tokenResponse = await checkout.getCheckoutToken({
      items,
      redirectUrl: finalRedirectUrl,
    })

    const fastrrOrderId = tokenResponse?.result?.data?.order_id
    if (fastrrOrderId) {
      order.shiprocketOrderId = fastrrOrderId
      order.paymentDetails = {
        ...(order.paymentDetails || {}),
        checkoutToken: tokenResponse?.result?.token,
        fastrrOrderId,
      }
      await order.save()
    }

    res.status(200).json(tokenResponse)
  } catch (error) {
    console.error('SRC checkout token error:', error.message)
    res.status(error.status || 500).json({ message: error.message })
  }
}

const getOrderDetails = async (req, res) => {
  try {
    const { orderId } = req.body
    if (!orderId) {
      return res.status(400).json({ message: 'orderId is required' })
    }

    const details = await checkout.getOrderDetails({ orderId })
    res.status(200).json(details)
  } catch (error) {
    console.error('SRC order details error:', error.message)
    res.status(error.status || 500).json({ message: error.message })
  }
}

const orderWebhook = async (req, res) => {
  try {
    const payload = req.body

    const configuredKey = process.env.SHIPROCKET_WEBHOOK_API_KEY
    const providedKey = req.get('x-api-key')
    const providedHmac = req.get('X-Api-HMAC-SHA256')

    const keyValid = configuredKey && providedKey && providedKey === configuredKey
    const hmacValid = checkout.verifySignature(JSON.stringify(payload), providedHmac)

    if (!keyValid && !hmacValid) {
      return res.status(401).json({ ok: false, result: 'Invalid signature' })
    }

    const fastrrOrderId = payload?.order_id
    const status = String(payload?.status || '').toUpperCase()

    let order = null

    if (fastrrOrderId) {
      order = await Order.findOne({ shiprocketOrderId: fastrrOrderId })
    }

    if (!order && payload?.redirect_url) {
      try {
        const url = new URL(payload.redirect_url)
        const mongoId = url.searchParams.get('order')
        if (mongoId) order = await Order.findById(mongoId)
      } catch { /* ignore */ }
    }

    if (!order && payload?.cart_data?.customAttributes?.order_id) {
      order = await Order.findById(payload.cart_data.customAttributes.order_id)
    }

    if (!order && payload?.cid) {
      order = await Order.findById(payload.cid)
    }

    if (!order) {
      return res.status(200).json({ ok: true, result: 'Order not found' })
    }

    const wasPaid = order.paymentStatus === 'Paid'

    if (status === 'SUCCESS' || status === 'PAID' || status === 'PAYMENT_SUCCESS') {
      order.paymentStatus = 'Paid'
      order.status = 'Confirmed'
      order.paymentMethod = order.paymentMethod || 'Online'
    } else if (status === 'FAILED' || status === 'FAILURE' || status === 'CANCELLED' || status === 'CANCELED' || status === 'REFUNDED') {
      order.paymentStatus = 'Failed'
      if (wasPaid) {
        try {
          await restoreStock(order)
        } catch (e) {
          console.error('Failed to restore stock on payment webhook cancel:', e.message)
        }
      }
    }

    order.shiprocketOrderId = fastrrOrderId || order.shiprocketOrderId
    order.paymentDetails = { ...(order.paymentDetails || {}), raw: payload }
    await order.save()

    res.status(200).json({ ok: true, result: true })
  } catch (error) {
    console.error('SRC order webhook error:', error.message)
    res.status(200).json({ ok: true, result: 'webhook received' })
  }
}

const confirmPaymentStatus = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
    if (!order) {
      return res.status(404).json({ message: 'Order not found' })
    }

    const wasPending = order.paymentStatus !== 'Paid'
    order.paymentStatus = 'Paid'
    order.status = 'Confirmed'
    await order.save()

    if (wasPending) {
      try {
        await decreaseStock(order)
      } catch (e) {
        console.error('Failed to decrease stock on payment confirmation:', e.message)
      }
    }

    res.status(200).json(order)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

module.exports = { getNumericProducts, getNumericCollections, getCheckoutToken, getOrderDetails, orderWebhook, confirmPaymentStatus }