-- Supabase setup for Task Dashboard
create extension if not exists "pgcrypto";

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  descricao text,
  comentario text,
  status text not null check (status in ('pendente','em_trabalho','concluido')),
  categoria text not null check (categoria in ('pdv','impressoras','computadores','chamados')),
  fotos text[] default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.tasks enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'tasks'
  ) then
    create policy "Authenticated can manage tasks"
      on public.tasks
      for all
      using (auth.role() = 'authenticated')
      with check (auth.role() = 'authenticated');
  end if;
end $$;

-- Storage bucket for task photos
insert into storage.buckets (id, name, public)
values ('task-photos', 'task-photos', true)
on conflict (id) do nothing;

-- Storage policies
create policy "Authenticated can upload task photos"
  on storage.objects
  for insert
  with check (bucket_id = 'task-photos' and auth.role() = 'authenticated');

create policy "Public can view task photos"
  on storage.objects
  for select
  using (bucket_id = 'task-photos');

-- Public read-only access for tasks (public consultation)
create policy "Public can view tasks"
  on public.tasks
  for select
  to anon
  using (true);
APP_LOGIN_USER=vltecnologia
APP_LOGIN_EMAIL=SEU_EMAIL_DO_PASSO_1
