const express = require('express')
const {
  registerUser,
  loginUser,
  getProfile,
  updateProfile,
  getUsers,
  updateUser,
  deleteUser,
} = require('../controllers/userController')
const { protect, adminOnly } = require('../middleware/authMiddleware')

const router = express.Router()

router.post('/register', registerUser)
router.post('/login', loginUser)

router.get('/me', protect, getProfile)
router.put('/me', protect, updateProfile)

router.get('/', protect, adminOnly, getUsers)
router.route('/:id').put(protect, adminOnly, updateUser).delete(protect, adminOnly, deleteUser)

module.exports = router
