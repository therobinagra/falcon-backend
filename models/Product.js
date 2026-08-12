const mongoose = require('mongoose')

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      trim: true,
      unique: true,
      sparse: true,
    },
    tagline: {
      type: String,
      default: '',
    },
    description: {
      type: String,
      default: '',
    },
    category: {
      type: String,
      required: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    mrp: {
      type: Number,
      required: true,
      min: 0,
    },
    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    reviews: {
      type: Number,
      default: 0,
    },
    image: {
      type: String,
      default: '',
    },
    gradient: {
      type: String,
      default: 'from-amber-700 to-orange-600',
    },
    badge: {
      type: String,
      default: '',
    },
    stock: {
      type: Number,
      default: 10,
      min: 0,
    },
    featured: {
      type: Boolean,
      default: false,
    },
    inStock: {
      type: Boolean,
      default: true,
    },
    related: {
      type: [String],
      default: [],
    },
  },
  { timestamps: true }
)

module.exports = mongoose.model('Product', productSchema)
