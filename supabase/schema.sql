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

-- ---------- the class's own problem format (2026-11-05) ----------
-- {"demo": true, "fill": 1, "order1": 2, "order2": 1, "write": 1} = how many problems of each kind per assigned lesson.
-- null = the usual set (example, fill, order 1, order 2, write ×2).
alter table public.classes add column if not exists format jsonb check (format is null or jsonb_typeof(format) = 'object');

-- ---------- class live (2026-11-05) ----------
-- While live_until is in the future, the class's students work on the assignment
-- (the app opens it for them and goes from one assigned problem to the next).
alter table public.classes add column if not exists live_until timestamptz;
create or replace function public.start_live(p_class uuid, p_min integer)
  returns public.classes
  language plpgsql security definer set search_path = public as
$$
declare c public.classes;
begin
  if not public.is_teacher_of(p_class) then raise exception 'not_teacher' using errcode = '42501'; end if;
  update public.classes set live_until = now() + make_interval(mins => greatest(5, least(p_min, 240)))
    where id = p_class returning * into c;
  return c;
end
$$;
create or replace function public.stop_live(p_class uuid)
  returns public.classes
  language plpgsql security definer set search_path = public as
$$
declare c public.classes;
begin
  if not public.is_teacher_of(p_class) then raise exception 'not_teacher' using errcode = '42501'; end if;
  update public.classes set live_until = null where id = p_class returning * into c;
  return c;
end
$$;
revoke all on function public.start_live(uuid, integer) from public, anon;
revoke all on function public.stop_live(uuid) from public, anon;
grant execute on function public.start_live(uuid, integer) to authenticated;
grant execute on function public.stop_live(uuid) to authenticated;

-- ---------- students: nickname + 4-digit number, to go on from another device (2026-11-05) ----------
-- The number is kept only as a bcrypt hash in member_pins, which nobody can read directly:
-- only the functions below use it. 5 wrong numbers lock that student for 10 minutes.
create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;
create table if not exists public.member_pins (
  class_id     uuid not null,
  user_id      uuid not null,
  pin_hash     text not null,
  fails        integer not null default 0,
  locked_until timestamptz,
  primary key (class_id, user_id),
  foreign key (class_id, user_id) references public.members (class_id, user_id) on delete cascade on update cascade
);
alter table public.member_pins enable row level security;   -- no policies: no direct access at all
revoke all on public.member_pins from public, anon, authenticated;

-- one nickname per class (only for new names; classes that already have the same name twice keep working)
create or replace function public.nickname_free() returns trigger
  language plpgsql security definer set search_path = public as
$$
begin
  if exists (select 1 from public.members m where m.class_id = new.class_id and m.user_id <> new.user_id
             and lower(btrim(m.nickname)) = lower(btrim(new.nickname))) then
    raise exception 'nickname_taken' using errcode = 'P0001';
  end if;
  return new;
end
$$;
drop trigger if exists members_nickname_free on public.members;
create trigger members_nickname_free before insert or update of nickname on public.members
  for each row execute function public.nickname_free();

create or replace function public.save_pin(p_class uuid, p_user uuid, p_pin text) returns void
  language plpgsql security definer set search_path = public, extensions as
$$
begin
  if coalesce(p_pin, '') !~ '^[0-9]{4}$' then raise exception 'bad_pin' using errcode = '22023'; end if;
  insert into public.member_pins (class_id, user_id, pin_hash) values (p_class, p_user, crypt(p_pin, gen_salt('bf')))
    on conflict (class_id, user_id) do update set pin_hash = excluded.pin_hash, fails = 0, locked_until = null;
end
$$;
revoke all on function public.save_pin(uuid, uuid, text) from public, anon, authenticated;   -- only for the functions below

/* join with a nickname and a 4-digit number */
create or replace function public.join_class(p_code text, p_nickname text, p_pin text)
  returns public.classes
  language plpgsql security definer set search_path = public as
$$
declare c public.classes;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  if coalesce(p_pin, '') !~ '^[0-9]{4}$' then raise exception 'bad_pin' using errcode = '22023'; end if;
  select * into c from public.classes where code = upper(btrim(p_code));
  if not found then raise exception 'class_not_found' using errcode = 'P0002'; end if;
  if not c.open and not public.is_member_of(c.id) then raise exception 'class_closed' using errcode = 'P0001'; end if;
  insert into public.members (class_id, user_id, nickname)
    values (c.id, auth.uid(), left(btrim(p_nickname), 30))
    on conflict (class_id, user_id) do update set nickname = excluded.nickname;
  perform public.save_pin(c.id, auth.uid(), p_pin);
  return c;
end
$$;

/* go on as a student who joined on another device: nickname + number.
 * Returns {"ok": true, "class": …} or {"ok": false, "error": "pin_wrong" | "pin_locked" | "no_pin" | "not_found" | "class_not_found", "left": n}
 * (not an exception, so that a wrong number is still counted) */
create or replace function public.resume_member(p_code text, p_nickname text, p_pin text)
  returns jsonb
  language plpgsql security definer set search_path = public, extensions as
