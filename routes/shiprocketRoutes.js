const express = require('express')
const router = express.Router()
const {
  getNumericProducts,
  getNumericCollections,
  getCheckoutToken,
  orderWebhook,
} = require('../controllers/shiprocketController')

router.get('/products', getNumericProducts)
router.get('/collections', getNumericCollections)
router.post('/checkout-token', getCheckoutToken)
router.post('/webhook/order', orderWebhook)

module.exports = router