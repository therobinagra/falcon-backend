const express = require('express')
const router = express.Router()
const { orderWebhook } = require('../controllers/shiprocketController')

router.post('/order-status', orderWebhook)

module.exports = router