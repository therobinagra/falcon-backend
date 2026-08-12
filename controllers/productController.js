const Product = require('../models/Product')

const getProducts = async (req, res) => {
  try {
    const { category, search, featured, limit } = req.query
    const filter = {}

    if (category && category !== 'All Products') filter.category = category
    if (featured === 'true') filter.featured = true
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { category: { $regex: search, $options: 'i' } },
        { tagline: { $regex: search, $options: 'i' } },
      ]
    }

    let query = Product.find(filter).sort({ createdAt: 1 })
    if (limit) query = query.limit(Number(limit))

    const products = await query
    res.status(200).json(products)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

const getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
    if (!product) {
      return res.status(404).json({ message: 'Product not found' })
    }
    res.status(200).json(product)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

const getCategories = async (req, res) => {
  try {
    const categories = await Product.distinct('category')
    res.status(200).json(categories)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

const createProduct = async (req, res) => {
  try {
    const {
      name,
      slug,
      tagline,
      description,
      category,
      price,
      mrp,
      rating,
      reviews,
      gradient,
      badge,
      stock,
      featured,
      inStock,
      related,
    } = req.body

    if (!name || !category || !price || !mrp) {
      return res.status(400).json({ message: 'Name, category, price and MRP are required' })
    }

    const image = req.file ? `/uploads/${req.file.filename}` : req.body.image || ''

    const product = await Product.create({
      name,
      slug: slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      tagline: tagline || '',
      description: description || '',
      category,
      price: Number(price),
      mrp: Number(mrp),
      rating: Number(rating) || 0,
      reviews: Number(reviews) || 0,
      image,
      gradient: gradient || 'from-amber-700 to-orange-600',
      badge: badge || '',
      stock: Number(stock) || 0,
      featured: featured === 'true' || featured === true,
      inStock: inStock === 'true' || inStock === true || inStock === undefined,
      related: Array.isArray(related) ? related : [],
    })

    res.status(201).json(product)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

const updateProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
    if (!product) {
      return res.status(404).json({ message: 'Product not found' })
    }

    const fields = [
      'name',
      'slug',
      'tagline',
      'description',
      'category',
      'price',
      'mrp',
      'rating',
      'reviews',
      'gradient',
      'badge',
      'stock',
      'featured',
      'inStock',
      'related',
    ]

    fields.forEach((field) => {
      if (req.body[field] !== undefined) product[field] = req.body[field]
    })

    if (req.file) product.image = `/uploads/${req.file.filename}`
    else if (req.body.image !== undefined) product.image = req.body.image

    const updated = await product.save()
    res.status(200).json(updated)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
    if (!product) {
      return res.status(404).json({ message: 'Product not found' })
    }
    await product.deleteOne()
    res.status(200).json({ message: 'Product deleted', id: req.params.id })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

module.exports = {
  getProducts,
  getProductById,
  getCategories,
  createProduct,
  updateProduct,
  deleteProduct,
}
