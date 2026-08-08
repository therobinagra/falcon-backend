const express = require('express')
const { getStats } = require('../controllers/dashboardController')
const { protect, adminOnly } = require('../middleware/authMiddleware')

const router = express.Router()

router.get('/stats', protect, adminOnly, getStats)

module.exports = router
