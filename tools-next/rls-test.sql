\set ON_ERROR_STOP 0
\set QUIET 1
\pset tuples_only on
-- helpers to act as a user
create or replace function pg_temp.as_user(uid text, anon boolean) returns void language plpgsql as $$
begin perform set_config('request.jwt.claims', json_build_object('sub', uid, 'is_anonymous', anon, 'role', 'authenticated')::text, false); end $$;

\echo '--- teacher T (1111) creates a class'
select pg_temp.as_user('11111111-1111-1111-1111-111111111111', false);
set role authenticated;
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
