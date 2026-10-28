// Test double for vendor/supabase.js (only for headless tests; never deployed).
// Implements the subset of supabase-js used by backend.js. Data lives in localStorage
// (shared by all tabs of the same origin); "realtime" uses BroadcastChannel.
const K = 'mock.db';
const load = () => JSON.parse(localStorage.getItem(K) || '{"users":[],"classes":[],"members":[],"attempts":[],"seq":1}');
const save = db => localStorage.setItem(K, JSON.stringify(db));
const bc = new BroadcastChannel('mock-rt');
const uid = () => 'xxxxxxxx-xxxx-4xxx-8xxx-xxxxxxxxxxxx'.replace(/x/g, () => Math.floor(Math.random() * 16).toString(16));
const ok = data => ({ data, error: null });
const fail = message => ({ data: null, error: { message } });

function session() { const s = sessionStorage.getItem('mock.sess') || localStorage.getItem('mock.sess.' + location.pathname); return s ? JSON.parse(s) : null; }
function setSession(s) { if (s) localStorage.setItem('mock.sess.' + location.pathname, JSON.stringify(s)); else localStorage.removeItem('mock.sess.' + location.pathname); }

class Query {
  constructor(table) { this.table = table; this.filters = []; this.op = 'select'; this.payload = null; this.single = false; this.maybe = false; this.ord = null; this.rng = null; this.ret = false; }
  select() { if (this.op !== 'select') this.ret = true; return this; }
  insert(rows) { this.op = 'insert'; this.payload = Array.isArray(rows) ? rows : [rows]; return this; }
  update(p) { this.op = 'update'; this.payload = p; return this; }
  delete() { this.op = 'delete'; return this; }
  eq(c, v) { this.filters.push(r => r[c] === v); return this; }
  gte(c, v) { this.filters.push(r => r[c] >= v); return this; }
  order(c, o) { this.ord = [c, o && o.ascending === false ? -1 : 1]; return this; }
  range(a, b) { this.rng = [a, b]; return this; }
  maybeSingle() { this.maybe = true; return this; }
  then(res, rej) { return Promise.resolve(this.run()).then(res, rej); }
  visible(db, row) {
    const s = session(); const me = s && s.user.id;
    const isTeacher = cid => db.classes.some(c => c.id === cid && c.teacher_id === me);
    const isMember = cid => db.members.some(m => m.class_id === cid && m.user_id === me);
    if (this.table === 'classes') return row.teacher_id === me || isMember(row.id);
    if (this.table === 'members' || this.table === 'attempts') return row.user_id === me || isTeacher(row.class_id);
    return false;
  }
  run() {
    const db = load(); const s = session();
    if (!s) return fail('not signed in');
    let rows = db[this.table];
    if (this.op === 'insert') {
      if (this.table !== 'attempts') return fail('permission denied');
      for (const r of this.payload) {
        if (!db.members.some(m => m.class_id === r.class_id && m.user_id === s.user.id)) return fail('new row violates row-level security policy');
        const row = Object.assign({ id: db.seq++, user_id: s.user.id, created_at: new Date().toISOString() }, r);
        db.attempts.push(row); bc.postMessage({ table: 'attempts', type: 'INSERT', row });
      }
      save(db); return ok(null);
    }
    let sel = rows.filter(r => this.visible(db, r) && this.filters.every(f => f(r)));
    if (this.op === 'update') {
      sel.forEach(r => { if (this.table === 'classes' && r.teacher_id !== s.user.id) return; Object.assign(r, this.payload, { updated_at: new Date().toISOString() }); bc.postMessage({ table: this.table, type: 'UPDATE', row: r }); });
      save(db);
      return this.single ? ok(sel[0] || null) : ok(sel);
    }
    if (this.op === 'delete') {
      const ids = new Set(sel);
      db[this.table] = rows.filter(r => !ids.has(r));
      if (this.table === 'classes') { const cids = new Set(sel.map(c => c.id)); db.members = db.members.filter(m => !cids.has(m.class_id)); db.attempts = db.attempts.filter(a => !cids.has(a.class_id)); }
      save(db); sel.forEach(r => bc.postMessage({ table: this.table, type: 'DELETE', row: r }));
      return ok(null);
    }
    if (this.ord) sel = sel.slice().sort((a, b) => (a[this.ord[0]] > b[this.ord[0]] ? 1 : -1) * this.ord[1]);
    if (this.rng) sel = sel.slice(this.rng[0], this.rng[1] + 1);
    if (this.single) return sel[0] ? ok(sel[0]) : fail('no rows');
    if (this.maybe) return ok(sel[0] || null);
    return ok(sel);
  }
}

