const express = require('express')
const router = express.Router()
const {
  getNumericProducts,
  getNumericCollections,
  getShippingRates,
  getEstimateDelivery,
  webhookHandler,
  getCheckoutToken,
  confirmPaymentStatus,
} = require('../controllers/shiprocketController')

router.get('/products', getNumericProducts)
router.get('/collections', getNumericCollections)
router.get('/rates', getShippingRates)
router.get('/estimate', getEstimateDelivery)
router.post('/checkout-token', getCheckoutToken)
router.post('/confirm/:id', confirmPaymentStatus)
router.post('/webhook', webhookHandler)

module.exports = router
