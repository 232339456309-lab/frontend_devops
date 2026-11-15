import { useI18n } from '../i18n/index.jsx'
import { Icon } from './Icon.jsx'

export function Tabs({ tabs, value, onChange }) {
  return (
    <div className="tabs" role="tablist">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          aria-selected={value === tab.id}
          className="tab"
          onClick={() => onChange(tab.id)}
        >
          {tab.label}
          {tab.count !== undefined ? <span className="tab__count">{tab.count}</span> : null}
        </button>
      ))}
    </div>
  )
}

export function Empty({ icon = 'file', title, hint, action }) {
  return (
    <div className="empty">
      <span className="empty__icon">
        <Icon name={icon} size={18} />
      </span>
      <div className="empty__title">{title}</div>
      {hint ? <p className="empty__hint">{hint}</p> : null}
      {action ? <div className="empty__action">{action}</div> : null}
    </div>
  )
}

export function Pagination({ page, pages, total, limit, onChange }) {
  const { t } = useI18n()
  const from = total === 0 ? 0 : (page - 1) * limit + 1
  const to = Math.min(total, page * limit)

  return (
    <div className="pagination">
      <span>{t('common.showing', { from, to, total })}</span>
      <span className="spacer" />
      <button
        type="button"
        className="pagebtn"
        onClick={() => onChange(page - 1)}
        disabled={page <= 1}
        aria-label={t('common.prev')}
      >
        <Icon name="chevronLeft" size={12} />
      </button>
      <span className="mono tiny">{t('common.page', { page, pages })}</span>
      <button
        type="button"
        className="pagebtn"
        onClick={() => onChange(page + 1)}
        disabled={page >= pages}
        aria-label={t('common.next')}
      >
        <Icon name="chevronRight" size={12} />
      </button>
    </div>
  )
}

export function Notice({ tone = 'default', icon = 'info', children, style }) {
  return (
    <div className={`notice${tone !== 'default' ? ` notice--${tone}` : ''}`} style={style}>
      <Icon name={icon} size={15} />
      <div>{children}</div>
    </div>
  )
}

export function Spinner({ label }) {
  return (
    <span className="row" style={{ gap: 8 }}>
      <span className="spinner" />
      {label ? <span className="small muted">{label}</span> : null}
    </span>
  )
}
