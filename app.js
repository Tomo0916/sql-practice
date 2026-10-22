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

  renderNav();
  loadProblem(0);
}

// 2. ナビゲーションの描画
function renderNav() {
  const pBox = document.getElementById('tabContainerProducts');
  const sBox = document.getElementById('tabContainerStudents');
  pBox.innerHTML = '';
  sBox.innerHTML = '';

  PROBLEMS.forEach((p, idx) => {
    const btn = document.createElement('button');
    btn.className = `tab-btn ${idx === currentProbIdx ? 'active' : ''} ${completedSet.has(p.id) ? 'completed' : ''}`;
    btn.innerText = `Q${p.id}`;
    btn.onclick = () => loadProblem(idx);
    if (p.table === 'products') pBox.appendChild(btn);
    else sBox.appendChild(btn);
  });
}

// 3. 問題のロード
function loadProblem(idx) {
  currentProbIdx = idx;
  const p = PROBLEMS[idx];

  document.getElementById('probTitle').innerText = p.title[currentLang] || p.title.en;
  document.getElementById('probDesc').innerText = p.desc[currentLang] || p.desc.en;
  document.getElementById('targetTableLabel').innerText = p.table;
  document.getElementById('hint1Text').innerText = p.hint1;
  document.getElementById('hint2Text').innerText = p.hint2;
  document.getElementById('answerText').innerText = p.answer;
  document.getElementById('sqlInput').value = p.defaultSql;
  document.getElementById('nextBtn').style.display = 'none';

  // 列名チップの描画
  const chipsBox = document.getElementById('columnChips');
  chipsBox.innerHTML = '';
  TABLE_COLUMNS[p.table].forEach(col => {
    const chip = document.createElement('span');
    chip.className = 'col-chip';
    chip.innerText = col;
    chip.onclick = () => insertSnippet(col);
    chipsBox.appendChild(chip);
  });

  hideStatus();
  renderNav();
}

// 4. エディタへのテキスト挿入（チップ入力）
function insertSnippet(text) {
  const textarea = document.getElementById('sqlInput');
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const val = textarea.value;
  textarea.value = val.substring(0, start) + text + val.substring(end);
  textarea.focus();
  textarea.selectionStart = textarea.selectionEnd = start + text.length;
}

// 5. クエリ実行と正誤判定
function executeQuery() {
  const sql = document.getElementById('sqlInput').value.trim();
  const p = PROBLEMS[currentProbIdx];

  try {
    const userRes = db.exec(sql);
    const ansRes = db.exec(p.answer);

    lastUserResult = userRes.length > 0 ? userRes[0] : null;
    lastExpectedResult = ansRes.length > 0 ? ansRes[0] : null;

    // デフォルトで「あなたの結果」タブを表示
    switchResultTab('user');

    if (!lastUserResult) {
      showStatus("⚠️ 結果が0件です (0 rows returned)", "error");
      return;
    }

    const userVal = lastUserResult.values;
    const ansVal = lastExpectedResult.values;
    const userCol = lastUserResult.columns.map(c => c.toLowerCase());
    const ansCol = lastExpectedResult.columns.map(c => c.toLowerCase());

    const colMatch = JSON.stringify(userCol) === JSON.stringify(ansCol);
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
      
      // 次の問題があれば「次へ進む」ボタンを表示
      if (currentProbIdx < PROBLEMS.length - 1) {
        document.getElementById('nextBtn').style.display = 'inline-block';
      }
    } else {
      showStatus(UI_I18N.wrong[currentLang] || UI_I18N.wrong.en, "error");
    }
  } catch (err) {
    showStatus(`❌ SQL構文エラー: ${err.message}`, "error");
  }
}

// 6. 結果テーブル描画
function renderTable(data) {
  const box = document.getElementById('tableOutput');
  if (!data || !data.columns || data.values.length === 0) {
    box.innerHTML = "<p style='padding:16px; color:#94a3b8;'>No rows to display.</p>";
    return;
  }
  let html = "<table><thead><tr>";
  data.columns.forEach(c => html += `<th>${c}</th>`);
  html += "</tr></thead><tbody>";
  data.values.forEach(r => {
    html += "<tr>";
    r.forEach(v => html += `<td>${v !== null ? v : '<span style="color:#ccc;">NULL</span>'}</td>`);
    html += "</tr>";
  });
  html += "</tbody></table>";
  box.innerHTML = html;
}

function switchResultTab(type) {
  document.getElementById('tabUserRes').className = `res-tab-btn ${type === 'user' ? 'active' : ''}`;
  document.getElementById('tabExpectedRes').className = `res-tab-btn ${type === 'expected' ? 'active' : ''}`;
  renderTable(type === 'user' ? lastUserResult : lastExpectedResult);
}

function showStatus(msg, type) {
  const el = document.getElementById('statusMsg');
  el.className = `status-msg ${type}`;
  el.innerText = msg;
}
function hideStatus() {
  document.getElementById('statusMsg').className = 'status-msg';
}

// 7. 言語切り替え
function changeLanguage(lang) {
  currentLang = lang;
  document.getElementById('viewRawLabel').innerText = UI_I18N.viewRaw[lang] || UI_I18N.viewRaw.en;
  document.getElementById('hint1Label').innerText = UI_I18N.hint1[lang] || UI_I18N.hint1.en;
  document.getElementById('hint2Label').innerText = UI_I18N.hint2[lang] || UI_I18N.hint2.en;
  document.getElementById('ansLabel').innerText = UI_I18N.ans[lang] || UI_I18N.ans.en;
  document.getElementById('runBtnLabel').innerText = UI_I18N.run[lang] || UI_I18N.run.en;
  document.getElementById('resetBtnLabel').innerText = UI_I18N.reset[lang] || UI_I18N.reset.en;
  loadProblem(currentProbIdx);
}

// 8. イベントリスナー登録
document.getElementById('runBtn').addEventListener('click', executeQuery);
document.getElementById('resetBtn').addEventListener('click', () => {
  document.getElementById('sqlInput').value = PROBLEMS[currentProbIdx].defaultSql;
  hideStatus();
});
document.getElementById('nextBtn').addEventListener('click', () => {
  if (currentProbIdx < PROBLEMS.length - 1) loadProblem(currentProbIdx + 1);
});
document.getElementById('langSelect').addEventListener('change', e => changeLanguage(e.target.value));
document.getElementById('tabUserRes').addEventListener('click', () => switchResultTab('user'));
document.getElementById('tabExpectedRes').addEventListener('click', () => switchResultTab('expected'));

// ショートカットキー: Ctrl + Enter / Cmd + Enter
document.getElementById('sqlInput').addEventListener('keydown', e => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
    e.preventDefault();
    executeQuery();
  }
});

// モーダル（全データ表示）
document.getElementById('previewTableBtn').addEventListener('click', () => {
  const tbl = PROBLEMS[currentProbIdx].table;
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

  document.getElementById('modalBody').innerHTML = html;
  document.getElementById('modalOverlay').style.display = 'flex';
});

document.getElementById('closeModalBtn').addEventListener('click', () => {
  document.getElementById('modalOverlay').style.display = 'none';
});
document.getElementById('modalOverlay').addEventListener('click', e => {
  if (e.target.id === 'modalOverlay') document.getElementById('modalOverlay').style.display = 'none';
});

// 起動
initApp();