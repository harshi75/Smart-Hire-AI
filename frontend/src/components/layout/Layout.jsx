import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import {
  LayoutDashboard, Users, Upload, Briefcase, BarChart2,
  GitCompare, LogOut, Zap, ChevronRight, Bell, Search
} from 'lucide-react'
import clsx from 'clsx'

const NAV = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/candidates', icon: Users, label: 'Candidates' },
  { to: '/upload', icon: Upload, label: 'Upload Resume' },
  { to: '/jobs', icon: Briefcase, label: 'Job Descriptions' },
  { to: '/analytics', icon: BarChart2, label: 'Analytics' },
  { to: '/compare', icon: GitCompare, label: 'Compare' },
]

export default function Layout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="flex h-screen bg-gray-950 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 flex flex-col border-r border-gray-800 bg-gray-900/60 backdrop-blur-xl shrink-0">
        {/* Logo */}
        <div className="p-5 border-b border-gray-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary-500 flex items-center justify-center glow">
              <Zap size={16} className="text-white" />
            </div>
            <div>
              <span className="font-bold text-white text-base tracking-tight">SmartHire</span>
              <span className="block text-[10px] text-gray-500 tracking-widest uppercase -mt-0.5">AI Platform</span>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          <p className="text-[10px] text-gray-600 font-semibold uppercase tracking-widest px-3 mb-2">Main Menu</p>
          {NAV.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => clsx('nav-item', isActive ? 'nav-item-active' : 'nav-item-inactive')}
            >
              <Icon size={16} />
              <span>{label}</span>
              {({ isActive }) => isActive ? <ChevronRight size={14} className="ml-auto text-primary-400" /> : null}
            </NavLink>
          ))}
        </nav>

        {/* User */}
        <div className="p-3 border-t border-gray-800">
          <div className="flex items-center gap-3 px-2 py-2 rounded-xl">
            <div className="w-8 h-8 rounded-full bg-primary-500/20 border border-primary-500/30 flex items-center justify-center text-primary-400 text-sm font-semibold">
              {user?.name?.[0]?.toUpperCase() || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{user?.name}</p>
              <p className="text-xs text-gray-500 truncate">{user?.email}</p>
            </div>
            <button onClick={handleLogout} className="text-gray-500 hover:text-red-400 transition-colors p-1 rounded-lg hover:bg-red-500/10">
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="h-14 border-b border-gray-800 px-6 flex items-center justify-between bg-gray-900/40 backdrop-blur-md shrink-0">
          <div className="flex items-center gap-3 flex-1 max-w-md">
            <Search size={15} className="text-gray-500" />
            <input
              placeholder="Search candidates, jobs..."
              className="bg-transparent text-sm text-gray-300 placeholder-gray-600 focus:outline-none w-full"
            />
          </div>
          <div className="flex items-center gap-2">
            <button className="relative p-2 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-white transition-colors">
              <Bell size={16} />
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-primary-500 rounded-full"></span>
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6 animate-in">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
