'use client'

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'

type Step = 'loading' | 'create-account' | 'success' | 'error'

export default function AcceptInvitePage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams.get('token') || ''
  const email = searchParams.get('email') || ''

  const [step, setStep] = useState<Step>('loading')
  const [error, setError] = useState('')
  const [formData, setFormData] = useState({
    email: email,
    password: '',
  })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (token && email) {
      // Move to create account step
      setStep('create-account')
    } else {
      setError('Invalid invite link')
      setStep('error')
    }
  }, [token, email])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      // First, create auth user
      const signupResponse = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          partnerEmail: null, // They're being invited, not inviting
        }),
      })

      const signupData = await signupResponse.json()

      if (!signupResponse.ok) {
        throw new Error(signupData.error || 'Signup failed')
      }

      // Then accept the invite
      const acceptResponse = await fetch('/api/invites/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          userId: signupData.userId || null,
        }),
      })

      const acceptData = await acceptResponse.json()

      if (!acceptResponse.ok) {
        throw new Error(acceptData.error || 'Failed to accept invite')
      }

      setStep('success')
      setTimeout(() => {
        router.push('/auth/login')
      }, 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      setStep('error')
    } finally {
      setLoading(false)
    }
  }

  if (step === 'loading') {
    return (
      <div className="space-y-4 text-center">
        <p className="text-slate-400">Loading invite...</p>
        <div className="inline-block">
          <div className="w-8 h-8 border-4 border-rose-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    )
  }

  if (step === 'create-account') {
    return (
      <form onSubmit={handleSubmit} className="space-y-4">
        <h2 className="text-xl font-semibold text-white">Join Account</h2>
        <p className="text-sm text-slate-400">
          Create your account to accept this invite
        </p>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Email
          </label>
          <input
            type="email"
            value={formData.email}
            disabled
            className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-400 cursor-not-allowed"
          />
          <p className="text-xs text-slate-400 mt-1">
            This email was invited
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Password
          </label>
          <input
            type="password"
            value={formData.password}
            onChange={(e) =>
              setFormData({ ...formData, password: e.target.value })
            }
            required
            minLength={8}
            className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-rose-500"
            placeholder="••••••••"
          />
        </div>

        {error && (
          <div className="p-3 bg-red-900/20 border border-red-500/30 rounded-lg">
            <p className="text-sm text-red-200">{error}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:bg-rose-600/50 text-white font-medium rounded-lg transition-colors"
        >
          {loading ? 'Creating account...' : 'Accept Invite'}
        </button>
      </form>
    )
  }

  if (step === 'success') {
    return (
      <div className="space-y-4 text-center">
        <div className="text-4xl">✓</div>
        <p className="text-green-200">Account created and invite accepted!</p>
        <p className="text-sm text-slate-400">
          Redirecting to login...
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4 text-center">
      <div className="p-4 bg-red-900/20 border border-red-500/30 rounded-lg">
        <p className="text-red-200">{error || 'Invalid invite'}</p>
      </div>
      <p className="text-sm text-slate-400">
        This invite link is invalid or has expired
      </p>
    </div>
  )
}
