// Print the app's sample tables used by the textbook as JSON (one source of truth for data).
import { ALL_TABLES } from '../next/js/datasets.js';
const pick = ['products', 'students'];
process.stdout.write(JSON.stringify(Object.fromEntries(pick.map(t => [t, ALL_TABLES[t]]))));
