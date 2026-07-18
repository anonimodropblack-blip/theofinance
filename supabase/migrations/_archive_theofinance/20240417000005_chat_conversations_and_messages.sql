-- Conversations table
create table if not exists conversations (
  id uuid default gen_random_uuid() primary key,
  couple_id uuid not null references couples(id) on delete cascade,
  title text not null,
  topic text check (topic in ('spending_analysis', 'savings_tips', 'budget_planning', 'investment_advice', 'general')),
  created_by uuid not null references auth.users(id),
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  archived boolean default false,

  constraint title_not_empty check (length(trim(title)) > 0)
);

-- Messages table (conversation history)
create table if not exists conversation_messages (
  id uuid default gen_random_uuid() primary key,
  conversation_id uuid not null references conversations(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  tokens_used integer,
  created_at timestamp with time zone default now() not null,

  constraint content_not_empty check (length(trim(content)) > 0)
);

-- Conversation insights (cached AI responses)
create table if not exists conversation_insights (
  id uuid default gen_random_uuid() primary key,
  couple_id uuid not null references couples(id) on delete cascade,
  insight_type text not null check (insight_type in ('spending_pattern', 'savings_opportunity', 'budget_recommendation', 'alert')),
  title text not null,
  description text not null,
  priority text default 'medium' check (priority in ('low', 'medium', 'high', 'critical')),
  data jsonb,
  created_at timestamp with time zone default now() not null,
  expires_at timestamp with time zone,

  constraint title_not_empty check (length(trim(title)) > 0),
  constraint description_not_empty check (length(trim(description)) > 0)
);

-- Indexes
create index idx_conversations_couple_id on conversations(couple_id);
create index idx_conversations_created_by on conversations(created_by);
create index idx_conversations_archived on conversations(archived);
create index idx_messages_conversation_id on conversation_messages(conversation_id);
create index idx_messages_created_at on conversation_messages(created_at);
create index idx_insights_couple_id on conversation_insights(couple_id);
create index idx_insights_type on conversation_insights(insight_type);

-- RLS: Conversations
alter table conversations enable row level security;

create policy "Users can view couple conversations" on conversations
  for select
  using (
    couple_id in (
      select id from couples
      where primary_user_id = auth.uid() or secondary_user_id = auth.uid()
    )
  );

create policy "Users can create conversations for couple" on conversations
  for insert
  with check (
    couple_id in (
      select id from couples
      where primary_user_id = auth.uid() or secondary_user_id = auth.uid()
    )
    and auth.uid() = created_by
  );

create policy "Users can update couple conversations" on conversations
  for update
  using (
    couple_id in (
      select id from couples
      where primary_user_id = auth.uid() or secondary_user_id = auth.uid()
    )
  );

-- RLS: Messages
alter table conversation_messages enable row level security;

create policy "Users can view couple messages" on conversation_messages
  for select
  using (
    conversation_id in (
      select id from conversations
      where couple_id in (
        select id from couples
        where primary_user_id = auth.uid() or secondary_user_id = auth.uid()
      )
    )
  );

create policy "Users can add messages to couple conversations" on conversation_messages
  for insert
  with check (
    conversation_id in (
      select id from conversations
      where couple_id in (
        select id from couples
        where primary_user_id = auth.uid() or secondary_user_id = auth.uid()
      )
    )
  );

-- RLS: Insights
alter table conversation_insights enable row level security;

create policy "Users can view couple insights" on conversation_insights
  for select
  using (
    couple_id in (
      select id from couples
      where primary_user_id = auth.uid() or secondary_user_id = auth.uid()
    )
  );

create policy "Users can delete couple insights" on conversation_insights
  for delete
  using (
    couple_id in (
      select id from couples
      where primary_user_id = auth.uid() or secondary_user_id = auth.uid()
    )
  );
