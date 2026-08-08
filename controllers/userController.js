const User = require('../models/User')
const generateToken = require('../utils/generateToken')

const registerUser = async (req, res) => {
  try {
    const { name, email, password, phone } = req.body

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email and password are required' })
    }

    const exists = await User.findOne({ email: email.toLowerCase() })
    if (exists) {
      return res.status(409).json({ message: 'User already exists' })
    }

    const user = await User.create({ name, email, password, phone: phone || '' })

    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      token: generateToken(user._id),
    })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' })
    }

    const user = await User.findOne({ email: email.trim().toLowerCase() })

    if (!user) {
      return res.status(401).json({ message: 'No account found with this email' })
    }

    if (!(await user.matchPassword(password))) {
      return res.status(401).json({ message: 'Incorrect password' })
    }

    if (!user.isActive) {
      return res.status(403).json({ message: 'Account disabled, contact support' })
    }

    res.status(200).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      token: generateToken(user._id),
    })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

const getProfile = async (req, res) => {
  res.status(200).json({
    _id: req.user._id,
    name: req.user.name,
    email: req.user.email,
    phone: req.user.phone,
    role: req.user.role,
    createdAt: req.user.createdAt,
  })
}

const updateProfile = async (req, res) => {
  try {
    const { name, phone, password } = req.body
    const user = req.user

    if (name) user.name = name
    if (phone !== undefined) user.phone = phone
    if (password) user.password = password

    const updated = await user.save()

    res.status(200).json({
      _id: updated._id,
      name: updated.name,
      email: updated.email,
      phone: updated.phone,
      role: updated.role,
      token: generateToken(updated._id),
    })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

const getUsers = async (req, res) => {
  try {
    const users = await User.find().sort({ createdAt: -1 })
    res.status(200).json(users)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

const updateUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
    if (!user) {
      return res.status(404).json({ message: 'User not found' })
    }

    const { name, phone, role, isActive, password } = req.body
    if (name !== undefined) user.name = name
    if (phone !== undefined) user.phone = phone
    if (role !== undefined) user.role = role
    if (isActive !== undefined) user.isActive = isActive === 'true' || isActive === true
    if (password) user.password = password

    const updated = await user.save()
    res.status(200).json(updated)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

const deleteUser = async (req, res) => {
  try {
    if (req.params.id === req.user._id.toString()) {
      return res.status(400).json({ message: 'You cannot delete your own account' })
    }
    const user = await User.findById(req.params.id)
    if (!user) {
      return res.status(404).json({ message: 'User not found' })
    }
    await user.deleteOne()
    res.status(200).json({ message: 'User deleted', id: req.params.id })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

module.exports = {
  registerUser,
  loginUser,
  getProfile,
  updateProfile,
  getUsers,
  updateUser,
  deleteUser,
}
