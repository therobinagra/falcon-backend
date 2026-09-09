const Product = require('../models/Product')
const Category = require('../models/Category')
const { ensureNumericSku } = require('../utils/numericId')

const getNumericProducts = async (req, res) => {
  try {
    const products = await Product.find({}).lean()
    const out = []
    for (const p of products) {
      const sku = await ensureNumericSku(Product, p)
      out.push({
        id: sku,
        sku,
        name: p.name,
        price: p.price,
        mrp: p.mrp,
        stock: p.stock,
        category: p.category,
      })
    }
    res.status(200).json(out)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

const getNumericCollections = async (req, res) => {
  try {
    const collections = await Category.find({ isActive: true }).lean()
    const out = []
    for (const c of collections) {
      const sku = await ensureNumericSku(Category, c)
      out.push({
        id: sku,
        sku,
        name: c.name,
      })
    }
    res.status(200).json(out)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

module.exports = { getNumericProducts, getNumericCollections }
