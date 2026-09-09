// Assigns a stable, collision-free numeric SKU to a document that currently
// has no SKU (missing/0). Returns the numeric SKU for that document.
// Shiprocket Fastrr requires a purely numeric product id.
const getNextNumericSku = async (Model) => {
  const doc = await Model.findOne({}).sort({ sku: -1 })
  return (doc && doc.sku ? doc.sku : 0) + 1
}

const ensureNumericSku = async (Model, doc) => {
  if (doc.sku && doc.sku > 0) return doc.sku

  while (true) {
    const candidate = await getNextNumericSku(Model)
    try {
      await Model.updateOne({ _id: doc._id }, { $set: { sku: candidate } })
      doc.sku = candidate
      return candidate
    } catch (err) {
      if (err && err.code === 11000) continue
      throw err
    }
  }
}

module.exports = { getNextNumericSku, ensureNumericSku }
