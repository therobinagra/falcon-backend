const Product = require('../models/Product')
const Category = require('../models/Category')
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

module.exports = { getNumericProducts, getNumericCollections }