'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import AlertCard from '@/components/AlertCard'

interface Alert {
  type: 'low_balance' | 'high_expense' | 'unusual_activity'
  accountName: string
  message: string
  severity: 'info' | 'warning' | 'critical'
}

export default function InsightsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [loading, setLoading] = useState(true)
  const [summary, setSummary] = useState<any>(null)

  useEffect(() => {
    loadInsights()
  }, [])

  const loadInsights = async () => {
    try {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL || '',
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
      )

      // Get accounts with low balance
      const { data: accountsData } = await supabase
        .from('accounts')
        .select('id, name, balance, type')

      // Get summary
      const summaryRes = await fetch('/api/dashboard/summary')
      const summaryData = await summaryRes.json()

      if (summaryRes.ok) {
        setSummary(summaryData.summary)
      }

      // Generate alerts
      const generatedAlerts: Alert[] = []

      accountsData?.forEach((account) => {
        // Low balance alert
        if (account.balance < 500 && account.type !== 'credit') {
          generatedAlerts.push({
            type: 'low_balance',
            accountName: account.name,
            message: `Saldo baixo: ${new Intl.NumberFormat('pt-BR', {
              style: 'currency',
              currency: 'BRL',
            }).format(account.balance)}`,
            severity: account.balance < 100 ? 'critical' : 'warning',
          })
        }
      })

      // High expense alert (if applicable)
      if (summary?.totalExpense > 5000) {
        generatedAlerts.push({
          type: 'high_expense',
          accountName: 'Gastos do Mês',
          message: `Despesa elevada neste período: ${new Intl.NumberFormat(
            'pt-BR',
            { style: 'currency', currency: 'BRL' }
          ).format(summary.totalExpense)}`,
          severity: summary.totalExpense > 10000 ? 'critical' : 'warning',
        })
      }

      setAlerts(generatedAlerts)
      setLoading(false)
    } catch (err) {
      console.error('Load insights error:', err)
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white">Insights & Alertas</h2>

      {loading ? (
        <p className="text-slate-400">Carregando...</p>
      ) : alerts.length === 0 ? (
        <div className="p-8 text-center bg-slate-800 border border-slate-700 rounded-lg">
          <p className="text-slate-400">Nenhum alerta no momento</p>
          <p className="text-sm text-slate-500 mt-2">Seu fluxo de caixa está saudável! 🎉</p>
        </div>
      ) : (
        <div className="space-y-3">
          {alerts.map((alert, idx) => (
            <AlertCard
              key={idx}
              type={alert.type}
              accountName={alert.accountName}
              message={alert.message}
              severity={alert.severity}
            />
          ))}
        </div>
      )}

      {/* Quick Tips */}
      <div className="p-6 bg-slate-800 border border-slate-700 rounded-lg">
        <h3 className="text-lg font-semibold text-white mb-4">💡 Dicas</h3>
        <ul className="space-y-2 text-slate-300 text-sm">
          <li>• Mantenha um saldo mínimo de emergência em sua conta principal</li>
          <li>• Use categorias para rastrear seus gastos por tipo</li>
          <li>• Revise seus relatórios mensais para identificar padrões</li>
          <li>• Configure favoritos para suas contas mais usadas</li>
        </ul>
      </div>
    </div>
  )
}
