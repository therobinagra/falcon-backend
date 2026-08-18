const Lead = require('../models/Lead')

const createLead = async (req, res) => {
  try {
    const { name, email, phone, subject, message } = req.body
    if (!name || !email || !message) {
      return res.status(400).json({ message: 'Name, email and message are required' })
    }
    const lead = await Lead.create({ name, email, phone, subject, message })

    res.status(201).json({ message: 'Lead submitted successfully', lead })

    try {
      const accessKey = process.env.WEB3FORMS_KEY
      if (!accessKey) {
        console.error('EMAIL SKIPPED: WEB3FORMS_KEY not configured')
        return
      }

      const res2 = await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          access_key: accessKey,
          name,
          email,
          phone: phone || 'Not provided',
          subject: subject || 'Contact Form Lead',
          message,
        }),
      })
      const data = await res2.json()
      if (data.success) {
        console.log('Lead email sent successfully to falconayurveda1@gmail.com')
      } else {
        console.error('EMAIL FAILED:', data.message || 'Web3Forms rejected')
      }
    } catch (emailErr) {
      console.error('EMAIL FAILED:', emailErr.message)
    }
  } catch (err) {
    res.status(500).json({ message: 'Failed to submit lead', error: err.message })
  }
}

const getLeads = async (req, res) => {
  try {
    const leads = await Lead.find().sort({ createdAt: -1 })
    res.json(leads)
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch leads', error: err.message })
  }
}

const updateLeadStatus = async (req, res) => {
  try {
    const lead = await Lead.findByIdAndUpdate(req.params.id, { status: req.body.status }, { new: true })
    if (!lead) return res.status(404).json({ message: 'Lead not found' })
    res.json(lead)
  } catch (err) {
    res.status(500).json({ message: 'Failed to update lead', error: err.message })
  }
}

const deleteLead = async (req, res) => {
  try {
    const lead = await Lead.findByIdAndDelete(req.params.id)
    if (!lead) return res.status(404).json({ message: 'Lead not found' })
    res.json({ message: 'Lead deleted' })
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete lead', error: err.message })
  }
}

module.exports = { createLead, getLeads, updateLeadStatus, deleteLead }
