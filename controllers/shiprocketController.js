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

    const items = order.items.map((item) => ({
      variant_id: skuByProduct.get(item.product.toString()) || item.product.toString(),
      quantity: item.qty,
    }))

    const clientUrl = process.env.CLIENT_URL || 'https://www.falconayurveda.in'
    const token = await checkout.getCheckoutToken({
      items,
      redirectUrl: redirectUrl || `${clientUrl}/track-order`,
      customAttributes: {
        order_id: order._id.toString(),
        email: order.customer.email,
        phone: order.customer.phone,
      },
    })

    res.status(200).json(token)
  } catch (error) {
    console.error('SRC checkout token error:', error.message)
    res.status(error.status || 500).json({ message: error.message })
  }
}

const orderWebhook = async (req, res) => {
  try {
    const payload = req.body

    const providedHmac = req.get('X-Api-HMAC-SHA256')
    if (!checkout.verifySignature(JSON.stringify(payload), providedHmac)) {
      return res.status(401).json({ ok: false, result: 'Invalid signature' })
    }

    const orderId =
      payload?.order_id ||
      payload?.orderId ||
      payload?.cart_data?.customAttributes?.order_id ||
      payload?.custom_attributes?.order_id ||
      payload?.cid

    const status = String(payload?.status || payload?.event || '').toUpperCase()

    if (!orderId) {
      return res.status(200).json({ ok: true, result: 'No order reference in payload' })
    }

    const order = await Order.findById(orderId)
    if (!order) {
      return res.status(200).json({ ok: true, result: 'Order not found' })
    }

    if (['SUCCESS', 'PAID', 'PAYMENT_SUCCESS', 'CREATED', 'CONFIRMED'].includes(status)) {
      order.paymentStatus = 'Paid'
      order.status = 'Confirmed'
      order.paymentMethod = order.paymentMethod || 'Online'
    } else if (['FAILED', 'FAILURE', 'CANCELLED', 'CANCELED', 'REFUNDED'].includes(status)) {
      order.paymentStatus = 'Failed'
    }

    order.shiprocketOrderId = payload?.shiprocket_order_id || payload?.order_no || order.shiprocketOrderId
    order.paymentDetails = { ...(order.paymentDetails || {}), ...payload, raw: payload }
    await order.save()

    res.status(200).json({ ok: true, result: true })
  } catch (error) {
    console.error('SRC order webhook error:', error.message)
    res.status(200).json({ ok: true, result: 'webhook received' })
  }
}

module.exports = { getNumericProducts, getNumericCollections, getCheckoutToken, orderWebhook }