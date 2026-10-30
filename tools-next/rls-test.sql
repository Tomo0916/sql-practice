\set ON_ERROR_STOP 0
\set QUIET 1
\pset tuples_only on
-- helpers to act as a user
create or replace function pg_temp.as_user(uid text, anon boolean) returns void language plpgsql as $$
begin perform set_config('request.jwt.claims', json_build_object('sub', uid, 'is_anonymous', anon, 'role', 'authenticated')::text, false); end $$;

reset role;
insert into public.teachers (email) values ('teacher@school.jp'), ('unconfirmed@school.jp');
\echo '--- unlisted account (4444) cannot create a class (expect not_teacher)'
select pg_temp.as_user('44444444-4444-4444-4444-444444444444', false);
set role authenticated;
select 'am_i_teacher (stranger)', public.am_i_teacher();
select public.create_class('spam');
insert into classes (code, name) values ('SPAM01', 'spam');
reset role;
\echo '--- listed but email not confirmed (5555) cannot create (expect not_teacher)'
select pg_temp.as_user('55555555-5555-5555-5555-555555555555', false);
set role authenticated;
select public.create_class('x');
reset role;
\echo '--- students cannot read the teacher list (expect permission denied)'
select pg_temp.as_user('22222222-2222-2222-2222-222222222222', true);
set role authenticated;
select * from public.teachers;
reset role;
\echo '--- teacher T (1111) creates a class'
select pg_temp.as_user('11111111-1111-1111-1111-111111111111', false);
set role authenticated;
select 'am_i_teacher (listed)', public.am_i_teacher();
select 'created', (c).name from (select public.create_class('IT 1年A') c) x;
select 'code ok', code ~ '^[A-Z0-9]{6}$' from classes;
reset role;
select set_config('test.code', (select code from classes limit 1), false);
select set_config('test.cid', (select id::text from classes limit 1), false);

\echo '--- anonymous student cannot create a class (expect error)'
select pg_temp.as_user('22222222-2222-2222-2222-222222222222', true);
set role authenticated;
select public.create_class('hack');
insert into classes (code, name) values ('ABCDEF', 'hack');

\echo '--- student S1 (2222) cannot see the class before joining (expect 0)'
select 'visible before join', count(*) from classes;
\echo '--- S1 joins with code + nickname'
select 'joined', (c).name from (select public.join_class(lower(current_setting('test.code')), 'Ram') c) x;
select 'visible after join', count(*) from classes;
\echo '--- wrong code (expect class_not_found)'
select public.join_class('ZZZZZZ', 'x');
\echo '--- S1 logs attempts'
insert into attempts (class_id, problem_id, lesson, stage, ok, reason, sql) values (current_setting('test.cid')::uuid, 'topn:demo', 'topn', 'demo', false, 'values', 'SELECT 1');
insert into attempts (class_id, problem_id, lesson, stage, ok) values (current_setting('test.cid')::uuid, 'topn:demo', 'topn', 'demo', true);
\echo '--- S1 cannot log as someone else (expect error)'
insert into attempts (class_id, user_id, problem_id, lesson, stage, ok) values (current_setting('test.cid')::uuid, '33333333-3333-3333-3333-333333333333', 'x', 'x', 'write', true);
\echo '--- S1 cannot change the assignment (expect UPDATE 0 rows)'
update classes set lessons = '{hack}';
select 'lessons still', lessons from classes;
\echo '--- S1 cannot move membership to another class (expect permission error)'
update members set class_id = gen_random_uuid();
update members set nickname = 'Ram K';
reset role;

\echo '--- student S2 (3333) joins, cannot see S1 attempts or membership'
select pg_temp.as_user('33333333-3333-3333-3333-333333333333', true);
set role authenticated;
select (c).name from (select public.join_class(current_setting('test.code'), 'Mai') c) x;
select 'S2 sees attempts', count(*) from attempts;
select 'S2 sees members', count(*) from members;
\echo '--- S2 cannot insert into a class they did not join'
reset role;

\echo '--- teacher T sees everything in own class'
select pg_temp.as_user('11111111-1111-1111-1111-111111111111', false);
set role authenticated;
select 'T sees attempts', count(*) from attempts;
select 'T sees members', string_agg(nickname, ',' order by nickname) from members;
update classes set lessons = '{topn,having}', set_code = 'K7Q2', answer_policy = 'solved';
select 'assignment', lessons, set_code, answer_policy from classes;
reset role;

