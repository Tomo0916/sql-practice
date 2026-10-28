-- minimal stand-in for Supabase's auth schema, roles and realtime publication (local testing only)
create role anon nologin; create role authenticated nologin;
create schema auth;
create table auth.users (id uuid primary key, is_anonymous boolean default false, email text, email_confirmed_at timestamptz);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claims', true)::json->>'sub','')::uuid $$;
create function auth.jwt() returns jsonb language sql stable as $$ select coalesce(current_setting('request.jwt.claims', true), '{}')::jsonb $$;
grant usage on schema auth to anon, authenticated; grant usage on schema public to anon, authenticated;
grant execute on all functions in schema auth to anon, authenticated;
create publication supabase_realtime;
insert into auth.users values
 ('11111111-1111-1111-1111-111111111111', false, 'Teacher@School.jp', now()),
 ('22222222-2222-2222-2222-222222222222', true, null, null),
 ('33333333-3333-3333-3333-333333333333', true, null, null),
 ('44444444-4444-4444-4444-444444444444', false, 'stranger@example.com', now()),
 ('55555555-5555-5555-5555-555555555555', false, 'unconfirmed@school.jp', null);
