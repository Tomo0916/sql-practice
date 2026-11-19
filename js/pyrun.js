/* =========================================================
 * pyrun.js — the page's side of Python: start the worker (once, when the Python
 * course is opened), run code with a time limit, and restart after a stop.
 * Pyodide comes from the jsDelivr CDN (about 45 MB the first time, then from the browser's cache).
 * ========================================================= */
import { pdAllTables } from './pandas.js';

export const PY_BASE = 'https://cdn.jsdelivr.net/pyodide/v0.27.2/full/';
const LIMIT_MS = 8000;
let worker = null, state = 'idle', readyP = null, plotP = null, seq = 0;
const waiting = new Map(), listeners = new Set();
const tell = () => listeners.forEach(f => f(state));

/** 'idle' | 'loading' | 'pandas' | 'ready' | 'failed' */
export const pyState = () => state;
export const onPyState = f => { listeners.add(f); return () => listeners.delete(f); };

function start() {
  worker = new Worker(new URL('./py-worker.js', import.meta.url));
  state = 'loading'; tell();
  readyP = new Promise((resolve, reject) => {
    worker.onmessage = e => {
      const m = e.data;
      if (m.type === 'progress') { state = m.step; tell(); return; }
      if (m.type === 'ready') { state = 'ready'; tell(); resolve(); return; }
      if (m.type === 'failed') { state = 'failed'; tell(); reject(new Error(m.error)); return; }
      const w = waiting.get(m.id); if (w) { waiting.delete(m.id); clearTimeout(w.timer); w.resolve(m); }
    };
    worker.onerror = err => { state = 'failed'; tell(); reject(err); };
  });
  worker.postMessage({ type: 'init', base: PY_BASE, tables: pdAllTables() });
  readyP.catch(() => {});
}
/** code that draws a chart (Lesson 21): matplotlib is loaded first, without the time limit */
export const drawsChart = code => /\.plot\b|\bplt\b|matplotlib|\.hist\(/.test(code);
/** load matplotlib (once per worker) */
export function pyPlotWarm() {
  pyWarm();
  if (!plotP) {
    const w = worker;
    plotP = readyP.then(() => new Promise((resolve, reject) => {
      const id = ++seq;
      waiting.set(id, { resolve: m => (m.ok ? resolve() : reject(new Error(m.error))), timer: null });
      w.postMessage({ type: 'plot', id });
    }));
    plotP.catch(() => { plotP = null; });
  }
  return plotP;
}
/** load Python in the background (does nothing when it is loading or loaded) */
export function pyWarm() { if (!worker || state === 'failed') start(); return readyP; }
/** run code; need = the table names it may use → { ok, result, out, error, line, timeout } */
export async function pyRun(code, need) {
  pyWarm();
  await readyP;
  if (drawsChart(code)) { try { await pyPlotWarm(); } catch (e) { return { ok: false, error: String(e && e.message || e) }; } }
  const id = ++seq;
  return new Promise(resolve => {
    const timer = setTimeout(() => {   // too long (an endless loop …): stop the worker, start a new one
      waiting.delete(id); worker.terminate(); worker = null; plotP = null; state = 'idle'; pyWarm();
      resolve({ ok: false, timeout: true, error: 'timeout' });
    }, LIMIT_MS);
    waiting.set(id, { resolve, timer });
    worker.postMessage({ type: 'run', id, code, need });
  });
}
