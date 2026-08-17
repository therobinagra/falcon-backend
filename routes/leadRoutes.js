const express = require('express')
const router = express.Router()
const { createLead, getLeads, updateLeadStatus, deleteLead } = require('../controllers/leadController')
const { protect, adminOnly } = require('../middleware/authMiddleware')

router.post('/', createLead)
router.get('/', protect, adminOnly, getLeads)
router.put('/:id', protect, adminOnly, updateLeadStatus)
router.delete('/:id', protect, adminOnly, deleteLead)

module.exports = router
