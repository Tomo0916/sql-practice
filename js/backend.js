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
const missingFn = e => e.code === 'PGRST202' || /could not find the function|schema cache/i.test(e.message || '');
const KNOWN = ['class_not_found', 'class_closed', 'nickname_taken', 'bad_pin', 'not_member'];
const known = e => { const k = KNOWN.find(x => (e.message || '').includes(x)); if (k) e.message = k; return e; };
/**
 * Join with a nickname and a 4-digit number (the number lets the student go on from another device).
 * → { klass, pinSet }. Errors: 'class_not_found', 'class_closed', 'nickname_taken', 'bad_pin', 'anon_disabled'
 * A database without the new functions (schema.sql not run again) still joins, without a number.
 */
export async function joinClass(code, nickname, pin) {
  const sb = await client();
  try { await ensureSession(sb); } catch (e) { const err = new Error('anon_disabled'); err.cause = e; throw err; }
  try { return { klass: check(await sb.rpc('join_class', { p_code: code, p_nickname: nickname, p_pin: pin })), pinSet: true }; }
  catch (e) {
    if (!missingFn(e)) throw known(e);
    try { return { klass: check(await sb.rpc('join_class', { p_code: code, p_nickname: nickname })), pinSet: false }; } catch (e2) { throw known(e2); }
  }
}
/** go on as a student who joined on another device. → class row; errors 'pin_wrong' (e.left), 'pin_locked' (e.minutes), 'no_pin', 'not_found', 'class_not_found', 'pin_missing' */
export async function resumeMember(code, nickname, pin) {
  const sb = await client();
  try { await ensureSession(sb); } catch (e) { const err = new Error('anon_disabled'); err.cause = e; throw err; }
  let r;
  try { r = check(await sb.rpc('resume_member', { p_code: code, p_nickname: nickname, p_pin: pin })); }
  catch (e) { if (missingFn(e)) e.message = 'pin_missing'; throw e; }
  if (r && r.ok) return r.class;
  const err = new Error((r && r.error) || 'error'); err.left = r && r.left; err.minutes = r && r.minutes; throw err;
}
export async function setMyPin(classId, pin) { const sb = await client(); try { return check(await sb.rpc('set_my_pin', { p_class: classId, p_pin: pin })); } catch (e) { if (missingFn(e)) e.message = 'pin_missing'; throw known(e); } }
/** true / false; null when the database does not know numbers yet */
export async function myPinSet(classId) { const sb = await client(); try { return check(await sb.rpc('my_pin_set', { p_class: classId })); } catch (e) { if (missingFn(e)) return null; throw e; } }
/** teacher: [{user_id, has_pin, locked}] (empty when the database does not know numbers yet) */
export async function pinStatus(classId) { const sb = await client(); try { return check(await sb.rpc('pin_status', { p_class: classId })); } catch (e) { if (missingFn(e)) return []; throw e; } }
export async function teacherSetPin(classId, userId, pin) { const sb = await client(); try { return check(await sb.rpc('teacher_set_pin', { p_class: classId, p_user: userId, p_pin: pin })); } catch (e) { if (missingFn(e)) e.message = 'pin_missing'; throw known(e); } }
/** the student's own answers in a class (to bring back the record on this device) */
export async function myAttempts(classId) {
  const sb = await client();
  const { data } = await sb.auth.getSession();
  if (!data.session) return [];
  return check(await sb.from('attempts').select('problem_id, lesson, stage, ok, sql, created_at').eq('class_id', classId).eq('user_id', data.session.user.id).order('id'));
}
export async function getClass(classId) {
  const sb = await client();
  return check(await sb.from('classes').select('*').eq('id', classId).maybeSingle());
}
/** the parts of the class row a student's screen follows (a light request, for when the live connection missed a change) */
export async function classPulse(classId) {
  const sb = await client();
  return check(await sb.from('classes').select('name, set_code, lessons, answer_policy, timer_end, format, live_until, quick').eq('id', classId).maybeSingle());
}
export async function leaveClass(classId) {
  const sb = await client();
  const { data } = await sb.auth.getSession();
  if (data.session) await sb.from('members').delete().eq('class_id', classId).eq('user_id', data.session.user.id);
}
export async function renameMe(classId, nickname) {   // error 'nickname_taken' when another student has that name
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
    else if (/check constraint/i.test(error.message)) {   // one row the database does not accept yet (e.g. schema.sql not run again): send the others one by one
      for (const row of q) { const r = await sb.from('attempts').insert(row); if (r.error && !/check constraint|row-level security|violates/i.test(r.error.message)) throw r.error; }
      Store.set(QKEY, Store.get(QKEY, []).slice(q.length));
    }
    else if (/row-level security|violates/i.test(error.message)) Store.set(QKEY, []); // no longer a member: drop
  } catch (e) { /* offline: keep queue */ }
  finally { flushing = false; }
}
if (typeof window !== 'undefined') window.addEventListener('online', () => flushAttempts());

