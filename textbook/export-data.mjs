// Print the app's sample tables used by the textbooks as JSON (one source of truth for data):
// products and students (SQL textbook) and every data-analysis table (Kumo Mart and the practice tables).
import { ALL_TABLES } from '../next/js/datasets.js';
const pick = ['products', 'students', ...Object.keys(ALL_TABLES).filter(k => ALL_TABLES[k].analysis)];
process.stdout.write(JSON.stringify(Object.fromEntries(pick.map(t => [t, ALL_TABLES[t]]))));
