// Auth & Couple
export interface User {
  id: string
  email: string
  email_confirmed_at?: string
  created_at: string
}

export interface Couple {
  id: string
  primary_user_id: string
  primary_user_email: string
  secondary_user_id?: string
  secondary_user_email?: string
  created_at: string
  updated_at: string
}

export interface CoupleInvite {
  id: string
  couple_id: string
  invited_email: string
  token: string
  created_at: string
  expires_at: string
  accepted_at?: string
}

// Accounts & Transactions
export type AccountType = 'checking' | 'savings' | 'credit' | 'cash'

export interface Account {
  id: string
  couple_id: string
  type: AccountType
  name: string
  balance: number
  currency: string
  color: string
  owner?: 'primary' | 'secondary' | 'joint'
  created_at: string
  updated_at: string
}

export interface Transaction {
  id: string
  couple_id: string
  account_id: string
  amount: number
  type: 'income' | 'expense' | 'transfer'
  category: string
  description?: string
  date: string
  created_by: string
  created_at: string
  updated_at: string
}

// Session & Context
export interface SessionData {
  user: User
  couple: Couple
  viewMode: 'primary' | 'secondary'
}

export interface AppContext {
  session: SessionData | null
  loading: boolean
  error?: string
}
