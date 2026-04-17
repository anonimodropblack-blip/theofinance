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

// Fixed Accounts & Savings Goals
export type FrequencyType = 'weekly' | 'biweekly' | 'monthly' | 'bimonthly' | 'quarterly' | 'yearly'

export interface FixedAccount {
  id: string
  couple_id: string
  name: string
  amount: number
  frequency: FrequencyType
  due_date?: number
  category?: string
  description?: string
  is_active: boolean
  created_by: string
  created_at: string
  updated_at: string
}

export interface SavingsGoal {
  id: string
  couple_id: string
  name: string
  target_amount: number
  current_amount: number
  icon: string
  color: string
  deadline?: string
  is_active: boolean
  created_by: string
  created_at: string
  updated_at: string
  progress?: number
}

export interface SavingsContribution {
  id: string
  goal_id: string
  amount: number
  description?: string
  created_by: string
  created_at: string
}

// Due Bills & Reminders
export type BillStatus = 'pending' | 'paid' | 'overdue' | 'cancelled'
export type ReminderType = 'email' | 'sms' | 'push' | 'in_app'

export interface DueBill {
  id: string
  couple_id: string
  title: string
  amount: number
  due_date: string
  status: BillStatus
  category?: string
  description?: string
  reminder_days: number
  reminder_sent: boolean
  created_by: string
  created_at: string
  updated_at: string
  paid_at?: string
  daysUntilDue?: number
  isOverdue?: boolean
}

export interface Reminder {
  id: string
  bill_id: string
  reminder_type: ReminderType
  sent_at: string
  status: 'sent' | 'failed' | 'read'
}

export interface BillPayment {
  id: string
  bill_id: string
  amount_paid: number
  paid_date: string
  payment_method?: string
  notes?: string
  created_by: string
  created_at: string
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
