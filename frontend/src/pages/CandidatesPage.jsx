import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Users, Search, Filter, Download, Trash2, ChevronRight, Upload } from 'lucide-react'
import { candidatesAPI, exportAPI } from '../services/api'
import { StatusBadge, EmptyState, Spinner } from '../components/ui'
import toast from 'react-hot-toast'
import clsx from 'clsx'

const STATUSES = ['all', 'new', 'shortlisted', 'interview', 'rejected']

export default function CandidatesPage() {
  const [candidates, setCandidates] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [selected, setSelected] = useState(new Set())

  const load = async () => {
    setLoading(true)
    try {
      const res = await candidatesAPI.list(statusFilter === 'all' ? null : statusFilter)
      setCandidates(res.data)
    } catch { toast.error('Failed to load candidates') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [statusFilter])

  const filtered = candidates.filter(c =>
    !search || c.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.email?.toLowerCase().includes(search.toLowerCase()) ||
    c.skills?.some(s => s.toLowerCase().includes(search.toLowerCase()))
  )

  const toggleSelect = (id) => {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this candidate?')) return
    try {
      await candidatesAPI.delete(id)
      toast.success('Candidate deleted')
      load()
    } catch { toast.error('Delete failed') }
  }

  const handleStatusChange = async (id, status) => {
    try {
      await candidatesAPI.updateStatus(id, status)
      toast.success(`Status updated to ${status}`)
      load()
    } catch { toast.error('Update failed') }
  }

  const handleExport = async (format) => {
    try {
      const res = await exportAPI.download(format)
      const url = URL.createObjectURL(res.data)
      const a = document.createElement('a')
      a.href = url
      a.download = `smarthire_candidates.${format}`
      a.click()
      URL.revokeObjectURL(url)
      toast.success(`Exported as ${format.toUpperCase()}`)
    } catch { toast.error('Export failed') }
  }

  return (
    <div className="space-y-5 animate-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Candidates</h1>
          <p className="text-gray-500 text-sm">{filtered.length} candidate{filtered.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => handleExport('csv')} className="btn-ghost border border-gray-700 flex items-center gap-2 text-sm">
            <Download size={14} /> CSV
          </button>
          <button onClick={() => handleExport('excel')} className="btn-ghost border border-gray-700 flex items-center gap-2 text-sm">
            <Download size={14} /> Excel
          </button>
          <Link to="/upload" className="btn-primary flex items-center gap-2 text-sm">
            <Upload size={14} /> Upload
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input className="input pl-9 py-2 text-sm" placeholder="Search by name, email, skill…"
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-1 p-1 bg-gray-900 border border-gray-800 rounded-xl">
          {STATUSES.map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={clsx('px-3 py-1.5 rounded-lg text-xs font-medium transition-all capitalize',
                statusFilter === s ? 'bg-primary-500 text-white' : 'text-gray-400 hover:text-white')}>
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center h-48"><Spinner size={24} /></div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No candidates found"
          description={search ? 'Try a different search term' : 'Upload resumes to get started'}
          action={<Link to="/upload" className="btn-primary text-sm">Upload Resume</Link>}
        />
      ) : (
        <div className="glass-card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Candidate</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">Skills</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">Confidence</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/60">
              {filtered.map(c => (
                <tr key={c.id} className="hover:bg-gray-800/30 transition-colors group">
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary-500/15 border border-primary-500/20 flex items-center justify-center text-primary-400 text-sm font-semibold shrink-0">
                        {c.name?.[0]?.toUpperCase() || '?'}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-white truncate">{c.name || 'Unknown'}</p>
                        <p className="text-xs text-gray-500 truncate">{c.email || '—'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 hidden md:table-cell">
                    <div className="flex flex-wrap gap-1 max-w-[200px]">
                      {(c.skills || []).slice(0, 3).map(s => (
                        <span key={s} className="badge bg-gray-800 text-gray-300 border border-gray-700 text-xs">{s}</span>
                      ))}
                      {c.skills?.length > 3 && (
                        <span className="badge bg-gray-800 text-gray-500 text-xs">+{c.skills.length - 3}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3.5 hidden lg:table-cell">
                    <div className="flex items-center gap-2">
                      <div className="w-16 bg-gray-800 rounded-full h-1.5 overflow-hidden">
                        <div className="h-1.5 rounded-full bg-primary-500" style={{ width: `${(c.parse_confidence || 0) * 100}%` }} />
                      </div>
                      <span className="text-xs text-gray-500">{Math.round((c.parse_confidence || 0) * 100)}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <select
                      value={c.status || 'new'}
                      onChange={e => handleStatusChange(c.id, e.target.value)}
                      onClick={e => e.stopPropagation()}
                      className="bg-gray-800 border border-gray-700 rounded-lg text-xs text-gray-300 px-2 py-1 focus:outline-none focus:ring-1 focus:ring-primary-500"
                    >
                      <option value="new">New</option>
                      <option value="shortlisted">Shortlisted</option>
                      <option value="interview">Interview</option>
                      <option value="rejected">Rejected</option>
                    </select>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center justify-end gap-1">
                      <Link to={`/candidates/${c.id}`}
                        className="p-1.5 rounded-lg hover:bg-gray-700 text-gray-500 hover:text-primary-400 transition-colors">
                        <ChevronRight size={15} />
                      </Link>
                      <button onClick={() => handleDelete(c.id)}
                        className="p-1.5 rounded-lg hover:bg-red-500/10 text-gray-600 hover:text-red-400 transition-colors">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
