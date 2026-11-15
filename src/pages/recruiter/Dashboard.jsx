import { useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../api/client.js'
import { Icon } from '../../components/Icon.jsx'
import { Empty, Notice } from '../../components/Small.jsx'
import { StatusBadge } from '../../components/Status.jsx'
import { useI18n } from '../../i18n/index.jsx'
import { percent, statusLabel, statusTone } from '../../lib/format.js'
import { useAsync } from '../../lib/useAsync.js'

function WeeklyChart({ weeks, t, locale }) {
  const [active, setActive] = useState(null)
  const [asTable, setAsTable] = useState(false)

  const short = (iso) =>
    new Date(iso).toLocaleDateString(locale, { day: '2-digit', month: '2-digit' })

  if (!weeks.length) {
    return <Empty icon="activity" title={t('dash.noData')} />
  }

  const shares = weeks.map((week) => week.fakeShare)
  const maxIndex = shares.indexOf(Math.max(...shares))
  const lastIndex = weeks.length - 1
  const currentWeek = weeks[active ?? lastIndex]

  return (
    <>
      <div className="chart__head">
        <div className="chart__readout">
          <span className="tiny faint">
            {t('dash.week')} {short(currentWeek.weekStart)}
          </span>
          <span className="mono" style={{ fontSize: 21, letterSpacing: '-0.03em' }}>
            {currentWeek.fakeShare}%
          </span>
          <span className="small muted">
            {t('dash.readout', { fake: currentWeek.fake, total: currentWeek.total })}
          </span>
        </div>
        <span className="spacer" />
        <button type="button" className="linkbtn" onClick={() => setAsTable((value) => !value)}>
          {asTable ? t('dash.chartView') : t('dash.tableView')}
        </button>
      </div>

      {asTable ? (
        <div className="tablewrap">
          <table className="table">
            <thead>
              <tr>
                <th>{t('dash.week')}</th>
                <th className="cell-right">{t('dash.kpi.postings')}</th>
                <th className="cell-right">{t('dash.legend.fake')}</th>
                <th className="cell-right">{t('dash.share')}</th>
              </tr>
            </thead>
            <tbody>
              {weeks.map((week) => (
                <tr key={week.weekStart}>
                  <td className="mono small">{short(week.weekStart)}</td>
                  <td className="cell-right cell-mono">{week.total}</td>
                  <td className="cell-right cell-mono">{week.fake}</td>
                  <td className="cell-right cell-mono">{week.fakeShare}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="chart__plot">
          <div className="chart__y" aria-hidden="true">
            <span>100%</span>
            <span>50%</span>
            <span>0</span>
          </div>

          <div className="chart__axis">
            {weeks.map((week, index) => {
              const labelled = index === maxIndex || index === lastIndex
              return (
                <button
                  type="button"
                  key={week.weekStart}
                  className={`col${active === index ? ' is-active' : ''}`}
                  onMouseEnter={() => setActive(index)}
                  onMouseLeave={() => setActive(null)}
                  onFocus={() => setActive(index)}
                  onBlur={() => setActive(null)}
                  aria-label={`${t('dash.week')} ${short(week.weekStart)}: ${week.fakeShare}%, ${t('dash.readout', { fake: week.fake, total: week.total })}`}
                >
                  <span className="col__area">
                    <span
                      className="col__stack"
                      style={{ height: `${Math.max(week.fakeShare, week.total ? 1.5 : 0)}%` }}
                    >
                      {labelled ? <span className="col__value">{week.fakeShare}%</span> : null}
                    </span>
                  </span>
                  <span className="col__label">{short(week.weekStart)}</span>
                </button>
              )
            })}
          </div>
        </div>
      )}
    </>
  )
}

export function Dashboard() {
  const { t, locale, formatDate } = useI18n()

  const dash = useAsync(
    () =>
      Promise.all([
        api.stats.summary(),
        api.stats.weekly(9),
        api.stats.companies(),
        api.stats.rules(),
        api.stats.activity(7),
      ]).then(([summary, weekly, companies, rules, activity]) => ({
        summary,
        weeks: weekly.items,
        companies: companies.items,
        rules: rules.items,
        activity: activity.items,
      })),
    [],
  )

  const data = dash.data
  const maxRuleCount = data ? Math.max(1, ...data.rules.map((row) => row.count)) : 1

  return (
    <div className="page">
      <div className="page-head">
        <div className="page-head__text">
          <h1>{t('dash.title')}</h1>
          <p>{t('dash.sub')}</p>
        </div>
        <div className="page-head__actions">
          <button type="button" className="btn btn--secondary" onClick={dash.reload}>
            <Icon name="refresh" size={14} />
            {t('common.refresh')}
          </button>
        </div>
      </div>

      {dash.error ? (
        <Notice tone="danger" icon="alert">
          {t(dash.error.key ?? 'error.server')}{' '}
          <button type="button" className="linkbtn" onClick={dash.reload}>
            {t('common.retry')}
          </button>
        </Notice>
      ) : null}

      {data ? (
        <>
          <div className="stats">
            <div className="stat">
              <div className="stat__label">{t('dash.kpi.postings')}</div>
              <div className="stat__value">{data.summary.total}</div>
              <div className="stat__foot">
                {t('dash.kpi.postingsFoot', { count: data.summary.companies })}
              </div>
            </div>
            <div className="stat">
              <div className="stat__label">{t('dash.kpi.fakeShare')}</div>
              <div className="stat__value">{percent(data.summary.fakeShare)}</div>
              <div className="stat__foot">
                {t('dash.kpi.fakeShareFoot', { count: data.summary.byStatus.F })}
              </div>
            </div>
            <div className="stat">
              <div className="stat__label">{t('dash.kpi.pending')}</div>
              <div className="stat__value">{data.summary.pending}</div>
              <div className="stat__foot">
                {t('dash.kpi.pendingFoot', { count: data.summary.byStatus.S })}
              </div>
            </div>
            <div className="stat">
              <div className="stat__label">{t('dash.kpi.reports')}</div>
              <div className="stat__value">{data.summary.reports7d}</div>
              <div className="stat__foot">
                {t('dash.kpi.reportsFoot', { count: data.summary.checkedTotal })}
              </div>
            </div>
          </div>

          <div className="dashgrid" style={{ marginTop: 16 }}>
            <div className="stack">
              <section className="card">
                <div className="card__head">
                  <span className="card__title">{t('dash.weekly.title')}</span>
                  <span className="card__sub">
                    {t('dash.weekly.sub', { count: data.weeks.length })}
                  </span>
                </div>
                <div className="chart">
                  <WeeklyChart weeks={data.weeks} t={t} locale={locale} />
                </div>
              </section>

              <section className="card">
                <div className="card__head">
                  <span className="card__title">{t('dash.rules.title')}</span>
                  <span className="card__sub">{t('dash.rules.sub')}</span>
                </div>
                <div className="card__body card__body--flush">
                  <div className="tablewrap">
                    <table className="table">
                      <thead>
                        <tr>
                          <th>{t('dash.rules.rule')}</th>
                          <th className="cell-right" style={{ width: 90 }}>
                            {t('dash.rules.count')}
                          </th>
                          <th aria-hidden="true" style={{ width: '38%' }} />
                        </tr>
                      </thead>
                      <tbody>
                        {data.rules.map((row) => (
                          <tr key={row.ruleId}>
                            <td>
                              <span className="row" style={{ gap: 8 }}>
                                <span className="rule__code">{row.ruleId}</span>
                                <span className="small mono faint">{row.ruleId}</span>
                              </span>
                            </td>
                            <td className="cell-right cell-mono">{row.count}</td>
                            <td aria-hidden="true">
                              <span
                                className="hbar__track"
                                style={{ display: 'block', width: '100%' }}
                              >
                                <span
                                  className="hbar__fill"
                                  style={{ width: `${(row.count / maxRuleCount) * 100}%` }}
                                />
                              </span>
                            </td>
                          </tr>
                        ))}
                        {data.rules.length === 0 ? (
                          <tr>
                            <td colSpan={3} className="muted small">
                              {t('dash.activity.empty')}
                            </td>
                          </tr>
                        ) : null}
                      </tbody>
                    </table>
                  </div>
                </div>
              </section>
            </div>

            <div className="stack">
              <section className="card">
                <div className="card__head">
                  <span className="card__title">{t('dash.company.title')}</span>
                  <span className="card__sub">{t('dash.company.sub')}</span>
                </div>
                <div className="hbars">
                  {data.companies.map((company) => (
                    <div className="hbar" key={company.companyId}>
                      <span className="hbar__name" title={company.name}>
                        {company.name}
                        {company.blacklisted === 1 ? (
                          <span className="roletag" style={{ marginLeft: 6 }}>
                            {t('admin.companies.blacklist')}
                          </span>
                        ) : null}
                      </span>
                      <span className="hbar__pct">{company.fakeShare}%</span>
                      <div className="hbar__track">
                        <div className="hbar__fill" style={{ width: `${company.fakeShare}%` }} />
                      </div>
                      <div className="hbar__meta">
                        <span>{t('dash.company.meta', { fake: company.fake, total: company.total })}</span>
                        <span>·</span>
                        <span>
                          {company.suspicious} {t('dash.legend.suspicious').toLowerCase()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="card">
                <div className="card__head">
                  <span className="card__title">{t('dash.activity.title')}</span>
                  <span className="card__sub">{t('dash.activity.sub')}</span>
                </div>
                <div className="card__body">
                  {data.activity.length === 0 ? (
                    <Empty icon="clock" title={t('dash.activity.empty')} />
                  ) : (
                    <div className="activity">
                      {data.activity.map((entry) => (
                        <Link
                          className="act"
                          key={entry.id}
                          to={`/recruiter/postings/${entry.postingId}`}
                          style={{ textDecoration: 'none', color: 'inherit' }}
                        >
                          <span
                            className="act__dot"
                            style={{
                              background:
                                entry.label === 'F'
                                  ? 'var(--fake)'
                                  : entry.label === 'S'
                                    ? 'var(--suspicious)'
                                    : entry.label === 'L'
                                      ? 'var(--legit)'
                                      : 'var(--pending)',
                            }}
                          />
                          <span style={{ minWidth: 0 }}>
                            <span className="act__title">{entry.title}</span>
                            <span className="act__sub">
                              {entry.company} · {entry.ruleId ?? t('override.title')}
                            </span>
                          </span>
                          <span className="act__time">
                            {formatDate(entry.at)}
                          </span>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              </section>
            </div>
          </div>
        </>
      ) : (
        <div className="card">
          <div className="card__body stack">
            <span className="sk" style={{ width: '30%' }} />
            <span className="sk" style={{ width: '100%', height: 120 }} />
            <span className="sk" style={{ width: '80%' }} />
          </div>
        </div>
      )}
    </div>
  )
}