\echo '--- other teacher U (4444) sees nothing'
select pg_temp.as_user('44444444-4444-4444-4444-444444444444', false);
set role authenticated;
select 'U sees classes', count(*) from classes;
select 'U sees attempts', count(*) from attempts;
delete from classes;
reset role;
select 'class survives', count(*) from classes;

\echo '--- teacher closes class; new join refused'
select pg_temp.as_user('11111111-1111-1111-1111-111111111111', false);
set role authenticated;
update classes set open = false;
reset role;
select pg_temp.as_user('44444444-4444-4444-4444-444444444444', true);
set role authenticated;
select public.join_class(current_setting('test.code'), 'late');
reset role;
\echo '--- anon role (not signed in) sees nothing'
set role anon;
select count(*) from classes;
reset role;
\echo '--- realtime publication tables'
select string_agg(tablename, ',') from pg_publication_tables where pubname = 'supabase_realtime';

\echo '--- teacher removed from the list loses access to own class (expect 0 / 0 / UPDATE 0)'
reset role;
delete from public.teachers where email = 'teacher@school.jp';
select pg_temp.as_user('11111111-1111-1111-1111-111111111111', false);
set role authenticated;
select 'delisted sees classes', count(*) from classes;
select 'delisted sees attempts', count(*) from attempts;
update classes set name = 'hijack';
reset role;
select 'name unchanged', name from classes;

\echo '=== class timer ==='
reset role;
insert into public.teachers (email) values ('teacher@school.jp') on conflict do nothing;
update classes set open = true;
\echo '--- student cannot start or stop the timer (expect not_teacher twice)'
select pg_temp.as_user('22222222-2222-2222-2222-222222222222', true);
set role authenticated;
select public.start_timer(current_setting('test.cid')::uuid, 60);
select public.stop_timer(current_setting('test.cid')::uuid);
select 'server_now works', public.server_now() is not null;
\echo '--- Lesson 0 answers (stage quiz) can be logged'
insert into attempts (class_id, problem_id, lesson, stage, ok, sql) values (current_setting('test.cid')::uuid, 'intro:quiz:1', 'intro', 'quiz', true, '6');
\echo '--- a student cannot mark an answer late or on time themselves (expect late = false while no timer)'
insert into attempts (class_id, problem_id, lesson, stage, ok, late) values (current_setting('test.cid')::uuid, 'x:1', 'x', 'write', true, true);
reset role;
select 'forced late ignored', late from attempts where problem_id = 'x:1';
\echo '--- teacher starts a 60 s timer; the student sees the end time'
select pg_temp.as_user('11111111-1111-1111-1111-111111111111', false);
set role authenticated;
select 'timer set', timer_sec, timer_end > now() + interval '59 seconds' from (select (public.start_timer(current_setting('test.cid')::uuid, 60)).*) x;
select 'timer clamped', (public.start_timer(current_setting('test.cid')::uuid, 99999)).timer_sec;
reset role;
select pg_temp.as_user('22222222-2222-2222-2222-222222222222', true);
set role authenticated;
select 'student sees timer', timer_end is not null from classes;
insert into attempts (class_id, problem_id, lesson, stage, ok) values (current_setting('test.cid')::uuid, 'x:2', 'x', 'write', true);
\echo '--- after the end, answers are marked late'
reset role;
update classes set timer_end = now() - interval '1 second';
select pg_temp.as_user('22222222-2222-2222-2222-222222222222', true);
set role authenticated;
insert into attempts (class_id, problem_id, lesson, stage, ok) values (current_setting('test.cid')::uuid, 'x:3', 'x', 'write', true);
reset role;
select 'on time / late', string_agg(problem_id || '=' || late, ' ' order by problem_id) from attempts where problem_id in ('x:2', 'x:3');
\echo '--- teacher stops the timer; answers are on time again'
select pg_temp.as_user('11111111-1111-1111-1111-111111111111', false);
set role authenticated;
select 'stopped', (public.stop_timer(current_setting('test.cid')::uuid)).timer_end is null;
reset role;
select pg_temp.as_user('22222222-2222-2222-2222-222222222222', true);
set role authenticated;
insert into attempts (class_id, problem_id, lesson, stage, ok) values (current_setting('test.cid')::uuid, 'x:4', 'x', 'write', true);
reset role;
select 'after stop', late from attempts where problem_id = 'x:4';
