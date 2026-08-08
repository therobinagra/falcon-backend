const express = require('express')
const {
  getBlogs,
  getBlog,
  createBlog,
  updateBlog,
  deleteBlog,
} = require('../controllers/blogController')
const { protect, adminOnly } = require('../middleware/authMiddleware')

const router = express.Router()

router.get('/', getBlogs)
router.get('/:id', getBlog)

router.post('/', protect, adminOnly, createBlog)
router.route('/:id').put(protect, adminOnly, updateBlog).delete(protect, adminOnly, deleteBlog)

module.exports = router
