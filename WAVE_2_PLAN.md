# Wave 2: Auth Pages (01-03)

## Objetivo
Criar páginas de autenticação: signup, login, reset password, confirm email.

## Tarefas

### Task 1: Auth Layout (2h)
- [ ] `app/auth/layout.tsx` — container simples
- [ ] `styles/auth.module.css` — estilo minimalista

### Task 2: Auth Pages (4h)
- [ ] `app/auth/signup/page.tsx` — form signup + submit
- [ ] `app/auth/login/page.tsx` — form login + submit
- [ ] `app/auth/reset-password/page.tsx` — form reset
- [ ] `app/auth/confirm-email/page.tsx` — confirm + redirect

### Task 3: Auth API Routes (3h)
- [ ] `app/api/auth/signup/route.ts` — criar user + chamar RPC
- [ ] `app/api/auth/login/route.ts` — validar + criar session
- [ ] `app/api/auth/reset/route.ts` — gerar token reset
- [ ] `app/api/auth/confirm/route.ts` — confirmar email

## Decisões
- RLS via SECURITY DEFINER (couple_id derivado no DB)
- Email via Supabase templates (configurar dashboard)
- Redirect automático após confirm
