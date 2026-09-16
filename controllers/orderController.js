const mongoose = require('mongoose')
const Order = require('../models/Order')
const Product = require('../models/Product')

const createOrder = async (req, res) => {
  try {
    const { customer, address, items, paymentMethod, paymentStatus } = req.body

    if (!customer || !address || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'Customer, address and items are required' })
    }

    let itemsPrice = 0
    const enriched = []

    for (const item of items) {
      const product = await Product.findById(item.product)
      if (!product) {
        return res.status(404).json({ message: `Product not found: ${item.product}` })
      }

      const qty = Number(item.qty) || 1
      itemsPrice += product.price * qty

      enriched.push({
        product: product._id,
        name: product.name,
        image: product.image,
        price: product.price,
        mrp: product.mrp,
        qty,
      })
    }

    const shippingPrice = itemsPrice >= 499 ? 0 : 49
    const totalPrice = itemsPrice + shippingPrice

    const order = await Order.create({
      user: req.user ? req.user._id : undefined,
      customer: {
        name: customer.name,
        email: customer.email,
        phone: customer.phone || '',
      },
      address,
      items: enriched,
      itemsPrice,
      shippingPrice,
      totalPrice,
      paymentMethod: paymentMethod || 'COD',
      paymentStatus: paymentStatus || 'Pending',
    })

    res.status(201).json(order)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

const getMyOrders = async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user._id }).sort({ createdAt: -1 })
    res.status(200).json(orders)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

const getOrders = async (req, res) => {
  try {
    const { status } = req.query
    const filter = status && status !== 'All' ? { status } : {}
    const orders = await Order.find(filter)
      .populate('user', 'name email')
      .sort({ createdAt: -1 })
    res.status(200).json(orders)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

const trackOrder = async (req, res) => {
  try {
    const { id, phone } = req.query
    if (!phone) {
      return res.status(400).json({ message: 'Phone number is required' })
    }

    if (id) {
      if (!mongoose.isValidObjectId(id)) {
        return res.status(404).json({ message: 'Order not found. Please check the order ID.' })
      }
      const order = await Order.findById(id)
      if (!order || order.customer?.phone !== phone.trim()) {
        return res
          .status(404)
          .json({ message: 'Order not found. Please check the order ID and phone number.' })
      }
      return res.status(200).json(order)
    }

    const orders = await Order.find({ 'customer.phone': phone.trim() })
      .sort({ createdAt: -1 })
      .limit(5)
    if (orders.length === 0) {
      return res
        .status(404)
        .json({ message: 'No orders found for this phone number. Please check and try again.' })
    }
    res.status(200).json(orders)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

const getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate('user', 'name email')
    if (!order) {
      return res.status(404).json({ message: 'Order not found' })
    }
    res.status(200).json(order)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

const updateOrderStatus = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
    if (!order) {
      return res.status(404).json({ message: 'Order not found' })
    }

    const { status, paymentStatus } = req.body
    if (status) order.status = status
    if (paymentStatus) order.paymentStatus = paymentStatus

    const updated = await order.save()
    res.status(200).json(updated)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

const deleteOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
    if (!order) {
      return res.status(404).json({ message: 'Order not found' })
    }
    await order.deleteOne()
    res.status(200).json({ message: 'Order deleted', id: req.params.id })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

module.exports = {
  createOrder,
  getMyOrders,
  getOrders,
  trackOrder,
  getOrderById,
  updateOrderStatus,
  deleteOrder,
}
