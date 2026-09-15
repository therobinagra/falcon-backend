const crypto = require('crypto')

const {
  SHIPROCKET_CHECKOUT_API_KEY,
  SHIPROCKET_CHECKOUT_API_SECRET,
  SHIPROCKET_CHECKOUT_ENV,
  SHIPROCKET_CHECKOUT_BASE_URL,
  SHIPROCKET_CHECKOUT_TOKEN_PATH,
  SHIPROCKET_CHECKOUT_ORDER_DETAILS_PATH,
} = process.env

const BASE_URL =
  SHIPROCKET_CHECKOUT_BASE_URL ||
  (SHIPROCKET_CHECKOUT_ENV === 'sandbox'
    ? 'https://fastrr-api-dev.pickrr.com'
    : 'https://fastrr-api-dev.pickrr.com')

const TOKEN_PATH = SHIPROCKET_CHECKOUT_TOKEN_PATH || '/api/v1/access-token/checkout'
const ORDER_DETAILS_PATH = SHIPROCKET_CHECKOUT_ORDER_DETAILS_PATH || '/api/v1/custom-platform-order/details'

const signBody = (rawBody) =>
  crypto
    .createHmac('sha256', SHIPROCKET_CHECKOUT_API_SECRET || '')
    .update(rawBody || '', 'utf8')
    .digest('base64')

const signHeaders = (rawBody) => ({
  'Content-Type': 'application/json',
  'X-Api-Key': SHIPROCKET_CHECKOUT_API_KEY || '',
  'X-Api-HMAC-SHA256': signBody(rawBody),
})

const isConfigured = () => Boolean(SHIPROCKET_CHECKOUT_API_KEY && SHIPROCKET_CHECKOUT_API_SECRET)

const getCheckoutToken = async ({ items, redirectUrl }) => {
  if (!isConfigured()) {
    const err = new Error('Shiprocket Checkout API key/secret not configured')
    err.code = 'SRC_NOT_CONFIGURED'
    throw err
  }

  const payload = {
    cart_data: { items },
    redirect_url: redirectUrl,
    timestamp: new Date().toISOString(),
  }

  const rawBody = JSON.stringify(payload)
  const response = await fetch(`${BASE_URL}${TOKEN_PATH}`, {
    method: 'POST',
    headers: signHeaders(rawBody),
    body: rawBody,
  })

  let data = null
  try {
    data = await response.json()
  } catch {
    data = { ok: false, result: await response.text().catch(() => '') }
  }

  if (!response.ok || data?.ok === false) {
    const err = new Error(data?.result || data?.message || `SRC token request failed (${response.status})`)
    err.status = response.status
    err.data = data
    throw err
  }

  return data
}

const getOrderDetails = async ({ orderId }) => {
  if (!isConfigured()) {
    const err = new Error('Shiprocket Checkout API key/secret not configured')
    err.code = 'SRC_NOT_CONFIGURED'
    throw err
  }

  const payload = { order_id: orderId, timestamp: new Date().toISOString() }
  const rawBody = JSON.stringify(payload)
  const response = await fetch(`${BASE_URL}${ORDER_DETAILS_PATH}`, {
    method: 'POST',
    headers: signHeaders(rawBody),
    body: rawBody,
  })

  let data = null
  try {
    data = await response.json()
  } catch {
    data = { ok: false, result: await response.text().catch(() => '') }
  }

  if (!response.ok || data?.ok === false) {
    const err = new Error(data?.result || data?.message || `SRC order details failed (${response.status})`)
    err.status = response.status
    err.data = data
    throw err
  }

  return data
}

const verifySignature = (rawBody, providedHmac) => {
  if (!SHIPROCKET_CHECKOUT_API_SECRET) return true
  if (!providedHmac) return false
  const expected = signBody(rawBody || '')
  try {
    const a = Buffer.from(expected, 'base64')
    const b = Buffer.from(String(providedHmac), 'base64')
    if (a.length !== b.length) return false
    return crypto.timingSafeEqual(a, b)
  } catch {
    return false
  }
}

module.exports = { BASE_URL, TOKEN_PATH, signBody, signHeaders, getCheckoutToken, getOrderDetails, verifySignature, isConfigured }