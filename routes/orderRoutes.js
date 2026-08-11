const express = require('express')
const {
  createOrder,
  getMyOrders,
  getOrders,
  trackOrder,
  getOrderById,
  updateOrderStatus,
  deleteOrder,
} = require('../controllers/orderController')
const { protect, adminOnly } = require('../middleware/authMiddleware')

const router = express.Router()

router.post('/', createOrder)
router.get('/track', trackOrder)
router.get('/my', protect, getMyOrders)
router.get('/', protect, adminOnly, getOrders)
router.route('/:id').get(protect, getOrderById)
router
  .route('/:id')
  .put(protect, adminOnly, updateOrderStatus)
  .delete(protect, adminOnly, deleteOrder)

module.exports = router
