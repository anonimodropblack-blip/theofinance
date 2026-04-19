'use client'

import { useEffect, useState, useRef } from 'react'
import { Plus, Send, MessageCircle } from 'lucide-react'
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
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-[var(--text)]">Chat IA</h1>
        <p className="text-sm text-[var(--text-muted)] mt-1">Converse com a IA sobre suas finanças.</p>
      </div>

      <div className="card overflow-hidden flex h-[70vh]">
        {/* Sidebar de conversas */}
        <div className="w-64 border-r border-[var(--border)] flex flex-col bg-[var(--bg)]">
          <div className="p-3 border-b border-[var(--border)]">
            <button
              onClick={() => setShowNewModal(true)}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white px-3 py-2 text-sm font-medium transition-colors"
            >
              <Plus className="h-4 w-4" />
              Nova conversa
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {conversations.length === 0 ? (
              <p className="text-xs text-[var(--text-subtle)] text-center py-6 px-2">
                Nenhuma conversa ainda
              </p>
            ) : (
              conversations.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => handleSelectConv(conv)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                    activeConv?.id === conv.id
                      ? 'bg-[var(--primary-subtle)] text-[var(--primary)] font-medium'
                      : 'text-[var(--text-muted)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text)]'
                  }`}
                >
                  <p className="truncate">{conv.title}</p>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Área do chat */}
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
                      className={`max-w-md px-4 py-2.5 rounded-2xl text-sm ${
                        msg.role === 'user'
                          ? 'bg-[var(--primary)] text-white rounded-br-sm'
                          : 'bg-[var(--bg)] text-[var(--text)] border border-[var(--border)] rounded-bl-sm'
                      }`}
                    >
                      {msg.content}
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              <form onSubmit={handleSendMessage} className="p-4 border-t border-[var(--border)]">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Faça uma pergunta..."
                    disabled={loading}
                    className="input-base flex-1 disabled:opacity-50"
                  />
                  <button
                    type="submit"
                    disabled={loading}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white px-4 py-2.5 text-sm font-medium transition-colors disabled:opacity-50"
                  >
                    <Send className="h-4 w-4" />
                    {loading ? 'Enviando...' : 'Enviar'}
                  </button>
                </div>
              </form>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-[var(--text-muted)] p-8 text-center">
              <div className="h-12 w-12 rounded-xl bg-[var(--primary-subtle)] text-[var(--primary)] flex items-center justify-center mb-4">
                <MessageCircle className="h-6 w-6" />
              </div>
              <p className="text-sm font-medium text-[var(--text)]">Selecione uma conversa</p>
              <p className="text-xs mt-1">ou crie uma nova para começar</p>
            </div>
          )}
        </div>
      </div>

      {/* Modal nova conversa */}
      {showNewModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="card p-6 w-full max-w-md">
            <h2 className="text-xl font-semibold text-[var(--text)] mb-4">Nova conversa</h2>
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Assunto da conversa"
              className="input-base w-full mb-4"
            />
            <div className="flex gap-3">
              <button onClick={() => setShowNewModal(false)} className="btn-ghost flex-1">
                Cancelar
              </button>
              <button onClick={handleNewConv} className="btn-primary flex-1">
                Criar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
