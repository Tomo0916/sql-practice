-- =========================================================
-- SQL Practice — Supabase schema
-- Supabase の「SQL Editor」に全部貼り付けて「Run」を押してください（何度実行しても安全です）。
--
--   classes  : クラス（先生が作る。今日の課題・セット番号・模範解答の表示ルール）
--   members  : クラスに参加した生徒（ニックネームのみ。個人情報は持たない）
--   attempts : 生徒が「実行」した記録（正解/不正解・SQL）
--   teachers : 先生として使ってよいメールアドレスの一覧（ここに無い人はクラスを作れない・見られない）
--
-- 先生を追加する:  insert into public.teachers (email) values ('example@school.jp');
-- 先生を外す:      delete from public.teachers where email = 'example@school.jp';
--
-- 生徒は「匿名ログイン」、先生はメール＋パスワードでログインします。
-- 行レベルセキュリティ（RLS）で、生徒は自分の記録だけ、先生は自分のクラスの記録だけを見られます。
-- =========================================================

create extension if not exists pgcrypto;

-- ---------- tables ----------
create table if not exists public.classes (
  id            uuid primary key default gen_random_uuid(),
  code          text not null unique check (code ~ '^[A-Z0-9]{4,8}$'),
  name          text not null check (char_length(name) between 1 and 80),
  teacher_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  set_code      text not null default to_char(now() at time zone 'Asia/Tokyo', 'YYYYMMDD') check (char_length(set_code) between 1 and 16),
  lessons       text[] not null default '{}',
  answer_policy text not null default 'after2' check (answer_policy in ('always', 'after2', 'solved', 'never')),
  open          boolean not null default true,
  updated_at    timestamptz not null default now(),
  created_at    timestamptz not null default now()
);

create table if not exists public.members (
  class_id  uuid not null references public.classes(id) on delete cascade,
  user_id   uuid not null default auth.uid() references auth.users(id) on delete cascade,
  nickname  text not null check (char_length(btrim(nickname)) between 1 and 30),
  joined_at timestamptz not null default now(),
  primary key (class_id, user_id)
);

create table if not exists public.attempts (
  id         bigint generated always as identity primary key,
  class_id   uuid not null references public.classes(id) on delete cascade,
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  problem_id text not null check (char_length(problem_id) <= 80),
  lesson     text not null check (char_length(lesson) <= 40),
  stage      text not null check (stage in ('demo', 'fill', 'order', 'write', 'review')),
  ok         boolean not null,
  reason     text check (char_length(reason) <= 40),
  sql        text check (char_length(sql) <= 2000),
  created_at timestamptz not null default now()
);
create index if not exists attempts_class_time on public.attempts (class_id, created_at);
create index if not exists attempts_user on public.attempts (user_id);
create index if not exists classes_teacher on public.classes (teacher_id);

-- ---------- teacher allow-list ----------
create table if not exists public.teachers (
  email    text primary key check (email = lower(btrim(email)) and email like '%@%'),
  note     text,
  added_at timestamptz not null default now()
);
alter table public.teachers enable row level security;   -- no policies: only the dashboard / SQL editor can read or change it
revoke all on public.teachers from anon, authenticated;

-- ---------- helpers (security definer = can read tables regardless of RLS) ----------
/* signed in with a confirmed email address that is on the teacher list */
create or replace function public.is_teacher() returns boolean
  language sql stable security definer set search_path = public, auth as
$$ select exists (
     select 1 from auth.users u join public.teachers t on t.email = lower(u.email)
     where u.id = auth.uid() and u.email_confirmed_at is not null and coalesce(u.is_anonymous, false) = false) $$;

create or replace function public.is_teacher_of(cid uuid) returns boolean
  language sql stable security definer set search_path = public as
$$ select public.is_teacher() and exists (select 1 from public.classes c where c.id = cid and c.teacher_id = auth.uid()) $$;

create or replace function public.is_member_of(cid uuid) returns boolean
  language sql stable security definer set search_path = public as
$$ select exists (select 1 from public.members m where m.class_id = cid and m.user_id = auth.uid()) $$;

create or replace function public.is_anonymous_user() returns boolean
  language sql stable as
$$ select coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) $$;

-- ---------- row level security ----------
alter table public.classes  enable row level security;
alter table public.members  enable row level security;
alter table public.attempts enable row level security;

drop policy if exists classes_select on public.classes;
drop policy if exists classes_insert on public.classes;
drop policy if exists classes_update on public.classes;
drop policy if exists classes_delete on public.classes;
create policy classes_select on public.classes for select to authenticated
  using ((teacher_id = auth.uid() and public.is_teacher()) or public.is_member_of(id));
create policy classes_insert on public.classes for insert to authenticated
  with check (teacher_id = auth.uid() and public.is_teacher());
create policy classes_update on public.classes for update to authenticated
  using (teacher_id = auth.uid() and public.is_teacher()) with check (teacher_id = auth.uid());
create policy classes_delete on public.classes for delete to authenticated
  using (teacher_id = auth.uid() and public.is_teacher());

drop policy if exists members_select on public.members;
drop policy if exists members_update on public.members;
drop policy if exists members_delete on public.members;
create policy members_select on public.members for select to authenticated
  using (user_id = auth.uid() or public.is_teacher_of(class_id));
create policy members_update on public.members for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy members_delete on public.members for delete to authenticated
  using (user_id = auth.uid() or public.is_teacher_of(class_id));
-- (no insert policy: students join only through join_class())

drop policy if exists attempts_select on public.attempts;
drop policy if exists attempts_insert on public.attempts;
drop policy if exists attempts_delete on public.attempts;
create policy attempts_select on public.attempts for select to authenticated
  using (user_id = auth.uid() or public.is_teacher_of(class_id));
