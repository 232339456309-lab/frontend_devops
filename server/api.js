/**
 * HTTP surface of the mock API.
 *
 * This is the contract the real back-end has to implement. Every route below is
 * documented in docs/API_CONTRACT.md with its payload and status codes.
 */
import { Router } from 'express'
import * as store from './store.js'
import { ALL_RULES } from '../shared/rules.js'
import {
  validateCompanyPayload,
  validatePostingPayload,
  validateRecruiterPayload,
  validateReportPayload,
} from './validate.js'

const router = Router()

const fail = (res, status, message, fields, meta) =>
  res
    .status(status)
    .json({ error: { message, ...(fields ? { fields } : {}), ...(meta ? { meta } : {}) } })

/* -------------------------------- auth -------------------------------- */

/** Demo sign-in. A real deployment replaces this with the university SSO. */
router.post('/auth/login', (req, res) => {
  const { role = 'recruiter', userId } = req.body ?? {}
  if (role === 'recruiter') {
    const recruiter = userId ? store.getRecruiter(userId) : store.listRecruiters()[0]
    if (!recruiter) return fail(res, 404, 'error.notFound')
    return res.json({
      user: {
        id: recruiter.id,
        kind: 'recruiter',
        name: recruiter.name,
        surname: recruiter.surname,
        fullName: `${recruiter.name} ${recruiter.surname}`,
        email: recruiter.email,
        role: recruiter.role,
      },
    })
  }
  if (role === 'candidate') {
    const candidate = userId ? store.getCandidate(userId) : store.listCandidates()[0]
    if (!candidate) return fail(res, 404, 'error.notFound')
    return res.json({
      user: {
        id: candidate.id,
        kind: 'candidate',
        name: candidate.name,
        surname: candidate.surname,
        fullName: `${candidate.name} ${candidate.surname}`,
        email: candidate.email,
        role: null,
      },
    })
  }
  if (role === 'admin') {
    const admins = store.getTables().itAdmin
    const admin = userId ? admins.find((a) => a.id === Number(userId)) : admins[0]
    if (!admin) return fail(res, 404, 'error.notFound')
    return res.json({
      user: {
        id: admin.id,
        kind: 'admin',
        name: admin.name.split(' ')[0],
        surname: admin.name.split(' ').slice(1).join(' '),
        fullName: admin.name,
        email: admin.email,
        role: null,
      },
    })
  }
  return fail(res, 400, 'error.role')
})

router.get('/auth/accounts', (req, res) => {
  res.json({
    recruiters: store.listRecruiters(),
    candidates: store.listCandidates(),
    admins: store.getTables().itAdmin,
  })
})

/* ------------------------------ companies ----------------------------- */

router.get('/companies', (req, res) => {
  const { q, blacklisted } = req.query
  const parsed = blacklisted === undefined || blacklisted === '' ? undefined : Number(blacklisted)
  res.json({ items: store.listCompanies({ q, blacklisted: parsed }) })
})

router.get('/companies/:id', (req, res) => {
  const company = store.getCompany(req.params.id)
  if (!company) return fail(res, 404, 'error.notFound')
  res.json({ company })
})

router.post('/companies', (req, res) => {
  const { ok, errors, data } = validateCompanyPayload(req.body)
  if (!ok) return fail(res, 422, 'error.validation', errors)
  res.status(201).json({ company: store.createCompany(data) })
})

router.put('/companies/:id', (req, res) => {
  if (!store.getCompany(req.params.id)) return fail(res, 404, 'error.notFound')
  const { ok, errors, data } = validateCompanyPayload(req.body)
  if (!ok) return fail(res, 422, 'error.validation', errors)
  res.json({ company: store.updateCompany(req.params.id, data) })
})

router.delete('/companies/:id', (req, res) => {
  const force = req.query.force === '1' || req.query.force === 'true'
  const outcome = store.deleteCompany(req.params.id, { force })
  if (!outcome.ok && outcome.reason === 'not_found') return fail(res, 404, 'error.notFound')
  if (!outcome.ok && outcome.reason === 'has_postings') {
    return fail(res, 409, 'error.companyHasPostings', null, { count: outcome.count })
  }
  res.json({ ok: true, removedPostings: outcome.removedPostings ?? 0 })
})

/** R11 — Blacklist_Repeat_Offender. */
router.post('/companies/:id/check', (req, res) => {
  const outcome = store.checkCompany(req.params.id)
  if (!outcome) return fail(res, 404, 'error.notFound')
  res.json(outcome)
})

router.post('/companies/:id/blacklist', (req, res) => {
  const company = store.getCompany(req.params.id)
  if (!company) return fail(res, 404, 'error.notFound')
  const value = Number(req.body?.blacklisted)
  if (![0, 1].includes(value)) return fail(res, 422, 'error.validation', { blacklisted: 'error.coded' })
  store.updateCompany(company.id, { blacklisted: value })
  res.json({ company: store.getCompany(company.id) })
})

/* ------------------------------- postings ----------------------------- */

router.get('/postings', (req, res) => {
  const { q, status, companyId, minRisk, sort, page, limit, pendingOnly } = req.query
  res.json(
    store.listPostings({
      q,
      status,
      companyId,
      minRisk,
      sort,
      page,
      limit,
      pendingOnly: pendingOnly === '1' || pendingOnly === 'true',
    }),
  )
})

router.get('/postings/:id', (req, res) => {
  const posting = store.getPostingDetail(req.params.id)
  if (!posting) return fail(res, 404, 'error.notFound')
  res.json({ posting, facts: store.factsOf(posting.id) })
})

