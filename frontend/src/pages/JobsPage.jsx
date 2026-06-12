import { useEffect, useState } from 'react'
import { Briefcase, Plus, Trash2, ChevronDown, ChevronUp, X } from 'lucide-react'
import { jobsAPI } from '../services/api'
import { EmptyState, Spinner } from '../components/ui'
import toast from 'react-hot-toast'
import clsx from 'clsx'

export default function JobsPage() {
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [expanded, setExpanded] = useState(null)
  const [form, setForm] = useState({ title: '', company: '', description: '' })
  const [saving, setSaving] = useState(false)

  const load = async () => {
    try {
      const res = await jobsAPI.list()
      setJobs(res.data)
    } catch { toast.error('Failed to load jobs') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!form.title.trim() || !form.description.trim()) { toast.error('Title and description are required'); return }
    setSaving(true)
    try {
      await jobsAPI.create(form)
      toast.success('Job description created')
      setForm({ title: '', company: '', description: '' })
      setShowForm(false)
      load()
    } catch { toast.error('Failed to create job') }
    finally { setSaving(false) }
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this job description?')) return
    try {
      await jobsAPI.delete(id)
      toast.success('Deleted')
      load()
    } catch { toast.error('Delete failed') }
  }

  return (
    <div className="space-y-5 animate-in max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Job Descriptions</h1>
          <p className="text-gray-500 text-sm mt-0.5">{jobs.length} job{jobs.length !== 1 ? 's' : ''} created</p>
        </div>
        <button onClick={() => setShowForm(s => !s)} className="btn-primary flex items-center gap-2">
          {showForm ? <X size={15} /> : <Plus size={15} />}
          {showForm ? 'Cancel' : 'New Job'}
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="glass-card p-6 animate-in">
          <h3 className="section-title">Create Job Description</h3>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Job Title *</label>
                <input className="input" placeholder="e.g. ML Engineer" value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required />
              </div>
              <div>
                <label className="label">Company</label>
                <input className="input" placeholder="e.g. Acme Corp" value={form.company}
                  onChange={e => setForm(f => ({ ...f, company: e.target.value }))} />
              </div>
            </div>
            <div>
              <label className="label">Job Description *</label>
              <textarea className="input min-h-[200px] resize-y" placeholder="Paste the full job description here. Required skills will be extracted automatically..."
                value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} required />
            </div>
            <div className="flex gap-3">
              <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2">
                {saving ? 'Creating…' : 'Create Job Description'}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="btn-ghost border border-gray-700">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Job list */}
      {loading ? (
        <div className="flex justify-center py-16"><Spinner size={24} /></div>
      ) : jobs.length === 0 ? (
        <EmptyState
          icon={Briefcase}
          title="No job descriptions yet"
          description="Create a job description to start matching and ranking candidates against it."
          action={<button onClick={() => setShowForm(true)} className="btn-primary text-sm">Create Job Description</button>}
        />
      ) : (
        <div className="space-y-3">
          {jobs.map(job => (
            <div key={job.id} className="glass-card overflow-hidden">
              <div className="flex items-center gap-4 p-4 cursor-pointer hover:bg-gray-800/30 transition-colors"
                onClick={() => setExpanded(expanded === job.id ? null : job.id)}>
                <div className="w-9 h-9 rounded-xl bg-primary-500/15 border border-primary-500/20 flex items-center justify-center shrink-0">
                  <Briefcase size={15} className="text-primary-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-white text-sm">{job.title}</p>
                  <p className="text-xs text-gray-500">{job.company || 'Company not specified'} · {job.required_skills?.length || 0} skills extracted</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-gray-600">{new Date(job.created_at).toLocaleDateString()}</span>
                  <button onClick={e => { e.stopPropagation(); handleDelete(job.id) }}
                    className="p-1.5 rounded-lg hover:bg-red-500/10 text-gray-600 hover:text-red-400 transition-colors">
                    <Trash2 size={13} />
                  </button>
                  {expanded === job.id ? <ChevronUp size={15} className="text-gray-500" /> : <ChevronDown size={15} className="text-gray-500" />}
                </div>
              </div>

              {expanded === job.id && (
                <div className="px-4 pb-4 space-y-4 border-t border-gray-800 pt-4">
                  {job.required_skills?.length > 0 && (
                    <div>
                      <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-2">Extracted Skills</p>
                      <div className="flex flex-wrap gap-1.5">
                        {job.required_skills.map(s => (
                          <span key={s} className="badge bg-primary-500/10 text-primary-300 border border-primary-500/20 text-xs">{s}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  <div>
                    <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-2">Description Preview</p>
                    <p className="text-sm text-gray-400 leading-relaxed line-clamp-4">{job.description}</p>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
