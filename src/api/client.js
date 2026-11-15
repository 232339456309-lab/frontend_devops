/**
 * API client.
 *
 * Points at the bundled mock API through the Vite proxy by default. Set
 * VITE_API_BASE_URL to the teammate's back-end and every screen keeps working,
 * as long as the routes in docs/API_CONTRACT.md are implemented.
 */

const BASE = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/+$/, '')

export class ApiError extends Error {
  constructor(status, payload) {
    const error = payload?.error ?? {}
    super(error.message || `HTTP ${status}`)
    this.name = 'ApiError'
    this.status = status
    /** i18n key for the message, e.g. 'error.validation' */
    this.key = error.message || 'error.server'
    /** field path -> i18n key */
    this.fields = error.fields ?? null
    this.meta = error.meta ?? null
  }
}

function query(params = {}) {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue
    search.set(key, String(value))
  }
  const string = search.toString()
  return string ? `?${string}` : ''
}

async function request(path, { method = 'GET', body, signal } = {}) {
  let response
  try {
    response = await fetch(`${BASE}${path}`, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      signal,
    })
  } catch (networkError) {
    if (networkError?.name === 'AbortError') throw networkError
    throw new ApiError(0, { error: { message: 'error.network' } })
  }

  const text = await response.text()
  let payload = null
  if (text) {
    try {
      payload = JSON.parse(text)
    } catch {
      payload = null
    }
  }

  if (!response.ok) throw new ApiError(response.status, payload)
  return payload
}

export const api = {
  baseUrl: BASE,

  login(role, userId) {
    return request('/auth/login', { method: 'POST', body: { role, userId } })
  },
  accounts() {
    return request('/auth/accounts')
  },

  companies: {
    list(params) {
      return request(`/companies${query(params)}`)
    },
    get(id) {
      return request(`/companies/${id}`)
    },
    create(body) {
      return request('/companies', { method: 'POST', body })
    },
    update(id, body) {
      return request(`/companies/${id}`, { method: 'PUT', body })
    },
    remove(id, { force = false } = {}) {
      return request(`/companies/${id}${force ? '?force=1' : ''}`, { method: 'DELETE' })
    },
    check(id) {
      return request(`/companies/${id}/check`, { method: 'POST' })
    },
    setBlacklist(id, blacklisted) {
      return request(`/companies/${id}/blacklist`, { method: 'POST', body: { blacklisted } })
    },
  },

  postings: {
    list(params) {
      return request(`/postings${query(params)}`)
    },
    get(id) {
      return request(`/postings/${id}`)
    },
    create(body) {
      return request('/postings', { method: 'POST', body })
    },
    update(id, body) {
      return request(`/postings/${id}`, { method: 'PUT', body })
    },
    remove(id) {
      return request(`/postings/${id}`, { method: 'DELETE' })
    },
    check(id, recruiterId) {
      return request(`/postings/${id}/check`, { method: 'POST', body: { recruiterId } })
    },
    override(id, body) {
      return request(`/postings/${id}/override`, { method: 'POST', body })
    },
    history(id) {
      return request(`/postings/${id}/history`)
    },
  },

  reports: {
    list(params) {
      return request(`/reports${query(params)}`)
    },
    create(body) {
      return request('/reports', { method: 'POST', body })
    },
  },

  recruiters: {
    list() {
      return request('/recruiters')
    },
    create(body) {
      return request('/recruiters', { method: 'POST', body })
    },
    update(id, body) {
      return request(`/recruiters/${id}`, { method: 'PUT', body })
    },
    remove(id) {
      return request(`/recruiters/${id}`, { method: 'DELETE' })
    },
  },

  candidates: {
    list() {
      return request('/candidates')
    },
  },

  classifications(limit = 20) {
    return request(`/classifications${query({ limit })}`)
  },

  stats: {
    summary() {
      return request('/stats/summary')
    },
    weekly(weeks = 9) {
      return request(`/stats/weekly${query({ weeks })}`)
    },
    companies() {
      return request('/stats/companies')
    },
    rules() {
      return request('/stats/rules')
    },
    activity(limit = 8) {
      return request(`/stats/activity${query({ limit })}`)
    },
  },

  rules() {
    return request('/rules')
  },

  resetDemoData() {
    return request('/dev/reset', { method: 'POST' })
  },
}