$$
declare c public.classes; m record; found_name boolean := false; had_pin boolean := false; left_tries integer := 5;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  select * into c from public.classes where code = upper(btrim(p_code));
  if not found then return jsonb_build_object('ok', false, 'error', 'class_not_found'); end if;
  for m in select mb.user_id, mp.pin_hash, mp.fails, mp.locked_until from public.members mb
           left join public.member_pins mp on mp.class_id = mb.class_id and mp.user_id = mb.user_id
           where mb.class_id = c.id and mb.user_id <> auth.uid() and lower(btrim(mb.nickname)) = lower(btrim(p_nickname)) loop
    found_name := true;
    if m.pin_hash is null then continue; end if;
    had_pin := true;
    if m.locked_until is not null and m.locked_until > now() then
      return jsonb_build_object('ok', false, 'error', 'pin_locked', 'minutes', ceil(extract(epoch from m.locked_until - now()) / 60));
    end if;
    if coalesce(p_pin, '') ~ '^[0-9]{4}$' and crypt(p_pin, m.pin_hash) = m.pin_hash then
      -- this device becomes that student: membership and answers move to this account
      delete from public.members where class_id = c.id and user_id = auth.uid();
      update public.attempts set user_id = auth.uid() where class_id = c.id and user_id = m.user_id;
      update public.members set user_id = auth.uid() where class_id = c.id and user_id = m.user_id;
      update public.member_pins set fails = 0, locked_until = null where class_id = c.id and user_id = auth.uid();
      return jsonb_build_object('ok', true, 'class', to_jsonb(c));
    end if;
    update public.member_pins set fails = fails + 1, locked_until = case when fails + 1 >= 5 then now() + interval '10 minutes' end
      where class_id = c.id and user_id = m.user_id returning greatest(0, 5 - fails) into left_tries;
    if left_tries = 0 then return jsonb_build_object('ok', false, 'error', 'pin_locked', 'minutes', 10); end if;
    return jsonb_build_object('ok', false, 'error', 'pin_wrong', 'left', left_tries);
  end loop;
  return jsonb_build_object('ok', false, 'error', case when not found_name then 'not_found' when not had_pin then 'no_pin' else 'pin_wrong' end);
end
$$;

/* a student sets or changes their own number */
create or replace function public.set_my_pin(p_class uuid, p_pin text) returns boolean
  language plpgsql security definer set search_path = public as
$$
begin
  if not public.is_member_of(p_class) then raise exception 'not_member' using errcode = '42501'; end if;
  perform public.save_pin(p_class, auth.uid(), p_pin);
  return true;
end
$$;
create or replace function public.my_pin_set(p_class uuid) returns boolean
  language sql stable security definer set search_path = public as
$$ select exists (select 1 from public.member_pins where class_id = p_class and user_id = auth.uid()) $$;

/* the teacher: which students have a number, and a new number for a student who forgot it */
create or replace function public.pin_status(p_class uuid) returns table (user_id uuid, has_pin boolean, locked boolean)
  language plpgsql stable security definer set search_path = public as
$$
begin
  if not public.is_teacher_of(p_class) then raise exception 'not_teacher' using errcode = '42501'; end if;
  return query select mb.user_id, mp.user_id is not null, coalesce(mp.locked_until > now(), false)
    from public.members mb left join public.member_pins mp on mp.class_id = mb.class_id and mp.user_id = mb.user_id
    where mb.class_id = p_class;
end
$$;
create or replace function public.teacher_set_pin(p_class uuid, p_user uuid, p_pin text) returns boolean
  language plpgsql security definer set search_path = public as
$$
begin
  if not public.is_teacher_of(p_class) then raise exception 'not_teacher' using errcode = '42501'; end if;
  if not exists (select 1 from public.members where class_id = p_class and user_id = p_user) then raise exception 'not_member' using errcode = 'P0002'; end if;
  perform public.save_pin(p_class, p_user, p_pin);
  return true;
end
$$;
revoke all on function public.join_class(text, text, text) from public, anon;
revoke all on function public.resume_member(text, text, text) from public, anon;
revoke all on function public.set_my_pin(uuid, text) from public, anon;
revoke all on function public.my_pin_set(uuid) from public, anon;
revoke all on function public.pin_status(uuid) from public, anon;
revoke all on function public.teacher_set_pin(uuid, uuid, text) from public, anon;
grant execute on function public.join_class(text, text, text) to authenticated;
grant execute on function public.resume_member(text, text, text) to authenticated;
grant execute on function public.set_my_pin(uuid, text) to authenticated;
grant execute on function public.my_pin_set(uuid) to authenticated;
grant execute on function public.pin_status(uuid) to authenticated;
grant execute on function public.teacher_set_pin(uuid, uuid, text) to authenticated;

-- ---------- quick test (2026-11-09) ----------
-- A few problems for the whole class; students who solve them all may take a break.
-- quick = {"id": round id, "code": check-test code, "at": start time, "n": number of problems}, null = none.
-- The teacher sets it like any other class setting (classes_update policy).
alter table public.classes add column if not exists quick jsonb check (quick is null or jsonb_typeof(quick) = 'object');
-- answers to it are logged with stage 'quick' (and the 'quiz' questions of Lesson 0 / A13 are allowed too)
alter table public.attempts drop constraint if exists attempts_stage_check;
alter table public.attempts add constraint attempts_stage_check
  check (stage in ('demo', 'fill', 'order', 'write', 'review', 'quiz', 'quick'));

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