/** Live updates of the class assignment for students. Returns an unsubscribe function. */
export async function watchClass(classId, onChange, onPing) {
  const sb = await client();
  const ch = sb.channel('class-' + classId)
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'classes', filter: `id=eq.${classId}` }, p => onChange(p.new))
    .subscribe();
  // the teacher's page also says "changed" directly (pingClass): read the row again
  const ping = sb.channel('ping-' + classId).on('broadcast', { event: 'changed' }, () => { if (onPing) onPing(); }).subscribe();
  return () => { sb.removeChannel(ch); sb.removeChannel(ping); };
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
/**
 * Tell the students of a class that its row has changed (a short message to everyone who is connected).
 * The students then read the row again; this does not depend on the database's own change events.
 */
export async function pingClass(id) {
  try { const sb = await client(), ch = sb.channel('ping-' + id); await ch.send({ type: 'broadcast', event: 'changed', payload: {} }); sb.removeChannel(ch); } catch (e) { /* the students also ask by themselves */ }
}
const pinged = (id, row) => { pingClass(id); return row; };
export async function updateClass(id, patch) { const sb = await client(); return pinged(id, check(await sb.from('classes').update(patch).eq('id', id).select().single())); }
/** class timer: the server sets the end time. Error 'timer_missing' when schema.sql has not been run again yet. */
export async function startTimer(id, sec) { const sb = await client(); try { return pinged(id, check(await sb.rpc('start_timer', { p_class: id, p_sec: sec }))); } catch (e) { if (e.code === 'PGRST202' || /could not find the function|schema cache/i.test(e.message)) { e.raw = e.message; e.message = 'timer_missing'; } throw e; } }
/** class live: the students work on the assignment until the end time. Error 'live_missing' when schema.sql has not been run again yet. */
export async function startLive(id, min) { const sb = await client(); try { return pinged(id, check(await sb.rpc('start_live', { p_class: id, p_min: min }))); } catch (e) { if (e.code === 'PGRST202' || /could not find the function|schema cache/i.test(e.message)) { e.raw = e.message; e.message = 'live_missing'; } throw e; } }
export async function stopLive(id) { const sb = await client(); return pinged(id, check(await sb.rpc('stop_live', { p_class: id }))); }
export async function stopTimer(id) { const sb = await client(); return pinged(id, check(await sb.rpc('stop_timer', { p_class: id }))); }
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
export async function watchDashboard(classId, onAttempt, onMember, onStatus) {
  const sb = await client();
  const ch = sb.channel('dash-' + classId)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'attempts', filter: `class_id=eq.${classId}` }, p => onAttempt(p.new))
    .on('postgres_changes', { event: '*', schema: 'public', table: 'members', filter: `class_id=eq.${classId}` }, () => onMember())
    .subscribe(status => { if (onStatus) onStatus(status); });   // SUBSCRIBED · CHANNEL_ERROR · TIMED_OUT · CLOSED
  return () => sb.removeChannel(ch);
}
