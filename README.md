# NG Cursos Técnicos e Profissionalizantes

Aplicação web para cadastro de alunos com login de administrador e lista pública de conclusão.

## 1) Criar o projeto no Supabase (gratuito)
1. Crie um projeto em https://supabase.com
2. Em **Project Settings > API**, copie:
   - `URL` (SUPABASE URL)
   - `anon public` (ANON KEY)
3. Em **Authentication > Users**, crie o usuário administrador (email e senha).

## 2) SQL (rode no Supabase > SQL Editor)
```sql
-- Tabela com dados completos
create table if not exists students (
  id uuid primary key default gen_random_uuid(),
  created_at timestamp with time zone default now(),
  nome text not null,
  cpf text not null,
  data_nascimento date not null,
  curso text not null,
  data_inicio date not null,
  data_fim date not null
);

-- Tabela pública com dados reduzidos
create table if not exists public_students (
  id uuid primary key references students(id) on delete cascade,
  nome text not null,
  data_fim date not null,
  updated_at timestamp with time zone default now()
);

-- Perfil do usuário para definir admin
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'viewer'
);

alter table students enable row level security;
alter table public_students enable row level security;
alter table profiles enable row level security;

-- Políticas para admins
create policy "Admins read students"
  on students for select to authenticated
  using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));

create policy "Admins insert students"
  on students for insert to authenticated
  with check (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));

create policy "Admins update students"
  on students for update to authenticated
  using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'))
  with check (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));

create policy "Admins delete students"
  on students for delete to authenticated
  using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));

create policy "Admins manage public_students"
  on public_students for all to authenticated
  using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'))
  with check (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));

-- Leitura pública (anon + autenticado)
create policy "Public read public_students (anon)"
  on public_students for select to anon
  using (true);

create policy "Public read public_students (auth)"
  on public_students for select to authenticated
  using (true);

-- Trigger para espelhar dados públicos
create or replace function sync_public_students()
returns trigger as $$
begin
  if (tg_op = 'INSERT') then
    insert into public_students (id, nome, data_fim, updated_at)
    values (new.id, new.nome, new.data_fim, now())
    on conflict (id) do update
      set nome = excluded.nome,
          data_fim = excluded.data_fim,
          updated_at = now();
    return new;
  elsif (tg_op = 'UPDATE') then
    update public_students
      set nome = new.nome,
          data_fim = new.data_fim,
          updated_at = now()
    where id = new.id;
    return new;
  elsif (tg_op = 'DELETE') then
    delete from public_students where id = old.id;
    return old;
  end if;
  return null;
end;
$$ language plpgsql;

drop trigger if exists sync_public_students_trigger on students;
create trigger sync_public_students_trigger
after insert or update or delete on students
for each row execute function sync_public_students();
```

### Definir o usuário admin
Após criar o usuário em **Authentication > Users**, rode:
```sql
insert into profiles (id, role)
values ('COLE-AQUI-O-UUID-DO-USUÁRIO', 'admin')
on conflict (id) do update set role = 'admin';
```

## 3) Configurar variáveis de ambiente
Crie um arquivo `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=COLE_AQUI
NEXT_PUBLIC_SUPABASE_ANON_KEY=COLE_AQUI
NEXT_PUBLIC_SITE_URL=https://SEU-SITE.vercel.app
```

## 4) Rodar localmente
```
npm install
npm run dev
```

## 5) Publicar gratuitamente no Vercel
1. Suba este projeto para o GitHub.
2. Crie conta gratuita no Vercel e conecte o repositório.
3. Em **Environment Variables**, adicione as mesmas variáveis do `.env.local`.
4. Deploy.

Pronto: o QR Code do painel admin vai apontar para a sua URL pública.
