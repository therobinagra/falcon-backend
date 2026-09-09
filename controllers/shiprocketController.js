const Product = require('../models/Product')
const Category = require('../models/Category')
const { ensureNumericSku } = require('../utils/numericId')

const getNumericProducts = async (req, res) => {
  try {
    let products = await Product.find({}).lean()
    products = await Promise.all(
      products.map(async (p) => {
        const sku = await ensureNumericSku(Product, p)
        return {
          id: sku,
          sku,
          name: p.name,
          price: p.price,
          mrp: p.mrp,
          stock: p.stock,
          category: p.category,
        }
      })
    )
    res.status(200).json(products)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

const getNumericCollections = async (req, res) => {
  try {
    let collections = await Category.find({ isActive: true }).lean()
    collections = await Promise.all(
      collections.map(async (c) => {
        const sku = await ensureNumericSku(Category, c)
        return {
          id: sku,
          sku,
          name: c.name,
        }
      })
    )
    res.status(200).json(collections)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

module.exports = { getNumericProducts, getNumericCollections }
