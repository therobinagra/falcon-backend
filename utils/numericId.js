// Assigns a stable, collision-free numeric SKU to a document that currently
// has no SKU (value 0 or missing). Returns the numeric SKU that should be used
// for that document. Shiprocket Fastrr requires a purely numeric product id.
const getNextNumericSku = async (Model) => {
  const doc = await Model.findOne({}).sort({ sku: -1 })
  return (doc && doc.sku ? doc.sku : 0) + 1
}

const ensureNumericSku = async (Model, doc) => {
  if (doc.sku && doc.sku > 0) return doc.sku
  const next = await getNextNumericSku(Model)
  doc.sku = next
  await Model.updateOne({ _id: doc._id }, { $set: { sku: next } })
  return next
}

module.exports = { getNextNumericSku, ensureNumericSku }
