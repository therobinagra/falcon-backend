const Product = require('../models/Product')

async function decreaseStock(order) {
  if (!order || !Array.isArray(order.items)) return

  for (const item of order.items) {
    const product = await Product.findById(item.product)
    if (!product) continue

    const remaining = Math.max(0, (product.stock || 0) - item.qty)
    product.stock = remaining
    if (product.stock <= 0) product.inStock = false
    await product.save()
  }
}

async function restoreStock(order) {
  if (!order || !Array.isArray(order.items)) return

  for (const item of order.items) {
    const product = await Product.findById(item.product)
    if (!product) continue

    product.stock = (product.stock || 0) + item.qty
    if (product.stock > 0) product.inStock = true
    await product.save()
  }
}

module.exports = { decreaseStock, restoreStock }