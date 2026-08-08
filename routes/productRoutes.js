const express = require('express')
const {
  getProducts,
  getProductById,
  getCategories,
  createProduct,
  updateProduct,
  deleteProduct,
} = require('../controllers/productController')
const { protect, adminOnly } = require('../middleware/authMiddleware')
const upload = require('../middleware/uploadMiddleware')

const router = express.Router()

router.route('/').get(getProducts).post(protect, adminOnly, upload.single('image'), createProduct)
router.get('/categories', getCategories)
router
  .route('/:id')
  .get(getProductById)
  .put(protect, adminOnly, upload.single('image'), updateProduct)
  .delete(protect, adminOnly, deleteProduct)

module.exports = router