router.post('/postings', (req, res) => {
  const { ok, errors, data } = validatePostingPayload(req.body)
  if (!ok) return fail(res, 422, 'error.validation', errors)

  if (data.company.companyId && !store.getCompany(data.company.companyId)) {
    return fail(res, 422, 'error.validation', { 'company.companyId': 'error.coded' })
  }

  const posting = store.createPosting({ ...data, recruiterId: req.body?.recruiterId })
  res.status(201).json({ posting })
})

router.put('/postings/:id', (req, res) => {
  if (!store.getPostingRow(req.params.id)) return fail(res, 404, 'error.notFound')
  const { ok, errors, data } = validatePostingPayload(req.body)
  if (!ok) return fail(res, 422, 'error.validation', errors)
  res.json({ posting: store.updatePosting(req.params.id, data) })
})

router.delete('/postings/:id', (req, res) => {
  if (!store.deletePosting(req.params.id)) return fail(res, 404, 'error.notFound')
  res.json({ ok: true })
})

/** R.ToCheck(P, Infos) — evaluate R1–R8 by precedence. */
router.post('/postings/:id/check', (req, res) => {
  const outcome = store.checkPosting(req.params.id, { recruiterId: req.body?.recruiterId })
  if (!outcome) return fail(res, 404, 'error.notFound')
  res.json(outcome)
})

/** Human adjudication of a machine verdict. Recorded in the classification history. */
router.post('/postings/:id/override', (req, res) => {
  const { status, reason, recruiterId } = req.body ?? {}
  if (!['P', 'L', 'S', 'F'].includes(status)) {
    return fail(res, 422, 'error.validation', { status: 'error.coded' })
  }
  if (!String(reason ?? '').trim()) {
    return fail(res, 422, 'error.validation', { reason: 'error.required' })
  }
  const outcome = store.overrideVerdict(req.params.id, { status, reason, recruiterId })
  if (!outcome) return fail(res, 404, 'error.notFound')
  res.json(outcome)
})

router.get('/postings/:id/history', (req, res) => {
  if (!store.getPostingRow(req.params.id)) return fail(res, 404, 'error.notFound')
  res.json({ items: store.classificationHistory(req.params.id) })
})

/* -------------------------------- reports ----------------------------- */

router.get('/reports', (req, res) => {
  res.json({ items: store.listReports({ postingId: req.query.postingId }) })
})

/** Cd.Report(P, Reason) — applies R9 and R10, then re-runs ToCheck. */
router.post('/reports', (req, res) => {
  const { ok, errors, data } = validateReportPayload(req.body)
  if (!ok) return fail(res, 422, 'error.validation', errors)
  if (!store.getPostingRow(data.postingId)) return fail(res, 404, 'error.postingNotFound')
  if (!store.getCandidate(data.candidateId)) return fail(res, 404, 'error.candidateNotFound')

  const outcome = store.createReport(data)
  res.status(201).json(outcome)
})

/* --------------------------------- people ----------------------------- */

router.get('/recruiters', (req, res) => {
  res.json({ items: store.listRecruiters() })
})

router.post('/recruiters', (req, res) => {
  const { ok, errors, data } = validateRecruiterPayload(req.body)
  if (!ok) return fail(res, 422, 'error.validation', errors)
  res.status(201).json({ recruiter: store.createRecruiter(data) })
})

router.put('/recruiters/:id', (req, res) => {
  if (!store.getRecruiter(req.params.id)) return fail(res, 404, 'error.notFound')
  const { ok, errors, data } = validateRecruiterPayload(req.body)
  if (!ok) return fail(res, 422, 'error.validation', errors)
  res.json({ recruiter: store.updateRecruiter(req.params.id, data) })
})

router.delete('/recruiters/:id', (req, res) => {
  if (!store.deleteRecruiter(req.params.id)) return fail(res, 404, 'error.notFound')
  res.json({ ok: true })
})

router.get('/candidates', (req, res) => {
  res.json({ items: store.listCandidates() })
})

router.get('/classifications', (req, res) => {
  const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 20))
  res.json({ items: store.recentActivity(limit) })
})

/* -------------------------------- stats ------------------------------- */

router.get('/stats/summary', (req, res) => res.json(store.statsSummary()))
router.get('/stats/weekly', (req, res) => {
  const weeks = Math.min(26, Math.max(2, Number(req.query.weeks) || 9))
  res.json({ items: store.statsWeekly(weeks) })
})
router.get('/stats/companies', (req, res) => res.json({ items: store.statsByCompany(8) }))
router.get('/stats/rules', (req, res) => res.json({ items: store.statsByRule() }))
router.get('/stats/activity', (req, res) => {
  res.json({ items: store.recentActivity(Number(req.query.limit) || 8) })
})

/* -------------------------------- rules ------------------------------- */

/** The rule repository (US9): rules are data, not compiled code. */
router.get('/rules', (req, res) => {
  res.json({
    items: store.getTables().ecaRule,
    source: 'ecaRule table',
    count: ALL_RULES.length,
  })
})

/* -------------------------------- dev --------------------------------- */

router.post('/dev/reset', (req, res) => {
  store.resetDatabase()
  res.json({ ok: true, postings: store.getTables().jobPosting.length })
})

router.get('/health', (req, res) => {
  res.json({
    ok: true,
    service: 'verdict-mock-api',
    tables: Object.fromEntries(Object.entries(store.getTables()).map(([k, v]) => [k, v.length])),
  })
})

export default router
