const mongoose = require('mongoose')

const blogSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    category: {
      type: String,
      default: 'Wellness',
    },
    date: {
      type: String,
      default: '',
    },
    readTime: {
      type: String,
      default: '',
    },
    desc: {
      type: String,
      default: '',
    },
    body: {
      type: String,
      default: '',
    },
    image: {
      type: String,
      default: '',
    },
  },
  { timestamps: true }
)

module.exports = mongoose.model('Blog', blogSchema)
