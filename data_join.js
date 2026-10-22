// JOIN学習用のテーブル作成＆シードデータ
const INITIAL_DATABASE_SQL = `
CREATE TABLE table_a (
  id INTEGER PRIMARY KEY,
  class TEXT,
  column_a1 TEXT
);

CREATE TABLE table_b (
  id INTEGER PRIMARY KEY,
  column_b1 TEXT,
  column_b2 INTEGER
);

INSERT INTO table_a VALUES
(1, 'A', 'data_a1'),
(2, 'A', 'data_a2'),
(3, 'B', 'data_a3'),
(4, 'B', 'data_a4');

INSERT INTO table_b VALUES
(2, 'data_b2', 200),
(3, 'data_b3', 300),
(4, 'data_b4', 400),
(5, 'data_b5', 500);
`;

const TABLE_COLUMNS = {
  table_a: ['id', 'class', 'column_a1'],
  table_b: ['id', 'column_b1', 'column_b2']
};

const UI_I18N = {
  viewRaw: { ja: "全データを見る", en: "View Raw Data", my: "အချက်အလက်အားလုံးကြည့်ရန်", bn: "সব ডাটা দেখুন", si: "සියලු දත්ත බලන්න", id: "Lihat Semua Data", vi: "Xem toàn bộ dữ liệu", zh: "查看全部数据" },
  hint1: { ja: "💡 ヒント 1: 構文", en: "💡 Hint 1: Syntax", my: "💡 သဲလွန်စ ၁", bn: "💡 ইঙ্গিত ১", si: "💡 ඉඟිය 1", id: "💡 Petunjuk 1", vi: "💡 Gợi ý 1", zh: "💡 提示 1" },
  hint2: { ja: "🔍 ヒント 2: テンプレート", en: "🔍 Hint 2: Template", my: "🔍 သဲလွန်စ ၂", bn: "🔍 ইঙ্গিত ২", si: "🔍 ඉඟිය 2", id: "🔍 Petunjuk 2", vi: "🔍 Gợi ý 2", zh: "🔍 提示 2" },
  ans: { ja: "✅ 模範解答", en: "✅ Answer", my: "✅ အဖြေမှန်", bn: "✅ সঠিক উত্তর", si: "✅ පිළිතුර", id: "✅ Kunci Jawaban", vi: "✅ Đáp án", zh: "✅ 参考答案" },
  run: { ja: "実行 (Run)", en: "Run", my: "အလုပ်လုပ်ရန်", bn: "রান করুন", si: "ක්‍රියාත්මක කරන්න", id: "Jalankan", vi: "Chạy", zh: "运行" },
  reset: { ja: "リセット", en: "Reset", my: "မူလအတိုင်း", bn: "রিসেট", si: "යළි පිහිටුවන්න", id: "Reset", vi: "Đặt lại", zh: "重置" },
  success: { ja: "🎉 正解です！完璧です！", en: "🎉 Correct! Excellent job!", my: "🎉 မှန်ကန်ပါသည်! ကောင်းမွန်ပါသည်။", bn: "🎉 সঠিক উত্তর! চমৎকার!", si: "🎉 නිවැරදියි! විශිෂ්ටයි!", id: "🎉 Benar! Kerja bagus!", vi: "🎉 Chính xác! Làm rất tốt!", zh: "🎉 回答正确！太棒了！" },
  wrong: { ja: "🤔 結果が異なります。「正解の見本」タブと見比べてみましょう。", en: "🤔 Result differs. Compare with the 'Expected Output' tab.", my: "🤔 အဖြေမကိုက်ညီပါ။ 'Expected Output' နှင့် နှိုင်းယှဉ်ကြည့်ပါ။", bn: "🤔 ফলাফল মিলছে না। 'Expected Output' ট্যাবের সাথে মিলিয়ে দেখুন।", si: "🤔 ප්‍රතිඵලය වෙනස් වේ. 'Expected Output' සමඟ සසඳන්න.", id: "🤔 Hasil belum sesuai. Bandingkan dengan tab 'Expected Output'.", vi: "🤔 Chưa đúng. Hãy so sánh với tab 'Expected Output'.", zh: "🤔 结果不符，请对比“正解见本”标签页。" }
};

