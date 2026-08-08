const Product = require('../models/Product')
const Order = require('../models/Order')
const User = require('../models/User')
const Category = require('../models/Category')

const getStats = async (req, res) => {
  try {
    const [productCount, userCount, orderCount, categoryCount, orders, products] =
      await Promise.all([
        Product.countDocuments(),
        User.countDocuments(),
        Order.countDocuments(),
        Category.countDocuments(),
        Order.find().sort({ createdAt: -1 }).limit(6),
        Product.find().sort({ createdAt: -1 }).limit(6),
      ])

    const revenue = orders.reduce((sum, o) => sum + o.totalPrice, 0)
    const totalRevenue = await Order.aggregate([
      { $match: { status: { $ne: 'Cancelled' } } },
      { $group: { _id: null, total: { $sum: '$totalPrice' } } },
    ])

    const statusCounts = await Order.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ])

    res.status(200).json({
      counts: {
        products: productCount,
        users: userCount,
        orders: orderCount,
        categories: categoryCount,
      },
      revenue: totalRevenue.length ? totalRevenue[0].total : 0,
      recentRevenue: revenue,
      statusCounts,
      recentOrders: orders,
      recentProducts: products,
    })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

module.exports = { getStats }
