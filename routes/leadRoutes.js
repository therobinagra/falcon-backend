const express = require('express')
const router = express.Router()
const { createLead, getLeads, updateLeadStatus, deleteLead } = require('../controllers/leadController')
const { protect, admin } = require('../middleware/authMiddleware')

router.post('/', createLead)
router.get('/', protect, admin, getLeads)
router.put('/:id', protect, admin, updateLeadStatus)
router.delete('/:id', protect, admin, deleteLead)

module.exports = router
