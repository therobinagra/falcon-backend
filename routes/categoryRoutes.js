const express = require('express')
const {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} = require('../controllers/categoryController')
const { protect, adminOnly } = require('../middleware/authMiddleware')

const router = express.Router()

router.route('/').get(getCategories).post(protect, adminOnly, createCategory)
router.route('/:id').put(protect, adminOnly, updateCategory).delete(protect, adminOnly, deleteCategory)

module.exports = router
