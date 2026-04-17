'use client'

import { useState } from 'react'
import Link from 'next/link'

type Step = 'request' | 'check-email' | 'reset'

export default function ResetPasswordPage() {
  const [step, setStep] = useState<Step>('request')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleRequest = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await fetch('/api/auth/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, action: 'request' }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Request failed')
      }

      setSuccess('Check your email for reset instructions')
      setStep('check-email')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await fetch('/api/auth/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          code,
          newPassword,
          action: 'reset',
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Reset failed')
      }

      setSuccess('Password reset successfully! Redirecting to login...')
      setTimeout(() => {
        window.location.href = '/auth/login'
      }, 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  if (step === 'request') {
    return (
      <form onSubmit={handleRequest} className="space-y-4">
        <h2 className="text-xl font-semibold text-white">Reset Password</h2>
        <p className="text-sm text-slate-400">
          Enter your email to receive reset instructions
        </p>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-rose-500"
            placeholder="your@email.com"
          />
        </div>

        {error && (
          <div className="p-3 bg-red-900/20 border border-red-500/30 rounded-lg">
            <p className="text-sm text-red-200">{error}</p>
          </div>
        )}

        {success && (
          <div className="p-3 bg-green-900/20 border border-green-500/30 rounded-lg">
            <p className="text-sm text-green-200">{success}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:bg-rose-600/50 text-white font-medium rounded-lg transition-colors"
        >
          {loading ? 'Sending...' : 'Send Reset Link'}
        </button>

        <Link href="/auth/login" className="block text-center text-sm text-slate-400 hover:text-slate-300">
          Back to login
        </Link>
      </form>
    )
  }

  return (
    <form onSubmit={handleReset} className="space-y-4">
      <h2 className="text-xl font-semibold text-white">Reset Password</h2>

      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">
          Reset Code
        </label>
        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          required
          className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-rose-500"
          placeholder="Code from email"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">
          New Password
        </label>
        <input
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
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

      {success && (
        <div className="p-3 bg-green-900/20 border border-green-500/30 rounded-lg">
          <p className="text-sm text-green-200">{success}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:bg-rose-600/50 text-white font-medium rounded-lg transition-colors"
      >
        {loading ? 'Resetting...' : 'Reset Password'}
      </button>
    </form>
  )
}
