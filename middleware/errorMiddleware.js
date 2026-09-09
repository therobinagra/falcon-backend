const notFound = (req, res, next) => {
  const error = new Error(`Route not found - ${req.originalUrl}`)
  error.status = 404
  next(error)
}

const errorHandler = (err, req, res, next) => {
  const status = err.status || res.statusCode || 500
  res.status(status)
  res.json({
    message: err.message || 'Server error',
    stack: process.env.NODE_ENV === 'production' ? undefined : err.stack,
  })
}

module.exports = { notFound, errorHandler }
