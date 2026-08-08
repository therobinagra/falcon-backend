require('dotenv').config()
const connectDB = require('./config/db')
const Product = require('./models/Product')
const Category = require('./models/Category')
const User = require('./models/User')
const Blog = require('./models/Blog')
const productData = require('./data/products')
const categoryData = require('./data/categories')
const blogData = require('./data/blogs')

const seed = async () => {
  try {
    await connectDB()

    const [existingProducts, existingCategories, existingAdmin, existingBlogs] = await Promise.all([
      Product.countDocuments(),
      Category.countDocuments(),
      User.findOne({ email: (process.env.ADMIN_EMAIL || 'admin@falcon.com').toLowerCase() }),
      Blog.countDocuments(),
    ])

    if (existingProducts === 0) {
      await Product.insertMany(productData)
      console.log(`Seeded ${productData.length} products`)
    } else {
      console.log(`Products already exist (${existingProducts}), skipping`)
    }

    if (existingCategories === 0) {
      await Category.insertMany(categoryData)
      console.log(`Seeded ${categoryData.length} categories`)
    } else {
      console.log(`Categories already exist (${existingCategories}), skipping`)
    }

    if (existingAdmin) {
      console.log(`Admin user already exists: ${existingAdmin.email}`)
    } else {
      const admin = await User.create({
        name: process.env.ADMIN_NAME || 'Falcon Admin',
        email: process.env.ADMIN_EMAIL || 'admin@falcon.com',
        password: process.env.ADMIN_PASSWORD || 'admin123',
        role: 'admin',
      })
      console.log(`Admin user created: ${admin.email} / ${process.env.ADMIN_PASSWORD || 'admin123'}`)
    }

    if (existingBlogs === 0) {
      await Blog.insertMany(blogData)
      console.log(`Seeded ${blogData.length} blog posts`)
    } else {
      console.log(`Blog posts already exist (${existingBlogs}), skipping`)
    }

    console.log('Seed complete — existing data was preserved')
    process.exit(0)
  } catch (error) {
    console.error(`Seeding failed: ${error.message}`)
    process.exit(1)
  }
}

seed()
