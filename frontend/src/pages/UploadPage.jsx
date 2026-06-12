import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDropzone } from 'react-dropzone'
import { Upload, FileText, CheckCircle2, XCircle, Loader2, ChevronRight } from 'lucide-react'
import { candidatesAPI } from '../services/api'
import toast from 'react-hot-toast'
import clsx from 'clsx'

export default function UploadPage() {
  const navigate = useNavigate()
  const [files, setFiles] = useState([])
  const [uploading, setUploading] = useState(false)
  const [results, setResults] = useState([])

  const onDrop = useCallback((accepted) => {
    const newFiles = accepted.map(f => ({ file: f, status: 'pending', result: null, error: null }))
    setFiles(prev => [...prev, ...newFiles])
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'], 'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'], 'text/plain': ['.txt'] },
    maxSize: 10 * 1024 * 1024,
    onDropRejected: () => toast.error('File rejected. Max 10MB, PDF/DOCX/TXT only.'),
  })

  const uploadAll = async () => {
    const pending = files.filter(f => f.status === 'pending')
    if (!pending.length) return
    setUploading(true)
    const newResults = []

    for (let i = 0; i < pending.length; i++) {
      const item = pending[i]
      setFiles(prev => prev.map(f => f.file.name === item.file.name ? { ...f, status: 'uploading' } : f))
      try {
        const fd = new FormData()
        fd.append('file', item.file)
        const res = await candidatesAPI.upload(fd)
        setFiles(prev => prev.map(f => f.file.name === item.file.name ? { ...f, status: 'success', result: res.data } : f))
        newResults.push({ name: item.file.name, candidate: res.data, success: true })
      } catch (err) {
        const msg = err.response?.data?.detail || 'Upload failed'
        setFiles(prev => prev.map(f => f.file.name === item.file.name ? { ...f, status: 'error', error: msg } : f))
        newResults.push({ name: item.file.name, success: false, error: msg })
      }
    }
    setResults(newResults)
    setUploading(false)
    const successCount = newResults.filter(r => r.success).length
    if (successCount) toast.success(`${successCount} resume${successCount > 1 ? 's' : ''} uploaded successfully!`)
  }

  const removeFile = (name) => setFiles(prev => prev.filter(f => f.file.name !== name))
  const clearAll = () => { setFiles([]); setResults([]) }

  const pendingCount = files.filter(f => f.status === 'pending').length
  const successCount = files.filter(f => f.status === 'success').length

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-in">
      <div>
        <h1 className="text-2xl font-bold text-white">Upload Resumes</h1>
        <p className="text-gray-500 text-sm mt-1">Supports PDF, DOCX, and TXT files up to 10MB each</p>
      </div>

      {/* Drop zone */}
      <div
        {...getRootProps()}
        className={clsx(
          'border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all duration-300',
          isDragActive
            ? 'border-primary-500 bg-primary-500/10 scale-[1.01]'
            : 'border-gray-700 hover:border-primary-500/50 hover:bg-gray-800/30'
        )}
      >
        <input {...getInputProps()} />
        <div className={clsx('w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 transition-colors',
          isDragActive ? 'bg-primary-500' : 'bg-gray-800')}>
          <Upload size={24} className={isDragActive ? 'text-white' : 'text-gray-400'} />
        </div>
        {isDragActive
          ? <p className="text-primary-400 font-semibold text-lg">Drop files here!</p>
          : <>
              <p className="text-white font-semibold text-base mb-1">Drag & drop resumes here</p>
              <p className="text-gray-500 text-sm">or <span className="text-primary-400">browse files</span></p>
              <p className="text-gray-600 text-xs mt-3">PDF · DOCX · TXT · Max 10MB per file</p>
            </>
        }
      </div>

      {/* File list */}
      {files.length > 0 && (
        <div className="glass-card p-5 space-y-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-300">{files.length} file{files.length > 1 ? 's' : ''} selected</span>
            <button onClick={clearAll} className="text-xs text-gray-500 hover:text-red-400 transition-colors">Clear all</button>
          </div>

          {files.map(item => (
            <div key={item.file.name} className="flex items-center gap-3 p-3 rounded-xl bg-gray-800/50">
              <FileText size={18} className="text-primary-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{item.file.name}</p>
                <p className="text-xs text-gray-500">
                  {(item.file.size / 1024).toFixed(0)} KB
                  {item.result && ` · Parsed: ${item.result.name || 'Unknown'} · ${item.result.skills?.length || 0} skills`}
                  {item.error && ` · Error: ${item.error}`}
                </p>
              </div>
              <div className="shrink-0">
                {item.status === 'pending' && (
                  <button onClick={() => removeFile(item.file.name)} className="text-gray-600 hover:text-red-400 transition-colors">
                    <XCircle size={16} />
                  </button>
                )}
                {item.status === 'uploading' && <Loader2 size={16} className="animate-spin text-primary-400" />}
                {item.status === 'success' && <CheckCircle2 size={16} className="text-green-400" />}
                {item.status === 'error' && <XCircle size={16} className="text-red-400" />}
              </div>
            </div>
          ))}

          <div className="flex gap-3 pt-2">
            <button
              onClick={uploadAll}
              disabled={uploading || pendingCount === 0}
              className="btn-primary flex-1 flex items-center justify-center gap-2 py-2.5"
            >
              {uploading
                ? <><Loader2 size={16} className="animate-spin" /> Uploading…</>
                : <><Upload size={15} /> Upload {pendingCount > 0 ? `${pendingCount} file${pendingCount > 1 ? 's' : ''}` : ''}</>
              }
            </button>
            {successCount > 0 && (
              <button onClick={() => navigate('/candidates')} className="btn-ghost border border-gray-700 flex items-center gap-2 px-4">
                View candidates <ChevronRight size={14} />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Tips */}
      <div className="glass-card p-5">
        <h3 className="text-sm font-semibold text-gray-300 mb-3">What happens after upload?</h3>
        <div className="space-y-2">
          {[
            { step: '1', label: 'Resume is parsed', desc: 'Name, email, skills, education, experience extracted automatically' },
            { step: '2', label: 'Skills are detected', desc: 'AI identifies 60+ technical skills from the resume content' },
            { step: '3', label: 'Profile is created', desc: 'Structured candidate profile stored and ready for ranking' },
            { step: '4', label: 'Analysis available', desc: 'Match score, skill gap, roadmap, and interview questions on demand' },
          ].map(({ step, label, desc }) => (
            <div key={step} className="flex gap-3 items-start">
              <div className="w-5 h-5 rounded-full bg-primary-500/20 text-primary-400 text-xs flex items-center justify-center font-semibold shrink-0 mt-0.5">{step}</div>
              <div>
                <p className="text-sm font-medium text-gray-200">{label}</p>
                <p className="text-xs text-gray-500">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
