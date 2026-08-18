const path = require('path')
const express = require('express')
const cors = require('cors')
const connectDB = require('./config/db')
const { notFound, errorHandler } = require('./middleware/errorMiddleware')
require('dotenv').config()

const app = express()

connectDB().then(async () => {
  const Product = require('./models/Product')
  const seedProducts = require('./data/products')
  await Promise.all(
    seedProducts.map((p) =>
      Product.findOneAndUpdate(
        { $or: [{ slug: p.slug }, { name: p.name }] },
        { $set: p },
        { upsert: true, setDefaultsOnInsert: true }
      ).catch((err) => console.error('Product sync failed:', err.message))
    )
  )
  await Product.deleteMany({
    slug: { $nin: seedProducts.map((p) => p.slug) },
  }).catch((err) => console.error('Product cleanup failed:', err.message))

  const Blog = require('./models/Blog')
  const seedBlogs = require('./data/blogs')
  seedBlogs.forEach((b) => {
    Blog.findOneAndUpdate(
      { slug: b.slug },
      { $set: b },
      { upsert: true, setDefaultsOnInsert: true }
    ).catch((err) => console.error('Blog sync failed:', err.message))
  })
})

app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

app.use('/uploads', express.static(path.join(__dirname, 'uploads')))

app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Backend is running' })
})

app.get('/api/smtp-check', (req, res) => {
  const hasUser = !!process.env.SMTP_USER
  const hasPass = !!process.env.SMTP_PASS && process.env.SMTP_PASS !== 'your_gmail_app_password_here'
  const hasHost = !!process.env.SMTP_HOST
  res.json({
    SMTP_USER_SET: hasUser,
    SMTP_PASS_SET: hasPass,
    SMTP_HOST_SET: hasHost,
    SMTP_USER_LENGTH: process.env.SMTP_USER ? process.env.SMTP_USER.length : 0,
    SMTP_PASS_LENGTH: process.env.SMTP_PASS ? process.env.SMTP_PASS.length : 0,
  })
})

app.use('/api/users', require('./routes/userRoutes'))
app.use('/api/products', require('./routes/productRoutes'))
app.use('/api/orders', require('./routes/orderRoutes'))
app.use('/api/categories', require('./routes/categoryRoutes'))
app.use('/api/blogs', require('./routes/blogRoutes'))
app.use('/api/leads', require('./routes/leadRoutes'))
app.use('/api/admin', require('./routes/adminRoutes'))

app.use(notFound)
app.use(errorHandler)

const PORT = process.env.PORT || 5000

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})
