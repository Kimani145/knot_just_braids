/**
 * tests/adapters.test.js
 * Unit tests for HTTP adapters, rate limiting, and Vercel serverless function handlers.
 */

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  createApiHandler,
  getClientIp,
  parseJsonBody,
  setCorsHeaders,
} from '../server/adapters/httpUtils.js'
import { ValidationError } from '../server/core/errors.js'

function createMockReq(options = {}) {
  return {
    method: options.method || 'GET',
    url: options.url || '/api/test',
    headers: options.headers || {},
    body: options.body || null,
    socket: { remoteAddress: '127.0.0.1' },
    on: (event, cb) => {
      if (event === 'end') cb()
    },
  }
}

function createMockRes() {
  const headers = {}
  return {
    statusCode: 200,
    headers,
    setHeader: (k, v) => {
      headers[k.toLowerCase()] = v
    },
    getHeader: (k) => headers[k.toLowerCase()],
    end: function (data) {
      this.body = data
    },
  }
}

describe('Server Adapters - HTTP Utils', () => {
  it('extracts client IP from x-forwarded-for or socket', () => {
    const req1 = createMockReq({ headers: { 'x-forwarded-for': '197.232.1.1, 10.0.0.1' } })
    assert.equal(getClientIp(req1), '197.232.1.1')

    const req2 = createMockReq()
    assert.equal(getClientIp(req2), '127.0.0.1')
  })

  it('sets CORS headers correctly', () => {
    const req = createMockReq({ headers: { origin: 'http://localhost:5173' } })
    const res = createMockRes()
    setCorsHeaders(req, res)
    assert.equal(res.getHeader('access-control-allow-origin'), 'http://localhost:5173')
    assert.ok(res.getHeader('access-control-allow-methods').includes('POST'))
  })

  it('parses JSON bodies from objects and strings', async () => {
    const reqObj = createMockReq({ body: { key: 'value' } })
    assert.deepEqual(await parseJsonBody(reqObj), { key: 'value' })

    const reqStr = createMockReq({ body: '{"foo":"bar"}' })
    assert.deepEqual(await parseJsonBody(reqStr), { foo: 'bar' })
  })

  it('rejects disallowed HTTP methods with 405 Method Not Allowed', async () => {
    const handler = createApiHandler(async () => {}, { methods: ['POST'] })
    const req = createMockReq({ method: 'GET' })
    const res = createMockRes()

    await handler(req, res)

    assert.equal(res.statusCode, 405)
    const body = JSON.parse(res.body)
    assert.equal(body.ok, false)
    assert.equal(body.error.code, 'METHOD_NOT_ALLOWED')
  })

  it('handles OPTIONS preflight requests with 204 No Content', async () => {
    const handler = createApiHandler(async () => {}, { methods: ['POST'] })
    const req = createMockReq({ method: 'OPTIONS' })
    const res = createMockRes()

    await handler(req, res)

    assert.equal(res.statusCode, 204)
  })

  it('formats errors safely into HTTP status and response payload', async () => {
    const handler = createApiHandler(
      async () => {
        throw new ValidationError('Invalid request item', { field: 'items' })
      },
      { methods: ['POST'] }
    )

    const req = createMockReq({ method: 'POST', body: {} })
    const res = createMockRes()

    await handler(req, res)

    assert.equal(res.statusCode, 400)
    const body = JSON.parse(res.body)
    assert.equal(body.ok, false)
    assert.equal(body.error.code, 'VALIDATION_ERROR')
    assert.equal(body.error.message, 'Invalid request item')
  })
})
