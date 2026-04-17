'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import type { Couple, User } from '@/types'

export default function DashboardPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [couple, setCouple] = useState<Couple | null>(null)
  const [viewMode, setViewMode] = useState<'primary' | 'secondary'>('primary')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const loadSession = async () => {
      try {
        const supabase = createBrowserClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL || '',
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
        )

        // Get current user
        const { data: authData, error: authError } = await supabase.auth.getUser()

        if (authError || !authData.user) {
          router.push('/auth/login')
          return
        }

        setUser({
          id: authData.user.id,
          email: authData.user.email || '',
          email_confirmed_at: authData.user.email_confirmed_at,
          created_at: authData.user.created_at,
        })

        // Get couple info
        const { data: coupleData, error: coupleError } = await supabase
          .from('couples')
          .select('*')
          .or(`primary_user_id.eq.${authData.user.id},secondary_user_id.eq.${authData.user.id}`)
          .single()

        if (coupleError) {
          setError('Failed to load couple data')
          return
        }

        setCouple(coupleData)

        // Set view mode based on user role
        if (coupleData.primary_user_id === authData.user.id) {
          setViewMode('primary')
        } else {
          setViewMode('secondary')
        }

        setLoading(false)
      } catch (err) {
        console.error('Load session error:', err)
        setError('An error occurred')
        setLoading(false)
      }
    }

    loadSession()
  }, [router])

  const handleLogout = async () => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
    )

    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    )
  }

  if (error || !user || !couple) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-200 mb-4">{error || 'Failed to load dashboard'}</p>
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg"
          >
            Return to Login
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      {/* Header */}
      <header className="border-b border-slate-700 bg-slate-800/50">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-white">
            Theo<span className="text-rose-500">Finance</span>
          </h1>

          <div className="flex items-center gap-6">
            {/* View Mode Toggle */}
            {couple.secondary_user_id && (
              <div className="flex items-center gap-3 bg-slate-700 rounded-lg p-2">
                <button
                  onClick={() => setViewMode('primary')}
                  className={`px-3 py-1 rounded transition-colors ${
                    viewMode === 'primary'
                      ? 'bg-rose-600 text-white'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  {couple.primary_user_email.split('@')[0]}
                </button>
                <div className="w-px h-6 bg-slate-600"></div>
                <button
                  onClick={() => setViewMode('secondary')}
                  className={`px-3 py-1 rounded transition-colors ${
                    viewMode === 'secondary'
                      ? 'bg-rose-600 text-white'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  {couple.secondary_user_email?.split('@')[0] || 'Partner'}
                </button>
              </div>
            )}

            {/* User Menu */}
            <div className="flex items-center gap-4">
              <span className="text-sm text-slate-400">{user.email}</span>
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Welcome Card */}
          <div className="md:col-span-3 p-6 bg-slate-800 border border-slate-700 rounded-lg">
            <h2 className="text-xl font-semibold text-white mb-2">
              Welcome back!
            </h2>
            <p className="text-slate-400">
              You're viewing as <span className="text-rose-500 font-medium">
                {viewMode === 'primary' ? couple.primary_user_email : couple.secondary_user_email || 'Partner'}
              </span>
            </p>
          </div>

          {/* Placeholder Cards */}
          <div className="p-6 bg-slate-800 border border-slate-700 rounded-lg">
            <h3 className="text-lg font-semibold text-white mb-4">Accounts</h3>
            <p className="text-slate-400 text-sm">Coming soon...</p>
          </div>

          <div className="p-6 bg-slate-800 border border-slate-700 rounded-lg">
            <h3 className="text-lg font-semibold text-white mb-4">Recent Transactions</h3>
            <p className="text-slate-400 text-sm">Coming soon...</p>
          </div>

          <div className="p-6 bg-slate-800 border border-slate-700 rounded-lg">
            <h3 className="text-lg font-semibold text-white mb-4">Analytics</h3>
            <p className="text-slate-400 text-sm">Coming soon...</p>
          </div>
        </div>
      </main>
    </div>
  )
}
