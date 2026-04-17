'use client'

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'

export default function ConfirmEmailPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const email = searchParams.get('email') || ''
  const [status, setStatus] = useState<'pending' | 'confirming' | 'success' | 'error'>('pending')
  const [error, setError] = useState('')

  useEffect(() => {
    const confirmEmail = async () => {
      if (!email) return

      setStatus('confirming')

      try {
        const response = await fetch('/api/auth/confirm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email }),
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Confirmation failed')
        }

        setStatus('success')
        setTimeout(() => {
          router.push('/auth/login')
        }, 3000)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred')
        setStatus('error')
      }
    }

    if (email) {
      confirmEmail()
    }
  }, [email, router])

  return (
    <div className="space-y-4 text-center">
      <h2 className="text-xl font-semibold text-white">
        Confirming Your Email
      </h2>

      {status === 'pending' && (
        <p className="text-slate-400">Loading...</p>
      )}

      {status === 'confirming' && (
        <div className="space-y-4">
          <div className="inline-block">
            <div className="w-8 h-8 border-4 border-rose-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
          <p className="text-slate-400">Confirming your email...</p>
        </div>
      )}

      {status === 'success' && (
        <div className="space-y-4">
          <div className="text-4xl">✓</div>
          <p className="text-green-200">Email confirmed successfully!</p>
          <p className="text-sm text-slate-400">
            Redirecting to login...
          </p>
        </div>
      )}

      {status === 'error' && (
        <div className="space-y-4">
          <div className="p-4 bg-red-900/20 border border-red-500/30 rounded-lg">
            <p className="text-red-200">{error}</p>
          </div>
          <p className="text-sm text-slate-400">
            Please try signing up again or contact support
          </p>
        </div>
      )}
    </div>
  )
}
