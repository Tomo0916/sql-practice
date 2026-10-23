let currentProbIdx = 0;
let currentLang = 'ja';
let db = null;
let completedSet = new Set(JSON.parse(localStorage.getItem('sql_completed') || '[]'));
let lastUserResult = null;
let lastExpectedResult = null;

// 1. データベース初期化
async function initApp() {
  const SQL = await initSqlJs({ locateFile: f => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/${f}` });
  db = new SQL.Database();
  db.run(INITIAL_DATABASE_SQL);

  // JOIN編用の2テーブルプレビューがあれば描画
  if (typeof renderJoinTablesPreview === 'function') {
    renderJoinTablesPreview();
  }

  renderNav();
  loadProblem(0);
}

// JOIN編用テーブル描画
function renderJoinTablesPreview() {
  const container = document.getElementById('joinTablesPreview');
  if (!container || !db) return;

  container.innerHTML = '';
  ['table_a', 'table_b'].forEach(tblName => {
    try {
      const res = db.exec(`SELECT * FROM ${tblName};`)[0];
      if (!res) return;
      let html = `<div class="mini-table-card"><div class="mini-table-title">■ ${tblName}</div><table><thead><tr>`;
      res.columns.forEach(c => html += `<th>${c}</th>`);
      html += "</tr></thead><tbody>";
      res.values.forEach(r => {
        html += "<tr>";
        r.forEach(v => html += `<td>${v}</td>`);
        html += "</tr>";
      });
      html += "</tbody></table></div>";
      container.innerHTML += html;
    } catch(e) {}
  });
}

// 2. ナビゲーションの描画（★基礎編・JOIN編・集計編のすべてのタブコンテナに自動対応）
function renderNav() {
  const p1Box = document.getElementById('tabPart1');
  const p2Box = document.getElementById('tabPart2');
  const p3Box = document.getElementById('tabPart3');
  const pBox = document.getElementById('tabContainerProducts');
  const sBox = document.getElementById('tabContainerStudents');

  [p1Box, p2Box, p3Box, pBox, sBox].forEach(b => { if (b) b.innerHTML = ''; });

  PROBLEMS.forEach((p, idx) => {
    const btn = document.createElement('button');
    btn.className = `tab-btn ${idx === currentProbIdx ? 'active' : ''} ${completedSet.has(p.id) ? 'completed' : ''}`;
    btn.innerText = `Q${p.id}`;
    btn.onclick = () => loadProblem(idx);

    // 集計編（Part 1, 2, 3）
    if (p.part === 1 && p1Box) p1Box.appendChild(btn);
    else if (p.part === 2 && p2Box) p2Box.appendChild(btn);
    else if (p.part === 3 && p3Box) p3Box.appendChild(btn);
    // 基礎編（Products, Students）
    else if (sBox && p.table === 'students') sBox.appendChild(btn);
    else if (pBox) pBox.appendChild(btn);
  });
}

// 3. 問題のロード
function loadProblem(idx) {
  currentProbIdx = idx;
  const p = PROBLEMS[idx];

  const elTitle = document.getElementById('probTitle');
  if (elTitle) elTitle.innerText = p.title[currentLang] || p.title.en;

  const elDesc = document.getElementById('probDesc');
  if (elDesc) elDesc.innerText = p.desc[currentLang] || p.desc.en;

  const elTarget = document.getElementById('targetTableLabel');
  if (elTarget) elTarget.innerText = p.table;

  const elH1 = document.getElementById('hint1Text');
  if (elH1) elH1.innerText = p.hint1;

  const elH2 = document.getElementById('hint2Text');
  if (elH2) elH2.innerText = p.hint2;

  const elAns = document.getElementById('answerText');
  if (elAns) elAns.innerText = p.answer;

  const elSql = document.getElementById('sqlInput');
  if (elSql) elSql.value = p.defaultSql;

  const elNext = document.getElementById('nextBtn');
  if (elNext) elNext.style.display = 'none';

  // 列名チップの描画
  const chipsBox = document.getElementById('columnChips');
  if (chipsBox) {
    chipsBox.innerHTML = '';
    if (p.table === 'table_a' || p.table === 'table_b') {
      ['table_a.id', 'table_a.class', 'table_a.column_a1', 'table_b.id', 'table_b.column_b1', 'table_b.column_b2'].forEach(col => {
        const chip = document.createElement('span');
        chip.className = 'col-chip';
        chip.innerText = col;
        chip.onclick = () => insertSnippet(col);
        chipsBox.appendChild(chip);
      });
    } else if (typeof TABLE_COLUMNS !== 'undefined' && TABLE_COLUMNS[p.table]) {
      TABLE_COLUMNS[p.table].forEach(col => {
        const chip = document.createElement('span');
        chip.className = 'col-chip';
        chip.innerText = col;
        chip.onclick = () => insertSnippet(col);
        chipsBox.appendChild(chip);
      });
    }
  }

  hideStatus();
  renderNav();
}

// 4. エディタ挿入
function insertSnippet(text) {
  const textarea = document.getElementById('sqlInput');
  if (!textarea) return;
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const val = textarea.value;
  textarea.value = val.substring(0, start) + text + val.substring(end);
  textarea.focus();
  textarea.selectionStart = textarea.selectionEnd = start + text.length;
}

// 5. クエリ実行 & 正誤判定
function executeQuery() {
  const sql = document.getElementById('sqlInput').value.trim();
  const p = PROBLEMS[currentProbIdx];

  try {
    const userRes = db.exec(sql);
    const ansRes = db.exec(p.answer);

    lastUserResult = userRes.length > 0 ? userRes[0] : null;
    lastExpectedResult = ansRes.length > 0 ? ansRes[0] : null;

    switchResultTab('user');

    if (!lastUserResult) {
      showStatus("⚠️ 結果が0件です (0 rows returned)", "error");
      return;
    }

    const userVal = lastUserResult.values;
    const ansVal = lastExpectedResult.values;
    const userCol = lastUserResult.columns.map(c => c.toLowerCase());
    const ansCol = lastExpectedResult.columns.map(c => c.toLowerCase());

    const colMatch = userCol.length === ansCol.length; // 集計関数名やエイリアスの差を許容
    let valMatch = false;

    if (p.answer.toUpperCase().includes("ORDER BY")) {
      valMatch = JSON.stringify(userVal) === JSON.stringify(ansVal);
    } else {
      valMatch = JSON.stringify([...userVal].sort()) === JSON.stringify([...ansVal].sort());
    }

    if (colMatch && valMatch) {
      showStatus(UI_I18N.success[currentLang] || UI_I18N.success.en, "success");
      completedSet.add(p.id);
      localStorage.setItem('sql_completed', JSON.stringify([...completedSet]));
      renderNav();

      const elNext = document.getElementById('nextBtn');
      if (elNext && currentProbIdx < PROBLEMS.length - 1) {
        elNext.style.display = 'inline-block';
      }
    } else {
      showStatus(UI_I18N.wrong[currentLang] || UI_I18N.wrong.en, "error");
    }
  } catch (err) {
    showStatus(`❌ SQL構文エラー: ${err.message}`, "error");
  }
}

// 6. テーブル描画
function renderTable(data) {
  const box = document.getElementById('tableOutput');
  if (!box) return;
  if (!data || !data.columns || data.values.length === 0) {
    box.innerHTML = "<p style='padding:16px; color:#94a3b8;'>No rows to display.</p>";
    return;
  }
  let html = "<table><thead><tr>";
  data.columns.forEach(c => html += `<th>${c}</th>`);
  html += "</tr></thead><tbody>";
  data.values.forEach(r => {
    html += "<tr>";
    r.forEach(v => html += `<td>${v !== null ? v : '<span style="color:#e11d48; font-weight:bold;">NULL</span>'}</td>`);
    html += "</tr>";
  });
  html += "</tbody></table>";
  box.innerHTML = html;
}

function switchResultTab(type) {
  const tUser = document.getElementById('tabUserRes');
  const tExp = document.getElementById('tabExpectedRes');
  if (tUser) tUser.className = `res-tab-btn ${type === 'user' ? 'active' : ''}`;
  if (tExp) tExp.className = `res-tab-btn ${type === 'expected' ? 'active' : ''}`;
  renderTable(type === 'user' ? lastUserResult : lastExpectedResult);
}

function showStatus(msg, type) {
  const el = document.getElementById('statusMsg');
  if (el) {
    el.className = `status-box ${type}`;
    el.innerText = msg;
  }
}
function hideStatus() {
  const el = document.getElementById('statusMsg');
  if (el) el.className = 'status-box';
}

// 7. 言語切り替え
function changeLanguage(lang) {
  currentLang = lang;
  const setTxt = (id, obj) => {
    const el = document.getElementById(id);
    if (el && obj) el.innerText = obj[lang] || obj.en;
  };
  setTxt('viewRawLabel', UI_I18N.viewRaw);
  setTxt('hint1Label', UI_I18N.hint1);
  setTxt('hint2Label', UI_I18N.hint2);
  setTxt('ansLabel', UI_I18N.ans);
  setTxt('runBtnLabel', UI_I18N.run);
  setTxt('resetBtnLabel', UI_I18N.reset);
  loadProblem(currentProbIdx);
}

// 8. イベント登録
const runBtn = document.getElementById('runBtn');
if (runBtn) runBtn.addEventListener('click', executeQuery);

const resetBtn = document.getElementById('resetBtn');
if (resetBtn) resetBtn.addEventListener('click', () => {
  document.getElementById('sqlInput').value = PROBLEMS[currentProbIdx].defaultSql;
  hideStatus();
});

const nextBtn = document.getElementById('nextBtn');
if (nextBtn) nextBtn.addEventListener('click', () => {
  if (currentProbIdx < PROBLEMS.length - 1) loadProblem(currentProbIdx + 1);
});

const langSel = document.getElementById('langSelect');
if (langSel) langSel.addEventListener('change', e => changeLanguage(e.target.value));

const tabUser = document.getElementById('tabUserRes');
if (tabUser) tabUser.addEventListener('click', () => switchResultTab('user'));

const tabExp = document.getElementById('tabExpectedRes');
if (tabExp) tabExp.addEventListener('click', () => switchResultTab('expected'));

const sqlIn = document.getElementById('sqlInput');
if (sqlIn) {
  sqlIn.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      executeQuery();
    }
  });
}

// モーダル表示
const prevBtn = document.getElementById('previewTableBtn');
if (prevBtn) {
  prevBtn.addEventListener('click', () => {
    const tbl = PROBLEMS[currentProbIdx].table;
    const modalBody = document.getElementById('modalBody');
    if (!modalBody) return;
    modalBody.innerHTML = '';

    if (tbl === 'table_a' || tbl === 'table_b') {
      document.getElementById('modalTitle').innerText = 'Raw Data: table_a & table_b';
      ['table_a', 'table_b'].forEach(t => {
        const res = db.exec(`SELECT * FROM ${t};`)[0];
        let html = `<h4 style="margin: 10px 0 6px 0; color:#2563eb;">■ Table: ${t}</h4><table><thead><tr>`;
        res.columns.forEach(c => html += `<th>${c}</th>`);
        html += "</tr></thead><tbody>";
        res.values.forEach(r => {
          html += "<tr>";
          r.forEach(v => html += `<td>${v}</td>`);
          html += "</tr>";
        });
        html += "</tbody></table>";
        modalBody.innerHTML += html;
      });
    } else {
      const res = db.exec(`SELECT * FROM ${tbl};`)[0];
      document.getElementById('modalTitle').innerText = `Table: ${tbl} (${res.values.length} records)`;
      let html = "<table><thead><tr>";
      res.columns.forEach(c => html += `<th>${c}</th>`);
      html += "</tr></thead><tbody>";
      res.values.forEach(r => {
        html += "<tr>";
        r.forEach(v => html += `<td>${v}</td>`);
        html += "</tr>";
      });
      html += "</tbody></table>";
      modalBody.innerHTML += html;
    }

    const overlay = document.getElementById('modalOverlay');
    if (overlay) overlay.style.display = 'flex';
  });
}

const closeBtn = document.getElementById('closeModalBtn');
if (closeBtn) closeBtn.addEventListener('click', () => {
  const overlay = document.getElementById('modalOverlay');
  if (overlay) overlay.style.display = 'none';
});

const overlay = document.getElementById('modalOverlay');
if (overlay) {
  overlay.addEventListener('click', e => {
    if (e.target.id === 'modalOverlay') overlay.style.display = 'none';
  });
}

initApp();