-- Accounts table
create table if not exists accounts (
  id uuid default gen_random_uuid() primary key,
  couple_id uuid not null references couples(id) on delete cascade,
  name text not null,
  type text not null check (type in ('checking', 'savings', 'credit', 'cash')),
  balance numeric(15, 2) default 0,
  currency text default 'BRL',
  color text default '#3b82f6',
  created_by uuid not null references auth.users(id),
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,

  constraint positive_balance check (type != 'credit' or balance >= 0),
  constraint name_not_empty check (length(trim(name)) > 0)
);

-- Account members (who has access)
create table if not exists account_members (
  id uuid default gen_random_uuid() primary key,
  account_id uuid not null references accounts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  permission text default 'view' check (permission in ('view', 'edit', 'admin')),
  added_at timestamp with time zone default now() not null,

  unique(account_id, user_id)
);

-- Categories table
create table if not exists transaction_categories (
  id uuid default gen_random_uuid() primary key,
  couple_id uuid not null references couples(id) on delete cascade,
  name text not null,
  type text not null check (type in ('income', 'expense')),
  color text default '#6b7280',
  icon text default '📌',
  created_at timestamp with time zone default now() not null,

  unique(couple_id, name, type)
);

-- Transactions table
create table if not exists transactions (
  id uuid default gen_random_uuid() primary key,
  couple_id uuid not null references couples(id) on delete cascade,
  account_id uuid not null references accounts(id) on delete cascade,
  category_id uuid references transaction_categories(id) on delete set null,
  amount numeric(15, 2) not null,
  type text not null check (type in ('income', 'expense', 'transfer')),
  description text,
  date date not null default current_date,
  created_by uuid not null references auth.users(id),
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,

  constraint amount_positive check (amount > 0),
  constraint description_not_empty check (description is null or length(trim(description)) > 0)
);

-- Indexes
create index idx_accounts_couple_id on accounts(couple_id);
create index idx_accounts_created_by on accounts(created_by);
create index idx_account_members_user_id on account_members(user_id);
create index idx_transactions_couple_id on transactions(couple_id);
create index idx_transactions_account_id on transactions(account_id);
create index idx_transactions_date on transactions(date);
create index idx_transactions_created_by on transactions(created_by);
create index idx_categories_couple_id on transaction_categories(couple_id);

-- RLS: Accounts
alter table accounts enable row level security;

create policy "Users can view couple accounts" on accounts
  for select
  using (
    couple_id in (
      select id from couples
      where primary_user_id = auth.uid() or secondary_user_id = auth.uid()
    )
  );

create policy "Users can create accounts for couple" on accounts
  for insert
  with check (
    couple_id in (
      select id from couples
      where primary_user_id = auth.uid() or secondary_user_id = auth.uid()
    )
    and auth.uid() = created_by
  );

create policy "Users can update couple accounts" on accounts
  for update
  using (
    couple_id in (
      select id from couples
      where primary_user_id = auth.uid() or secondary_user_id = auth.uid()
    )
  );

-- RLS: Account Members
alter table account_members enable row level security;

create policy "Users can view account members of their accounts" on account_members
  for select
  using (
    account_id in (
      select id from accounts
      where couple_id in (
        select id from couples
        where primary_user_id = auth.uid() or secondary_user_id = auth.uid()
      )
    )
  );

-- RLS: Categories
alter table transaction_categories enable row level security;

create policy "Users can view couple categories" on transaction_categories
  for select
  using (
    couple_id in (
      select id from couples
      where primary_user_id = auth.uid() or secondary_user_id = auth.uid()
    )
  );

create policy "Users can create categories for couple" on transaction_categories
  for insert
  with check (
    couple_id in (
      select id from couples
      where primary_user_id = auth.uid() or secondary_user_id = auth.uid()
    )
  );

-- RLS: Transactions
alter table transactions enable row level security;

create policy "Users can view couple transactions" on transactions
  for select
  using (
    couple_id in (
      select id from couples
      where primary_user_id = auth.uid() or secondary_user_id = auth.uid()
    )
  );

create policy "Users can create transactions for couple" on transactions
  for insert
  with check (
    couple_id in (
      select id from couples
      where primary_user_id = auth.uid() or secondary_user_id = auth.uid()
    )
    and auth.uid() = created_by
  );

create policy "Users can update couple transactions" on transactions
  for update
  using (
    couple_id in (
      select id from couples
      where primary_user_id = auth.uid() or secondary_user_id = auth.uid()
    )
  );