export function createClient() {
  const listeners = [];
  const auth = {
    async getSession() { return { data: { session: session() } }; },
    async signInAnonymously() { const user = { id: uid(), is_anonymous: true }; const s = { user }; setSession(s); return ok({ session: s, user }); },
    async signInWithPassword({ email, password }) {
      const db = load(); const u = db.users.find(x => x.email === email && x.password === password);
      if (!u) return fail('Invalid login credentials');
      const s = { user: { id: u.id, email, is_anonymous: false } }; setSession(s); listeners.forEach(f => f('SIGNED_IN', s)); return ok({ session: s });
    },
    async signUp({ email, password }) {
      const db = load(); if (db.users.some(x => x.email === email)) return fail('User already registered');
      const u = { id: uid(), email, password }; db.users.push(u); save(db);
      const s = { user: { id: u.id, email, is_anonymous: false } }; setSession(s); return ok({ session: s, user: s.user });
    },
    async signOut() { setSession(null); listeners.forEach(f => f('SIGNED_OUT', null)); return ok(null); },
    async resetPasswordForEmail() { return ok({}); },
    async updateUser() { return ok({}); },
    onAuthStateChange(f) { listeners.push(f); return { data: { subscription: { unsubscribe() {} } } }; }
  };
  return {
    auth,
    from(t) { const q = new Query(t); q.single = false; const proxy = new Proxy(q, { get(o, p) { if (p === 'single') return () => { o.single = true; return proxy; }; const v = o[p]; return typeof v === 'function' ? (...a) => { const r = v.apply(o, a); return r === o ? proxy : r; } : v; } }); return proxy; },
    async rpc(name, args) {
      const db = load(); const s = session();
      if (!s) return fail('not signed in');
      if (name === 'join_class') {
        const c = db.classes.find(x => x.code === String(args.p_code).trim().toUpperCase());
        if (!c) return fail('class_not_found');
        if (!c.open) return fail('class_closed');
        const m = db.members.find(x => x.class_id === c.id && x.user_id === s.user.id);
        if (m) m.nickname = args.p_nickname; else db.members.push({ class_id: c.id, user_id: s.user.id, nickname: args.p_nickname, joined_at: new Date().toISOString() });
        save(db); bc.postMessage({ table: 'members', type: 'INSERT', row: { class_id: c.id } });
        return ok(c);
      }
      const listed = () => !s.user.is_anonymous && (db.teachers || []).includes(String(s.user.email || '').toLowerCase());
      if (name === 'am_i_teacher') return ok(listed());
      if (name === 'create_class') {
        if (!listed()) return fail('not_teacher');
        const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; let code = ''; for (let i = 0; i < 6; i++) code += A[Math.floor(Math.random() * A.length)];
        const d = new Date(); const set = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
        const c = { id: uid(), code, name: args.p_name, teacher_id: s.user.id, set_code: set, lessons: [], answer_policy: 'after2', open: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
        db.classes.push(c); save(db); return ok(c);
      }
      return fail('unknown rpc');
    },
    channel() {
      const subs = [];
      const ch = {
        on(_kind, opt, cb) { subs.push({ opt, cb }); return ch; },
        subscribe() { ch.h = e => { for (const s of subs) { if (s.opt.table !== e.data.table) continue; if (s.opt.event !== '*' && s.opt.event !== e.data.type) continue; const [col, val] = (s.opt.filter || '=eq.').split('=eq.'); if (s.opt.filter && String(e.data.row[col]) !== val) continue; s.cb({ new: e.data.row }); } }; bc.addEventListener('message', ch.h); return ch; },
        unsubscribe() { bc.removeEventListener('message', ch.h); }
      };
      return ch;
    },
    removeChannel(ch) { ch.unsubscribe(); }
  };
}
