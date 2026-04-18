'use client'

import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import type { Conversation, ConversationMessage } from '@/types'

export default function ChatPage() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeConv, setActiveConv] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<ConversationMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [showNewModal, setShowNewModal] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    loadConversations()
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const loadConversations = async () => {
    const res = await fetch('/api/conversations')
    const data = await res.json()
    setConversations(data.conversations || [])
  }

  const loadMessages = async (convId: string) => {
    const res = await fetch(`/api/conversations/${convId}/messages`)
    const data = await res.json()
    setMessages(data.messages || [])
  }

  const handleSelectConv = (conv: Conversation) => {
    setActiveConv(conv)
    loadMessages(conv.id)
  }

  const handleNewConv = async () => {
    const res = await fetch('/api/conversations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: newTitle }),
    })
    const data = await res.json()
    setConversations([data.conversation, ...conversations])
    setActiveConv(data.conversation)
    setMessages([])
    setNewTitle('')
    setShowNewModal(false)
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || !activeConv) return

    setLoading(true)
    const userMsg: ConversationMessage = {
      id: Date.now().toString(),
      conversation_id: activeConv.id,
      role: 'user',
      content: input,
      created_at: new Date().toISOString(),
    }
    setMessages([...messages, userMsg])
    setInput('')

    try {
      const res = await fetch(`/api/conversations/${activeConv.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: input }),
      })
      const data = await res.json()
      setMessages([...messages, userMsg, data.message])
    } catch (err) {
      console.error('Send error:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex flex-col">
      <header className="border-b border-slate-700 bg-slate-800/50">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-white">Chat IA</h1>
          <Link href="/dashboard" className="text-slate-400 hover:text-white">
            ← Voltar
          </Link>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div className="w-64 bg-slate-800 border-r border-slate-700 flex flex-col">
          <button
            onClick={() => setShowNewModal(true)}
            className="m-4 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded font-medium"
          >
            + Nova Conversa
          </button>
          <div className="flex-1 overflow-y-auto space-y-2 px-2">
            {conversations.map((conv) => (
              <button
                key={conv.id}
                onClick={() => handleSelectConv(conv)}
                className={`w-full text-left px-3 py-2 rounded transition-colors ${
                  activeConv?.id === conv.id
                    ? 'bg-rose-600 text-white'
                    : 'hover:bg-slate-700 text-slate-400'
                }`}
              >
                <p className="truncate">{conv.title}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col">
          {activeConv ? (
            <>
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-md px-4 py-2 rounded-lg ${
                        msg.role === 'user'
                          ? 'bg-rose-600 text-white'
                          : 'bg-slate-700 text-slate-100'
                      }`}
                    >
                      {msg.content}
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              <form onSubmit={handleSendMessage} className="p-4 border-t border-slate-700">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Faça uma pergunta..."
                    disabled={loading}
                    className="flex-1 px-4 py-2 bg-slate-700 border border-slate-600 rounded text-white placeholder-slate-500 disabled:opacity-50"
                  />
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-6 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded font-medium disabled:opacity-50"
                  >
                    {loading ? 'Enviando...' : 'Enviar'}
                  </button>
                </div>
              </form>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-slate-400">
              Selecione uma conversa ou crie uma nova
            </div>
          )}
        </div>
      </div>

      {/* New Conversation Modal */}
      {showNewModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-white mb-4">Nova Conversa</h2>
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Assunto da conversa"
              className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded text-white mb-4"
            />
            <div className="flex gap-3">
              <button
                onClick={() => setShowNewModal(false)}
                className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded"
              >
                Cancelar
              </button>
              <button
                onClick={handleNewConv}
                className="flex-1 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded"
              >
                Criar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
