/* =========================================================
 * lessons.js — the lesson "patterns"
 * ---------------------------------------------------------
 * 1レッスン = 1つの書き方（パターン）。
 *   - demo   : 例題。授業でみんなの前で解く固定の1問（元の問題をそのまま使用）
 *   - gen()  : 演習の作り方。datasets.js の別テーマのデータに同じパターンを当てはめ、
 *              値（カテゴリ・しきい値・件数・並び順など）をセット番号からランダムに決める。
 *              → 毎日・セット番号ごとに新しい演習問題が自動でできる。
 *
 * 文章（title / point / desc）は 10 言語の配列です。
 *   順番: ja, en, ne, fr, my, bn, si, id, vi, zh
 *   desc の {x} は gen() が返す値に置き換わります（列名・値は <code> で表示）。
 *   {ord} は並び順の言葉、{f} {f1} {f2} は集計関数の言葉に自動で翻訳されます。
 * ========================================================= */

const BLANK = '___';
const lit = v => (v === BLANK ? `'${BLANK}'` : typeof v === 'number' ? String(v) : `'${String(v).replace(/'/g, "''")}'`);
const dir = o => (o === BLANK ? BLANK : (o === 'desc' || o === 'za') ? 'DESC' : 'ASC');
const fn = (f, c) => (f === 'COUNT' ? 'COUNT(*)' : `${f}(${c})`);

/* ---- small helpers used by the generators ---- */
function colIndex(tbl, col) { return tbl.columns.findIndex(c => c[0] === col); }
function colVals(tbl, col) { const i = colIndex(tbl, col); return tbl.rows.map(r => r[i]); }
function groupsOf(tbl, col) {
  const m = new Map();
  colVals(tbl, col).forEach(v => m.set(v, (m.get(v) || 0) + 1));
  return [...m.entries()].map(([value, size]) => ({ value, size }));
}
/** Round to a "nice" number so that problems read naturally (1650 → 1500, 320000 → 300000). */
function niceStep(x) {
  const a = Math.abs(x);
  if (a < 10) return 1;
  const mag = Math.pow(10, Math.floor(Math.log10(a)));
  return mag >= 100 ? mag / 2 : mag / 2 >= 1 ? mag / 2 : 1;
}
const niceFloor = x => Math.floor(x / niceStep(x)) * niceStep(x);
const niceCeil = x => Math.ceil(x / niceStep(x)) * niceStep(x);
const AGG4 = ['SUM', 'AVG', 'MAX', 'MIN'];

/* ---- join helpers ---- */
function joinParams(pair) {
  const L = pair.left, R = pair.right;
  return { L: L.table, R: R.table, id: L.roles.id, key: R.roles.key, name: L.roles.name, grp: L.roles.grp, text: R.roles.text, num: R.roles.num };
}
const onOf = p => `${p.L}.${p.id} = ${p.R}.${p.key}`;
const joinView = p => Object.assign({}, p, { on: onOf(p) });

/** The example pair used by every JOIN demo (the original table_a / table_b). */
const DEMO_JOIN_PAIR = {
  key: 'demo',
  left: { table: 'table_a', roles: { id: 'id', name: 'column_a1', grp: 'class' } },
  right: { table: 'table_b', roles: { key: 'id', text: 'column_b1', num: 'column_b2' } }
};

const CHAPTERS = [
  { key: 'basics', title: 'ch.basics', desc: 'ch.basics.desc', icon: 'S' },
  { key: 'agg', title: 'ch.agg', desc: 'ch.agg.desc', icon: 'Σ' },
  { key: 'join', title: 'ch.join', desc: 'ch.join.desc', icon: '⋈' }
];