create policy attempts_insert on public.attempts for insert to authenticated
  with check (user_id = auth.uid() and public.is_member_of(class_id));
create policy attempts_delete on public.attempts for delete to authenticated
  using (public.is_teacher_of(class_id));

-- members can't change classes / attempts can't be edited
revoke all on public.classes, public.members, public.attempts from anon;
grant select, insert, update, delete on public.classes to authenticated;
grant select, delete on public.members to authenticated;
grant update (nickname) on public.members to authenticated;
grant select, insert, delete on public.attempts to authenticated;

-- ---------- RPC: student joins a class with its code ----------
create or replace function public.join_class(p_code text, p_nickname text)
  returns public.classes
  language plpgsql security definer set search_path = public as
$$
declare c public.classes;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  select * into c from public.classes where code = upper(btrim(p_code));
  if not found then raise exception 'class_not_found' using errcode = 'P0002'; end if;
  if not c.open then raise exception 'class_closed' using errcode = 'P0001'; end if;
  insert into public.members (class_id, user_id, nickname)
    values (c.id, auth.uid(), left(btrim(p_nickname), 30))
    on conflict (class_id, user_id) do update set nickname = excluded.nickname;
  return c;
end
$$;

-- ---------- RPC: teacher creates a class (server picks a unique, easy-to-read code) ----------
create or replace function public.create_class(p_name text)
  returns public.classes
  language plpgsql security definer set search_path = public as
$$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  new_code text;
  c public.classes;
begin
  if not public.is_teacher() then raise exception 'not_teacher' using errcode = '42501'; end if;
  loop
    new_code := '';
    for i in 1..6 loop
      new_code := new_code || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;
    exit when not exists (select 1 from public.classes where code = new_code);
  end loop;
  insert into public.classes (code, name, teacher_id) values (new_code, left(btrim(p_name), 80), auth.uid())
    returning * into c;
  return c;
end
$$;

-- ---------- RPC: is the signed-in user on the teacher list? (used by teacher.html) ----------
create or replace function public.am_i_teacher() returns boolean
  language sql stable security definer set search_path = public as
$$ select public.is_teacher() $$;

revoke all on function public.am_i_teacher() from public, anon;
grant execute on function public.am_i_teacher() to authenticated;
revoke all on function public.is_teacher() from public, anon;
grant execute on function public.is_teacher() to authenticated;
revoke all on function public.join_class(text, text) from public, anon;
revoke all on function public.create_class(text) from public, anon;
grant execute on function public.join_class(text, text) to authenticated;
grant execute on function public.create_class(text) to authenticated;

-- ---------- class timer (2026-10-29) ----------
-- The teacher starts a countdown; every student's screen shows it.
-- Answers sent after the end are marked late (the server decides, students cannot change it).
alter table public.classes  add column if not exists timer_end timestamptz;
alter table public.classes  add column if not exists timer_sec integer check (timer_sec between 10 and 7200);
alter table public.attempts add column if not exists late boolean not null default false;
-- Lesson 0 questions are stored with stage 'quiz'
alter table public.attempts drop constraint if exists attempts_stage_check;
alter table public.attempts add constraint attempts_stage_check check (stage in ('demo', 'fill', 'order', 'write', 'review', 'quiz'));

/* the server's clock, so that every screen counts down together */
create or replace function public.server_now() returns timestamptz language sql stable as $$ select now() $$;

create or replace function public.start_timer(p_class uuid, p_sec integer)
  returns public.classes
  language plpgsql security definer set search_path = public as
$$
declare c public.classes;
begin
  if not public.is_teacher_of(p_class) then raise exception 'not_teacher' using errcode = '42501'; end if;
  update public.classes set timer_end = now() + make_interval(secs => greatest(10, least(p_sec, 7200))), timer_sec = greatest(10, least(p_sec, 7200))
    where id = p_class returning * into c;
  return c;
end
$$;
create or replace function public.stop_timer(p_class uuid)
  returns public.classes
  language plpgsql security definer set search_path = public as
$$
declare c public.classes;
begin
  if not public.is_teacher_of(p_class) then raise exception 'not_teacher' using errcode = '42501'; end if;
  update public.classes set timer_end = null, timer_sec = null where id = p_class returning * into c;
  return c;
end
$$;
create or replace function public.mark_late() returns trigger
  language plpgsql security definer set search_path = public as
$$
begin
  new.late := exists (select 1 from public.classes c where c.id = new.class_id and c.timer_end is not null and now() > c.timer_end);
  return new;
end
$$;
drop trigger if exists attempts_late on public.attempts;
create trigger attempts_late before insert on public.attempts for each row execute function public.mark_late();

revoke all on function public.server_now() from public, anon;
revoke all on function public.start_timer(uuid, integer) from public, anon;
revoke all on function public.stop_timer(uuid) from public, anon;
grant execute on function public.server_now() to authenticated;
grant execute on function public.start_timer(uuid, integer) to authenticated;
grant execute on function public.stop_timer(uuid) to authenticated;

-- keep updated_at fresh
create or replace function public.touch_updated_at() returns trigger language plpgsql as
$$ begin new.updated_at := now(); return new; end $$;
drop trigger if exists classes_touch on public.classes;
create trigger classes_touch before update on public.classes for each row execute function public.touch_updated_at();

-- ---------- realtime (live dashboard + live assignment updates) ----------
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    begin alter publication supabase_realtime add table public.attempts; exception when duplicate_object then null; end;
    begin alter publication supabase_realtime add table public.members;  exception when duplicate_object then null; end;
    begin alter publication supabase_realtime add table public.classes;  exception when duplicate_object then null; end;
  end if;
end $$;
