const crypto = require('crypto')

const {
  SHIPROCKET_CHECKOUT_API_KEY,
  SHIPROCKET_CHECKOUT_API_SECRET,
  SHIPROCKET_CHECKOUT_ENV,
  SHIPROCKET_CHECKOUT_BASE_URL,
  SHIPROCKET_CHECKOUT_TOKEN_PATH,
} = process.env

const BASE_URL =
  SHIPROCKET_CHECKOUT_BASE_URL ||
  (SHIPROCKET_CHECKOUT_ENV === 'sandbox'
    ? 'https://fastrr-api-dev.pickrr.com'
    : 'https://checkout-api.shiprocket.com')

const TOKEN_PATH = SHIPROCKET_CHECKOUT_TOKEN_PATH || '/v1/checkout/access-token'

const signBody = (rawBody) =>
  crypto
    .createHmac('sha256', SHIPROCKET_CHECKOUT_API_SECRET || '')
    .update(rawBody || '', 'utf8')
    .digest('hex')

const signHeaders = (rawBody) => ({
  'Content-Type': 'application/json',
  'X-Api-Key': SHIPROCKET_CHECKOUT_API_KEY || '',
  'X-Api-HMAC-SHA256': signBody(rawBody),
})

const isConfigured = () => Boolean(SHIPROCKET_CHECKOUT_API_KEY && SHIPROCKET_CHECKOUT_API_SECRET)

const getCheckoutToken = async ({ items, redirectUrl, customAttributes, cartDiscount }) => {
  if (!isConfigured()) {
    const err = new Error('Shiprocket Checkout API key/secret not configured')
    err.code = 'SRC_NOT_CONFIGURED'
    throw err
  }

  const payload = {
    items,
    redirectUrl,
    cart_data: {
      customAttributes: customAttributes || {},
      ...(cartDiscount ? { cartDiscount } : {}),
    },
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

  if (!response.ok) {
    const err = new Error(data?.result || data?.message || `SRC token request failed (${response.status})`)
    err.status = response.status
    err.data = data
    throw err
  }

  return { token: data?.token || data?.checkout_url, ...data }
}

const verifySignature = (rawBody, providedHmac) => {
  if (!SHIPROCKET_CHECKOUT_API_SECRET) return true
  if (!providedHmac) return false
  const expected = signBody(rawBody || '')
  const a = Buffer.from(expected)
  const b = Buffer.from(String(providedHmac))
  if (a.length !== b.length) return false
  return crypto.timingSafeEqual(a, b)
}

module.exports = { BASE_URL, TOKEN_PATH, signBody, signHeaders, getCheckoutToken, verifySignature, isConfigured }