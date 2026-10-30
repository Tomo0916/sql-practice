/* =========================================================
 * backend.js — Supabase connection (optional)
 * If config.js has no URL/key, everything still works locally;
 * only class features (joining, live dashboard) are unavailable.
 * ========================================================= */
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../config.js';
import { Store } from './store.js';

export const enabled = !!(SUPABASE_URL && SUPABASE_ANON_KEY);
let clientPromise = null;
export function client() {
  if (!enabled) return Promise.reject(new Error('backend_disabled'));
  if (!clientPromise) {
    clientPromise = import('../vendor/supabase.js').then(({ createClient }) =>
      createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: true, autoRefreshToken: true, storageKey: 'sqln.auth' } }));
  }
  return clientPromise;
}
function check({ data, error }) { if (error) { const e = new Error(error.message || 'error'); e.code = error.code; e.details = error; throw e; } return data; }

/* ---------- students ---------- */
async function ensureSession(sb) {
  const { data } = await sb.auth.getSession();
  if (data.session) return data.session;
  return check(await sb.auth.signInAnonymously()).session;
}
/** → class row. Errors: 'class_not_found', 'class_closed', 'anon_disabled' */
export async function joinClass(code, nickname) {
  const sb = await client();
  try { await ensureSession(sb); } catch (e) { const err = new Error('anon_disabled'); err.cause = e; throw err; }
  try { return check(await sb.rpc('join_class', { p_code: code, p_nickname: nickname })); }
  catch (e) { if (/class_not_found/.test(e.message)) e.message = 'class_not_found'; if (/class_closed/.test(e.message)) e.message = 'class_closed'; throw e; }
}
export async function getClass(classId) {
  const sb = await client();
  return check(await sb.from('classes').select('*').eq('id', classId).maybeSingle());
}
export async function leaveClass(classId) {
  const sb = await client();
  const { data } = await sb.auth.getSession();
  if (data.session) await sb.from('members').delete().eq('class_id', classId).eq('user_id', data.session.user.id);
}
export async function renameMe(classId, nickname) {
  const sb = await client();
  const { data } = await sb.auth.getSession();
  if (!data.session) return;
  check(await sb.from('members').update({ nickname }).eq('class_id', classId).eq('user_id', data.session.user.id));
}

/* attempts are queued locally so nothing is lost when the network drops */
const QKEY = 'sqln.queue';
let flushing = false;
export function logAttempt(row) {
  const q = Store.get(QKEY, []);
  q.push(row);
  Store.set(QKEY, q.slice(-500));
  flushAttempts();
}
export async function flushAttempts() {
  if (!enabled || flushing) return;
  const q = Store.get(QKEY, []);
  if (!q.length) return;
  flushing = true;
  try {
    const sb = await client();
    await ensureSession(sb);
    const { error } = await sb.from('attempts').insert(q);
    if (!error) Store.set(QKEY, Store.get(QKEY, []).slice(q.length));
    else if (/row-level security|violates/i.test(error.message)) Store.set(QKEY, []); // no longer a member: drop
  } catch (e) { /* offline: keep queue */ }
  finally { flushing = false; }
}
if (typeof window !== 'undefined') window.addEventListener('online', () => flushAttempts());

/** Live updates of the class assignment for students. Returns an unsubscribe function. */
export async function watchClass(classId, onChange) {
  const sb = await client();
  const ch = sb.channel('class-' + classId)
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'classes', filter: `id=eq.${classId}` }, p => onChange(p.new))
    .subscribe();
  return () => sb.removeChannel(ch);
}

/** the server's clock (null if unknown) */
export async function serverNow() {
  const sb = await client();
  const { data, error } = await sb.rpc('server_now');
  return error || !data ? null : new Date(data);
}

/* ---------- teachers ---------- */
export async function teacherSession() {
  const sb = await client();
  const { data } = await sb.auth.getSession();
  const s = data.session;
  if (!s || s.user.is_anonymous) return null;
  return s;
}
export async function signIn(email, password) { const sb = await client(); return check(await sb.auth.signInWithPassword({ email, password })); }
/** Is the signed-in account on the teacher list (public.teachers)? */
export async function amITeacher() { const sb = await client(); return !!check(await sb.rpc('am_i_teacher')); }
export async function signUp(email, password) {
  const sb = await client();
  return check(await sb.auth.signUp({ email, password, options: { emailRedirectTo: location.href.split('#')[0] } }));
}
export async function signOut() { const sb = await client(); await sb.auth.signOut(); }
export async function resetPassword(email) { const sb = await client(); return check(await sb.auth.resetPasswordForEmail(email, { redirectTo: location.href.split('#')[0] })); }

export async function myClasses() {
  const sb = await client();
  const s = await teacherSession();
  if (!s) return [];
  return check(await sb.from('classes').select('*').eq('teacher_id', s.user.id).order('created_at', { ascending: false }));
}
export async function createClass(name) { const sb = await client(); return check(await sb.rpc('create_class', { p_name: name })); }
export async function updateClass(id, patch) { const sb = await client(); return check(await sb.from('classes').update(patch).eq('id', id).select().single()); }
/** class timer: the server sets the end time. Error 'timer_missing' when schema.sql has not been run again yet. */
export async function startTimer(id, sec) { const sb = await client(); try { return check(await sb.rpc('start_timer', { p_class: id, p_sec: sec })); } catch (e) { if (e.code === 'PGRST202' || /could not find the function|schema cache/i.test(e.message)) { e.raw = e.message; e.message = 'timer_missing'; } throw e; } }
export async function stopTimer(id) { const sb = await client(); return check(await sb.rpc('stop_timer', { p_class: id })); }
export async function deleteClass(id) { const sb = await client(); check(await sb.from('classes').delete().eq('id', id)); }
export async function members(classId) { const sb = await client(); return check(await sb.from('members').select('user_id, nickname, joined_at').eq('class_id', classId).order('joined_at')); }
export async function removeMember(classId, userId) { const sb = await client(); check(await sb.from('members').delete().eq('class_id', classId).eq('user_id', userId)); }
export async function attempts(classId, sinceIso) {
  const sb = await client();
  const out = [];
  for (let from = 0; ; from += 1000) {
    let q = sb.from('attempts').select('*').eq('class_id', classId).order('id').range(from, from + 999);
    if (sinceIso) q = q.gte('created_at', sinceIso);
    const rows = check(await q);
    out.push(...rows);
    if (rows.length < 1000) break;
  }
  return out;
}
export async function clearAttempts(classId) { const sb = await client(); check(await sb.from('attempts').delete().eq('class_id', classId)); }
/** Live attempts + new members for the teacher dashboard. */
export async function watchDashboard(classId, onAttempt, onMember) {
  const sb = await client();
  const ch = sb.channel('dash-' + classId)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'attempts', filter: `class_id=eq.${classId}` }, p => onAttempt(p.new))
    .on('postgres_changes', { event: '*', schema: 'public', table: 'members', filter: `class_id=eq.${classId}` }, () => onMember())
    .subscribe();
  return () => sb.removeChannel(ch);
}
