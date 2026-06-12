import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Users, Briefcase, Star, TrendingUp, Upload, ChevronRight, Trophy } from 'lucide-react'
import { analyticsAPI, candidatesAPI } from '../services/api'
import { StatCard, StatusBadge, ProgressBar, Spinner } from '../components/ui'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { useAuth } from '../hooks/useAuth'

const COLORS = ['#6C63FF', '#8B85FF', '#a5a0ff', '#c4c1ff', '#e2e1ff']

export default function DashboardPage() {
  const { user } = useAuth()
  const [analytics, setAnalytics] = useState(null)
  const [candidates, setCandidates] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([analyticsAPI.get(), candidatesAPI.list()])
      .then(([aRes, cRes]) => {
        setAnalytics(aRes.data)
        setCandidates(cRes.data.slice(0, 5))
      })
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Spinner size={28} />
    </div>
  )

  const ov = analytics?.overview || {}

  return (
    <div className="space-y-6 animate-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Welcome back, {user?.name?.split(' ')[0]} 👋</h1>
          <p className="text-gray-500 text-sm mt-0.5">Here's your recruitment overview</p>
        </div>
        <Link to="/upload" className="btn-primary flex items-center gap-2">
          <Upload size={15} /> Upload Resume
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Candidates" value={ov.total_candidates ?? 0} icon={Users} color="primary" />
        <StatCard label="Shortlisted" value={ov.shortlisted ?? 0} icon={Star} color="green" trend="Ready for interviews" />
        <StatCard label="In Interview" value={ov.interview ?? 0} icon={TrendingUp} color="yellow" />
        <StatCard label="Avg Match Score" value={`${ov.average_score ?? 0}%`} icon={Trophy} color="blue" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Skills Chart */}
        <div className="glass-card p-5">
          <h3 className="section-title">Top Skills in Talent Pool</h3>
          {analytics?.top_skills?.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={analytics.top_skills.slice(0, 10)} layout="vertical" margin={{ left: 20, right: 20 }}>
                <XAxis type="number" stroke="#374151" tick={{ fill: '#9ca3af', fontSize: 11 }} />
                <YAxis type="category" dataKey="skill" stroke="#374151" tick={{ fill: '#9ca3af', fontSize: 11 }} width={80} />
                <Tooltip
                  contentStyle={{ background: '#111827', border: '1px solid #374151', borderRadius: 10, fontSize: 12 }}
                  cursor={{ fill: 'rgba(108,99,255,0.08)' }}
                />
                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                  {analytics.top_skills.slice(0, 10).map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[220px] text-gray-600 text-sm">
              Upload resumes to see skill insights
            </div>
          )}
        </div>

        {/* Score Distribution */}
        <div className="glass-card p-5">
          <h3 className="section-title">Score Distribution</h3>
          {analytics?.score_distribution?.some(d => d.count > 0) ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={analytics.score_distribution} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <XAxis dataKey="range" stroke="#374151" tick={{ fill: '#9ca3af', fontSize: 11 }} />
                <YAxis stroke="#374151" tick={{ fill: '#9ca3af', fontSize: 11 }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ background: '#111827', border: '1px solid #374151', borderRadius: 10, fontSize: 12 }}
                  cursor={{ fill: 'rgba(108,99,255,0.08)' }}
                />
                <Bar dataKey="count" fill="#6C63FF" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[220px] text-gray-600 text-sm">
              Run ranking analysis to populate this chart
            </div>
          )}
        </div>
      </div>

      {/* Recent Candidates */}
      <div className="glass-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="section-title mb-0">Recent Candidates</h3>
          <Link to="/candidates" className="text-sm text-primary-400 hover:text-primary-300 flex items-center gap-1">
            View all <ChevronRight size={14} />
          </Link>
        </div>
        {candidates.length === 0 ? (
          <div className="py-8 text-center text-gray-600 text-sm">
            No candidates yet. <Link to="/upload" className="text-primary-400 hover:underline">Upload the first resume →</Link>
          </div>
        ) : (
          <div className="space-y-2">
            {candidates.map(c => (
              <Link key={c.id} to={`/candidates/${c.id}`}
                className="flex items-center gap-4 p-3 rounded-xl hover:bg-gray-800/50 transition-colors group">
                <div className="w-9 h-9 rounded-full bg-primary-500/15 border border-primary-500/20 flex items-center justify-center text-primary-400 font-semibold text-sm shrink-0">
                  {c.name?.[0]?.toUpperCase() || '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{c.name || 'Unknown'}</p>
                  <p className="text-xs text-gray-500 truncate">{c.email || '—'} · {c.skills?.length || 0} skills</p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <StatusBadge status={c.status} />
                  <ChevronRight size={14} className="text-gray-600 group-hover:text-gray-400 transition-colors" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Monthly Trend */}
      {analytics?.monthly_trend && (
        <div className="glass-card p-5">
          <h3 className="section-title">Monthly Candidate Intake</h3>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={analytics.monthly_trend} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
              <XAxis dataKey="month" stroke="#374151" tick={{ fill: '#9ca3af', fontSize: 11 }} />
              <YAxis stroke="#374151" tick={{ fill: '#9ca3af', fontSize: 11 }} allowDecimals={false} />
              <Tooltip contentStyle={{ background: '#111827', border: '1px solid #374151', borderRadius: 10, fontSize: 12 }}
                cursor={{ fill: 'rgba(108,99,255,0.08)' }} />
              <Bar dataKey="count" fill="#6C63FF" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
