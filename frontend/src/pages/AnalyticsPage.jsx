import { useEffect, useState } from 'react'
import { Users, Star, TrendingUp, Briefcase, BarChart2, Trophy } from 'lucide-react'
import { analyticsAPI } from '../services/api'
import { StatCard, Spinner, ProgressBar } from '../components/ui'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, CartesianGrid, Legend
} from 'recharts'

const PALETTE = ['#6C63FF', '#8B85FF', '#a5a0ff', '#c4c1ff', '#818CF8', '#A78BFA', '#C4B5FD', '#DDD6FE']

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-sm shadow-xl">
      <p className="text-gray-400 mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }}>{p.name}: <strong>{p.value}</strong></p>
      ))}
    </div>
  )
}

export default function AnalyticsPage() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    analyticsAPI.get().then(res => setData(res.data)).finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="flex justify-center pt-20"><Spinner size={28} /></div>
  if (!data) return <p className="text-gray-500 text-center pt-20">Could not load analytics</p>

  const ov = data.overview || {}
  const statusData = [
    { name: 'New', value: ov.new || 0, color: '#3B82F6' },
    { name: 'Shortlisted', value: ov.shortlisted || 0, color: '#22C55E' },
    { name: 'Interview', value: ov.interview || 0, color: '#F59E0B' },
    { name: 'Rejected', value: ov.rejected || 0, color: '#EF4444' },
  ].filter(d => d.value > 0)

  return (
    <div className="space-y-6 animate-in">
      <div>
        <h1 className="text-2xl font-bold text-white">Analytics</h1>
        <p className="text-gray-500 text-sm mt-0.5">Recruitment pipeline insights</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Candidates" value={ov.total_candidates ?? 0} icon={Users} color="primary" />
        <StatCard label="Shortlisted" value={ov.shortlisted ?? 0} icon={Star} color="green" />
        <StatCard label="In Interview" value={ov.interview ?? 0} icon={TrendingUp} color="yellow" />
        <StatCard label="Avg Match Score" value={`${ov.average_score ?? 0}%`} icon={Trophy} color="blue" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Rejected" value={ov.rejected ?? 0} icon={Users} color="red" />
        <StatCard label="New (Unreviewed)" value={ov.new ?? 0} icon={Users} color="primary" />
        <StatCard label="Total Jobs" value={ov.total_jobs ?? 0} icon={Briefcase} color="blue" />
        <StatCard label="Active Pipeline" value={(ov.shortlisted ?? 0) + (ov.interview ?? 0)} icon={BarChart2} color="green" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Skills */}
        <div className="glass-card p-5">
          <h3 className="section-title">Top Skills in Talent Pool</h3>
          {data.top_skills?.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={data.top_skills.slice(0, 12)} layout="vertical" margin={{ left: 10, right: 30 }}>
                <XAxis type="number" stroke="#374151" tick={{ fill: '#9ca3af', fontSize: 11 }} />
                <YAxis type="category" dataKey="skill" stroke="#374151" tick={{ fill: '#9ca3af', fontSize: 11 }} width={85} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(108,99,255,0.08)' }} />
                <Bar dataKey="count" radius={[0, 4, 4, 0]} name="Candidates">
                  {data.top_skills.slice(0, 12).map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : <div className="flex items-center justify-center h-64 text-gray-600 text-sm">No data yet</div>}
        </div>

        {/* Pipeline Status Pie */}
        <div className="glass-card p-5">
          <h3 className="section-title">Pipeline Status</h3>
          {statusData.length > 0 ? (
            <div className="flex items-center gap-6">
              <ResponsiveContainer width="60%" height={220}>
                <PieChart>
                  <Pie data={statusData} cx="50%" cy="50%" innerRadius={55} outerRadius={90}
                    paddingAngle={3} dataKey="value">
                    {statusData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2.5 flex-1">
                {statusData.map(d => (
                  <div key={d.name}>
                    <div className="flex justify-between text-xs text-gray-400 mb-1">
                      <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full inline-block" style={{ background: d.color }} />
                        {d.name}
                      </span>
                      <span className="font-medium text-white">{d.value}</span>
                    </div>
                    <ProgressBar value={d.value} max={ov.total_candidates || 1} color={d.color} />
                  </div>
                ))}
              </div>
            </div>
          ) : <div className="flex items-center justify-center h-[220px] text-gray-600 text-sm">No pipeline data yet</div>}
        </div>

        {/* Score Distribution */}
        <div className="glass-card p-5">
          <h3 className="section-title">Score Distribution</h3>
          {data.score_distribution?.some(d => d.count > 0) ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data.score_distribution} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <XAxis dataKey="range" stroke="#374151" tick={{ fill: '#9ca3af', fontSize: 11 }} />
                <YAxis stroke="#374151" tick={{ fill: '#9ca3af', fontSize: 11 }} allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(108,99,255,0.08)' }} />
                <Bar dataKey="count" name="Candidates" fill="#6C63FF" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <div className="flex items-center justify-center h-[220px] text-gray-600 text-sm">Run ranking to generate scores</div>}
        </div>

        {/* Monthly Trend */}
        <div className="glass-card p-5">
          <h3 className="section-title">Monthly Intake Trend</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={data.monthly_trend} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
              <CartesianGrid stroke="#1f2937" strokeDasharray="3 3" />
              <XAxis dataKey="month" stroke="#374151" tick={{ fill: '#9ca3af', fontSize: 11 }} />
              <YAxis stroke="#374151" tick={{ fill: '#9ca3af', fontSize: 11 }} allowDecimals={false} />
              <Tooltip content={<CustomTooltip />} />
              <Line type="monotone" dataKey="count" name="Candidates" stroke="#6C63FF" strokeWidth={2}
                dot={{ fill: '#6C63FF', r: 4 }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top Candidates */}
      {data.top_candidates?.length > 0 && (
        <div className="glass-card p-5">
          <h3 className="section-title">Top Ranked Candidates</h3>
          <div className="space-y-2">
            {data.top_candidates.map((c, i) => (
              <div key={c.id} className="flex items-center gap-4 p-3 bg-gray-800/40 rounded-xl">
                <div className="w-7 h-7 rounded-full bg-primary-500/20 text-primary-400 text-xs font-bold flex items-center justify-center shrink-0">
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{c.name || 'Unknown'}</p>
                  <p className="text-xs text-gray-500 truncate">{c.email}</p>
                </div>
                <div className="shrink-0">
                  <span className={`text-sm font-bold ${c.score >= 70 ? 'text-green-400' : c.score >= 50 ? 'text-yellow-400' : 'text-gray-400'}`}>
                    {c.score}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
