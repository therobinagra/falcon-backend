const Product = require('../models/Product')
const Category = require('../models/Category')
const { ensureNumericSku } = require('./numericId')

const VENDOR = 'Falcon Ayurveda'

const WILD = /https?:\/\//i

function baseUrl(req) {
  if (process.env.BACKEND_URL) return String(process.env.BACKEND_URL).replace(/\/+$/, '')
  const host = req && req.get ? req.get('host') : 'localhost:5000'
  const proto = (req && req.protocol) || 'http'
  return `${proto}://${host}`
}

function absolute(src, req) {
  if (!src) return ''
  if (WILD.test(src)) return src
  const base = baseUrl(req)
  return `${base}${src.startsWith('/') ? src : `/${src}`}`
}

async function hydrateProductSkus(products) {
  for (const p of products) {
    p.sku = await ensureNumericSku(Product, p)
  }
  return products
}

async function hydrateCategorySkus(collections) {
  for (const c of collections) {
    c.sku = await ensureNumericSku(Category, c)
  }
  return collections
}

function slugify(name = '') {
  return String(name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function toSrcProduct(p, req) {
  const id = Number(p.sku)
  const variantId = id * 10 + 1
  const createdAt = p.createdAt ? new Date(p.createdAt).toISOString() : new Date().toISOString()
  const updatedAt = p.updatedAt ? new Date(p.updatedAt).toISOString() : createdAt
  const imageSrc = absolute(p.image, req)

  return {
    id,
    title: p.name,
    body_html: p.description || '',
    vendor: VENDOR,
    product_type: p.category || '',
    created_at: createdAt,
    handle: `${slugify(p.name)}-${id}`,
    updated_at: updatedAt,
    tags: [p.tagline, p.badge].filter(Boolean).join(', '),
    status: p.inStock === false ? 'archived' : 'active',
    variants: [
      {
        id: variantId,
        title: p.name,
        price: Number(p.price).toFixed(2),
        compare_at_price: Number(p.mrp).toFixed(2),
        sku: id,
        created_at: createdAt,
        updated_at: updatedAt,
        taxable: true,
        option_values: {},
        grams: 0,
        image: { src: imageSrc },
        weight: 0,
        weight_unit: 'kg',
      },
    ],
    image: { src: imageSrc },
    options: [],
  }
}

function toSrcCollection(c, req, fallbackImage) {
  const id = Number(c.sku)
  const createdAt = c.createdAt ? new Date(c.createdAt).toISOString() : new Date().toISOString()
  const updatedAt = c.updatedAt ? new Date(c.updatedAt).toISOString() : createdAt

  return {
    id,
    updated_at: updatedAt,
    body_html: c.description || '',
    handle: `${slugify(c.name)}-${id}`,
    image: { src: absolute(c.image || fallbackImage || '', req) },
    title: c.name,
    created_at: createdAt,
  }
}

function isSrcCall(query) {
  return (
    query.page !== undefined ||
    query.limit !== undefined ||
    query.format === 'src' ||
    query.collection_id !== undefined
  )
}

function pagination(query, defaultLimit) {
  const page = Math.max(parseInt(query.page, 10) || 1, 1)
  const limit = Math.min(Math.max(parseInt(query.limit, 10) || defaultLimit, 1), 250)
  return { page, limit }
}

async function categoryImageMap() {
  const rows = await Product.aggregate([
    { $match: { category: { $ne: null }, image: { $ne: '' } } },
    { $group: { _id: '$category', image: { $first: '$image' } } },
  ])
  return new Map(rows.map((r) => [r._id, r.image]))
}

module.exports = {
  baseUrl,
  absolute,
  hydrateProductSkus,
  hydrateCategorySkus,
  slugify,
  toSrcProduct,
  toSrcCollection,
  isSrcCall,
  pagination,
  categoryImageMap,
}