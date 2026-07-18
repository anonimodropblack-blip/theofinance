-- =============================================================================
-- Migration: 001_phase1_auth_couple.sql
-- Phase: 01 - Auth e Casal
-- Description: Schema completo para auth e casal como unidade de tenancy.
--              RLS ativado em todas as tabelas desde a criação.
--              Funções SECURITY DEFINER para operações privilegiadas.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Tabela couples (tenant unit — unidade de tenancy do sistema)
-- -----------------------------------------------------------------------------
CREATE TABLE public.couples (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.couples ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------------
-- 2. Tabela profiles (extende auth.users com dados do domínio)
-- -----------------------------------------------------------------------------
CREATE TABLE public.profiles (
  id           UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  couple_id    UUID        REFERENCES public.couples(id),
  email        TEXT,
  display_name TEXT,
  view_mode    TEXT        DEFAULT 'couple' CHECK (view_mode IN ('individual', 'couple')),
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------------
-- 3. Tabela couple_members (join table — um usuário pertence a APENAS um casal)
-- -----------------------------------------------------------------------------
CREATE TABLE public.couple_members (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id  UUID        NOT NULL REFERENCES public.couples(id) ON DELETE CASCADE,
  user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role       TEXT        NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'member')),
  joined_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

ALTER TABLE public.couple_members ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------------
-- 4. Tabela couple_invites (convites de parceiro com token único)
-- -----------------------------------------------------------------------------
CREATE TABLE public.couple_invites (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id   UUID        NOT NULL REFERENCES public.couples(id) ON DELETE CASCADE,
  invited_by  UUID        NOT NULL REFERENCES auth.users(id),
  email       TEXT        NOT NULL,
  token       UUID        NOT NULL DEFAULT gen_random_uuid(),
  status      TEXT        NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired')),
  expires_at  TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '7 days',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.couple_invites ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------------
-- 5. Índices de performance obrigatórios
-- -----------------------------------------------------------------------------
CREATE INDEX idx_couple_members_user_id   ON public.couple_members(user_id);
CREATE INDEX idx_couple_members_couple_id ON public.couple_members(couple_id);
CREATE INDEX idx_profiles_couple_id       ON public.profiles(couple_id);
CREATE INDEX idx_couple_invites_token     ON public.couple_invites(token);

-- -----------------------------------------------------------------------------
-- 6. Função helper para RLS — SECURITY DEFINER com search_path fixo
--    Base de todas as policies de isolamento por casal
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_couple_id_for_user(uid UUID)
RETURNS UUID AS $$
  SELECT couple_id
  FROM public.couple_members
  WHERE user_id = uid
  LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- -----------------------------------------------------------------------------
-- 7. RLS Policies
-- -----------------------------------------------------------------------------

-- Couples: membros veem apenas o próprio casal
CREATE POLICY "members_see_own_couple" ON public.couples
  FOR SELECT TO authenticated
  USING (id = public.get_couple_id_for_user(auth.uid()));

-- Profiles: usuário vê perfis do próprio casal
CREATE POLICY "couple_members_see_profiles" ON public.profiles
  FOR SELECT TO authenticated
  USING (couple_id = public.get_couple_id_for_user(auth.uid()));

-- Profiles: usuário edita apenas o próprio perfil
CREATE POLICY "user_updates_own_profile" ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Profiles: usuário insere apenas o próprio perfil
CREATE POLICY "user_inserts_own_profile" ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());

-- Couple_members: membros veem membros do próprio casal
CREATE POLICY "members_see_couple_members" ON public.couple_members
  FOR SELECT TO authenticated
  USING (couple_id = public.get_couple_id_for_user(auth.uid()));

-- Couple_invites: membros criam e gerenciam convites do próprio casal
CREATE POLICY "members_manage_invites" ON public.couple_invites
  FOR ALL TO authenticated
  USING (couple_id = public.get_couple_id_for_user(auth.uid()))
  WITH CHECK (couple_id = public.get_couple_id_for_user(auth.uid()));

-- -----------------------------------------------------------------------------
-- 8. Função SECURITY DEFINER para leitura de convite por usuário não autenticado
--    Necessária para exibir "Você foi convidado por X" antes do login
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_invite_by_token(invite_token UUID)
RETURNS SETOF public.couple_invites
LANGUAGE sql
SECURITY DEFINER SET search_path = public
AS $$
  SELECT *
  FROM public.couple_invites
  WHERE token = invite_token
    AND status = 'pending'
    AND expires_at > NOW();
$$;

-- -----------------------------------------------------------------------------
-- 9. RPC atômica para aceitar convite (evita race condition e dupla aceitação)
--    Usa FOR UPDATE lock para serializar acesso concorrente
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.accept_couple_invite(
  p_token   UUID,
  p_user_id UUID
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_invite public.couple_invites%ROWTYPE;
BEGIN
  -- Lock o convite para evitar dupla aceitação concorrente
  SELECT * INTO v_invite
  FROM public.couple_invites
  WHERE token = p_token
    AND status = 'pending'
    AND expires_at > NOW()
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Convite inválido ou expirado';
  END IF;

  -- Verificar que o usuário não está em outro casal
  IF EXISTS (SELECT 1 FROM public.couple_members WHERE user_id = p_user_id) THEN
    RAISE EXCEPTION 'Usuário já pertence a um casal';
  END IF;

  -- Entrar no casal como membro
  INSERT INTO public.couple_members (couple_id, user_id, role)
  VALUES (v_invite.couple_id, p_user_id, 'member');

  -- Atualizar couple_id no profile do novo membro
  UPDATE public.profiles
  SET couple_id = v_invite.couple_id
  WHERE id = p_user_id;

  -- Marcar convite como aceito
  UPDATE public.couple_invites
  SET status = 'accepted'
  WHERE id = v_invite.id;
END;
$$;

-- -----------------------------------------------------------------------------
-- 10. Trigger para criar casal automaticamente no signup
--     Nunca depender do cliente para criar o casal — DB trigger é atômico
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  new_couple_id UUID;
BEGIN
  -- Cria o casal do novo usuário
  INSERT INTO public.couples (name)
  VALUES ('Meu Casal')
  RETURNING id INTO new_couple_id;

  -- Cria o profile vinculado ao casal
  INSERT INTO public.profiles (id, couple_id, email)
  VALUES (NEW.id, new_couple_id, NEW.email);

  -- Registra o usuário como owner do casal
  INSERT INTO public.couple_members (couple_id, user_id, role)
  VALUES (new_couple_id, NEW.id, 'owner');

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
