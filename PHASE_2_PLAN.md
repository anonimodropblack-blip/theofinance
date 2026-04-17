# Phase 2: Contas e Transações

## Objetivo
Implementar sistema de contas (checking, savings, credit) e transações (receita/despesa/transferência).

## Waves

### Wave 1: Accounts Schema + RLS + CRUD API
- Migration: accounts + account_members + RLS
- API: POST/GET/PATCH accounts
- Types: Account, AccountMember

### Wave 2: Accounts UI
- Dashboard de contas com saldo
- Modal criar/editar conta
- Página de detalhes da conta

### Wave 3: Transactions Schema + RLS + CRUD API
- Migration: transactions + categories + RLS
- API: POST/GET/PATCH transactions
- Types: Transaction, Category

### Wave 4: Transactions UI
- Página registrar transação (form)
- Dashboard com histórico
- Filtros por conta/data/categoria

## Decisões
- Accounts: pode ser de 1 pessoa (primary/secondary) ou joint
- Transactions: registram em couple_id (multi-user access)
- Balance: calculado em real-time (no denorm)
- Categories: customizáveis por couple
