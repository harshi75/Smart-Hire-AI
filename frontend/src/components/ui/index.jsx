import clsx from 'clsx'
import { Loader2 } from 'lucide-react'

export function ScoreRing({ score, size = 80, label }) {
  const r = (size - 8) / 2
  const circ = 2 * Math.PI * r
  const offset = circ * (1 - Math.min(score, 100) / 100)
  const color = score >= 75 ? '#22c55e' : score >= 50 ? '#f59e0b' : '#ef4444'

  return (
    <div className="flex flex-col items-center gap-1.5">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#1f2937" strokeWidth={8} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke={color} strokeWidth={8} strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.8s ease-out' }}
        />
        <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle"
          style={{ transform: 'rotate(90deg)', transformOrigin: 'center', fontSize: size * 0.22, fontWeight: 600, fill: color }}>
          {Math.round(score)}%
        </text>
      </svg>
      {label && <span className="text-xs text-gray-500 text-center">{label}</span>}
    </div>
  )
}

export function ProgressBar({ value, max = 100, color }) {
  const pct = Math.min((value / max) * 100, 100)
  const barColor = color || (pct >= 75 ? '#22c55e' : pct >= 50 ? '#f59e0b' : '#ef4444')
  return (
    <div className="w-full bg-gray-800 rounded-full h-2 overflow-hidden">
      <div className="h-2 rounded-full transition-all duration-700"
        style={{ width: `${pct}%`, background: barColor }} />
    </div>
  )
}

export function StatusBadge({ status }) {
  const map = {
    new: 'bg-blue-500/15 text-blue-400 border border-blue-500/20',
    shortlisted: 'bg-green-500/15 text-green-400 border border-green-500/20',
    rejected: 'bg-red-500/15 text-red-400 border border-red-500/20',
    interview: 'bg-yellow-500/15 text-yellow-400 border border-yellow-500/20',
  }
  return (
    <span className={clsx('badge capitalize', map[status] || map.new)}>
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {status}
    </span>
  )
}

export function SkillChip({ skill, matched }) {
  return (
    <span className={clsx(
      'badge text-xs',
      matched === true ? 'bg-green-500/15 text-green-400 border border-green-500/20' :
      matched === false ? 'bg-red-500/15 text-red-400 border border-red-500/20' :
      'bg-gray-800 text-gray-300 border border-gray-700'
    )}>
      {skill}
    </span>
  )
}

export function Spinner({ size = 20 }) {
  return <Loader2 size={size} className="animate-spin text-primary-400" />
}

export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-14 h-14 rounded-2xl bg-gray-800 flex items-center justify-center mb-4">
        <Icon size={24} className="text-gray-600" />
      </div>
      <h3 className="text-base font-semibold text-gray-300 mb-1">{title}</h3>
      <p className="text-sm text-gray-600 max-w-xs">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

export function StatCard({ label, value, icon: Icon, color = 'primary', trend }) {
  const colors = {
    primary: 'bg-primary-500/10 text-primary-400 border-primary-500/20',
    green: 'bg-green-500/10 text-green-400 border-green-500/20',
    red: 'bg-red-500/10 text-red-400 border-red-500/20',
    yellow: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    blue: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  }
  return (
    <div className="stat-card">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm text-gray-500">{label}</p>
        <div className={clsx('w-8 h-8 rounded-lg flex items-center justify-center border', colors[color])}>
          <Icon size={15} />
        </div>
      </div>
      <p className="text-2xl font-bold text-white">{value ?? '—'}</p>
      {trend && <p className="text-xs text-gray-600 mt-1">{trend}</p>}
    </div>
  )
}

export function SectionCard({ title, children, className, action }) {
  return (
    <div className={clsx('glass-card p-5', className)}>
      {(title || action) && (
        <div className="flex items-center justify-between mb-4">
          {title && <h3 className="section-title mb-0">{title}</h3>}
          {action}
        </div>
      )}
      {children}
    </div>
  )
}

export function Modal({ open, onClose, title, children, maxWidth = 'max-w-lg' }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className={clsx('glass-card relative w-full p-6 z-10 animate-in', maxWidth)}>
        {title && <h2 className="text-lg font-semibold text-white mb-4">{title}</h2>}
        {children}
      </div>
    </div>
  )
}

export function Tabs({ tabs, active, onChange }) {
  return (
    <div className="flex gap-1 p-1 bg-gray-900 rounded-xl border border-gray-800">
      {tabs.map(tab => (
        <button
          key={tab.value}
          onClick={() => onChange(tab.value)}
          className={clsx(
            'flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200',
            active === tab.value
              ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/20'
              : 'text-gray-400 hover:text-white'
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}
