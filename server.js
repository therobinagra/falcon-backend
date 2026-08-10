const path = require('path')
const express = require('express')
const cors = require('cors')
const connectDB = require('./config/db')
const { notFound, errorHandler } = require('./middleware/errorMiddleware')
require('dotenv').config()

const app = express()

connectDB()

app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

app.use('/uploads', express.static(path.join(__dirname, 'uploads')))

app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Backend is running' })
})

app.use('/api/users', require('./routes/userRoutes'))
app.use('/api/products', require('./routes/productRoutes'))
app.use('/api/orders', require('./routes/orderRoutes'))
app.use('/api/categories', require('./routes/categoryRoutes'))
app.use('/api/blogs', require('./routes/blogRoutes'))
app.use('/api/admin', require('./routes/adminRoutes'))

app.use(notFound)
app.use(errorHandler)

const PORT = process.env.PORT || 5000

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})
