const Category = require('../models/Category')
const { ensureNumericSku, getNextNumericSku } = require('../utils/numericId')
const {
  hydrateCategorySkus,
  toSrcCollection,
  isSrcCall,
  pagination,
  categoryImageMap,
} = require('../utils/catalog')

const getCategories = async (req, res) => {
  try {
    if (isSrcCall(req.query)) {
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

      return res.status(200).json({
        data: {
          total,
          collections: collections.map((c) =>
            toSrcCollection(c, req, imageByCategory.get(c.name))
          ),
        },
      })
    }

    const categories = await Category.find().sort({ name: 1 })
    const withIds = []
    for (const c of categories) {
      const sku = await ensureNumericSku(Category, c)
      withIds.push({
        ...c.toObject(),
        id: sku,
        sku,
      })
    }
    res.status(200).json(withIds)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

const createCategory = async (req, res) => {
  try {
    const { name, description, image } = req.body

    if (!name) {
      return res.status(400).json({ message: 'Category name is required' })
    }

    const exists = await Category.findOne({ name: name.trim() })
    if (exists) {
      return res.status(409).json({ message: 'Category already exists' })
    }

    const category = await Category.create({
      name: name.trim(),
      description: description || '',
      image: image || '',
      sku: await getNextNumericSku(Category),
    })

    res.status(201).json(category)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

const updateCategory = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id)
    if (!category) {
      return res.status(404).json({ message: 'Category not found' })
    }

    const { name, description, image, isActive } = req.body
    if (name) category.name = name.trim()
    if (description !== undefined) category.description = description
    if (image !== undefined) category.image = image
    if (isActive !== undefined) category.isActive = isActive === 'true' || isActive === true

    const updated = await category.save()
    res.status(200).json(updated)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

const deleteCategory = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id)
    if (!category) {
      return res.status(404).json({ message: 'Category not found' })
    }
    await category.deleteOne()
    res.status(200).json({ message: 'Category deleted', id: req.params.id })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

module.exports = {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
}