const LESSONS = [
  /* =================== BASICS =================== */
  {
    key: 'select', ch: 'basics', kind: 'single',
    title: ['列を選ぶ (SELECT)', 'Choosing columns (SELECT)', 'स्तम्भ छान्ने (SELECT)', 'Choisir des colonnes (SELECT)', 'ကော်လံရွေးခြင်း (SELECT)', 'কলাম বাছাই (SELECT)', 'තීරු තෝරා ගැනීම (SELECT)', 'Memilih kolom (SELECT)', 'Chọn cột (SELECT)', '选择列 (SELECT)'],
    point: ['SELECT の後ろに欲しい列をカンマ区切りで並べ、FROM の後ろにテーブル名を書きます。すべての列が欲しいときは * を使います。', 'List the columns you want after SELECT, separated by commas, and write the table name after FROM. Use * to get every column.', 'SELECT पछि चाहिने स्तम्भहरू अल्पविरामले छुट्याएर लेख्नुहोस्, र FROM पछि तालिकाको नाम लेख्नुहोस्। सबै स्तम्भ चाहिँदा * प्रयोग गर्नुहोस्।', 'Après SELECT, listez les colonnes voulues séparées par des virgules, et après FROM, le nom de la table. * donne toutes les colonnes.', 'SELECT နောက်တွင် လိုချင်သော ကော်လံများကို ကော်မာဖြင့် ခြား၍ရေးပြီး FROM နောက်တွင် ဇယားအမည်ကို ရေးပါ။ ကော်လံအားလုံးလိုလျှင် * ကို သုံးပါ။', 'SELECT-এর পরে কমা দিয়ে আলাদা করে দরকারি কলামগুলো লিখুন, আর FROM-এর পরে টেবিলের নাম লিখুন। সব কলাম চাইলে * ব্যবহার করুন।', 'SELECT ට පසු අවශ්‍ය තීරු කොමා මගින් වෙන් කර ලියන්න, FROM ට පසු වගුවේ නම ලියන්න. සියලු තීරු අවශ්‍ය නම් * භාවිත කරන්න.', 'Tulis kolom yang diinginkan setelah SELECT, dipisah koma, lalu nama tabel setelah FROM. Gunakan * untuk mengambil semua kolom.', 'Viết các cột cần lấy sau SELECT, cách nhau bằng dấu phẩy, và tên bảng sau FROM. Dùng * để lấy tất cả các cột.', '在 SELECT 后面列出需要的列（用逗号分隔），在 FROM 后面写表名。想要所有列时使用 *。'],
    desc: ['{t} テーブルから、すべての行の {c1} と {c2} を取り出してください。', 'From the {t} table, get {c1} and {c2} for every row.', '{t} तालिकाबाट सबै पङ्क्तिहरूको {c1} र {c2} निकाल्नुहोस्।', 'À partir de la table {t}, récupérez {c1} et {c2} pour toutes les lignes.', '{t} ဇယားမှ အတန်းအားလုံး၏ {c1} နှင့် {c2} ကို ထုတ်ယူပါ။', '{t} টেবিল থেকে সব সারির {c1} এবং {c2} বের করুন।', '{t} වගුවෙන් සියලු පේළිවල {c1} සහ {c2} ලබා ගන්න.', 'Dari tabel {t}, ambil {c1} dan {c2} untuk semua baris.', 'Từ bảng {t}, lấy {c1} và {c2} của tất cả các dòng.', '从 {t} 表中取出所有行的 {c1} 和 {c2}。'],
    syntax: 'SELECT {col}, {col} FROM {table};',
    keywords: ['SELECT', 'FROM', '*', ','],
    demo: { ds: 'products', p: { t: 'products', c1: 'name', c2: 'price' } },
    gen(ds, R) { const r = ds.roles; return { t: ds.table, c1: r.name, c2: R.pick([r.n1, r.n2, r.cat, r.yr]) }; },
    sql: p => `SELECT ${p.c1}, ${p.c2} FROM ${p.t};`,
    blanks: ['c1', 'c2'],
    steps: p => [['step.from', `SELECT * FROM ${p.t};`], ['step.select', `SELECT ${p.c1}, ${p.c2} FROM ${p.t};`]]
  },
  {
    key: 'between', ch: 'basics', kind: 'single',
    title: ['範囲で絞り込む (BETWEEN)', 'Filtering by range (BETWEEN)', 'दायराले छान्ने (BETWEEN)', 'Filtrer par intervalle (BETWEEN)', 'အပိုင်းအခြားဖြင့် စစ်ထုတ်ခြင်း (BETWEEN)', 'সীমা দিয়ে ফিল্টার (BETWEEN)', 'පරාසයෙන් පෙරීම (BETWEEN)', 'Menyaring dengan rentang (BETWEEN)', 'Lọc theo khoảng (BETWEEN)', '按范围筛选 (BETWEEN)'],
    point: ['WHERE 列 BETWEEN A AND B は「A 以上 B 以下」という意味です。両端の値も含まれます。', 'WHERE col BETWEEN A AND B means “A or more and B or less”. Both ends are included.', 'WHERE स्तम्भ BETWEEN A AND B को अर्थ “A वा बढी र B वा कम” हो। दुवै छेउका मान पनि समावेश हुन्छन्।', 'WHERE col BETWEEN A AND B signifie « au moins A et au plus B ». Les deux bornes sont incluses.', 'WHERE ကော်လံ BETWEEN A AND B ဆိုသည်မှာ “A နှင့်အထက်၊ B နှင့်အောက်” ဟု အဓိပ္ပာယ်ရသည်။ အစွန်းနှစ်ဖက်လုံး ပါဝင်သည်။', 'WHERE কলাম BETWEEN A AND B মানে “A বা তার বেশি এবং B বা তার কম”। দুই প্রান্তের মানও অন্তর্ভুক্ত।', 'WHERE තීරුව BETWEEN A AND B යනු “A හෝ ඊට වැඩි සහ B හෝ ඊට අඩු” යන්නයි. අන්ත අගය දෙකම ඇතුළත් වේ.', 'WHERE kolom BETWEEN A AND B berarti “A atau lebih dan B atau kurang”. Kedua batas ikut terhitung.', 'WHERE cột BETWEEN A AND B nghĩa là “từ A đến B”. Cả hai đầu đều được tính.', 'WHERE 列 BETWEEN A AND B 表示“大于等于 A 且小于等于 B”，两端的值都包含在内。'],
    desc: ['{t} テーブルから、{c} が {lo} 以上 {hi} 以下の行を、すべての列で取り出してください。', 'From the {t} table, get all columns of the rows where {c} is between {lo} and {hi} (inclusive).', '{t} तालिकाबाट {c} {lo} देखि {hi} सम्म (दुवै समावेश) भएका पङ्क्तिहरूका सबै स्तम्भ निकाल्नुहोस्।', 'À partir de la table {t}, récupérez toutes les colonnes des lignes où {c} est compris entre {lo} et {hi} (inclus).', '{t} ဇယားမှ {c} သည် {lo} မှ {hi} အထိ (နှစ်ဖက်စလုံးပါ) ဖြစ်သော အတန်းများ၏ ကော်လံအားလုံးကို ထုတ်ယူပါ။', '{t} টেবিল থেকে যেসব সারিতে {c} {lo} থেকে {hi}-এর মধ্যে (উভয়সহ), সেগুলোর সব কলাম বের করুন।', '{t} වගුවෙන් {c} අගය {lo} සිට {hi} දක්වා (දෙකම ඇතුළුව) වන පේළිවල සියලු තීරු ලබා ගන්න.', 'Dari tabel {t}, ambil semua kolom dari baris yang {c}-nya antara {lo} dan {hi} (termasuk keduanya).', 'Từ bảng {t}, lấy tất cả các cột của những dòng có {c} nằm trong khoảng từ {lo} đến {hi} (bao gồm cả hai).', '从 {t} 表中取出 {c} 在 {lo} 到 {hi} 之间（含两端）的行的所有列。'],
    syntax: 'SELECT * FROM {table} WHERE {col} BETWEEN {min} AND {max};',
    keywords: ['SELECT', '*', 'FROM', 'WHERE', 'BETWEEN', 'AND'],
    demo: { ds: 'products', p: { t: 'products', c: 'price', lo: 1000, hi: 5000 } },
    gen(ds, R) {
      const c = R.pick([ds.roles.n1, ds.roles.n2]);
      const v = colVals(ds, c).slice().sort((a, b) => a - b), n = v.length;
      const i = R.int(1, Math.max(1, n - 5)), j = Math.min(n - 2, i + R.int(2, 4));
      const lo = niceFloor(v[i]), hi = niceCeil(v[j]);
      if (!(lo < hi)) return null;
      const cnt = v.filter(x => x >= lo && x <= hi).length;
      if (cnt < 2 || cnt > n - 2) return null;
      return { t: ds.table, c, lo, hi };
    },
    sql: p => `SELECT * FROM ${p.t} WHERE ${p.c} BETWEEN ${p.lo} AND ${p.hi};`,
    blanks: ['lo', 'hi'],
    steps: p => [['step.from', `SELECT * FROM ${p.t};`], ['step.where', `SELECT * FROM ${p.t} WHERE ${p.c} BETWEEN ${p.lo} AND ${p.hi};`]]
  },
  {
    key: 'like', ch: 'basics', kind: 'single',
    title: ['あいまい検索 (LIKE)', 'Pattern search (LIKE)', 'ढाँचा खोजी (LIKE)', 'Recherche par motif (LIKE)', 'ပုံစံဖြင့် ရှာဖွေခြင်း (LIKE)', 'প্যাটার্ন অনুসন্ধান (LIKE)', 'රටා සෙවීම (LIKE)', 'Pencarian pola (LIKE)', 'Tìm theo mẫu (LIKE)', '模糊查询 (LIKE)'],
    point: ["LIKE では % が「0文字以上の何か」を表します。'%abc%' と書くと「abc をどこかに含む」という意味です（英字の大文字・小文字は区別されません）。", "In LIKE, % means “any characters (or none)”. '%abc%' means “contains abc somewhere” (upper and lower case are treated the same).", "LIKE मा % ले “कुनै पनि अक्षरहरू (वा केही नभए पनि)” जनाउँछ। '%abc%' को अर्थ “कतै abc भएको” हो (ठूलो-सानो अक्षर एउटै मानिन्छ)।", "Dans LIKE, % signifie « n’importe quels caractères (ou aucun) ». '%abc%' veut dire « contient abc quelque part » (majuscules et minuscules sont équivalentes).", "LIKE တွင် % သည် “မည်သည့်စာလုံးမဆို (မရှိလည်းရ)” ကို ဆိုလိုသည်။ '%abc%' သည် “abc ပါဝင်သော” ဟု အဓိပ္ပာယ်ရသည် (စာလုံးအကြီးအသေး မခွဲခြားပါ)။", "LIKE-এ % মানে “যেকোনো অক্ষর (বা কিছুই না)”। '%abc%' মানে “কোথাও abc আছে” (বড় ও ছোট হাতের অক্ষর একই ধরা হয়)।", "LIKE හි % යනු “ඕනෑම අකුරු (හෝ කිසිවක් නැත)” යන්නයි. '%abc%' යනු “කොතැනක හෝ abc අඩංගු” යන්නයි (ලොකු සහ කුඩා අකුරු එක ලෙස සලකයි).", "Dalam LIKE, % berarti “karakter apa saja (atau kosong)”. '%abc%' berarti “mengandung abc di mana saja” (huruf besar dan kecil dianggap sama).", "Trong LIKE, % nghĩa là “bất kỳ ký tự nào (hoặc không có)”. '%abc%' nghĩa là “có chứa abc ở đâu đó” (không phân biệt chữ hoa, chữ thường).", "在 LIKE 中，% 表示“任意个字符（也可以没有）”。'%abc%' 表示“某处包含 abc”（英文字母不区分大小写）。"],
    desc: ['{t} テーブルから、{c1} に「{like}」を含む行の {c1} と {c2} を取り出してください。', 'From the {t} table, get {c1} and {c2} of the rows whose {c1} contains “{like}”.', '{t} तालिकाबाट {c1} मा “{like}” भएका पङ्क्तिहरूको {c1} र {c2} निकाल्नुहोस्।', 'À partir de la table {t}, récupérez {c1} et {c2} des lignes dont {c1} contient « {like} ».', '{t} ဇယားမှ {c1} တွင် “{like}” ပါဝင်သော အတန်းများ၏ {c1} နှင့် {c2} ကို ထုတ်ယူပါ။', '{t} টেবিল থেকে যেসব সারির {c1}-এ “{like}” আছে, সেগুলোর {c1} এবং {c2} বের করুন।', '{t} වගුවෙන් {c1} තුළ “{like}” අඩංගු පේළිවල {c1} සහ {c2} ලබා ගන්න.', 'Dari tabel {t}, ambil {c1} dan {c2} dari baris yang {c1}-nya mengandung “{like}”.', 'Từ bảng {t}, lấy {c1} và {c2} của những dòng có {c1} chứa “{like}”.', '从 {t} 表中取出 {c1} 包含“{like}”的行的 {c1} 和 {c2}。'],
    syntax: "SELECT {col}, {col} FROM {table} WHERE {col} LIKE '%{text}%';",
    keywords: ['SELECT', 'FROM', 'WHERE', 'LIKE', "'%%'"],
    demo: { ds: 'products', p: { t: 'products', c1: 'name', c2: 'category', like: 'Pro' } },
    gen(ds, R) {
      const names = colVals(ds, ds.roles.name), n = names.length;
      const ok = term => { const c = names.filter(s => s.toLowerCase().includes(term.toLowerCase())).length; return c >= 1 && c <= n - 2; };
      let terms = (ds.likeTerms || []).filter(ok);
      if (!terms.length) {
        const s = R.pick(names); const k = R.int(0, s.length - 3); const cand = s.substr(k, 3).trim();
        if (cand.length < 2 || !ok(cand)) return null; terms = [cand];
      }
      return { t: ds.table, c1: ds.roles.name, c2: ds.roles.cat, like: R.pick(terms) };
    },
    sql: p => `SELECT ${p.c1}, ${p.c2} FROM ${p.t} WHERE ${p.c1} LIKE '%${p.like}%';`,
    blanks: ['like'],
    steps: p => [['step.from', `SELECT * FROM ${p.t};`], ['step.where', `SELECT * FROM ${p.t} WHERE ${p.c1} LIKE '%${p.like}%';`], ['step.select', `SELECT ${p.c1}, ${p.c2} FROM ${p.t} WHERE ${p.c1} LIKE '%${p.like}%';`]]
  },
  {
    key: 'distinct', ch: 'basics', kind: 'single',
    title: ['重複を除いて並べる (DISTINCT・ORDER BY)', 'Unique values, sorted (DISTINCT, ORDER BY)', 'दोहोरो हटाएर क्रमबद्ध (DISTINCT, ORDER BY)', 'Valeurs uniques triées (DISTINCT, ORDER BY)', 'ထပ်နေသည်များဖယ်၍ စီခြင်း (DISTINCT, ORDER BY)', 'অনন্য মান ও সাজানো (DISTINCT, ORDER BY)', 'අනන්‍ය අගය පිළිවෙළට (DISTINCT, ORDER BY)', 'Nilai unik terurut (DISTINCT, ORDER BY)', 'Giá trị không trùng, sắp xếp (DISTINCT, ORDER BY)', '去重并排序 (DISTINCT, ORDER BY)'],
    point: ['SELECT DISTINCT は同じ値を1つにまとめます。ORDER BY 列 ASC で小さい順（A→Z）、DESC で大きい順（Z→A）に並びます。', 'SELECT DISTINCT shows each value only once. ORDER BY col ASC sorts smallest first (A→Z); DESC sorts largest first (Z→A).', 'SELECT DISTINCT ले एउटै मानलाई एक पटक मात्र देखाउँछ। ORDER BY स्तम्भ ASC ले सानोदेखि (A→Z), DESC ले ठूलोदेखि (Z→A) क्रमबद्ध गर्छ।', 'SELECT DISTINCT n’affiche chaque valeur qu’une fois. ORDER BY col ASC trie du plus petit au plus grand (A→Z), DESC dans l’autre sens (Z→A).', 'SELECT DISTINCT သည် တန်ဖိုးတစ်ခုစီကို တစ်ကြိမ်သာ ပြသည်။ ORDER BY ကော်လံ ASC သည် အငယ်မှ (A→Z)၊ DESC သည် အကြီးမှ (Z→A) စီသည်။', 'SELECT DISTINCT প্রতিটি মান একবারই দেখায়। ORDER BY কলাম ASC ছোট থেকে বড় (A→Z), DESC বড় থেকে ছোট (Z→A) সাজায়।', 'SELECT DISTINCT එක් එක් අගය එක් වරක් පමණක් පෙන්වයි. ORDER BY තීරුව ASC කුඩා සිට (A→Z), DESC විශාල සිට (Z→A) පිළිවෙළ කරයි.', 'SELECT DISTINCT menampilkan setiap nilai satu kali saja. ORDER BY kolom ASC mengurutkan dari kecil (A→Z), DESC dari besar (Z→A).', 'SELECT DISTINCT chỉ hiển thị mỗi giá trị một lần. ORDER BY cột ASC sắp từ nhỏ đến lớn (A→Z), DESC từ lớn đến nhỏ (Z→A).', 'SELECT DISTINCT 让相同的值只显示一次。ORDER BY 列 ASC 从小到大（A→Z），DESC 从大到小（Z→A）排序。'],
    desc: ['{t} テーブルにある {c} の種類を、重複なしで{ord}に並べて取り出してください。', 'From the {t} table, list each {c} only once, sorted {ord}.', '{t} तालिकामा भएका {c} हरूलाई दोहोरो नगरी {ord} देखाउनुहोस्।', 'À partir de la table {t}, listez chaque {c} une seule fois, trié {ord}.', '{t} ဇယားရှိ {c} တန်ဖိုးများကို မထပ်ဘဲ {ord} စီ၍ ထုတ်ယူပါ။', '{t} টেবিলের প্রতিটি {c} একবার করে {ord} সাজিয়ে দেখান।', '{t} වගුවේ ඇති {c} අගයන් නැවත නොවන ලෙස {ord} පෙන්වන්න.', 'Dari tabel {t}, tampilkan setiap {c} satu kali saja, diurutkan {ord}.', 'Từ bảng {t}, liệt kê mỗi {c} một lần, sắp xếp {ord}.', '从 {t} 表中不重复地取出 {c}，并{ord}排列。'],
    syntax: 'SELECT DISTINCT {col} FROM {table} ORDER BY {col} ASC;',
    keywords: ['SELECT', 'DISTINCT', 'FROM', 'ORDER BY', 'ASC', 'DESC'],
    demo: { ds: 'products', p: { t: 'products', c: 'category', ord: 'az' } },
    gen(ds, R) { return { t: ds.table, c: ds.roles.cat, ord: R.pick(['az', 'za']) }; },
    sql: p => `SELECT DISTINCT ${p.c} FROM ${p.t} ORDER BY ${p.c} ${dir(p.ord)};`,
    blanks: ['ord'],
    steps: p => [['step.from', `SELECT * FROM ${p.t};`], ['step.select', `SELECT ${p.c} FROM ${p.t};`], ['step.distinct', `SELECT DISTINCT ${p.c} FROM ${p.t};`], ['step.order', `SELECT DISTINCT ${p.c} FROM ${p.t} ORDER BY ${p.c} ${dir(p.ord)};`]]
  },
  {
    key: 'topn', ch: 'basics', kind: 'single',
    title: ['条件＋並べ替え＋件数 (WHERE・ORDER BY・LIMIT)', 'Filter, sort and take the top (WHERE, ORDER BY, LIMIT)', 'सर्त, क्रम र माथिका केही (WHERE, ORDER BY, LIMIT)', 'Filtrer, trier, garder les premiers (WHERE, ORDER BY, LIMIT)', 'စစ်ထုတ်၊ စီ၊ ထိပ်ဆုံးယူ (WHERE, ORDER BY, LIMIT)', 'ফিল্টার, সাজানো ও শীর্ষ কয়েকটি (WHERE, ORDER BY, LIMIT)', 'පෙරීම, පිළිවෙළ, ඉහළම කිහිපය (WHERE, ORDER BY, LIMIT)', 'Saring, urutkan, ambil teratas (WHERE, ORDER BY, LIMIT)', 'Lọc, sắp xếp, lấy đầu bảng (WHERE, ORDER BY, LIMIT)', '筛选、排序、取前几名 (WHERE, ORDER BY, LIMIT)'],
    point: ['SQL は WHERE → ORDER BY → LIMIT の順に書きます。条件で絞ってから並べ、先頭から LIMIT の件数だけ取り出します。', 'Write WHERE → ORDER BY → LIMIT in this order. Rows are filtered first, then sorted, and LIMIT keeps only the first rows.', 'WHERE → ORDER BY → LIMIT यही क्रममा लेख्नुहोस्। पहिले सर्तले छानिन्छ, त्यसपछि क्रमबद्ध हुन्छ, र LIMIT ले माथिका केही पङ्क्ति मात्र राख्छ।', 'Écrivez WHERE → ORDER BY → LIMIT dans cet ordre : on filtre, on trie, puis LIMIT garde les premières lignes.', 'WHERE → ORDER BY → LIMIT အစဉ်အတိုင်း ရေးပါ။ အရင်စစ်ထုတ်၊ ပြီးမှစီ၊ LIMIT က ထိပ်ဆုံးအတန်းများကိုသာ ယူသည်။', 'WHERE → ORDER BY → LIMIT এই ক্রমে লিখুন। প্রথমে শর্তে ফিল্টার, তারপর সাজানো, এবং LIMIT শুধু প্রথম কয়েকটি সারি রাখে।', 'WHERE → ORDER BY → LIMIT මෙම පිළිවෙළට ලියන්න. පළමුව පෙරීම, පසුව පිළිවෙළ කිරීම, LIMIT මුල් පේළි කිහිපය පමණක් තබා ගනී.', 'Tulis WHERE → ORDER BY → LIMIT dengan urutan ini. Baris disaring dulu, lalu diurutkan, dan LIMIT hanya mengambil baris teratas.', 'Viết theo thứ tự WHERE → ORDER BY → LIMIT. Lọc trước, rồi sắp xếp, và LIMIT chỉ giữ lại những dòng đầu tiên.', '按照 WHERE → ORDER BY → LIMIT 的顺序书写。先按条件筛选，再排序，最后 LIMIT 只保留前几行。'],
    desc: ['{t} テーブルで {cat} が {v} の行を、{c} の{ord}に並べ、先頭 {k} 件の {name} と {c} を取り出してください。', 'In the {t} table, take the rows where {cat} is {v}, sort them by {c} {ord}, and get {name} and {c} of the first {k} rows.', '{t} तालिकामा {cat} {v} भएका पङ्क्तिहरूलाई {c} को आधारमा {ord} मिलाउनुहोस्, र पहिलो {k} पङ्क्तिको {name} र {c} निकाल्नुहोस्।', 'Dans la table {t}, prenez les lignes où {cat} vaut {v}, triez-les selon {c} {ord}, puis récupérez {name} et {c} des {k} premières lignes.', '{t} ဇယားတွင် {cat} သည် {v} ဖြစ်သော အတန်းများကို {c} အလိုက် {ord} စီပြီး ပထမ {k} တန်း၏ {name} နှင့် {c} ကို ထုတ်ယူပါ။', '{t} টেবিলে যেসব সারিতে {cat} = {v}, সেগুলো {c} অনুযায়ী {ord} সাজিয়ে প্রথম {k}টি সারির {name} ও {c} বের করুন।', '{t} වගුවේ {cat} අගය {v} වන පේළි {c} අනුව {ord} පිළිවෙළ කර, මුල් පේළි {k} හි {name} සහ {c} ලබා ගන්න.', 'Di tabel {t}, ambil baris yang {cat}-nya {v}, urutkan berdasarkan {c} {ord}, lalu tampilkan {name} dan {c} dari {k} baris pertama.', 'Trong bảng {t}, lấy các dòng có {cat} là {v}, sắp xếp theo {c} {ord}, rồi lấy {name} và {c} của {k} dòng đầu tiên.', '在 {t} 表中，取出 {cat} 为 {v} 的行，按 {c} {ord}排序，取前 {k} 行的 {name} 和 {c}。'],
    syntax: "SELECT {col}, {col} FROM {table} WHERE {col} = '{value}' ORDER BY {col} DESC LIMIT {n};",
    keywords: ['SELECT', 'FROM', 'WHERE', "= ''", 'ORDER BY', 'DESC', 'ASC', 'LIMIT'],
    demo: { ds: 'products', p: { t: 'products', name: 'name', c: 'price', cat: 'category', v: 'Electronics', ord: 'desc', k: 3 } },
    gen(ds, R) {
      const g = groupsOf(ds, ds.roles.cat).filter(x => x.size >= 3);
      if (!g.length) return null;
      const grp = R.pick(g);
      return { t: ds.table, name: ds.roles.name, c: R.pick([ds.roles.n1, ds.roles.n2]), cat: ds.roles.cat, v: grp.value, ord: R.pick(['desc', 'asc']), k: R.int(2, Math.min(3, grp.size - 1)) };
    },
    sql: p => `SELECT ${p.name}, ${p.c} FROM ${p.t} WHERE ${p.cat} = ${lit(p.v)} ORDER BY ${p.c} ${dir(p.ord)} LIMIT ${p.k};`,
    tie: p => `SELECT ${p.c} FROM ${p.t} WHERE ${p.cat} = ${lit(p.v)};`,
    blanks: ['v', 'ord', 'k'],
    steps: p => [
      ['step.from', `SELECT * FROM ${p.t};`],
      ['step.where', `SELECT * FROM ${p.t} WHERE ${p.cat} = ${lit(p.v)};`],
      ['step.order', `SELECT * FROM ${p.t} WHERE ${p.cat} = ${lit(p.v)} ORDER BY ${p.c} ${dir(p.ord)};`],
      ['step.limit', `SELECT * FROM ${p.t} WHERE ${p.cat} = ${lit(p.v)} ORDER BY ${p.c} ${dir(p.ord)} LIMIT ${p.k};`],
      ['step.select', `SELECT ${p.name}, ${p.c} FROM ${p.t} WHERE ${p.cat} = ${lit(p.v)} ORDER BY ${p.c} ${dir(p.ord)} LIMIT ${p.k};`]
    ]
  },
  {
    key: 'offset', ch: 'basics', kind: 'single',
    title: ['途中から取り出す (LIMIT・OFFSET)', 'Starting from the middle (LIMIT, OFFSET)', 'बीचबाट लिने (LIMIT, OFFSET)', 'Commencer au milieu (LIMIT, OFFSET)', 'အလယ်မှစ၍ ယူခြင်း (LIMIT, OFFSET)', 'মাঝখান থেকে নেওয়া (LIMIT, OFFSET)', 'මැදින් ආරම්භ කිරීම (LIMIT, OFFSET)', 'Mulai dari tengah (LIMIT, OFFSET)', 'Lấy từ giữa (LIMIT, OFFSET)', '从中间开始取 (LIMIT, OFFSET)'],
    point: ['LIMIT 件数 OFFSET 飛ばす件数 で「○番目から△件」を取り出せます。4番目と5番目なら、先頭3件を飛ばすので LIMIT 2 OFFSET 3 です。', 'LIMIT n OFFSET m skips the first m rows and then takes n rows. For the 4th and 5th rows, skip 3: LIMIT 2 OFFSET 3.', 'LIMIT n OFFSET m ले सुरुका m पङ्क्ति छोडेर n पङ्क्ति लिन्छ। चौथो र पाँचौं चाहिए ३ छोड्नुहोस्: LIMIT 2 OFFSET 3।', 'LIMIT n OFFSET m saute les m premières lignes puis en prend n. Pour les 4e et 5e lignes : LIMIT 2 OFFSET 3.', 'LIMIT n OFFSET m သည် ပထမ m တန်းကို ကျော်ပြီး n တန်း ယူသည်။ ၄ တန်းမြောက်နှင့် ၅ တန်းမြောက်အတွက် ၃ တန်းကျော်ပါ: LIMIT 2 OFFSET 3။', 'LIMIT n OFFSET m প্রথম m টি সারি বাদ দিয়ে n টি সারি নেয়। ৪র্থ ও ৫ম সারির জন্য ৩টি বাদ দিন: LIMIT 2 OFFSET 3।', 'LIMIT n OFFSET m මුල් පේළි m මඟ හැර පේළි n ගනී. 4 වන සහ 5 වන පේළි සඳහා 3 ක් මඟ හරින්න: LIMIT 2 OFFSET 3.', 'LIMIT n OFFSET m melewati m baris pertama lalu mengambil n baris. Untuk baris ke-4 dan ke-5, lewati 3: LIMIT 2 OFFSET 3.', 'LIMIT n OFFSET m bỏ qua m dòng đầu rồi lấy n dòng. Muốn lấy dòng thứ 4 và 5 thì bỏ qua 3: LIMIT 2 OFFSET 3.', 'LIMIT n OFFSET m 先跳过前 m 行，再取 n 行。要取第 4 和第 5 行，就跳过 3 行：LIMIT 2 OFFSET 3。'],
    desc: ['{t} テーブルで {yr} が {y} 以上の行を {c} の{ord}に並べたとき、{a} 番目と {b} 番目の行の {name} と {c} を取り出してください。', 'In the {t} table, take the rows where {yr} is {y} or later and sort them by {c} {ord}. Get {name} and {c} of the rows in positions {a} and {b}.', '{t} तालिकामा {yr} {y} वा पछिका पङ्क्तिहरूलाई {c} को आधारमा {ord} मिलाउँदा {a} औं र {b} औं पङ्क्तिको {name} र {c} निकाल्नुहोस्।', 'Dans la table {t}, prenez les lignes où {yr} est supérieur ou égal à {y}, triez-les selon {c} {ord}, puis récupérez {name} et {c} des lignes en position {a} et {b}.', '{t} ဇယားတွင် {yr} သည် {y} နှင့်အထက် ဖြစ်သော အတန်းများကို {c} အလိုက် {ord} စီသောအခါ {a} တန်းမြောက်နှင့် {b} တန်းမြောက်၏ {name} နှင့် {c} ကို ထုတ်ယူပါ။', '{t} টেবিলে {yr} {y} বা তার পরের সারিগুলো {c} অনুযায়ী {ord} সাজালে {a}তম ও {b}তম সারির {name} ও {c} বের করুন।', '{t} වගුවේ {yr} අගය {y} හෝ ඊට වැඩි පේළි {c} අනුව {ord} පිළිවෙළ කළ විට, {a} වන සහ {b} වන පේළිවල {name} සහ {c} ලබා ගන්න.', 'Di tabel {t}, ambil baris dengan {yr} {y} atau sesudahnya, urutkan berdasarkan {c} {ord}, lalu tampilkan {name} dan {c} dari baris ke-{a} dan ke-{b}.', 'Trong bảng {t}, lấy các dòng có {yr} từ {y} trở đi, sắp xếp theo {c} {ord}, rồi lấy {name} và {c} của dòng thứ {a} và thứ {b}.', '在 {t} 表中，取出 {yr} 大于等于 {y} 的行，按 {c} {ord}排序后，取第 {a} 和第 {b} 行的 {name} 和 {c}。'],
    syntax: 'SELECT {col}, {col} FROM {table} WHERE {col} >= {value} ORDER BY {col} ASC LIMIT {n} OFFSET {skip};',
    keywords: ['SELECT', 'FROM', 'WHERE', '>=', 'ORDER BY', 'ASC', 'DESC', 'LIMIT', 'OFFSET'],
    demo: { ds: 'products', p: { t: 'products', name: 'name', c: 'price', yr: 'release_year', y: 2020, ord: 'asc', k: 2, skip: 3, a: 4, b: 5 } },
    gen(ds, R) {
      const yrs = colVals(ds, ds.roles.yr), n = yrs.length;
      const cands = [...new Set(yrs)].filter(y => { const c = yrs.filter(v => v >= y).length; return c >= 4 && c < n; });
      if (!cands.length) return null;
      const y = R.pick(cands), cnt = yrs.filter(v => v >= y).length;
      const skip = R.int(1, cnt - 2);
      return { t: ds.table, name: ds.roles.name, c: R.pick([ds.roles.n1, ds.roles.n2]), yr: ds.roles.yr, y, ord: R.pick(['asc', 'desc']), k: 2, skip, a: skip + 1, b: skip + 2 };
    },
    sql: p => `SELECT ${p.name}, ${p.c} FROM ${p.t} WHERE ${p.yr} >= ${p.y} ORDER BY ${p.c} ${dir(p.ord)} LIMIT ${p.k} OFFSET ${p.skip};`,
    tie: p => `SELECT ${p.c} FROM ${p.t} WHERE ${p.yr} >= ${p.y};`,
    blanks: ['ord', 'k', 'skip'],
    steps: p => [
      ['step.from', `SELECT * FROM ${p.t};`],
      ['step.where', `SELECT * FROM ${p.t} WHERE ${p.yr} >= ${p.y};`],
      ['step.order', `SELECT * FROM ${p.t} WHERE ${p.yr} >= ${p.y} ORDER BY ${p.c} ${dir(p.ord)};`],
      ['step.offset', `SELECT * FROM ${p.t} WHERE ${p.yr} >= ${p.y} ORDER BY ${p.c} ${dir(p.ord)} LIMIT ${p.k} OFFSET ${p.skip};`],
      ['step.select', `SELECT ${p.name}, ${p.c} FROM ${p.t} WHERE ${p.yr} >= ${p.y} ORDER BY ${p.c} ${dir(p.ord)} LIMIT ${p.k} OFFSET ${p.skip};`]
    ]
  },

  /* =================== AGGREGATION =================== */
  {
    key: 'aggfn', ch: 'agg', kind: 'single',
    title: ['集計関数 (COUNT・SUM・AVG・MAX・MIN)', 'Aggregate functions (COUNT, SUM, AVG, MAX, MIN)', 'समग्र फंक्सन (COUNT, SUM, AVG, MAX, MIN)', 'Fonctions d’agrégat (COUNT, SUM, AVG, MAX, MIN)', 'စုစည်းတွက်ချက်သည့် function များ (COUNT, SUM, AVG, MAX, MIN)', 'সমষ্টি ফাংশন (COUNT, SUM, AVG, MAX, MIN)', 'සමූහ ශ්‍රිත (COUNT, SUM, AVG, MAX, MIN)', 'Fungsi agregat (COUNT, SUM, AVG, MAX, MIN)', 'Hàm tổng hợp (COUNT, SUM, AVG, MAX, MIN)', '聚合函数 (COUNT, SUM, AVG, MAX, MIN)'],
    point: ['COUNT(*) は行数、SUM は合計、AVG は平均、MAX は最大値、MIN は最小値です。結果は1行にまとまります。', 'COUNT(*) counts rows, SUM adds up, AVG averages, MAX and MIN find the largest and smallest. The result is a single row.', 'COUNT(*) ले पङ्क्ति गन्छ, SUM ले जोड्छ, AVG ले औसत, MAX र MIN ले सबैभन्दा ठूलो र सानो मान निकाल्छ। नतिजा एउटै पङ्क्तिमा आउँछ।', 'COUNT(*) compte les lignes, SUM additionne, AVG fait la moyenne, MAX et MIN donnent le plus grand et le plus petit. Le résultat tient sur une ligne.', 'COUNT(*) သည် အတန်းရေတွက်၊ SUM သည် ပေါင်း၊ AVG သည် ပျမ်းမျှ၊ MAX နှင့် MIN သည် အကြီးဆုံးနှင့် အငယ်ဆုံးကို ရှာသည်။ ရလဒ်သည် အတန်းတစ်တန်းတည်း ဖြစ်သည်။', 'COUNT(*) সারি গোনে, SUM যোগ করে, AVG গড় করে, MAX ও MIN সবচেয়ে বড় ও ছোট মান দেয়। ফলাফল একটি সারিতে আসে।', 'COUNT(*) පේළි ගණන් කරයි, SUM එකතු කරයි, AVG සාමාන්‍යය ගනී, MAX සහ MIN විශාලතම සහ කුඩාම අගය සොයයි. ප්‍රතිඵලය එක් පේළියකි.', 'COUNT(*) menghitung baris, SUM menjumlahkan, AVG merata-rata, MAX dan MIN mencari nilai terbesar dan terkecil. Hasilnya satu baris.', 'COUNT(*) đếm số dòng, SUM tính tổng, AVG tính trung bình, MAX và MIN tìm giá trị lớn nhất và nhỏ nhất. Kết quả chỉ có một dòng.', 'COUNT(*) 计算行数，SUM 求和，AVG 求平均，MAX 和 MIN 求最大值和最小值。结果会汇总成一行。'],
    desc: ['{t} テーブル全体の行数と、{c} の{f}を求めてください。', 'For the whole {t} table, get the number of rows and the {f} of {c}.', 'पूरै {t} तालिकाको पङ्क्ति संख्या र {c} को {f} निकाल्नुहोस्।', 'Pour toute la table {t}, calculez le nombre de lignes ainsi que « {f} » de {c}.', '{t} ဇယားတစ်ခုလုံး၏ အတန်းအရေအတွက်နှင့် {c} ၏ {f} ကို ရှာပါ။', 'পুরো {t} টেবিলের সারির সংখ্যা এবং {c}-এর {f} বের করুন।', 'මුළු {t} වගුවේම පේළි ගණන සහ {c} හි {f} සොයන්න.', 'Untuk seluruh tabel {t}, hitung jumlah baris dan {f} dari {c}.', 'Với toàn bộ bảng {t}, hãy tìm số dòng và {f} của {c}.', '求整个 {t} 表的行数，以及 {c} 的{f}。'],
    syntax: 'SELECT COUNT(*), SUM({col}) FROM {table};   -- SUM / AVG / MAX / MIN',
    keywords: ['SELECT', 'COUNT(*)', 'SUM()', 'AVG()', 'MAX()', 'MIN()', 'FROM'],
    demo: { ds: 'products', p: { t: 'products', f: 'AVG', c: 'price' } },
    gen(ds, R) { return { t: ds.table, f: R.pick(AGG4), c: R.pick([ds.roles.n1, ds.roles.n2]) }; },
    sql: p => `SELECT COUNT(*), ${fn(p.f, p.c)} FROM ${p.t};`,
    blanks: ['f'],
    steps: p => [['step.from', `SELECT * FROM ${p.t};`], ['step.agg', `SELECT COUNT(*), ${fn(p.f, p.c)} FROM ${p.t};`]]
  },
  {
    key: 'whereagg', ch: 'agg', kind: 'single',
    title: ['条件をつけて集計 (WHERE＋集計)', 'Aggregating with a condition (WHERE + aggregate)', 'सर्तसहित हिसाब (WHERE + समग्र)', 'Agréger avec une condition (WHERE + agrégat)', 'အခြေအနေဖြင့် တွက်ချက်ခြင်း (WHERE + aggregate)', 'শর্তসহ সমষ্টি (WHERE + সমষ্টি)', 'කොන්දේසිය සමඟ එකතු කිරීම (WHERE + සමූහ)', 'Agregasi dengan syarat (WHERE + agregat)', 'Tổng hợp có điều kiện (WHERE + hàm tổng hợp)', '带条件的聚合 (WHERE + 聚合)'],
    point: ['WHERE は集計の前に働きます。まず条件で行を絞り、残った行だけで集計関数が計算されます。', 'WHERE works before aggregation: rows are filtered first, and the aggregate functions use only the rows that remain.', 'WHERE हिसाब गर्नुअघि काम गर्छ: पहिले पङ्क्ति छानिन्छ, अनि बाँकी पङ्क्तिहरूबाट मात्र हिसाब हुन्छ।', 'WHERE agit avant l’agrégation : on filtre d’abord les lignes, puis les fonctions d’agrégat n’utilisent que les lignes restantes.', 'WHERE သည် တွက်ချက်ခြင်းမတိုင်မီ အလုပ်လုပ်သည်။ အရင် အတန်းများကို စစ်ထုတ်ပြီး ကျန်သောအတန်းများဖြင့်သာ တွက်ချက်သည်။', 'WHERE সমষ্টির আগে কাজ করে: প্রথমে সারি ফিল্টার হয়, তারপর বাকি সারিগুলো দিয়েই হিসাব হয়।', 'WHERE එකතු කිරීමට පෙර ක්‍රියා කරයි: පළමුව පේළි පෙරා, ඉතිරි පේළි පමණක් ගණනය කරයි.', 'WHERE bekerja sebelum agregasi: baris disaring dulu, lalu fungsi agregat hanya memakai baris yang tersisa.', 'WHERE chạy trước khi tổng hợp: lọc dòng trước, rồi hàm tổng hợp chỉ tính trên các dòng còn lại.', 'WHERE 在聚合之前起作用：先按条件筛选行，聚合函数只计算剩下的行。'],
    desc: ['{t} テーブルで {cat} が {v} の行だけを対象に、{c1} の{f1}と {c2} の{f2}を求めてください。', 'In the {t} table, using only the rows where {cat} is {v}, get the {f1} of {c1} and the {f2} of {c2}.', '{t} तालिकामा {cat} {v} भएका पङ्क्तिहरू मात्र लिएर {c1} को {f1} र {c2} को {f2} निकाल्नुहोस्।', 'Dans la table {t}, en ne gardant que les lignes où {cat} vaut {v}, calculez « {f1} » de {c1} et « {f2} » de {c2}.', '{t} ဇယားတွင် {cat} သည် {v} ဖြစ်သော အတန်းများကိုသာ အသုံးပြု၍ {c1} ၏ {f1} နှင့် {c2} ၏ {f2} ကို ရှာပါ။', '{t} টেবিলে শুধু {cat} = {v} সারিগুলো নিয়ে {c1}-এর {f1} এবং {c2}-এর {f2} বের করুন।', '{t} වගුවේ {cat} අගය {v} වන පේළි පමණක් භාවිත කර {c1} හි {f1} සහ {c2} හි {f2} සොයන්න.', 'Di tabel {t}, hanya untuk baris yang {cat}-nya {v}, hitung {f1} dari {c1} dan {f2} dari {c2}.', 'Trong bảng {t}, chỉ xét các dòng có {cat} là {v}, hãy tìm {f1} của {c1} và {f2} của {c2}.', '在 {t} 表中，只针对 {cat} 为 {v} 的行，求 {c1} 的{f1}和 {c2} 的{f2}。'],
    syntax: "SELECT MAX({col}), MIN({col}) FROM {table} WHERE {col} = '{value}';",
    keywords: ['SELECT', 'SUM()', 'AVG()', 'MAX()', 'MIN()', 'FROM', 'WHERE', "= ''"],
    demo: { ds: 'students', p: { t: 'students', cat: 'major', v: 'IT', f1: 'MAX', c1: 'score', f2: 'MIN', c2: 'score' } },
    gen(ds, R) {
      const g = groupsOf(ds, ds.roles.cat).filter(x => x.size >= 2);
      const [f1, f2] = R.shuffle(AGG4).slice(0, 2);
      return { t: ds.table, cat: ds.roles.cat, v: R.pick(g).value, f1, c1: ds.roles.n1, f2, c2: R.pick([ds.roles.n1, ds.roles.n2]) };
    },
    sql: p => `SELECT ${fn(p.f1, p.c1)}, ${fn(p.f2, p.c2)} FROM ${p.t} WHERE ${p.cat} = ${lit(p.v)};`,
    blanks: ['v', 'f1', 'f2'],
    steps: p => [['step.from', `SELECT * FROM ${p.t};`], ['step.where', `SELECT * FROM ${p.t} WHERE ${p.cat} = ${lit(p.v)};`], ['step.agg', `SELECT ${fn(p.f1, p.c1)}, ${fn(p.f2, p.c2)} FROM ${p.t} WHERE ${p.cat} = ${lit(p.v)};`]]
  },
  {
    key: 'groupby', ch: 'agg', kind: 'single',
    title: ['グループごとに集計 (GROUP BY)', 'Summarising by group (GROUP BY)', 'समूह अनुसार हिसाब (GROUP BY)', 'Résumer par groupe (GROUP BY)', 'အုပ်စုအလိုက် တွက်ချက်ခြင်း (GROUP BY)', 'গ্রুপ অনুযায়ী সমষ্টি (GROUP BY)', 'කණ්ඩායම් අනුව එකතු කිරීම (GROUP BY)', 'Agregasi per kelompok (GROUP BY)', 'Tổng hợp theo nhóm (GROUP BY)', '分组聚合 (GROUP BY)'],
    point: ['GROUP BY 列 で、その列の値が同じ行どうしを1つのグループにします。集計関数はグループごとに計算され、グループの数だけ行ができます。', 'GROUP BY col puts rows with the same value into one group. Aggregates are calculated per group, so you get one row per group.', 'GROUP BY स्तम्भ ले एउटै मान भएका पङ्क्तिहरूलाई एउटा समूह बनाउँछ। हिसाब हरेक समूहको छुट्टै हुन्छ, त्यसैले हरेक समूहको एउटा पङ्क्ति आउँछ।', 'GROUP BY col regroupe les lignes ayant la même valeur. Les agrégats sont calculés par groupe : une ligne par groupe.', 'GROUP BY ကော်လံ သည် တန်ဖိုးတူသော အတန်းများကို အုပ်စုတစ်ခုတည်း ပြုလုပ်သည်။ အုပ်စုတစ်ခုစီအတွက် တွက်ချက်ပြီး အုပ်စုတစ်ခုလျှင် အတန်းတစ်တန်း ရသည်။', 'GROUP BY কলাম একই মানের সারিগুলোকে একটি গ্রুপে রাখে। প্রতিটি গ্রুপের জন্য আলাদা হিসাব হয়, তাই প্রতি গ্রুপে একটি সারি পাবেন।', 'GROUP BY තීරුව එකම අගය ඇති පේළි එක් කණ්ඩායමකට දමයි. සෑම කණ්ඩායමකටම වෙන වෙනම ගණනය කරන නිසා කණ්ඩායමකට එක් පේළියක් ලැබේ.', 'GROUP BY kolom mengelompokkan baris dengan nilai yang sama. Agregat dihitung per kelompok, jadi hasilnya satu baris per kelompok.', 'GROUP BY cột gom các dòng có cùng giá trị thành một nhóm. Hàm tổng hợp tính theo từng nhóm, nên mỗi nhóm cho ra một dòng.', 'GROUP BY 列 会把该列值相同的行分成一组。聚合函数按组计算，每组得到一行。'],
    desc: ['{t} テーブルを {cat} ごとにまとめ、{cat}・行数・{c} の{f}を取り出してください。', 'In the {t} table, for each {cat}, get {cat}, the number of rows, and the {f} of {c}.', '{t} तालिकामा हरेक {cat} अनुसार {cat}, पङ्क्ति संख्या, र {c} को {f} निकाल्नुहोस्।', 'Dans la table {t}, pour chaque {cat}, récupérez {cat}, le nombre de lignes et « {f} » de {c}.', '{t} ဇယားတွင် {cat} တစ်ခုစီအလိုက် {cat}၊ အတန်းအရေအတွက်နှင့် {c} ၏ {f} ကို ထုတ်ယူပါ။', '{t} টেবিলে প্রতিটি {cat} অনুযায়ী {cat}, সারির সংখ্যা এবং {c}-এর {f} বের করুন।', '{t} වගුවේ සෑම {cat} එකකටම {cat}, පේළි ගණන සහ {c} හි {f} ලබා ගන්න.', 'Di tabel {t}, untuk setiap {cat}, tampilkan {cat}, jumlah baris, dan {f} dari {c}.', 'Trong bảng {t}, với mỗi {cat}, hãy lấy {cat}, số dòng và {f} của {c}.', '在 {t} 表中，按 {cat} 分组，取出 {cat}、行数以及 {c} 的{f}。'],
    syntax: 'SELECT {group}, COUNT(*), AVG({num}) FROM {table} GROUP BY {group};',
    keywords: ['SELECT', 'COUNT(*)', 'SUM()', 'AVG()', 'MAX()', 'MIN()', 'FROM', 'GROUP BY'],
    demo: { ds: 'students', p: { t: 'students', cat: 'major', f: 'AVG', c: 'score' } },
    gen(ds, R) { return { t: ds.table, cat: ds.roles.cat, f: R.pick(AGG4), c: R.pick([ds.roles.n1, ds.roles.n2]) }; },
    sql: p => `SELECT ${p.cat}, COUNT(*), ${fn(p.f, p.c)} FROM ${p.t} GROUP BY ${p.cat};`,
    blanks: ['cat'],
    steps: p => [['step.from', `SELECT * FROM ${p.t} ORDER BY ${p.cat};`], ['step.group', `SELECT ${p.cat}, COUNT(*) FROM ${p.t} GROUP BY ${p.cat};`], ['step.agg', `SELECT ${p.cat}, COUNT(*), ${fn(p.f, p.c)} FROM ${p.t} GROUP BY ${p.cat};`]]
  },
  {
    key: 'grouporder', ch: 'agg', kind: 'single',
    title: ['集計結果で並べ替え (GROUP BY＋ORDER BY)', 'Sorting groups (GROUP BY + ORDER BY)', 'समूहलाई क्रमबद्ध (GROUP BY + ORDER BY)', 'Trier les groupes (GROUP BY + ORDER BY)', 'အုပ်စုများကို စီခြင်း (GROUP BY + ORDER BY)', 'গ্রুপ সাজানো (GROUP BY + ORDER BY)', 'කණ්ඩායම් පිළිවෙළ කිරීම (GROUP BY + ORDER BY)', 'Mengurutkan kelompok (GROUP BY + ORDER BY)', 'Sắp xếp nhóm (GROUP BY + ORDER BY)', '对分组结果排序 (GROUP BY + ORDER BY)'],
    point: ['ORDER BY には集計関数もそのまま書けます（例: ORDER BY AVG(price) DESC）。ORDER BY は GROUP BY の後ろに書きます。', 'You can sort by an aggregate directly, e.g. ORDER BY AVG(price) DESC. ORDER BY comes after GROUP BY.', 'ORDER BY मा समग्र फंक्सन सिधै लेख्न सकिन्छ, जस्तै ORDER BY AVG(price) DESC। ORDER BY, GROUP BY पछि आउँछ।', 'On peut trier directement par un agrégat, par ex. ORDER BY AVG(price) DESC. ORDER BY se place après GROUP BY.', 'ORDER BY တွင် aggregate function ကို တိုက်ရိုက်ရေးနိုင်သည် (ဥပမာ ORDER BY AVG(price) DESC)။ ORDER BY ကို GROUP BY နောက်တွင် ရေးပါ။', 'ORDER BY-তে সরাসরি সমষ্টি ফাংশন লেখা যায়, যেমন ORDER BY AVG(price) DESC। ORDER BY লিখতে হয় GROUP BY-এর পরে।', 'ORDER BY තුළ සමූහ ශ්‍රිතය කෙලින්ම ලිවිය හැක, උදා: ORDER BY AVG(price) DESC. ORDER BY ලියන්නේ GROUP BY ට පසුවය.', 'Anda bisa mengurutkan langsung dengan fungsi agregat, misalnya ORDER BY AVG(price) DESC. ORDER BY ditulis setelah GROUP BY.', 'Có thể sắp xếp trực tiếp theo hàm tổng hợp, ví dụ ORDER BY AVG(price) DESC. ORDER BY đặt sau GROUP BY.', 'ORDER BY 中可以直接写聚合函数，例如 ORDER BY AVG(price) DESC。ORDER BY 写在 GROUP BY 之后。'],
    desc: ['{t} テーブルで {cat} ごとに {c} の{f}を求め、その値の{ord}に {cat} と{f}を並べて取り出してください。', 'In the {t} table, for each {cat}, get {cat} and the {f} of {c}, sorted by that value {ord}.', '{t} तालिकामा हरेक {cat} को {c} को {f} निकाली, त्यो मानको आधारमा {ord} {cat} र {f} देखाउनुहोस्।', 'Dans la table {t}, pour chaque {cat}, calculez « {f} » de {c}, puis affichez {cat} et cette valeur, triés {ord}.', '{t} ဇယားတွင် {cat} တစ်ခုစီ၏ {c} ၏ {f} ကို ရှာပြီး ထိုတန်ဖိုးအလိုက် {ord} စီ၍ {cat} နှင့် {f} ကို ထုတ်ယူပါ။', '{t} টেবিলে প্রতিটি {cat}-এর {c}-এর {f} বের করে, সেই মান অনুযায়ী {ord} সাজিয়ে {cat} ও {f} দেখান।', '{t} වගුවේ සෑම {cat} එකකටම {c} හි {f} සොයා, එම අගය අනුව {ord} පිළිවෙළ කර {cat} සහ {f} පෙන්වන්න.', 'Di tabel {t}, untuk setiap {cat}, hitung {f} dari {c}, lalu tampilkan {cat} dan nilai itu diurutkan {ord}.', 'Trong bảng {t}, với mỗi {cat}, tính {f} của {c}, rồi hiển thị {cat} và giá trị đó, sắp xếp {ord}.', '在 {t} 表中，按 {cat} 求 {c} 的{f}，并按该值{ord}排列，取出 {cat} 和{f}。'],
    syntax: 'SELECT {group}, AVG({num}) FROM {table} GROUP BY {group} ORDER BY AVG({num}) DESC;',
    keywords: ['SELECT', 'SUM()', 'AVG()', 'MAX()', 'MIN()', 'FROM', 'GROUP BY', 'ORDER BY', 'ASC', 'DESC'],
    demo: { ds: 'products', p: { t: 'products', cat: 'category', f: 'AVG', c: 'price', ord: 'desc' } },
    gen(ds, R) { return { t: ds.table, cat: ds.roles.cat, f: R.pick(AGG4), c: R.pick([ds.roles.n1, ds.roles.n2]), ord: R.pick(['desc', 'asc']) }; },
    sql: p => `SELECT ${p.cat}, ${fn(p.f, p.c)} FROM ${p.t} GROUP BY ${p.cat} ORDER BY ${fn(p.f, p.c)} ${dir(p.ord)};`,
    tie: p => `SELECT ${fn(p.f, p.c)} FROM ${p.t} GROUP BY ${p.cat};`,
    blanks: ['ord'],
    steps: p => [['step.from', `SELECT * FROM ${p.t} ORDER BY ${p.cat};`], ['step.group', `SELECT ${p.cat}, ${fn(p.f, p.c)} FROM ${p.t} GROUP BY ${p.cat};`], ['step.order', `SELECT ${p.cat}, ${fn(p.f, p.c)} FROM ${p.t} GROUP BY ${p.cat} ORDER BY ${fn(p.f, p.c)} ${dir(p.ord)};`]]
  },
  {
    key: 'having', ch: 'agg', kind: 'single',
    title: ['グループを絞り込む (HAVING)', 'Filtering groups (HAVING)', 'समूह छान्ने (HAVING)', 'Filtrer les groupes (HAVING)', 'အုပ်စုများကို စစ်ထုတ်ခြင်း (HAVING)', 'গ্রুপ ফিল্টার (HAVING)', 'කණ්ඩායම් පෙරීම (HAVING)', 'Menyaring kelompok (HAVING)', 'Lọc nhóm (HAVING)', '筛选分组 (HAVING)'],
    point: ['HAVING は集計した後のグループに条件をつけます。WHERE は集計の前の「行」、HAVING は集計の後の「グループ」を絞ります。', 'HAVING puts a condition on groups after aggregation. WHERE filters rows before grouping; HAVING filters groups after.', 'HAVING ले हिसाबपछि समूहमा सर्त लगाउँछ। WHERE ले समूह बनाउनुअघि पङ्क्ति छान्छ, HAVING ले पछि समूह छान्छ।', 'HAVING applique une condition aux groupes après l’agrégation. WHERE filtre les lignes avant, HAVING filtre les groupes après.', 'HAVING သည် တွက်ချက်ပြီးနောက် အုပ်စုများအပေါ် အခြေအနေထားသည်။ WHERE က အုပ်စုမဖွဲ့မီ အတန်းများကို၊ HAVING က ဖွဲ့ပြီးနောက် အုပ်စုများကို စစ်ထုတ်သည်။', 'HAVING সমষ্টির পরে গ্রুপের উপর শর্ত দেয়। WHERE গ্রুপ করার আগে সারি ফিল্টার করে, HAVING পরে গ্রুপ ফিল্টার করে।', 'HAVING එකතු කිරීමෙන් පසු කණ්ඩායම්වලට කොන්දේසියක් දමයි. WHERE කණ්ඩායම් කිරීමට පෙර පේළි ද, HAVING පසුව කණ්ඩායම් ද පෙරයි.', 'HAVING memberi syarat pada kelompok setelah agregasi. WHERE menyaring baris sebelum dikelompokkan, HAVING menyaring kelompok sesudahnya.', 'HAVING đặt điều kiện cho nhóm sau khi tổng hợp. WHERE lọc dòng trước khi gom nhóm, HAVING lọc nhóm sau đó.', 'HAVING 在聚合之后对分组设置条件。WHERE 在分组前筛选“行”，HAVING 在分组后筛选“组”。'],
    desc: ['{t} テーブルで {cat} ごとに {c} の{f}を求め、その値が {x} 以上のグループだけ、{cat} と{f}を取り出してください。', 'In the {t} table, for each {cat}, get {cat} and the {f} of {c} — but only for groups where that value is {x} or more.', '{t} तालिकामा हरेक {cat} को {c} को {f} निकाल्नुहोस्, तर त्यो मान {x} वा बढी भएका समूहको मात्र {cat} र {f} देखाउनुहोस्।', 'Dans la table {t}, pour chaque {cat}, calculez « {f} » de {c} et affichez {cat} et cette valeur, uniquement pour les groupes où elle vaut au moins {x}.', '{t} ဇယားတွင် {cat} တစ်ခုစီ၏ {c} ၏ {f} ကို ရှာပြီး ထိုတန်ဖိုး {x} နှင့်အထက်ရှိသော အုပ်စုများ၏ {cat} နှင့် {f} ကိုသာ ထုတ်ယူပါ။', '{t} টেবিলে প্রতিটি {cat}-এর {c}-এর {f} বের করুন, তবে যেসব গ্রুপে মানটি {x} বা তার বেশি শুধু সেগুলোর {cat} ও {f} দেখান।', '{t} වගුවේ සෑම {cat} එකකටම {c} හි {f} සොයා, එම අගය {x} හෝ ඊට වැඩි කණ්ඩායම්වල පමණක් {cat} සහ {f} පෙන්වන්න.', 'Di tabel {t}, untuk setiap {cat}, hitung {f} dari {c}, lalu tampilkan {cat} dan nilai itu hanya untuk kelompok yang nilainya {x} atau lebih.', 'Trong bảng {t}, với mỗi {cat}, tính {f} của {c}, rồi chỉ hiển thị {cat} và giá trị đó cho những nhóm có giá trị từ {x} trở lên.', '在 {t} 表中，按 {cat} 求 {c} 的{f}，只取出该值大于等于 {x} 的组的 {cat} 和{f}。'],
    syntax: 'SELECT {group}, AVG({num}) FROM {table} GROUP BY {group} HAVING AVG({num}) >= {value};',
    keywords: ['SELECT', 'SUM()', 'AVG()', 'MAX()', 'MIN()', 'FROM', 'GROUP BY', 'HAVING', '>='],
    demo: { ds: 'products', p: { t: 'products', cat: 'category', f: 'AVG', c: 'price', x: 5000 } },
    gen(ds, R, ctx) {
      const f = R.pick(AGG4), c = R.pick([ds.roles.n1, ds.roles.n2]);
      const vals = ctx.values(`SELECT ${fn(f, c)} FROM ${ds.table} GROUP BY ${ds.roles.cat};`).map(r => r[0]).sort((a, b) => a - b);
      if (vals.length < 2) return null;
      const i = R.int(0, vals.length - 2), lo = vals[i], hi = vals[i + 1];
      const x = [niceFloor(hi), Math.floor(hi)].find(v => v > lo && v <= hi);
      if (x === undefined) return null;
      return { t: ds.table, cat: ds.roles.cat, f, c, x };
    },
    sql: p => `SELECT ${p.cat}, ${fn(p.f, p.c)} FROM ${p.t} GROUP BY ${p.cat} HAVING ${fn(p.f, p.c)} >= ${p.x};`,
    blanks: ['x'],
    steps: p => [['step.from', `SELECT * FROM ${p.t} ORDER BY ${p.cat};`], ['step.group', `SELECT ${p.cat}, ${fn(p.f, p.c)} FROM ${p.t} GROUP BY ${p.cat};`], ['step.having', `SELECT ${p.cat}, ${fn(p.f, p.c)} FROM ${p.t} GROUP BY ${p.cat} HAVING ${fn(p.f, p.c)} >= ${p.x};`]]
  },
  {
    key: 'wherehaving', ch: 'agg', kind: 'single',
    title: ['WHERE と HAVING を両方使う', 'Using WHERE and HAVING together', 'WHERE र HAVING सँगै प्रयोग', 'Utiliser WHERE et HAVING ensemble', 'WHERE နှင့် HAVING ကို အတူသုံးခြင်း', 'WHERE ও HAVING একসাথে', 'WHERE සහ HAVING එකට භාවිතය', 'Memakai WHERE dan HAVING bersama', 'Dùng cả WHERE và HAVING', '同时使用 WHERE 和 HAVING'],
    point: ['書く順番は WHERE → GROUP BY → HAVING です。まず WHERE で行を絞り、残った行でグループを作り、最後に HAVING でグループを絞ります。', 'The order is WHERE → GROUP BY → HAVING: filter rows, then group what remains, then filter the groups.', 'क्रम WHERE → GROUP BY → HAVING हो: पहिले पङ्क्ति छान्ने, बाँकीलाई समूह बनाउने, अनि समूह छान्ने।', 'L’ordre est WHERE → GROUP BY → HAVING : filtrer les lignes, regrouper le reste, puis filtrer les groupes.', 'အစဉ်မှာ WHERE → GROUP BY → HAVING ဖြစ်သည်။ အတန်းစစ်ထုတ်၊ ကျန်သည်ကို အုပ်စုဖွဲ့၊ ပြီးမှ အုပ်စုများကို စစ်ထုတ်သည်။', 'ক্রম হলো WHERE → GROUP BY → HAVING: সারি ফিল্টার, বাকিগুলো গ্রুপ, তারপর গ্রুপ ফিল্টার।', 'පිළිවෙළ WHERE → GROUP BY → HAVING වේ: පේළි පෙරා, ඉතිරිය කණ්ඩායම් කර, පසුව කණ්ඩායම් පෙරයි.', 'Urutannya WHERE → GROUP BY → HAVING: saring baris, kelompokkan sisanya, lalu saring kelompoknya.', 'Thứ tự là WHERE → GROUP BY → HAVING: lọc dòng, gom nhóm phần còn lại, rồi lọc nhóm.', '顺序是 WHERE → GROUP BY → HAVING：先筛选行，再把剩下的行分组，最后筛选分组。'],
    desc: ['{t} テーブルで {yr} が {y} 以上の行だけを使い、{cat} ごとに行数を数えて、{k} 件以上あるグループの {cat} と行数を取り出してください。', 'In the {t} table, use only the rows where {yr} is {y} or later. For each {cat}, count the rows and get {cat} and the count for groups with {k} or more rows.', '{t} तालिकामा {yr} {y} वा पछिका पङ्क्तिहरू मात्र प्रयोग गरी हरेक {cat} को पङ्क्ति गन्नुहोस्, र {k} वा बढी पङ्क्ति भएका समूहको {cat} र संख्या देखाउनुहोस्।', 'Dans la table {t}, n’utilisez que les lignes où {yr} est supérieur ou égal à {y}. Pour chaque {cat}, comptez les lignes et affichez {cat} et ce nombre pour les groupes d’au moins {k} lignes.', '{t} ဇယားတွင် {yr} သည် {y} နှင့်အထက် ဖြစ်သော အတန်းများကိုသာ သုံး၍ {cat} တစ်ခုစီ၏ အတန်းကို ရေတွက်ပြီး {k} တန်းနှင့်အထက် ရှိသော အုပ်စုများ၏ {cat} နှင့် အရေအတွက်ကို ထုတ်ယူပါ။', '{t} টেবিলে শুধু {yr} {y} বা তার পরের সারিগুলো নিয়ে প্রতিটি {cat}-এর সারি গুনুন, এবং যেসব গ্রুপে {k} বা তার বেশি সারি আছে সেগুলোর {cat} ও সংখ্যা দেখান।', '{t} වගුවේ {yr} අගය {y} හෝ ඊට වැඩි පේළි පමණක් භාවිත කර, සෑම {cat} එකකටම පේළි ගණන් කර, පේළි {k} හෝ ඊට වැඩි කණ්ඩායම්වල {cat} සහ ගණන පෙන්වන්න.', 'Di tabel {t}, gunakan hanya baris dengan {yr} {y} atau sesudahnya. Untuk setiap {cat}, hitung barisnya dan tampilkan {cat} serta jumlahnya untuk kelompok yang memiliki {k} baris atau lebih.', 'Trong bảng {t}, chỉ dùng các dòng có {yr} từ {y} trở đi. Với mỗi {cat}, đếm số dòng và hiển thị {cat} cùng số đếm cho các nhóm có từ {k} dòng trở lên.', '在 {t} 表中，只使用 {yr} 大于等于 {y} 的行，按 {cat} 统计行数，取出行数在 {k} 以上的组的 {cat} 和行数。'],
    syntax: 'SELECT {group}, COUNT(*) FROM {table} WHERE {col} >= {value} GROUP BY {group} HAVING COUNT(*) >= {n};',
    keywords: ['SELECT', 'COUNT(*)', 'FROM', 'WHERE', '>=', 'GROUP BY', 'HAVING'],
    demo: { ds: 'products', p: { t: 'products', cat: 'category', yr: 'release_year', y: 2020, k: 2 } },
    gen(ds, R, ctx) {
      const yrs = [...new Set(colVals(ds, ds.roles.yr))].sort((a, b) => a - b).slice(1, -1);
      const y = R.pick(yrs);
      const counts = [...new Set(ctx.values(`SELECT COUNT(*) FROM ${ds.table} WHERE ${ds.roles.yr} >= ${y} GROUP BY ${ds.roles.cat};`).map(r => r[0]))].sort((a, b) => a - b);
      if (counts.length < 2) return null;
      const k = R.pick(counts.slice(1));
      if (k < 2) return null;
      return { t: ds.table, cat: ds.roles.cat, yr: ds.roles.yr, y, k };
    },
    sql: p => `SELECT ${p.cat}, COUNT(*) FROM ${p.t} WHERE ${p.yr} >= ${p.y} GROUP BY ${p.cat} HAVING COUNT(*) >= ${p.k};`,
    blanks: ['y', 'k'],
    steps: p => [
      ['step.from', `SELECT * FROM ${p.t};`],
      ['step.where', `SELECT * FROM ${p.t} WHERE ${p.yr} >= ${p.y} ORDER BY ${p.cat};`],
      ['step.group', `SELECT ${p.cat}, COUNT(*) FROM ${p.t} WHERE ${p.yr} >= ${p.y} GROUP BY ${p.cat};`],
      ['step.having', `SELECT ${p.cat}, COUNT(*) FROM ${p.t} WHERE ${p.yr} >= ${p.y} GROUP BY ${p.cat} HAVING COUNT(*) >= ${p.k};`]
    ]
  },

  /* =================== JOIN =================== */
  {
    key: 'inner', ch: 'join', kind: 'join',
    title: ['INNER JOIN の基本', 'INNER JOIN basics', 'INNER JOIN को आधार', 'Les bases de INNER JOIN', 'INNER JOIN အခြေခံ', 'INNER JOIN-এর মূল কথা', 'INNER JOIN මූලික', 'Dasar INNER JOIN', 'Cơ bản về INNER JOIN', 'INNER JOIN 基础'],
    point: ['INNER JOIN 表B ON 表A.列 = 表B.列 で2つの表をつなぎます。両方の表に相手がいる行だけが結果に残ります。', 'INNER JOIN tableB ON tableA.col = tableB.col connects two tables. Only rows that have a partner in both tables remain.', 'INNER JOIN तालिकाB ON तालिकाA.स्तम्भ = तालिकाB.स्तम्भ ले दुई तालिका जोड्छ। दुवैमा जोडी भएका पङ्क्ति मात्र बाँकी रहन्छन्।', 'INNER JOIN tableB ON tableA.col = tableB.col relie deux tables. Seules les lignes qui ont un partenaire des deux côtés restent.', 'INNER JOIN ဇယားB ON ဇယားA.ကော်လံ = ဇယားB.ကော်လံ ဖြင့် ဇယားနှစ်ခုကို ချိတ်သည်။ နှစ်ဖက်စလုံးတွင် တွဲဖက်ရှိသော အတန်းများသာ ကျန်သည်။', 'INNER JOIN টেবিলB ON টেবিলA.কলাম = টেবিলB.কলাম দুটি টেবিল যুক্ত করে। যেসব সারির দুই টেবিলেই মিল আছে শুধু সেগুলো থাকে।', 'INNER JOIN වගුවB ON වගුවA.තීරුව = වගුවB.තීරුව මගින් වගු දෙකක් සම්බන්ධ කරයි. වගු දෙකෙහිම ගැළපෙන පේළි පමණක් ඉතිරි වේ.', 'INNER JOIN tabelB ON tabelA.kolom = tabelB.kolom menggabungkan dua tabel. Hanya baris yang punya pasangan di kedua tabel yang tersisa.', 'INNER JOIN bảngB ON bảngA.cột = bảngB.cột nối hai bảng. Chỉ những dòng có cặp tương ứng ở cả hai bảng mới còn lại.', 'INNER JOIN 表B ON 表A.列 = 表B.列 可以连接两个表。只有在两个表中都能配对的行才会保留。'],
    desc: ['{L} と {R} を {on} でつなぎ（INNER JOIN）、すべての列を取り出してください。', 'Join {L} and {R} with an INNER JOIN on {on}, and get all columns.', '{L} र {R} लाई {on} मा INNER JOIN गरी सबै स्तम्भ निकाल्नुहोस्।', 'Reliez {L} et {R} par un INNER JOIN sur {on}, et récupérez toutes les colonnes.', '{L} နှင့် {R} ကို {on} ဖြင့် INNER JOIN ချိတ်ပြီး ကော်လံအားလုံးကို ထုတ်ယူပါ။', '{L} এবং {R}-কে {on} দিয়ে INNER JOIN করে সব কলাম বের করুন।', '{L} සහ {R} වගු {on} මත INNER JOIN කර සියලු තීරු ලබා ගන්න.', 'Gabungkan {L} dan {R} dengan INNER JOIN pada {on}, lalu ambil semua kolom.', 'Nối {L} và {R} bằng INNER JOIN với điều kiện {on}, rồi lấy tất cả các cột.', '用 INNER JOIN 按 {on} 连接 {L} 和 {R}，取出所有列。'],
    syntax: 'SELECT * FROM {table} INNER JOIN {table} ON {table}.{key} = {table}.{key};',
    keywords: ['SELECT', '*', 'FROM', 'INNER JOIN', 'ON', '='],
    demo: { p: joinParams(DEMO_JOIN_PAIR) },
    gen(pair) { return joinParams(pair); },
    sql: p => `SELECT * FROM ${p.L} INNER JOIN ${p.R} ON ${onOf(p)};`,
    blanks: ['id', 'key'],
    steps: p => [['step.from', `SELECT * FROM ${p.L};`], ['step.join_inner', `SELECT * FROM ${p.L} INNER JOIN ${p.R} ON ${onOf(p)};`]]
  },
  {
    key: 'innercols', ch: 'join', kind: 'join',
    title: ['JOIN して列を選ぶ', 'Choosing columns after a JOIN', 'JOIN पछि स्तम्भ छान्ने', 'Choisir des colonnes après un JOIN', 'JOIN ပြီးနောက် ကော်လံရွေးခြင်း', 'JOIN-এর পরে কলাম বাছাই', 'JOIN පසු තීරු තේරීම', 'Memilih kolom setelah JOIN', 'Chọn cột sau khi JOIN', 'JOIN 后选择列'],
    point: ['2つの表に同じ名前の列があることがあるので、「テーブル名.列名」の形で、どちらの表の列かをはっきり書きます。', 'Both tables may have columns with the same name, so write “table.column” to say which table each column comes from.', 'दुवै तालिकामा एउटै नामको स्तम्भ हुन सक्छ, त्यसैले कुन तालिकाको हो भनेर “तालिका.स्तम्भ” लेख्नुहोस्।', 'Les deux tables peuvent avoir des colonnes de même nom : écrivez « table.colonne » pour préciser leur origine.', 'ဇယားနှစ်ခုလုံးတွင် အမည်တူကော်လံ ရှိနိုင်သဖြင့် မည်သည့်ဇယားမှဖြစ်ကြောင်း “ဇယား.ကော်လံ” ပုံစံဖြင့် ရေးပါ။', 'দুই টেবিলে একই নামের কলাম থাকতে পারে, তাই কোন টেবিলের কলাম তা বোঝাতে “টেবিল.কলাম” লিখুন।', 'වගු දෙකෙහිම එකම නමින් තීරු තිබිය හැකි නිසා, කුමන වගුවේදැයි පැහැදිලි කිරීමට “වගුව.තීරුව” ලෙස ලියන්න.', 'Kedua tabel bisa punya kolom bernama sama, jadi tulis “tabel.kolom” untuk menunjukkan asal kolomnya.', 'Hai bảng có thể có cột trùng tên, vì vậy hãy viết “bảng.cột” để chỉ rõ cột thuộc bảng nào.', '两个表中可能有同名的列，所以要用“表名.列名”的形式写明是哪张表的列。'],
    desc: ['{L} と {R} を {on} で INNER JOIN し、{c1} と {c2} だけを取り出してください。', 'INNER JOIN {L} and {R} on {on}, and get only {c1} and {c2}.', '{L} र {R} लाई {on} मा INNER JOIN गरी {c1} र {c2} मात्र निकाल्नुहोस्।', 'Faites un INNER JOIN de {L} et {R} sur {on}, et récupérez seulement {c1} et {c2}.', '{L} နှင့် {R} ကို {on} ဖြင့် INNER JOIN ချိတ်ပြီး {c1} နှင့် {c2} ကိုသာ ထုတ်ယူပါ။', '{L} এবং {R}-কে {on} দিয়ে INNER JOIN করে শুধু {c1} ও {c2} বের করুন।', '{L} සහ {R} වගු {on} මත INNER JOIN කර {c1} සහ {c2} පමණක් ලබා ගන්න.', 'Lakukan INNER JOIN {L} dan {R} pada {on}, lalu ambil hanya {c1} dan {c2}.', 'INNER JOIN {L} và {R} với điều kiện {on}, rồi chỉ lấy {c1} và {c2}.', '按 {on} 对 {L} 和 {R} 做 INNER JOIN，只取出 {c1} 和 {c2}。'],
    syntax: 'SELECT {table}.{col}, {table}.{col} FROM {table} INNER JOIN {table} ON {cond};',
    keywords: ['SELECT', 'FROM', 'INNER JOIN', 'ON', '=', '.'],
    demo: { p: Object.assign(joinParams(DEMO_JOIN_PAIR), { rc: 'column_b1' }) },
    gen(pair, R) { const p = joinParams(pair); p.rc = R.pick([p.text, p.num]); return p; },
    view: p => ({ c1: `${p.L}.${p.name}`, c2: `${p.R}.${p.rc}` }),
    sql: p => `SELECT ${p.L}.${p.name}, ${p.R}.${p.rc} FROM ${p.L} INNER JOIN ${p.R} ON ${onOf(p)};`,
    blanks: ['name', 'rc'],
    steps: p => [['step.from', `SELECT * FROM ${p.L};`], ['step.join_inner', `SELECT * FROM ${p.L} INNER JOIN ${p.R} ON ${onOf(p)};`], ['step.select', `SELECT ${p.L}.${p.name}, ${p.R}.${p.rc} FROM ${p.L} INNER JOIN ${p.R} ON ${onOf(p)};`]]
  },
  {
    key: 'innerwhere', ch: 'join', kind: 'join',
    title: ['JOIN してから絞り込む (WHERE)', 'Filtering after a JOIN (WHERE)', 'JOIN पछि छान्ने (WHERE)', 'Filtrer après un JOIN (WHERE)', 'JOIN ပြီးနောက် စစ်ထုတ်ခြင်း (WHERE)', 'JOIN-এর পরে ফিল্টার (WHERE)', 'JOIN පසු පෙරීම (WHERE)', 'Menyaring setelah JOIN (WHERE)', 'Lọc sau khi JOIN (WHERE)', 'JOIN 后筛选 (WHERE)'],
    point: ['WHERE は JOIN の後ろに書きます。つないだ結果に対して、ふつうの WHERE と同じように条件をつけられます。', 'WHERE comes after the JOIN. It filters the joined result just like a normal WHERE.', 'WHERE लाई JOIN पछि लेख्नुहोस्। यसले जोडिएको नतिजामा सामान्य WHERE जस्तै सर्त लगाउँछ।', 'WHERE se place après le JOIN et filtre le résultat joint comme un WHERE normal.', 'WHERE ကို JOIN နောက်တွင် ရေးပါ။ ချိတ်ပြီးသော ရလဒ်ကို သာမန် WHERE ကဲ့သို့ စစ်ထုတ်သည်။', 'WHERE লিখুন JOIN-এর পরে। এটি যুক্ত ফলাফলকে সাধারণ WHERE-এর মতোই ফিল্টার করে।', 'WHERE ලියන්නේ JOIN ට පසුවය. එය සම්බන්ධ කළ ප්‍රතිඵලය සාමාන්‍ය WHERE ලෙසම පෙරයි.', 'WHERE ditulis setelah JOIN. WHERE menyaring hasil gabungan seperti WHERE biasa.', 'WHERE đặt sau JOIN và lọc kết quả đã nối giống như WHERE thông thường.', 'WHERE 写在 JOIN 之后，像普通的 WHERE 一样对连接后的结果进行筛选。'],
    desc: ['{L} と {R} を {on} で INNER JOIN し、{lg} が {v} の行について {c1}・{lg}・{c2} を取り出してください。', 'INNER JOIN {L} and {R} on {on}. For the rows where {lg} is {v}, get {c1}, {lg} and {c2}.', '{L} र {R} लाई {on} मा INNER JOIN गर्नुहोस्। {lg} {v} भएका पङ्क्तिहरूको {c1}, {lg} र {c2} निकाल्नुहोस्।', 'Faites un INNER JOIN de {L} et {R} sur {on}. Pour les lignes où {lg} vaut {v}, récupérez {c1}, {lg} et {c2}.', '{L} နှင့် {R} ကို {on} ဖြင့် INNER JOIN ချိတ်ပါ။ {lg} သည် {v} ဖြစ်သော အတန်းများ၏ {c1}၊ {lg} နှင့် {c2} ကို ထုတ်ယူပါ။', '{L} এবং {R}-কে {on} দিয়ে INNER JOIN করুন। যেসব সারিতে {lg} = {v}, সেগুলোর {c1}, {lg} ও {c2} বের করুন।', '{L} සහ {R} වගු {on} මත INNER JOIN කරන්න. {lg} අගය {v} වන පේළිවල {c1}, {lg} සහ {c2} ලබා ගන්න.', 'Lakukan INNER JOIN {L} dan {R} pada {on}. Untuk baris yang {lg}-nya {v}, ambil {c1}, {lg}, dan {c2}.', 'INNER JOIN {L} và {R} với điều kiện {on}. Với các dòng có {lg} là {v}, hãy lấy {c1}, {lg} và {c2}.', '按 {on} 对 {L} 和 {R} 做 INNER JOIN，对 {lg} 为 {v} 的行，取出 {c1}、{lg} 和 {c2}。'],
    syntax: "SELECT {table}.{col}, ... FROM {table} INNER JOIN {table} ON {cond} WHERE {table}.{col} = '{value}';",
    keywords: ['SELECT', 'FROM', 'INNER JOIN', 'ON', 'WHERE', "= ''", '.'],
    demo: { p: Object.assign(joinParams(DEMO_JOIN_PAIR), { v: 'A' }) },
    gen(pair, R, ctx) {
      const p = joinParams(pair);
      const rows = ctx.values(`SELECT ${p.L}.${p.grp} FROM ${p.L} INNER JOIN ${p.R} ON ${onOf(p)};`).map(r => r[0]);
      const opts = [...new Set(rows)].filter(v => rows.filter(x => x === v).length < rows.length);
      if (!opts.length) return null;
      p.v = R.pick(opts); return p;
    },
    view: p => ({ c1: `${p.L}.${p.name}`, lg: `${p.L}.${p.grp}`, c2: `${p.R}.${p.num}` }),
    sql: p => `SELECT ${p.L}.${p.name}, ${p.L}.${p.grp}, ${p.R}.${p.num} FROM ${p.L} INNER JOIN ${p.R} ON ${onOf(p)} WHERE ${p.L}.${p.grp} = ${lit(p.v)};`,
    blanks: ['v'],
    steps: p => [['step.from', `SELECT * FROM ${p.L};`], ['step.join_inner', `SELECT * FROM ${p.L} INNER JOIN ${p.R} ON ${onOf(p)};`], ['step.where', `SELECT * FROM ${p.L} INNER JOIN ${p.R} ON ${onOf(p)} WHERE ${p.L}.${p.grp} = ${lit(p.v)};`], ['step.select', `SELECT ${p.L}.${p.name}, ${p.L}.${p.grp}, ${p.R}.${p.num} FROM ${p.L} INNER JOIN ${p.R} ON ${onOf(p)} WHERE ${p.L}.${p.grp} = ${lit(p.v)};`]]
  },
  {
    key: 'left', ch: 'join', kind: 'join',
    title: ['LEFT JOIN の基本', 'LEFT JOIN basics', 'LEFT JOIN को आधार', 'Les bases de LEFT JOIN', 'LEFT JOIN အခြေခံ', 'LEFT JOIN-এর মূল কথা', 'LEFT JOIN මූලික', 'Dasar LEFT JOIN', 'Cơ bản về LEFT JOIN', 'LEFT JOIN 基础'],
    point: ['LEFT JOIN では、左（FROM に書いた表）の行がすべて残ります。右の表に相手がいない所は NULL になります。', 'With LEFT JOIN every row of the left table (the one after FROM) stays. Where the right table has no partner, you get NULL.', 'LEFT JOIN मा बायाँ (FROM पछिको) तालिकाका सबै पङ्क्ति रहन्छन्। दायाँ तालिकामा जोडी नभएमा NULL आउँछ।', 'Avec LEFT JOIN, toutes les lignes de la table de gauche (après FROM) restent. Sans partenaire à droite, on obtient NULL.', 'LEFT JOIN တွင် ဘယ်ဘက်ဇယား (FROM နောက်ရှိ) ၏ အတန်းအားလုံး ကျန်သည်။ ညာဘက်ဇယားတွင် တွဲဖက်မရှိလျှင် NULL ဖြစ်သည်။', 'LEFT JOIN-এ বাম (FROM-এর পরের) টেবিলের সব সারি থাকে। ডান টেবিলে মিল না থাকলে NULL আসে।', 'LEFT JOIN හි වම් (FROM ට පසු) වගුවේ සියලු පේළි ඉතිරි වේ. දකුණු වගුවේ ගැළපීමක් නැති තැන NULL වේ.', 'Dengan LEFT JOIN, semua baris tabel kiri (setelah FROM) tetap ada. Jika tabel kanan tidak punya pasangan, hasilnya NULL.', 'Với LEFT JOIN, mọi dòng của bảng bên trái (sau FROM) đều được giữ. Chỗ nào bảng bên phải không có cặp sẽ là NULL.', '使用 LEFT JOIN 时，左表（FROM 后面的表）的所有行都会保留。右表中没有对应的地方显示为 NULL。'],
    desc: ['{L} を基準にして {R} を {on} で LEFT JOIN し、すべての列を取り出してください（相手がいない行の右側は NULL になります）。', 'LEFT JOIN {R} onto {L} on {on}, and get all columns (rows without a partner get NULL on the right).', '{L} लाई आधार बनाएर {R} लाई {on} मा LEFT JOIN गरी सबै स्तम्भ निकाल्नुहोस् (जोडी नभएका पङ्क्तिको दायाँ भाग NULL हुन्छ)।', 'Faites un LEFT JOIN de {R} sur {L} avec {on}, et récupérez toutes les colonnes (sans partenaire, la partie droite vaut NULL).', '{L} ကို အခြေခံ၍ {R} ကို {on} ဖြင့် LEFT JOIN ချိတ်ပြီး ကော်လံအားလုံးကို ထုတ်ယူပါ (တွဲဖက်မရှိသော အတန်း၏ ညာဘက်သည် NULL ဖြစ်မည်)။', '{L}-কে ভিত্তি করে {R}-কে {on} দিয়ে LEFT JOIN করে সব কলাম বের করুন (মিল না থাকা সারির ডান অংশ NULL হবে)।', '{L} පදනම් කර {R} වගුව {on} මත LEFT JOIN කර සියලු තීරු ලබා ගන්න (ගැළපීමක් නැති පේළිවල දකුණු පැත්ත NULL වේ).', 'Lakukan LEFT JOIN {R} ke {L} pada {on}, lalu ambil semua kolom (baris tanpa pasangan bernilai NULL di sisi kanan).', 'LEFT JOIN {R} vào {L} với điều kiện {on}, rồi lấy tất cả các cột (dòng không có cặp sẽ có NULL ở phía bên phải).', '以 {L} 为基准，按 {on} 对 {R} 做 LEFT JOIN，取出所有列（没有对应的行，右侧为 NULL）。'],
    syntax: 'SELECT * FROM {table} LEFT JOIN {table} ON {table}.{key} = {table}.{key};',
    keywords: ['SELECT', '*', 'FROM', 'LEFT JOIN', 'ON', '='],
    demo: { p: joinParams(DEMO_JOIN_PAIR) },
    gen(pair) { return joinParams(pair); },
    sql: p => `SELECT * FROM ${p.L} LEFT JOIN ${p.R} ON ${onOf(p)};`,
    blanks: ['id', 'key'],
    steps: p => [['step.from', `SELECT * FROM ${p.L};`], ['step.join_left', `SELECT * FROM ${p.L} LEFT JOIN ${p.R} ON ${onOf(p)};`]]
  },
  {
    key: 'antijoin', ch: 'join', kind: 'join',
    title: ['相手がいない行を探す (IS NULL)', 'Finding rows with no partner (IS NULL)', 'जोडी नभएका पङ्क्ति खोज्ने (IS NULL)', 'Trouver les lignes sans partenaire (IS NULL)', 'တွဲဖက်မရှိသော အတန်းရှာခြင်း (IS NULL)', 'মিলহীন সারি খোঁজা (IS NULL)', 'ගැළපීමක් නැති පේළි සෙවීම (IS NULL)', 'Mencari baris tanpa pasangan (IS NULL)', 'Tìm dòng không có cặp (IS NULL)', '查找没有对应的行 (IS NULL)'],
    point: ['LEFT JOIN の後に WHERE 右の表.列 IS NULL をつけると、「右の表に相手がいない行」だけが残ります。NULL は = ではなく IS NULL で調べます。', 'After a LEFT JOIN, WHERE right_table.col IS NULL keeps only rows with no partner. Test NULL with IS NULL, not =.', 'LEFT JOIN पछि WHERE दायाँ_तालिका.स्तम्भ IS NULL ले जोडी नभएका पङ्क्ति मात्र राख्छ। NULL लाई = होइन, IS NULL ले जाँच्नुहोस्।', 'Après un LEFT JOIN, WHERE table_droite.col IS NULL ne garde que les lignes sans partenaire. On teste NULL avec IS NULL, pas avec =.', 'LEFT JOIN နောက်တွင် WHERE ညာဇယား.ကော်လံ IS NULL ထည့်လျှင် တွဲဖက်မရှိသော အတန်းများသာ ကျန်သည်။ NULL ကို = မဟုတ်ဘဲ IS NULL ဖြင့် စစ်ပါ။', 'LEFT JOIN-এর পরে WHERE ডান_টেবিল.কলাম IS NULL দিলে শুধু মিলহীন সারি থাকে। NULL পরীক্ষা করুন IS NULL দিয়ে, = দিয়ে নয়।', 'LEFT JOIN ට පසු WHERE දකුණු_වගුව.තීරුව IS NULL දැමූ විට ගැළපීමක් නැති පේළි පමණක් ඉතිරි වේ. NULL පරීක්ෂා කරන්නේ = නොව IS NULL මගිනි.', 'Setelah LEFT JOIN, WHERE tabel_kanan.kolom IS NULL hanya menyisakan baris tanpa pasangan. Periksa NULL dengan IS NULL, bukan =.', 'Sau LEFT JOIN, WHERE bảng_phải.cột IS NULL chỉ giữ lại các dòng không có cặp. Kiểm tra NULL bằng IS NULL, không dùng =.', '在 LEFT JOIN 之后加上 WHERE 右表.列 IS NULL，就只留下“右表中没有对应”的行。判断 NULL 要用 IS NULL，而不是 =。'],
    desc: ['{L} の行のうち、{R} に相手がいない（{on} が成り立たない）行を探し、{c1} と {c2} を取り出してください。', 'Find the rows of {L} that have no partner in {R} (no match for {on}), and get {c1} and {c2}.', '{L} का पङ्क्तिहरूमध्ये {R} मा जोडी नभएका ({on} नमिल्ने) पङ्क्ति खोजी {c1} र {c2} निकाल्नुहोस्।', 'Trouvez les lignes de {L} sans partenaire dans {R} (aucune correspondance pour {on}), et récupérez {c1} et {c2}.', '{L} ၏ အတန်းများထဲမှ {R} တွင် တွဲဖက်မရှိသော ({on} မကိုက်ညီသော) အတန်းများကို ရှာပြီး {c1} နှင့် {c2} ကို ထုတ်ယူပါ။', '{L}-এর যেসব সারির {R}-এ কোনো মিল নেই ({on} মেলে না), সেগুলো খুঁজে {c1} ও {c2} বের করুন।', '{L} හි පේළි අතරින් {R} තුළ ගැළපීමක් නැති ({on} නොගැළපෙන) පේළි සොයා {c1} සහ {c2} ලබා ගන්න.', 'Cari baris {L} yang tidak punya pasangan di {R} (tidak cocok untuk {on}), lalu ambil {c1} dan {c2}.', 'Tìm các dòng của {L} không có cặp trong {R} (không khớp {on}), rồi lấy {c1} và {c2}.', '找出 {L} 中在 {R} 里没有对应（不满足 {on}）的行，取出 {c1} 和 {c2}。'],
    syntax: 'SELECT ... FROM {table} LEFT JOIN {table} ON {cond} WHERE {table}.{key} IS NULL;',
    keywords: ['SELECT', 'FROM', 'LEFT JOIN', 'ON', 'WHERE', 'IS NULL', '.'],
    demo: { p: joinParams(DEMO_JOIN_PAIR) },
    gen(pair) { return joinParams(pair); },
    view: p => ({ c1: `${p.L}.${p.id}`, c2: `${p.L}.${p.name}` }),
    sql: p => `SELECT ${p.L}.${p.id}, ${p.L}.${p.name} FROM ${p.L} LEFT JOIN ${p.R} ON ${onOf(p)} WHERE ${p.R}.${p.nullcol || p.key} IS NULL;`,
    blanks: ['nullcol'],
    steps: p => [['step.from', `SELECT * FROM ${p.L};`], ['step.join_left', `SELECT * FROM ${p.L} LEFT JOIN ${p.R} ON ${onOf(p)};`], ['step.where', `SELECT * FROM ${p.L} LEFT JOIN ${p.R} ON ${onOf(p)} WHERE ${p.R}.${p.key} IS NULL;`], ['step.select', `SELECT ${p.L}.${p.id}, ${p.L}.${p.name} FROM ${p.L} LEFT JOIN ${p.R} ON ${onOf(p)} WHERE ${p.R}.${p.key} IS NULL;`]]
  },
  {
    key: 'leftorder', ch: 'join', kind: 'join',
    title: ['JOIN ＋ 並べ替え ＋ 件数', 'JOIN + sort + limit', 'JOIN + क्रम + सीमा', 'JOIN + tri + limite', 'JOIN + စီခြင်း + အရေအတွက်', 'JOIN + সাজানো + সীমা', 'JOIN + පිළිවෙළ + සීමාව', 'JOIN + urut + batas', 'JOIN + sắp xếp + giới hạn', 'JOIN + 排序 + 限制行数'],
    point: ['JOIN した結果にも ORDER BY や LIMIT がそのまま使えます。並べ替えに使う列も「テーブル名.列名」で書きます。', 'ORDER BY and LIMIT work on joined results too. Write the sort column as “table.column” as well.', 'जोडिएको नतिजामा पनि ORDER BY र LIMIT चल्छन्। क्रमबद्ध गर्ने स्तम्भ पनि “तालिका.स्तम्भ” मा लेख्नुहोस्।', 'ORDER BY et LIMIT fonctionnent aussi sur un résultat joint. Écrivez la colonne de tri sous la forme « table.colonne ».', 'ချိတ်ပြီးသော ရလဒ်တွင်လည်း ORDER BY နှင့် LIMIT သုံးနိုင်သည်။ စီရန်ကော်လံကိုလည်း “ဇယား.ကော်လံ” ဖြင့် ရေးပါ။', 'যুক্ত ফলাফলেও ORDER BY ও LIMIT কাজ করে। সাজানোর কলামও “টেবিল.কলাম” আকারে লিখুন।', 'සම්බන්ධ කළ ප්‍රතිඵලවලටද ORDER BY සහ LIMIT භාවිත කළ හැක. පිළිවෙළ කරන තීරුවද “වගුව.තීරුව” ලෙස ලියන්න.', 'ORDER BY dan LIMIT juga berlaku untuk hasil JOIN. Tulis kolom pengurutan sebagai “tabel.kolom”.', 'ORDER BY và LIMIT cũng dùng được với kết quả đã nối. Hãy viết cột sắp xếp dạng “bảng.cột”.', '连接后的结果同样可以使用 ORDER BY 和 LIMIT。用于排序的列也写成“表名.列名”。'],
    desc: ['{L} に {R} を {on} で LEFT JOIN し、{c2} の{ord}に並べて、先頭 {k} 件の {c1} と {c2} を取り出してください。', 'LEFT JOIN {R} onto {L} on {on}, sort by {c2} {ord}, and get {c1} and {c2} of the first {k} rows.', '{L} मा {R} लाई {on} मा LEFT JOIN गरी {c2} को आधारमा {ord} मिलाउनुहोस्, र पहिलो {k} पङ्क्तिको {c1} र {c2} निकाल्नुहोस्।', 'Faites un LEFT JOIN de {R} sur {L} avec {on}, triez selon {c2} {ord}, puis récupérez {c1} et {c2} des {k} premières lignes.', '{L} သို့ {R} ကို {on} ဖြင့် LEFT JOIN ချိတ်ပြီး {c2} အလိုက် {ord} စီကာ ပထမ {k} တန်း၏ {c1} နှင့် {c2} ကို ထုတ်ယူပါ။', '{L}-এর সাথে {R}-কে {on} দিয়ে LEFT JOIN করে {c2} অনুযায়ী {ord} সাজান, এবং প্রথম {k}টি সারির {c1} ও {c2} বের করুন।', '{L} වෙත {R} වගුව {on} මත LEFT JOIN කර, {c2} අනුව {ord} පිළිවෙළ කර, මුල් පේළි {k} හි {c1} සහ {c2} ලබා ගන්න.', 'Lakukan LEFT JOIN {R} ke {L} pada {on}, urutkan berdasarkan {c2} {ord}, lalu ambil {c1} dan {c2} dari {k} baris pertama.', 'LEFT JOIN {R} vào {L} với điều kiện {on}, sắp xếp theo {c2} {ord}, rồi lấy {c1} và {c2} của {k} dòng đầu tiên.', '按 {on} 把 {R} LEFT JOIN 到 {L}，按 {c2} {ord}排序，取前 {k} 行的 {c1} 和 {c2}。'],
    syntax: 'SELECT ... FROM {table} LEFT JOIN {table} ON {cond} ORDER BY {table}.{col} DESC LIMIT {n};',
    keywords: ['SELECT', 'FROM', 'LEFT JOIN', 'ON', 'ORDER BY', 'DESC', 'LIMIT', '.'],
    demo: { p: Object.assign(joinParams(DEMO_JOIN_PAIR), { ord: 'desc', k: 3 }) },
    gen(pair, R) { const p = joinParams(pair); p.ord = 'desc'; p.k = R.int(2, 3); return p; },
    view: p => ({ c1: `${p.L}.${p.name}`, c2: `${p.R}.${p.num}` }),
    sql: p => `SELECT ${p.L}.${p.name}, ${p.R}.${p.num} FROM ${p.L} LEFT JOIN ${p.R} ON ${onOf(p)} ORDER BY ${p.R}.${p.num} ${dir(p.ord)} LIMIT ${p.k};`,
    tie: p => `SELECT ${p.R}.${p.num} FROM ${p.L} INNER JOIN ${p.R} ON ${onOf(p)};`,
    blanks: ['ord', 'k'],
    steps: p => [['step.from', `SELECT * FROM ${p.L};`], ['step.join_left', `SELECT * FROM ${p.L} LEFT JOIN ${p.R} ON ${onOf(p)};`], ['step.order', `SELECT * FROM ${p.L} LEFT JOIN ${p.R} ON ${onOf(p)} ORDER BY ${p.R}.${p.num} ${dir(p.ord)};`], ['step.limit', `SELECT * FROM ${p.L} LEFT JOIN ${p.R} ON ${onOf(p)} ORDER BY ${p.R}.${p.num} ${dir(p.ord)} LIMIT ${p.k};`], ['step.select', `SELECT ${p.L}.${p.name}, ${p.R}.${p.num} FROM ${p.L} LEFT JOIN ${p.R} ON ${onOf(p)} ORDER BY ${p.R}.${p.num} ${dir(p.ord)} LIMIT ${p.k};`]]
  }
];

if (typeof module !== 'undefined') module.exports = { LESSONS, CHAPTERS, DEMO_JOIN_PAIR, BLANK, joinView };
