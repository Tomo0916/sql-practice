\set ON_ERROR_STOP 0
\set QUIET 1
\pset tuples_only on
-- nickname + 4-digit number: join, go on from another device, wrong numbers, lock, teacher
create or replace function pg_temp.as_user(uid text, anon boolean) returns void language plpgsql as $$
begin perform set_config('request.jwt.claims', json_build_object('sub', uid, 'is_anonymous', anon, 'role', 'authenticated')::text, false); end $$;
reset role;
delete from public.classes where name = 'PIN test';
insert into auth.users values ('66666666-6666-6666-6666-666666666666', true, null, null), ('77777777-7777-7777-7777-777777777777', true, null, null) on conflict do nothing;
insert into public.teachers (email) values ('teacher@school.jp') on conflict do nothing;
select pg_temp.as_user('11111111-1111-1111-1111-111111111111', false);
set role authenticated;
select public.create_class('PIN test');
reset role;
select code as cc from public.classes where name = 'PIN test' \gset
\echo '--- A (2222) joins as Mai with 0915'
select pg_temp.as_user('22222222-2222-2222-2222-222222222222', true); set role authenticated;
select 'joined', (public.join_class(:'cc', 'Mai', '0915')).name;
insert into public.attempts (class_id, problem_id, lesson, stage, ok, sql) select id, 'where:write:abc', 'where', 'write', true, 'SELECT 1' from public.classes where code = :'cc';
select 'A can read member_pins? (expect error)'; select * from public.member_pins;
reset role;
\echo '--- B (6666, another device) joins with the same name (expect nickname_taken)'
select pg_temp.as_user('66666666-6666-6666-6666-666666666666', true); set role authenticated;
select public.join_class(:'cc', ' mai ', '1234');
\echo '--- B: wrong number twice (expect left 4, 3)'
select public.resume_member(:'cc', 'Mai', '1111');
select public.resume_member(:'cc', 'MAI', '2222');
\echo '--- B: right number (expect ok)'
select (public.resume_member(:'cc', 'Mai', '0915')) ->> 'ok';
select 'B sees the answer of A:', count(*) from public.attempts where problem_id = 'where:write:abc';
select 'B pin set:', public.my_pin_set((select id from public.classes where code = :'cc'));
reset role;
select 'members of the class:', string_agg(user_id::text || '=' || nickname, ', ') from public.members m join public.classes c on c.id = m.class_id where c.code = :'cc';
\echo '--- A (old device) is no longer a member (expect false)'
select pg_temp.as_user('22222222-2222-2222-2222-222222222222', true); set role authenticated;
select 'A member:', public.is_member_of((select id from public.classes where code = :'cc'));
reset role;
\echo '--- C (7777) guesses 5 times (expect pin_wrong ×4, then pin_locked; then locked even with the right number)'
select pg_temp.as_user('77777777-7777-7777-7777-777777777777', true); set role authenticated;
select public.resume_member(:'cc', 'Mai', '0001') ->> 'error', public.resume_member(:'cc', 'Mai', '0002') ->> 'left';
select public.resume_member(:'cc', 'Mai', '0003') ->> 'left', public.resume_member(:'cc', 'Mai', '0004') ->> 'left';
select public.resume_member(:'cc', 'Mai', '0005');
select public.resume_member(:'cc', 'Mai', '0915');
select public.resume_member(:'cc', 'Nobody', '0915');
reset role;
\echo '--- teacher: status and a new number'
select pg_temp.as_user('11111111-1111-1111-1111-111111111111', false); set role authenticated;
select * from public.pin_status((select id from public.classes where code = :'cc'));
select public.teacher_set_pin((select id from public.classes where code = :'cc'), '66666666-6666-6666-6666-666666666666', '4321');
select * from public.pin_status((select id from public.classes where code = :'cc'));
reset role;
\echo '--- C with the new number (expect ok)'
select pg_temp.as_user('77777777-7777-7777-7777-777777777777', true); set role authenticated;
select public.resume_member(:'cc', 'Mai', '4321') ->> 'ok';
\echo '--- bad number format (expect bad_pin)'
select public.set_my_pin((select id from public.classes where code = :'cc'), '12a4');
\echo '--- a stranger cannot read pins or set them (expect errors)'
reset role; select pg_temp.as_user('33333333-3333-3333-3333-333333333333', true); set role authenticated;
select public.pin_status((select id from public.classes where code = :'cc'));
select public.save_pin((select id from public.classes where code = :'cc'), '33333333-3333-3333-3333-333333333333', '0000');
reset role;
