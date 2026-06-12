import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Zap, BookOpen, MessageSquare, ClipboardList, Send,
  Loader2, ChevronDown, ChevronUp, AlertTriangle, CheckCircle2,
  XCircle, RefreshCw, Trash2
} from 'lucide-react'
import { candidatesAPI, jobsAPI, analysisAPI, chatAPI } from '../services/api'
import { ScoreRing, ProgressBar, StatusBadge, SkillChip, SectionCard, Tabs, Spinner } from '../components/ui'
import toast from 'react-hot-toast'
import clsx from 'clsx'

const TABS = [
  { value: 'overview', label: 'Overview' },
  { value: 'rank', label: 'AI Ranking' },
  { value: 'gap', label: 'Skill Gap' },
  { value: 'roadmap', label: 'Roadmap' },
  { value: 'interview', label: 'Interview Qs' },
  { value: 'copilot', label: 'Copilot' },
]

export default function CandidateDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [candidate, setCandidate] = useState(null)
  const [jobs, setJobs] = useState([])
  const [selectedJob, setSelectedJob] = useState('')
  const [tab, setTab] = useState('overview')
  const [rankResult, setRankResult] = useState(null)
  const [gapResult, setGapResult] = useState(null)
  const [roadmapResult, setRoadmapResult] = useState(null)
  const [interviewResult, setInterviewResult] = useState(null)
  const [chatMessages, setChatMessages] = useState([])
  const [chatInput, setChatInput] = useState('')
  const [loading, setLoading] = useState({ page: true, rank: false, gap: false, roadmap: false, interview: false, chat: false })
  const [roadmapPlan, setRoadmapPlan] = useState('30_days')
  const [interviewDifficulty, setInterviewDifficulty] = useState('mixed')
  const chatEndRef = useRef(null)

  useEffect(() => {
    Promise.all([candidatesAPI.get(id), jobsAPI.list()])
      .then(([cRes, jRes]) => {
        setCandidate(cRes.data)
        setJobs(jRes.data)
        if (jRes.data.length > 0) setSelectedJob(String(jRes.data[0].id))
      })
      .catch(() => toast.error('Failed to load candidate'))
      .finally(() => setLoading(l => ({ ...l, page: false })))
  }, [id])

  useEffect(() => {
    if (tab === 'copilot' && chatMessages.length === 0) {
      chatAPI.history(id).then(res => setChatMessages(res.data)).catch(() => {})
    }
  }, [tab])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages])

  const setLoad = (key, val) => setLoading(l => ({ ...l, [key]: val }))

  const doRank = async () => {
    if (!selectedJob) { toast.error('Select a job description first'); return }
    setLoad('rank', true)
    try {
      const res = await analysisAPI.rank(Number(id), Number(selectedJob))
      setRankResult(res.data)
      toast.success('Ranking complete')
    } catch { toast.error('Ranking failed') }
    finally { setLoad('rank', false) }
  }

  const doGap = async () => {
    if (!selectedJob) { toast.error('Select a job first'); return }
    setLoad('gap', true)
    try {
      const res = await analysisAPI.skillGap(Number(id), Number(selectedJob))
      setGapResult(res.data)
    } catch { toast.error('Skill gap analysis failed') }
    finally { setLoad('gap', false) }
  }

  const doRoadmap = async () => {
    if (!selectedJob) { toast.error('Select a job first'); return }
    setLoad('roadmap', true)
    try {
      const res = await analysisAPI.roadmap(Number(id), Number(selectedJob))
      setRoadmapResult(res.data)
    } catch { toast.error('Roadmap generation failed') }
    finally { setLoad('roadmap', false) }
  }

  const doInterview = async () => {
    if (!selectedJob) { toast.error('Select a job first'); return }
    setLoad('interview', true)
    try {
      const res = await analysisAPI.interviewQuestions({ candidate_id: Number(id), job_description_id: Number(selectedJob), difficulty: interviewDifficulty })
      setInterviewResult(res.data)
    } catch { toast.error('Interview question generation failed') }
    finally { setLoad('interview', false) }
  }

  const sendChat = async () => {
    if (!chatInput.trim() || loading.chat) return
    const msg = chatInput.trim()
    setChatInput('')
    setChatMessages(prev => [...prev, { role: 'user', message: msg }])
    setLoad('chat', true)
    try {
      const res = await chatAPI.send(Number(id), msg)
      setChatMessages(prev => [...prev, { role: 'assistant', message: res.data.response }])
    } catch { toast.error('Chat failed') }
    finally { setLoad('chat', false) }
  }

  const clearChat = async () => {
    await chatAPI.clearHistory(id)
    setChatMessages([])
    toast.success('Chat cleared')
  }

  if (loading.page) return <div className="flex justify-center pt-20"><Spinner size={28} /></div>
  if (!candidate) return <div className="text-center pt-20 text-gray-500">Candidate not found</div>

  const jobSelector = (
    <select value={selectedJob} onChange={e => setSelectedJob(e.target.value)}
      className="bg-gray-800 border border-gray-700 rounded-xl text-sm text-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500">
      <option value="">— Select Job —</option>
      {jobs.map(j => <option key={j.id} value={j.id}>{j.title} {j.company ? `@ ${j.company}` : ''}</option>)}
    </select>
  )

  return (
    <div className="space-y-5 animate-in max-w-5xl">
      {/* Header */}
      <div className="flex items-start gap-4">
        <button onClick={() => navigate('/candidates')} className="btn-ghost p-2 mt-0.5">
          <ArrowLeft size={16} />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="w-12 h-12 rounded-2xl bg-primary-500/15 border border-primary-500/20 flex items-center justify-center text-primary-400 font-bold text-xl">
              {candidate.name?.[0]?.toUpperCase() || '?'}
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">{candidate.name || 'Unknown Candidate'}</h1>
              <p className="text-gray-500 text-sm">{candidate.email} {candidate.phone ? `· ${candidate.phone}` : ''}</p>
            </div>
            <StatusBadge status={candidate.status} />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs tabs={TABS} active={tab} onChange={setTab} />

      {/* Job selector */}
      {tab !== 'overview' && tab !== 'copilot' && (
        <div className="flex items-center gap-3 p-4 glass-card">
          <span className="text-sm text-gray-400">Comparing against:</span>
          {jobSelector}
          {jobs.length === 0 && (
            <span className="text-xs text-yellow-400">No job descriptions — <a href="/jobs" className="underline">add one</a></span>
          )}
        </div>
      )}

      {/* ── OVERVIEW ── */}
      {tab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 space-y-5">
            <SectionCard title="Skills Detected">
              <div className="flex flex-wrap gap-2">
                {candidate.skills?.length > 0
                  ? candidate.skills.map(s => <SkillChip key={s} skill={s} />)
                  : <p className="text-gray-600 text-sm">No skills detected</p>}
              </div>
            </SectionCard>
            {candidate.experience?.length > 0 && (
              <SectionCard title="Experience">
                <ul className="space-y-2">
                  {candidate.experience.map((e, i) => (
                    <li key={i} className="text-sm text-gray-300 flex gap-2 items-start">
                      <span className="text-primary-400 mt-1">▸</span> {e.title}
                    </li>
                  ))}
                </ul>
              </SectionCard>
            )}
            {candidate.projects?.length > 0 && (
              <SectionCard title="Projects">
                <ul className="space-y-2">
                  {candidate.projects.map((p, i) => (
                    <li key={i} className="text-sm text-gray-300 flex gap-2 items-start">
                      <span className="text-primary-400 mt-1">▸</span> {p.description}
                    </li>
                  ))}
                </ul>
              </SectionCard>
            )}
          </div>
          <div className="space-y-5">
            <SectionCard title="Education">
              {candidate.education?.length > 0
                ? candidate.education.map((e, i) => <p key={i} className="text-sm text-gray-300 mb-1">{e.degree}</p>)
                : <p className="text-sm text-gray-600">Not extracted</p>}
            </SectionCard>
            <SectionCard title="Certifications">
              {candidate.certifications?.length > 0
                ? candidate.certifications.map((c, i) => (
                    <p key={i} className="text-xs text-gray-300 mb-1 bg-gray-800 px-2 py-1 rounded-lg">{c}</p>
                  ))
                : <p className="text-sm text-gray-600">None found</p>}
            </SectionCard>
            <SectionCard>
              <div className="text-sm text-gray-400">
                <div className="flex justify-between mb-1"><span>Parse confidence</span><span>{Math.round((candidate.parse_confidence || 0) * 100)}%</span></div>
                <ProgressBar value={(candidate.parse_confidence || 0) * 100} color="#6C63FF" />
              </div>
            </SectionCard>
          </div>
        </div>
      )}

      {/* ── RANKING ── */}
      {tab === 'rank' && (
        <div className="space-y-5">
          <div className="flex gap-3">
            <button onClick={doRank} disabled={loading.rank || !selectedJob} className="btn-primary flex items-center gap-2">
              {loading.rank ? <><Loader2 size={15} className="animate-spin" /> Analysing…</> : <><Zap size={15} /> Run AI Ranking</>}
            </button>
          </div>
          {rankResult && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="glass-card p-4 flex flex-col items-center">
                  <ScoreRing score={rankResult.match_score} size={90} label="Match Score" />
                </div>
                <div className="glass-card p-4 flex flex-col items-center">
                  <ScoreRing score={rankResult.skill_match_score} size={90} label="Skill Match" />
                </div>
                <div className="glass-card p-4 flex flex-col items-center">
                  <ScoreRing score={rankResult.semantic_score} size={90} label="Semantic" />
                </div>
                <div className="glass-card p-4 flex flex-col items-center">
                  <ScoreRing score={rankResult.hiring_probability} size={90} label="Hire Probability" />
                </div>
              </div>

              {rankResult.ai_summary && (
                <SectionCard title="AI Summary">
                  <p className="text-sm text-gray-300 leading-relaxed border-l-2 border-primary-500 pl-3">{rankResult.ai_summary}</p>
                </SectionCard>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <SectionCard title="Matching Skills">
                  <div className="flex flex-wrap gap-2">
                    {rankResult.matching_skills?.map(s => <SkillChip key={s} skill={s} matched={true} />) || <p className="text-gray-600 text-sm">None</p>}
                  </div>
                </SectionCard>
                <SectionCard title="Missing Skills">
                  <div className="flex flex-wrap gap-2">
                    {rankResult.missing_skills?.map(s => <SkillChip key={s} skill={s} matched={false} />) || <p className="text-gray-600 text-sm">None</p>}
                  </div>
                </SectionCard>
                <SectionCard title="Strengths">
                  <ul className="space-y-1.5">
                    {rankResult.strengths?.map((s, i) => (
                      <li key={i} className="flex gap-2 items-start text-sm text-gray-300">
                        <CheckCircle2 size={14} className="text-green-400 mt-0.5 shrink-0" /> {s}
                      </li>
                    ))}
                  </ul>
                </SectionCard>
                <SectionCard title="Weaknesses">
                  <ul className="space-y-1.5">
                    {rankResult.weaknesses?.map((w, i) => (
                      <li key={i} className="flex gap-2 items-start text-sm text-gray-300">
                        <XCircle size={14} className="text-red-400 mt-0.5 shrink-0" /> {w}
                      </li>
                    ))}
                  </ul>
                </SectionCard>
              </div>

              {rankResult.red_flags?.length > 0 && (
                <SectionCard title="Red Flags">
                  <div className="space-y-2">
                    {rankResult.red_flags.map((f, i) => (
                      <div key={i} className="flex gap-2 items-start p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                        <AlertTriangle size={15} className="text-red-400 mt-0.5 shrink-0" />
                        <span className="text-sm text-red-300">{f}</span>
                      </div>
                    ))}
                  </div>
                </SectionCard>
              )}

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: 'Experience', val: rankResult.experience_score },
                  { label: 'Education', val: rankResult.education_score },
                  { label: 'Semantic Fit', val: rankResult.semantic_score },
                  { label: 'Skill Match', val: rankResult.skill_match_score },
                ].map(({ label, val }) => (
                  <div key={label} className="glass-card p-3">
                    <p className="text-xs text-gray-500 mb-1.5">{label}</p>
                    <ProgressBar value={val} />
                    <p className="text-right text-xs text-gray-400 mt-1">{val}%</p>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* ── SKILL GAP ── */}
      {tab === 'gap' && (
        <div className="space-y-5">
          <button onClick={doGap} disabled={loading.gap || !selectedJob} className="btn-primary flex items-center gap-2">
            {loading.gap ? <><Loader2 size={15} className="animate-spin" /> Analysing…</> : 'Analyse Skill Gap'}
          </button>
          {gapResult && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <SectionCard title="Required Skills">
                  <div className="flex flex-wrap gap-2">
                    {gapResult.required_skills?.map(s => (
                      <SkillChip key={s} skill={s} matched={gapResult.candidate_skills?.includes(s)} />
                    ))}
                  </div>
                </SectionCard>
                <SectionCard title="Missing Skills">
                  <div className="flex flex-wrap gap-2">
                    {gapResult.missing_skills?.length > 0
                      ? gapResult.missing_skills.map(s => <SkillChip key={s} skill={s} matched={false} />)
                      : <p className="text-green-400 text-sm flex items-center gap-1"><CheckCircle2 size={14} /> All required skills matched!</p>}
                  </div>
                </SectionCard>
              </div>
              {gapResult.learning_path?.length > 0 && (
                <SectionCard title="Recommended Learning Path">
                  <div className="space-y-3">
                    {gapResult.learning_path.map((item, i) => (
                      <div key={i} className="flex gap-3 p-3 bg-gray-800/50 rounded-xl">
                        <div className="w-6 h-6 rounded-full bg-primary-500/20 text-primary-400 text-xs flex items-center justify-center font-semibold shrink-0 mt-0.5">{i + 1}</div>
                        <div>
                          <p className="text-sm font-medium text-white">{item.skill}</p>
                          <p className="text-xs text-gray-400">{item.resource}</p>
                          <p className="text-xs text-gray-600 mt-0.5">⏱ {item.time}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </SectionCard>
              )}
            </>
          )}
        </div>
      )}

      {/* ── ROADMAP ── */}
      {tab === 'roadmap' && (
        <div className="space-y-5">
          <button onClick={doRoadmap} disabled={loading.roadmap || !selectedJob} className="btn-primary flex items-center gap-2">
            {loading.roadmap ? <><Loader2 size={15} className="animate-spin" /> Generating…</> : <><BookOpen size={15} /> Generate Roadmap</>}
          </button>
          {roadmapResult && (
            <>
              {roadmapResult.summary && (
                <div className="p-4 bg-primary-500/10 border border-primary-500/20 rounded-2xl text-sm text-primary-200 leading-relaxed">
                  {roadmapResult.summary}
                </div>
              )}
              <div className="flex gap-1 p-1 bg-gray-900 border border-gray-800 rounded-xl w-fit">
                {[{ key: '30_days', label: '30 Days' }, { key: '60_days', label: '60 Days' }, { key: '90_days', label: '90 Days' }].map(({ key, label }) => (
                  <button key={key} onClick={() => setRoadmapPlan(key)}
                    className={clsx('px-4 py-1.5 rounded-lg text-sm font-medium transition-all',
                      roadmapPlan === key ? 'bg-primary-500 text-white' : 'text-gray-400 hover:text-white')}>
                    {label}
                  </button>
                ))}
              </div>
              <div className="space-y-3">
                {(roadmapResult[roadmapPlan] || []).map((week, i) => (
                  <div key={i} className="glass-card p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-8 h-8 rounded-full bg-primary-500 flex items-center justify-center text-white text-sm font-bold shrink-0">{week.week}</div>
                      <div>
                        <p className="font-semibold text-white text-sm">Week {week.week}: {week.focus}</p>
                        {week.hours && <p className="text-xs text-gray-500">{week.hours} hours estimated</p>}
                      </div>
                    </div>
                    <ul className="space-y-1.5 ml-11">
                      {week.tasks?.map((task, j) => (
                        <li key={j} className="text-sm text-gray-300 flex gap-2 items-start">
                          <span className="text-primary-400 mt-0.5 shrink-0">▸</span> {task}
                        </li>
                      ))}
                    </ul>
                    {week.resources?.length > 0 && (
                      <div className="ml-11 mt-2 flex flex-wrap gap-1">
                        {week.resources.map((r, j) => (
                          <span key={j} className="text-xs bg-gray-800 text-gray-400 px-2 py-0.5 rounded-lg border border-gray-700">{r}</span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* ── INTERVIEW QUESTIONS ── */}
      {tab === 'interview' && (
        <div className="space-y-5">
          <div className="flex gap-3 items-center flex-wrap">
            <select value={interviewDifficulty} onChange={e => setInterviewDifficulty(e.target.value)}
              className="bg-gray-800 border border-gray-700 rounded-xl text-sm text-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500">
              <option value="mixed">Mixed Difficulty</option>
              <option value="easy">Easy Only</option>
              <option value="medium">Medium Only</option>
              <option value="hard">Hard Only</option>
            </select>
            <button onClick={doInterview} disabled={loading.interview || !selectedJob} className="btn-primary flex items-center gap-2">
              {loading.interview ? <><Loader2 size={15} className="animate-spin" /> Generating…</> : <><ClipboardList size={15} /> Generate Questions</>}
            </button>
          </div>
          {interviewResult && (
            <div className="space-y-5">
              {[
                { key: 'technical', label: 'Technical Questions' },
                { key: 'behavioral', label: 'Behavioral Questions' },
                { key: 'project', label: 'Project Questions' },
              ].map(({ key, label }) => (
                interviewResult[key]?.length > 0 && (
                  <SectionCard key={key} title={label}>
                    <div className="space-y-3">
                      {interviewResult[key].map((q, i) => (
                        <div key={i} className="p-3 bg-gray-800/50 rounded-xl">
                          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                            <span className={clsx('badge text-xs',
                              q.difficulty === 'Easy' ? 'bg-green-500/15 text-green-400 border border-green-500/20' :
                              q.difficulty === 'Medium' ? 'bg-yellow-500/15 text-yellow-400 border border-yellow-500/20' :
                              'bg-red-500/15 text-red-400 border border-red-500/20'
                            )}>{q.difficulty}</span>
                            {q.topic && <span className="text-xs text-gray-500">• {q.topic}</span>}
                          </div>
                          <p className="text-sm text-gray-200">{q.question}</p>
                        </div>
                      ))}
                    </div>
                  </SectionCard>
                )
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── COPILOT CHAT ── */}
      {tab === 'copilot' && (
        <div className="glass-card flex flex-col" style={{ height: '520px' }}>
          <div className="flex items-center justify-between px-5 py-3 border-b border-gray-800">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse-slow" />
              <span className="text-sm font-medium text-white">Recruiter Copilot — {candidate.name}</span>
            </div>
            <button onClick={clearChat} className="btn-ghost p-1.5 text-xs flex items-center gap-1">
              <Trash2 size={12} /> Clear
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {chatMessages.length === 0 && (
              <div className="text-center py-8">
                <MessageSquare size={28} className="text-gray-700 mx-auto mb-3" />
                <p className="text-gray-600 text-sm">Ask anything about this candidate</p>
                <div className="flex flex-wrap gap-2 justify-center mt-4">
                  {["Summarize this candidate", "What ML projects did they do?", "Any red flags?", "Best role for them?"].map(q => (
                    <button key={q} onClick={() => setChatInput(q)}
                      className="text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 px-3 py-1.5 rounded-full border border-gray-700 transition-colors">
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {chatMessages.map((m, i) => (
              <div key={i} className={clsx('flex', m.role === 'user' ? 'justify-end' : 'justify-start')}>
                <div className={clsx('max-w-[80%] px-4 py-2.5 rounded-2xl text-sm',
                  m.role === 'user'
                    ? 'bg-primary-500 text-white rounded-br-sm'
                    : 'bg-gray-800 text-gray-200 rounded-bl-sm border border-gray-700'
                )}>
                  {m.message || m.content}
                </div>
              </div>
            ))}
            {loading.chat && (
              <div className="flex justify-start">
                <div className="bg-gray-800 border border-gray-700 px-4 py-2.5 rounded-2xl rounded-bl-sm">
                  <div className="flex gap-1 items-center h-5">
                    {[0, 1, 2].map(i => (
                      <div key={i} className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                    ))}
                  </div>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>
          <div className="px-5 py-3 border-t border-gray-800">
            <div className="flex gap-2">
              <input
                className="input py-2 text-sm flex-1"
                placeholder="Ask about skills, experience, projects…"
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && sendChat()}
              />
              <button onClick={sendChat} disabled={loading.chat || !chatInput.trim()}
                className="btn-primary px-4 flex items-center gap-1.5">
                <Send size={15} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
