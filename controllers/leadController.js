const Lead = require('../models/Lead')
const nodemailer = require('nodemailer')

const createLead = async (req, res) => {
  try {
    const { name, email, phone, subject, message } = req.body
    if (!name || !email || !message) {
      return res.status(400).json({ message: 'Name, email and message are required' })
    }
    const lead = await Lead.create({ name, email, phone, subject, message })

    res.status(201).json({ message: 'Lead submitted successfully', lead })

    try {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: Number(process.env.SMTP_PORT) || 587,
        secure: false,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
        connectionTimeout: 5000,
        greetingTimeout: 5000,
        socketTimeout: 5000,
      })

      await transporter.sendMail({
        from: process.env.SMTP_USER || 'falconayurveda1@gmail.com',
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
    } catch (emailErr) {
      console.error('Email send failed:', emailErr.message)
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
