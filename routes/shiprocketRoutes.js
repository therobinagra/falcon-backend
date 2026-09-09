const express = require('express')
const router = express.Router()
const { getNumericProducts, getNumericCollections } = require('../controllers/shiprocketController')

router.get('/products', getNumericProducts)
router.get('/collections', getNumericCollections)

module.exports = router
