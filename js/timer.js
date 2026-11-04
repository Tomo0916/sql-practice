/* =========================================================
 * timer.js — the class timer, counted on the server's clock
 * so that the teacher's and every student's screen agree.
 * ========================================================= */
let offset = 0;   // server time − this device's time (ms)
export async function syncClock(serverNow) {
  try {
    const t0 = Date.now(); const s = await serverNow(); const t1 = Date.now();
    if (s) offset = s.getTime() - (t0 + t1) / 2;
  } catch (e) { /* keep the device clock */ }
}
/** seconds left (negative after the end), or null when no timer runs */
export function secondsLeft(klass) {
  if (!klass || !klass.timer_end) return null;
  return Math.ceil((new Date(klass.timer_end).getTime() - (Date.now() + offset)) / 1000);
}
export const fmtClock = s => { s = Math.max(0, s); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
/** 'run' | 'warn' (last 30 s) | 'up' (time is up) | '' (no timer) */
export const timerState = s => (s === null ? '' : s <= 0 ? 'up' : s <= 30 ? 'warn' : 'run');