const PROBLEMS = [
  {
    id: 1, table: "table_a",
    title: { ja: "問1: INNER JOIN の基本", en: "Q1: Basic INNER JOIN", my: "မေးခွန်း ၁: INNER JOIN အခြေခံ", bn: "প্রশ্ন ১: INNER JOIN এর ভিত্তি", si: "ප්‍රශ්නය 1: මූලික INNER JOIN", id: "Soal 1: Dasar INNER JOIN", vi: "Câu 1: Cơ bản về INNER JOIN", zh: "第1题: INNER JOIN 基础" },
    desc: {
      ja: "table_a と table_b を共通の「id」で内部結合（INNER JOIN）し、すべての列（*）を取得してください。",
      en: "Inner join table_a and table_b on the common 'id' column, and retrieve all columns (*).",
      my: "table_a နှင့် table_b ကို တူညီသော 'id' ဖြင့် INNER JOIN လုပ်ပြီး ကော်လံအားလုံး (*) ကို ရယူပါ။",
      bn: "table_a এবং table_b কে সাধারণ 'id' দিয়ে INNER JOIN করুন এবং সব কলাম (*) বের করুন।",
      si: "table_a සහ table_b පොදු 'id' මගින් INNER JOIN කර සියලු තීරු (*) ලබා ගන්න.",
      id: "Gabungkan table_a dan table_b (INNER JOIN) berdasarkan 'id' yang sama, tampilkan semua kolom (*).",
      vi: "Thực hiện INNER JOIN giữa table_a và table_b dựa trên 'id', lấy tất cả các cột (*).",
      zh: "将 table_a 和 table_b 通过公共的“id”进行内连接（INNER JOIN），并获取所有列（*）。"
    },
    hint1: "SELECT * FROM table_a INNER JOIN table_b ON table_a.id = table_b.id;",
    hint2: "SELECT * FROM table_a INNER JOIN table_b ON table_a.id = table_b.id;",
    answer: "SELECT * FROM table_a INNER JOIN table_b ON table_a.id = table_b.id;",
    defaultSql: "SELECT * FROM table_a INNER JOIN table_b ON "
  },
  {
    id: 2, table: "table_a",
    title: { ja: "問2: 列の指定とプレフィックス", en: "Q2: Explicit Columns & Prefix", my: "မေးခွန်း ၂: ကော်လံသတ်မှတ်ခြင်း", bn: "প্রশ্ন ২: কলাম নির্দিষ্টকরণ", si: "ප්‍රශ්නය 2: තීරු නිශ්චිත කිරීම", id: "Soal 2: Pemilihan Kolom & Prefix", vi: "Câu 2: Chỉ định cột rõ ràng", zh: "第2题: 指定列与前缀" },
    desc: {
      ja: "table_a と table_b を結合し、「table_a.id」「table_a.column_a1」「table_b.column_b1」の3列のみを取得してください。",
      en: "Join table_a and table_b on 'id', and select only 'table_a.id', 'table_a.column_a1', and 'table_b.column_b1'.",
      my: "table_a နှင့် table_b ကို ချိတ်ဆက်ပြီး 'table_a.id'၊ 'table_a.column_a1' နှင့် 'table_b.column_b1' တို့ကိုသာ ရယူပါ။",
      bn: "table_a এবং table_b যুক্ত করে কেবল 'table_a.id', 'table_a.column_a1' এবং 'table_b.column_b1' কলামগুলি বের করুন।",
      si: "table_a සහ table_b සම්බන්ධ කර 'table_a.id', 'table_a.column_a1' සහ 'table_b.column_b1' යන තීරු 3 පමණක් ලබා ගන්න.",
      id: "Gabungkan table_a dan table_b, tampilkan hanya kolom 'table_a.id', 'table_a.column_a1', dan 'table_b.column_b1'.",
      vi: "Kết hợp table_a và table_b, chỉ lấy 3 cột: 'table_a.id', 'table_a.column_a1', và 'table_b.column_b1'.",
      zh: "连接 table_a 与 table_b，仅获取“table_a.id”、“table_a.column_a1”和“table_b.column_b1”这3列。"
    },
    hint1: "SELECT テーブル名.列名 FROM ... (idは両方にあるため table_a.id のように指定します)",
    hint2: "SELECT table_a.id, table_a.column_a1, table_b.column_b1 FROM table_a INNER JOIN table_b ON table_a.id = table_b.id;",
    answer: "SELECT table_a.id, table_a.column_a1, table_b.column_b1 FROM table_a INNER JOIN table_b ON table_a.id = table_b.id;",
    defaultSql: "SELECT table_a.id,  FROM table_a INNER JOIN table_b ON table_a.id = table_b.id;"
  },
  {
    id: 3, table: "table_a",
    title: { ja: "問3: INNER JOIN ＋ WHERE 絞込", en: "Q3: INNER JOIN with WHERE", my: "မေးခွန်း ၃: WHERE ဖြင့် စစ်ထုတ်ခြင်း", bn: "প্রশ্ন ৩: WHERE দিয়ে ফিল্টার", si: "ප්‍රශ්නය 3: WHERE මගින් පෙරීම", id: "Soal 3: INNER JOIN dengan WHERE", vi: "Câu 3: INNER JOIN kết hợp WHERE", zh: "第3题: 结合WHERE筛选" },
    desc: {
      ja: "table_a と table_b を結合し、table_a の class が 'A' である行の「table_a.id」「table_a.class」「table_b.column_b2」を取得してください。",
      en: "Join both tables and retrieve 'table_a.id', 'table_a.class', and 'table_b.column_b2' where table_a.class is 'A'.",
      my: "ဇယားနှစ်ခုကို ချိတ်ဆက်ပြီး table_a ၏ class သည် 'A' ဖြစ်သော 'table_a.id'၊ 'table_a.class'၊ 'table_b.column_b2' ကို ရယူပါ။",
      bn: "উভয় টেবিল যুক্ত করুন এবং যেখানে table_a এর class হলো 'A', সেখান থেকে 'table_a.id', 'table_a.class', 'table_b.column_b2' বের করুন।",
      si: "වගු දෙක සම්බන්ධ කර table_a හි class එක 'A' වන පේළිවල 'table_a.id', 'table_a.class', 'table_b.column_b2' ලබා ගන්න.",
      id: "Gabungkan kedua tabel, tampilkan 'table_a.id', 'table_a.class', dan 'table_b.column_b2' di mana table_a.class bernilai 'A'.",
      vi: "Kết hợp 2 bảng và lấy 'table_a.id', 'table_a.class', 'table_b.column_b2' với điều kiện table_a.class = 'A'.",
      zh: "连接两个表，获取 table_a.class 为 'A' 的行的“table_a.id”、“table_a.class”和“table_b.column_b2”。"
    },
    hint1: "FROM table_a INNER JOIN table_b ON table_a.id = table_b.id WHERE table_a.class = 'A';",
    hint2: "SELECT table_a.id, table_a.class, table_b.column_b2 FROM table_a INNER JOIN table_b ON table_a.id = table_b.id WHERE table_a.class = 'A';",
    answer: "SELECT table_a.id, table_a.class, table_b.column_b2 FROM table_a INNER JOIN table_b ON table_a.id = table_b.id WHERE table_a.class = 'A';",
    defaultSql: "SELECT table_a.id, table_a.class, table_b.column_b2 FROM table_a INNER JOIN table_b ON table_a.id = table_b.id WHERE "
  },
  {
    id: 4, table: "table_a",
    title: { ja: "問4: LEFT JOIN（外部結合）の基本", en: "Q4: Basic LEFT JOIN", my: "မေးခွန်း ၄: LEFT JOIN အခြေခံ", bn: "প্রশ্ন ৪: LEFT JOIN এর ভিত্তি", si: "ප්‍රශ්නය 4: මූලික LEFT JOIN", id: "Soal 4: Dasar LEFT JOIN", vi: "Câu 4: Cơ bản về LEFT JOIN", zh: "第4题: LEFT JOIN 基础" },
    desc: {
      ja: "table_a を基準にして table_b を左外部結合（LEFT JOIN）し、すべての列（*）を取得してください。（id=1 の右側が NULL になることを確認しましょう）",
      en: "Perform a LEFT JOIN with table_a on the left and table_b on the right, selecting all columns (*). (Notice NULLs for id=1)",
      my: "table_a ကို မူတည်ပြီး table_b ကို LEFT JOIN လုပ်ကာ ကော်လံအားလုံး (*) ကို ရယူပါ။ (id=1 တွင် NULL ဖြစ်သည်ကို သတိပြုပါ)",
      bn: "table_a কে বামে রেখে table_b এর সাথে LEFT JOIN করুন এবং সব কলাম (*) বের করুন। (id=1 এর জন্য NULL লক্ষ্য করুন)",
      si: "table_a මුල් කරගෙන table_b සමඟ LEFT JOIN කර සියලු තීරු (*) ලබා ගන්න. (id=1 සඳහා NULL ලැබෙන බව නිරීක්ෂණය කරන්න)",
      id: "Gunakan LEFT JOIN antara table_a dan table_b, tampilkan semua kolom (*). (Perhatikan nilai NULL pada id=1)",
      vi: "Thực hiện LEFT JOIN bảng table_a với table_b, lấy tất cả các cột (*). (Quan sát giá trị NULL ở id=1)",
      zh: "以 table_a 为主表左连接（LEFT JOIN）table_b，并获取所有列（*）。（观察 id=1 右侧产生的 NULL）"
    },
    hint1: "SELECT * FROM table_a LEFT JOIN table_b ON table_a.id = table_b.id;",
    hint2: "SELECT * FROM table_a LEFT JOIN table_b ON table_a.id = table_b.id;",
    answer: "SELECT * FROM table_a LEFT JOIN table_b ON table_a.id = table_b.id;",
    defaultSql: "SELECT * FROM table_a LEFT JOIN table_b ON "
  },
  {
    id: 5, table: "table_a",
    title: { ja: "問5: LEFT JOIN ＋ IS NULL（差集合）", en: "Q5: Finding Missing Rows (IS NULL)", my: "မေးခွန်း ၅: IS NULL ဖြင့် ရှာဖွေခြင်း", bn: "প্রশ্ন ৫: IS NULL দিয়ে অমিল বের করা", si: "ප්‍රශ්නය 5: IS NULL භාවිතයෙන් වෙනස සෙවීම", id: "Soal 5: Mencari Data yang Tidak Ada (IS NULL)", vi: "Câu 5: Tìm bản ghi không khớp (IS NULL)", zh: "第5题: 查找未匹配项 (IS NULL)" },
    desc: {
      ja: "table_a には存在するが、table_b には存在しない行のみを抽出してください。「table_a.id」と「table_a.column_a1」を取得します。",
      en: "Find rows that exist in table_a but NOT in table_b. Retrieve 'table_a.id' and 'table_a.column_a1'.",
      my: "table_a တွင်ရှိပြီး table_b တွင်မရှိသော အချက်အလက်ကိုသာ ရှာပါ။ 'table_a.id' နှင့် 'table_a.column_a1' ကို ရယူပါ။",
      bn: "যেগুলি table_a তে আছে কিন্তু table_b তে নেই তা বের করুন। 'table_a.id' ও 'table_a.column_a1' প্রদর্শন করুন।",
      si: "table_a හි ඇති නමුත් table_b හි නැති පේළි පමණක් සොයන්න. 'table_a.id' සහ 'table_a.column_a1' ලබා ගන්න.",
      id: "Temukan baris yang ada di table_a tetapi TIDAK ada di table_b. Tampilkan 'table_a.id' dan 'table_a.column_a1'.",
      vi: "Tìm các dòng chỉ có trong table_a mà KHÔNG có trong table_b. Lấy 'table_a.id' và 'table_a.column_a1'.",
      zh: "找出仅存在于 table_a 但不存在于 table_b 的行。获取“table_a.id”和“table_a.column_a1”。"
    },
    hint1: "LEFT JOIN した後に WHERE table_b.id IS NULL と判定します。",
    hint2: "SELECT table_a.id, table_a.column_a1 FROM table_a LEFT JOIN table_b ON table_a.id = table_b.id WHERE table_b.id IS NULL;",
    answer: "SELECT table_a.id, table_a.column_a1 FROM table_a LEFT JOIN table_b ON table_a.id = table_b.id WHERE table_b.id IS NULL;",
    defaultSql: "SELECT table_a.id, table_a.column_a1 FROM table_a LEFT JOIN table_b ON table_a.id = table_b.id WHERE "
  },
  {
    id: 6, table: "table_a",
    title: { ja: "問6: LEFT JOIN ＋ ソートと件数制限", en: "Q6: LEFT JOIN with Sort & Limit", my: "မေးခွန်း ၆: အစဉ်လိုက်စီခြင်းနှင့် ကန့်သတ်ခြင်း", bn: "প্রশ্ন ৬: সাজানো এবং লিমিট নির্ধারণ", si: "ප්‍රශ්නය 6: පෙළගැස්වීම සහ සීමා කිරීම", id: "Soal 6: Pengurutan dan Limit pada LEFT JOIN", vi: "Câu 6: Sắp xếp và giới hạn với LEFT JOIN", zh: "第6题: 排序与数量限制" },
    desc: {
      ja: "table_a と table_b を LEFT JOIN し、column_b2 が大きい順（降順）に並べ替え、上位3件の「table_a.id」「table_a.column_a1」「table_b.column_b2」を取得してください。",
      en: "LEFT JOIN both tables, sort by column_b2 descending (highest first), and retrieve the top 3 rows ('table_a.id', 'table_a.column_a1', 'table_b.column_b2').",
      my: "table_a နှင့် table_b ကို LEFT JOIN လုပ်ပြီး column_b2 အကြီးဆုံးအလိုက် စဉ်ကာ ထိပ်ဆုံး ၃ ခု၏ 'table_a.id'၊ 'table_a.column_a1'၊ 'table_b.column_b2' ကို ရယူပါ။",
      bn: "LEFT JOIN করুন, column_b2 এর ক্রমানুসারে (বড় থেকে ছোট) সাজিয়ে শীর্ষ ৩টি রো-এর 'table_a.id', 'table_a.column_a1', 'table_b.column_b2' বের করুন।",
      si: "LEFT JOIN කර column_b2 වැඩිම අගය අනුව අවරෝහණව පෙළගස්වා මුල් පේළි 3 හි 'table_a.id', 'table_a.column_a1', 'table_b.column_b2' ලබා ගන්න.",
      id: "Gunakan LEFT JOIN, urutkan berdasarkan column_b2 terbesar (DESC), lalu tampilkan 3 baris teratas ('table_a.id', 'table_a.column_a1', 'table_b.column_b2').",
      vi: "LEFT JOIN 2 bảng, sắp xếp theo column_b2 giảm dần, lấy 3 dòng đầu ('table_a.id', 'table_a.column_a1', 'table_b.column_b2').",
      zh: "将两个表进行 LEFT JOIN，按 column_b2 由大到小（降序）排序，获取前3条记录的“table_a.id”、“table_a.column_a1”和“table_b.column_b2”。"
    },
    hint1: "ORDER BY table_b.column_b2 DESC LIMIT 3;",
    hint2: "SELECT table_a.id, table_a.column_a1, table_b.column_b2 FROM table_a LEFT JOIN table_b ON table_a.id = table_b.id ORDER BY table_b.column_b2 DESC LIMIT 3;",
    answer: "SELECT table_a.id, table_a.column_a1, table_b.column_b2 FROM table_a LEFT JOIN table_b ON table_a.id = table_b.id ORDER BY table_b.column_b2 DESC LIMIT 3;",
    defaultSql: "SELECT table_a.id, table_a.column_a1, table_b.column_b2 FROM table_a LEFT JOIN table_b ON table_a.id = table_b.id ORDER BY "
  }
];