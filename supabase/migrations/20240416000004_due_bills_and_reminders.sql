-- Due Bills table (contas a vencer / contas a pagar)
create table if not exists due_bills (
  id uuid default gen_random_uuid() primary key,
  couple_id uuid not null references couples(id) on delete cascade,
  title text not null,
  amount numeric(15, 2) not null,
  due_date date not null,
  status text not null check (status in ('pending', 'paid', 'overdue', 'cancelled')),
  category text,
  description text,
  reminder_days integer default 0,
  reminder_sent boolean default false,
  created_by uuid not null references auth.users(id),
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  paid_at timestamp with time zone,

  constraint amount_positive check (amount > 0),
  constraint title_not_empty check (length(trim(title)) > 0),
  constraint reminder_days_valid check (reminder_days >= 0)
);

-- Reminders table (histórico de lembretes enviados)
create table if not exists reminders (
  id uuid default gen_random_uuid() primary key,
  bill_id uuid not null references due_bills(id) on delete cascade,
  reminder_type text not null check (reminder_type in ('email', 'sms', 'push', 'in_app')),
  sent_at timestamp with time zone not null default now(),
  status text default 'sent' check (status in ('sent', 'failed', 'read')),

  unique(bill_id, reminder_type, date_trunc('day', sent_at))
);

-- Bill payments table (histórico de pagamentos)
create table if not exists bill_payments (
  id uuid default gen_random_uuid() primary key,
  bill_id uuid not null references due_bills(id) on delete cascade,
  amount_paid numeric(15, 2) not null,
  paid_date date not null,
  payment_method text,
  notes text,
  created_by uuid not null references auth.users(id),
  created_at timestamp with time zone default now() not null,

  constraint amount_positive check (amount_paid > 0)
);

-- Indexes
create index idx_due_bills_couple_id on due_bills(couple_id);
create index idx_due_bills_created_by on due_bills(created_by);
create index idx_due_bills_due_date on due_bills(due_date);
create index idx_due_bills_status on due_bills(status);
create index idx_reminders_bill_id on reminders(bill_id);
create index idx_reminders_sent_at on reminders(sent_at);
create index idx_bill_payments_bill_id on bill_payments(bill_id);

-- RLS: Due Bills
alter table due_bills enable row level security;

create policy "Users can view couple due bills" on due_bills
  for select
  using (
    couple_id in (
      select id from couples
      where primary_user_id = auth.uid() or secondary_user_id = auth.uid()
    )
  );

create policy "Users can create due bills for couple" on due_bills
  for insert
  with check (
    couple_id in (
      select id from couples
      where primary_user_id = auth.uid() or secondary_user_id = auth.uid()
    )
    and auth.uid() = created_by
  );

create policy "Users can update couple due bills" on due_bills
  for update
  using (
    couple_id in (
      select id from couples
      where primary_user_id = auth.uid() or secondary_user_id = auth.uid()
    )
  );

create policy "Users can delete couple due bills" on due_bills
  for delete
  using (
    couple_id in (
      select id from couples
      where primary_user_id = auth.uid() or secondary_user_id = auth.uid()
    )
  );

-- RLS: Reminders
alter table reminders enable row level security;

create policy "Users can view couple reminders" on reminders
  for select
  using (
    bill_id in (
      select id from due_bills
      where couple_id in (
        select id from couples
        where primary_user_id = auth.uid() or secondary_user_id = auth.uid()
      )
    )
  );

-- RLS: Bill Payments
alter table bill_payments enable row level security;

create policy "Users can view couple bill payments" on bill_payments
  for select
  using (
    bill_id in (
      select id from due_bills
      where couple_id in (
        select id from couples
        where primary_user_id = auth.uid() or secondary_user_id = auth.uid()
      )
    )
  );

create policy "Users can add bill payments for couple" on bill_payments
  for insert
  with check (
    bill_id in (
      select id from due_bills
      where couple_id in (
        select id from couples
        where primary_user_id = auth.uid() or secondary_user_id = auth.uid()
      )
    )
    and auth.uid() = created_by
  );
