import { useEffect, useState } from 'react'
import { GitCompare, Plus, X, Zap, Loader2, CheckCircle2, XCircle } from 'lucide-react'
import { candidatesAPI, jobsAPI, analysisAPI } from '../services/api'
import { ScoreRing, ProgressBar, SkillChip, Spinner } from '../components/ui'
import toast from 'react-hot-toast'

export default function ComparePage() {
  const [candidates, setCandidates] = useState([])
  const [jobs, setJobs] = useState([])
  const [selectedIds, setSelectedIds] = useState([])
  const [selectedJob, setSelectedJob] = useState('')
  const [results, setResults] = useState(null)
  const [loading, setLoading] = useState({ page: true, compare: false })

  useEffect(() => {
    Promise.all([candidatesAPI.list(), jobsAPI.list()])
      .then(([cRes, jRes]) => {
        setCandidates(cRes.data)
        setJobs(jRes.data)
        if (jRes.data.length > 0) setSelectedJob(String(jRes.data[0].id))
      })
      .finally(() => setLoading(l => ({ ...l, page: false })))
  }, [])

  const toggleCandidate = (id) => {
    setSelectedIds(prev => {
      if (prev.includes(id)) return prev.filter(i => i !== id)
      if (prev.length >= 5) { toast.error('Max 5 candidates at a time'); return prev }
      return [...prev, id]
    })
  }

  const handleCompare = async () => {
    if (selectedIds.length < 2) { toast.error('Select at least 2 candidates'); return }
    if (!selectedJob) { toast.error('Select a job description'); return }
    setLoading(l => ({ ...l, compare: true }))
    setResults(null)
    try {
      const res = await analysisAPI.compare(selectedIds, Number(selectedJob))
      setResults(res.data)
    } catch { toast.error('Comparison failed') }
    finally { setLoading(l => ({ ...l, compare: false })) }
  }

  if (loading.page) return <div className="flex justify-center pt-20"><Spinner size={28} /></div>

  const compArr = results?.comparisons || []
  const allSkills = compArr.length > 0
    ? [...new Set(compArr.flatMap(c => [...(c.matching_skills || []), ...(c.missing_skills || [])]))]
    : []

  return (
    <div className="space-y-6 animate-in">
      <div>
        <h1 className="text-2xl font-bold text-white">Compare Candidates</h1>
        <p className="text-gray-500 text-sm mt-0.5">Side-by-side analysis for a job role</p>
      </div>

      {/* Setup */}
      <div className="glass-card p-5 space-y-4">
        <div className="flex items-center gap-4 flex-wrap">
          <div>
            <label className="label text-xs">Job Description</label>
            <select value={selectedJob} onChange={e => setSelectedJob(e.target.value)}
              className="bg-gray-800 border border-gray-700 rounded-xl text-sm text-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500">
              <option value="">— Select job —</option>
              {jobs.map(j => <option key={j.id} value={j.id}>{j.title}{j.company ? ` @ ${j.company}` : ''}</option>)}
            </select>
          </div>
          <div className="flex-1">
            <label className="label text-xs">Select Candidates (2–5)</label>
            <div className="flex flex-wrap gap-2">
              {candidates.map(c => (
                <button key={c.id} onClick={() => toggleCandidate(c.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
                    selectedIds.includes(c.id)
                      ? 'bg-primary-500/20 border-primary-500/40 text-primary-300'
                      : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-white'
                  }`}>
                  {selectedIds.includes(c.id) ? <CheckCircle2 size={11} /> : <Plus size={11} />}
                  {c.name || `Candidate #${c.id}`}
                </button>
              ))}
              {candidates.length === 0 && <p className="text-xs text-gray-600">No candidates yet</p>}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-500">{selectedIds.length} selected</span>
          <button onClick={handleCompare} disabled={loading.compare || selectedIds.length < 2 || !selectedJob}
            className="btn-primary flex items-center gap-2">
            {loading.compare ? <><Loader2 size={15} className="animate-spin" /> Comparing…</> : <><GitCompare size={15} /> Compare</>}
          </button>
          {selectedIds.length > 0 && (
            <button onClick={() => setSelectedIds([])} className="btn-ghost flex items-center gap-1 text-sm">
              <X size={13} /> Clear
            </button>
          )}
        </div>
      </div>

      {/* Results */}
      {compArr.length > 0 && (
        <div className="space-y-6">
          {/* Score comparison */}
          <div className="glass-card p-5">
            <h3 className="section-title">Match Score Comparison — {results.job?.title}</h3>
            <div className="flex gap-6 overflow-x-auto pb-2">
              {compArr.map((c, i) => (
                <div key={c.candidate_id} className="flex flex-col items-center gap-2 min-w-[120px]">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm border ${
                    i === 0 ? 'bg-yellow-500/20 border-yellow-500/30 text-yellow-400' : 'bg-primary-500/15 border-primary-500/20 text-primary-400'
                  }`}>
                    {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                  </div>
                  <ScoreRing score={c.match_score} size={80} />
                  <p className="text-xs text-white font-medium text-center">{c.name}</p>
                  <p className="text-xs text-gray-500">{c.skills?.length || 0} skills</p>
                </div>
              ))}
            </div>
          </div>

          {/* Detailed metrics */}
          <div className="glass-card p-5 overflow-x-auto">
            <h3 className="section-title">Detailed Metrics</h3>
            <table className="w-full min-w-[500px]">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="text-left text-xs text-gray-500 font-medium py-2 pr-4">Metric</th>
                  {compArr.map(c => (
                    <th key={c.candidate_id} className="text-center text-xs text-gray-300 font-medium py-2 px-2">{c.name?.split(' ')[0]}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/50">
                {[
                  { label: 'Match Score', key: 'match_score' },
                  { label: 'Skill Match', key: 'skill_match_score' },
                  { label: 'Semantic Fit', key: 'semantic_score' },
                  { label: 'Experience', key: 'experience_score' },
                  { label: 'Education', key: 'education_score' },
                  { label: 'Hire Probability', key: 'hiring_probability' },
                ].map(({ label, key }) => {
                  const vals = compArr.map(c => c[key] || 0)
                  const maxVal = Math.max(...vals)
                  return (
                    <tr key={key}>
                      <td className="text-sm text-gray-400 py-3 pr-4">{label}</td>
                      {compArr.map(c => (
                        <td key={c.candidate_id} className="py-3 px-2">
                          <div className="flex flex-col items-center gap-1">
                            <span className={`text-sm font-semibold ${c[key] === maxVal ? 'text-green-400' : 'text-gray-300'}`}>
                              {c[key] || 0}%
                            </span>
                            <div className="w-16">
                              <ProgressBar value={c[key] || 0} color={c[key] === maxVal ? '#22c55e' : '#6C63FF'} />
                            </div>
                          </div>
                        </td>
                      ))}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Skills comparison */}
          {allSkills.length > 0 && (
            <div className="glass-card p-5 overflow-x-auto">
              <h3 className="section-title">Skills Matrix</h3>
              <table className="w-full min-w-[400px]">
                <thead>
                  <tr className="border-b border-gray-800">
                    <th className="text-left text-xs text-gray-500 font-medium py-2 pr-4">Skill</th>
                    {compArr.map(c => (
                      <th key={c.candidate_id} className="text-center text-xs text-gray-300 font-medium py-2 px-3">{c.name?.split(' ')[0]}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/50">
                  {allSkills.slice(0, 20).map(skill => (
                    <tr key={skill}>
                      <td className="text-sm text-gray-300 py-2.5 pr-4">{skill}</td>
                      {compArr.map(c => {
                        const has = c.matching_skills?.includes(skill) || c.skills?.some(s => s.toLowerCase() === skill.toLowerCase())
                        return (
                          <td key={c.candidate_id} className="text-center py-2.5 px-3">
                            {has
                              ? <CheckCircle2 size={15} className="text-green-400 mx-auto" />
                              : <XCircle size={15} className="text-red-500/50 mx-auto" />}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Strengths/Weaknesses side by side */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {compArr.map((c, i) => (
              <div key={c.candidate_id} className="glass-card p-4">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-lg">{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i+1}`}</span>
                  <p className="font-semibold text-white text-sm">{c.name}</p>
                </div>
                <div className="space-y-2">
                  {c.strengths?.slice(0, 3).map((s, j) => (
                    <div key={j} className="flex gap-2 text-xs text-gray-300 items-start">
                      <CheckCircle2 size={11} className="text-green-400 mt-0.5 shrink-0" /> {s}
                    </div>
                  ))}
                  {c.weaknesses?.slice(0, 2).map((w, j) => (
                    <div key={j} className="flex gap-2 text-xs text-gray-400 items-start">
                      <XCircle size={11} className="text-red-400 mt-0.5 shrink-0" /> {w}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
