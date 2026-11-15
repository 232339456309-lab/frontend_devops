import { STATUS_META } from '../../shared/fields.js'
import { useI18n } from '../i18n/index.jsx'

/** Verdict stamp: a colour, a square, and the word — nothing else. */
export function StatusBadge({ status, size }) {
  const { t } = useI18n()
  const meta = STATUS_META[status] ?? STATUS_META.P
  return (
    <span className={`status status--${meta.tone}${size === 'lg' ? ' status--lg' : ''}`}>
      {t(meta.label)}
    </span>
  )
}

export function StatusDot({ status }) {
  const meta = STATUS_META[status] ?? STATUS_META.P
  return (
    <span
      aria-hidden="true"
      style={{
        display: 'inline-block',
        width: 7,
        height: 7,
        borderRadius: 1,
        background: `var(--${meta.tone === 'pending' ? 'pending' : meta.tone})`,
        flex: 'none',
      }}
    />
  )
}
