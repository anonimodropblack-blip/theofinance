-- Create couple_invites table
create table if not exists couple_invites (
  id uuid default gen_random_uuid() primary key,
  couple_id uuid not null references couples(id) on delete cascade,
  invited_email text not null,
  token text not null unique,
  created_at timestamp with time zone default now() not null,
  expires_at timestamp with time zone not null,
  accepted_at timestamp with time zone,

  constraint email_format check (invited_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$')
);

-- Indexes
create index idx_couple_invites_couple_id on couple_invites(couple_id);
create index idx_couple_invites_token on couple_invites(token);
create index idx_couple_invites_email on couple_invites(invited_email);

-- RLS
alter table couple_invites enable row level security;

-- Policy: Users can see invites for their couple
create policy "Users can view couple invites" on couple_invites
  for select
  using (
    couple_id in (
      select id from couples
      where primary_user_id = auth.uid() or secondary_user_id = auth.uid()
    )
  );

-- Policy: Primary user can create invites
create policy "Primary user can create invites" on couple_invites
  for insert
  with check (
    couple_id in (
      select id from couples where primary_user_id = auth.uid()
    )
  );

-- Policy: Allow anon to verify token (for accept-invite flow)
create policy "Anon can verify invite tokens" on couple_invites
  for select
  using (
    -- If user is anonymous, allow checking token validity
    auth.role() = 'anon'
  );
