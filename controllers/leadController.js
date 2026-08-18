const Lead = require('../models/Lead')

let resendClient = null
function getResend() {
  if (!resendClient && process.env.RESEND_API_KEY) {
    const { Resend } = require('resend')
    resendClient = new Resend(process.env.RESEND_API_KEY)
  }
  return resendClient
}

const createLead = async (req, res) => {
  try {
    const { name, email, phone, subject, message } = req.body
    if (!name || !email || !message) {
      return res.status(400).json({ message: 'Name, email and message are required' })
    }
    const lead = await Lead.create({ name, email, phone, subject, message })

    res.status(201).json({ message: 'Lead submitted successfully', lead })

    try {
      const resend = getResend()
      if (!resend) {
        console.error('EMAIL SKIPPED: RESEND_API_KEY not configured')
        return
      }

      const fromEmail = process.env.EMAIL_FROM || 'falconayurveda1@gmail.com'

      await resend.emails.send({
        from: `FalconCare <${fromEmail}>`,
        to: 'falconayurveda1@gmail.com',
        subject: `New Lead: ${subject || name}`,
        html: `
          <h2>New Contact Form Lead</h2>
          <p><strong>Name:</strong> ${name}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Phone:</strong> ${phone || 'Not provided'}</p>
          <p><strong>Subject:</strong> ${subject || 'N/A'}</p>
          <p><strong>Message:</strong></p>
          <p>${message}</p>
          <hr/>
          <p><small>Sent from FalconCare Contact Form</small></p>
        `,
      })
      console.log('Lead email sent successfully to', 'falconayurveda1@gmail.com')
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
