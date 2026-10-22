// 初期化用データベーススキーマ＆シードデータ
const INITIAL_DATABASE_SQL = `
CREATE TABLE products (id INTEGER, name TEXT, category TEXT, price INTEGER, stock INTEGER, release_year INTEGER);
INSERT INTO products VALUES
(1, 'Wireless Mouse', 'Electronics', 1500, 50, 2019),
(2, 'Wireless Mouse Pro', 'Electronics', 4800, 20, 2021),
(3, 'Mechanical Keyboard', 'Electronics', 8500, 15, 2020),
(4, 'Noise Cancelling Headphones Pro', 'Electronics', 18000, 10, 2022),
(5, 'Coffee Maker', 'Kitchen', 3500, 30, 2018),
(6, 'Stainless Steel Kettle', 'Kitchen', 2800, 25, 2020),
(7, 'Chef Knife Pro', 'Kitchen', 6200, 8, 2021),
(8, 'SQL Beginner Guide', 'Books', 2200, 40, 2021),
(9, 'Web Development Basics', 'Books', 3000, 12, 2019),
(10, 'Graphic T-Shirt', 'Clothing', 1800, 60, 2022);

CREATE TABLE students (id INTEGER, name TEXT, major TEXT, score INTEGER, age INTEGER, enrollment_year INTEGER);
INSERT INTO students VALUES
(1, 'Ken Tanaka', 'IT', 85, 20, 2022),
(2, 'Aung San', 'Business', 74, 22, 2021),
(3, 'Maria Garcia', 'IT', 95, 19, 2023),
(4, 'Rahman Khan', 'Design', 68, 24, 2020),
(5, 'Silva Perera', 'Tourism', 82, 21, 2022),
(6, 'Nguyen Van Minh', 'IT', 88, 20, 2023),
(7, 'Chen Wei', 'Business', 58, 23, 2021),
(8, 'John Smith', 'Design', 91, 25, 2022),
(9, 'Siti Nurhaliza', 'Tourism', 78, 19, 2024),
(10, 'Ali Santos', 'IT', 62, 22, 2022);
`;

const TABLE_COLUMNS = {
  products: ['id', 'name', 'category', 'price', 'stock', 'release_year'],
  students: ['id', 'name', 'major', 'score', 'age', 'enrollment_year']
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
  // --- Part 1: Products ---
  {
    id: 1, table: "products",
    title: { ja: "問1: 基本の列抽出", en: "Q1: Select Columns", my: "မေးခွန်း ၁", bn: "প্রশ্ন ১", si: "ප්‍රශ්නය 1", id: "Soal 1", vi: "Câu 1", zh: "第1题: 基础列选择" },
    desc: {
      ja: "全商品の「商品名（name）」と「価格（price）」を取得してください。",
      en: "Retrieve 'name' and 'price' of all products.",
      my: "ထုတ်ကုန်အားလုံး၏ 'name' နှင့် 'price' ကို ရယူပါ။",
      bn: "সমস্ত পণ্যের 'name' এবং 'price' বের করুন।",
      si: "සියලුම භාණ්ඩවල 'name' සහ 'price' ලබා ගන්න.",
      id: "Tampilkan 'name' dan 'price' dari semua produk.",
      vi: "Lấy thông tin 'name' và 'price' của tất cả sản phẩm.",
      zh: "获取所有商品的“商品名（name）”和“价格（price）”。"
    },
    hint1: "SELECT 列名1, 列名2 FROM テーブル名;",
    hint2: "SELECT name, price FROM products;",
    answer: "SELECT name, price FROM products;",
    defaultSql: "SELECT name, price FROM products;"
  },
  {
    id: 2, table: "products",
    title: { ja: "問2: 数値範囲の絞り込み", en: "Q2: Numeric Range", my: "မေးခွန်း ၂", bn: "প্রশ্ন ২", si: "ප්‍රශ්නය 2", id: "Soal 2", vi: "Câu 2", zh: "第2题: 数值范围过滤" },
    desc: {
      ja: "価格が「1,000円以上 5,000円以下」の商品のすべての情報を取得してください。",
      en: "Retrieve all columns for products with a price between 1,000 and 5,000.",
      my: "စျေးနှုန်း '1,000 နှင့် 5,000 ကြား' ရှိသော ကုန်ပစ္စည်းများ၏ အချက်အလက်အားလုံးကို ရယူပါ။",
      bn: "যে পণ্যগুলির দাম '১,০০০ থেকে ৫,০০০ এর মধ্যে', সেগুলির সমস্ত তথ্য বের করুন।",
      si: "මිල '1,000 සහ 5,000 අතර' වන භාණ්ඩවල සියලුම තොරතුරු ලබා ගන්න.",
      id: "Tampilkan semua kolom untuk produk dengan harga antara 1.000 hingga 5.000.",
      vi: "Lấy toàn bộ thông tin của các sản phẩm có giá từ 1.000 đến 5.000.",
      zh: "获取价格在“1,000以上 5,000以下”的所有商品信息（所有列）。"
    },
    hint1: "WHERE 列名 BETWEEN 最小値 AND 最大値;",
    hint2: "SELECT * FROM products WHERE price BETWEEN 1000 AND 5000;",
    answer: "SELECT * FROM products WHERE price BETWEEN 1000 AND 5000;",
    defaultSql: "SELECT * FROM products WHERE price;"
  },
  {
    id: 3, table: "products",
    title: { ja: "問3: あいまい検索 (LIKE)", en: "Q3: Pattern Matching", my: "မေးခွန်း ၃", bn: "প্রশ্ন ৩", si: "ප්‍රශ්නය 3", id: "Soal 3", vi: "Câu 3", zh: "第3题: 模糊查询" },
    desc: {
      ja: "商品名に「Pro」が含まれる商品の「商品名（name）」と「カテゴリ（category）」を取得してください。",
      en: "Retrieve 'name' and 'category' of products whose name contains 'Pro'.",
      my: "အမည်တွင် 'Pro' ပါဝင်သော ထုတ်ကုန်များ၏ 'name' နှင့် 'category' ကို ရယူပါ။",
      bn: "যে পণ্যের নামের মধ্যে 'Pro' শব্দটি আছে, সেগুলির 'name' এবং 'category' বের করুন।",
      si: "නමේ 'Pro' අඩංගු භාණ්ඩවල 'name' සහ 'category' ලබා ගන්න.",
      id: "Tampilkan 'name' dan 'category' dari produk yang namanya mengandung kata 'Pro'.",
      vi: "Lấy 'name' và 'category' của các sản phẩm có tên chứa chữ 'Pro'.",
      zh: "获取商品名包含“Pro”的商品的“商品名（name）”和“分类（category）”。"
    },
    hint1: "WHERE 列名 LIKE '%キーワード%';",
    hint2: "SELECT name, category FROM products WHERE name LIKE '%Pro%';",
    answer: "SELECT name, category FROM products WHERE name LIKE '%Pro%';",
    defaultSql: "SELECT name, category FROM products WHERE name LIKE '%Pro%';"
  },
  {
    id: 4, table: "products",
    title: { ja: "問4: 重複除外とソート", en: "Q4: Distinct & Sort", my: "မေးခွန်း ၄", bn: "প্রশ্ন ৪", si: "ප්‍රශ්නය 4", id: "Soal 4", vi: "Câu 4", zh: "第4题: 去重与排序" },
    desc: {
      ja: "商品のカテゴリ一覧を「重複なし・アルファベット昇順」で取得してください。",
      en: "Retrieve the list of categories in alphabetical order without duplicates.",
      my: "အမျိုးအစား (category) စာရင်းကို ထပ်နေခြင်းမရှိဘဲ အက္ခရာစဉ်အလိုက် ရယူပါ။",
      bn: "ডুপ্লিকেট ছাড়া বর্ণানুক্রমিকভাবে (A-Z) ক্যাটাগরি তালিকা বের করুন।",
      si: "අනුපිටපත් නොමැතිව හෝඩියේ අනුපිළිවෙලට කාණ්ඩ ලැයිස්තුව ලබා ගන්න.",
      id: "Tampilkan daftar kategori produk tanpa duplikat dan diurutkan abjad.",
      vi: "Lấy danh sách phân loại (category) không trùng lặp và sắp xếp A-Z.",
      zh: "获取商品分类（category）列表，要求去重（无重复）并按字母升序排序。"
    },
    hint1: "SELECT DISTINCT 列名 FROM テーブル名 ORDER BY 列名 ASC;",
    hint2: "SELECT DISTINCT category FROM products ORDER BY category ASC;",
    answer: "SELECT DISTINCT category FROM products ORDER BY category ASC;",
    defaultSql: "SELECT DISTINCT category FROM products;"
  },
  {
    id: 5, table: "products",
    title: { ja: "問5: 条件絞込＋降順TOP3", en: "Q5: Filter & Top N", my: "မေးခွန်း ၅", bn: "প্রশ্ন ৫", si: "ප්‍රශ්නය 5", id: "Soal 5", vi: "Câu 5", zh: "第5题: 条件过滤与Top3" },
    desc: {
      ja: "カテゴリが「Electronics」の商品の中から、価格が高い順に上位3件の「商品名」と「価格」を取得してください。",
      en: "From 'Electronics', retrieve the top 3 most expensive products ('name' and 'price').",
      my: "'Electronics' အမျိုးအစားထဲမှ စျေးအကြီးဆုံး ထိပ်တန်း ၃ ခု၏ 'name' နှင့် 'price' ကို ရယူပါ။",
      bn: "'Electronics' ক্যাটাগরি থেকে সবচেয়ে বেশি দামের সেরা ৩টি পণ্যের 'name' ও 'price' বের করুন।",
      si: "'Electronics' කාණ්ඩයෙන් වැඩිම මිලක් සහිත මුල් භာණ්ඩ 3 හි 'name' සහ 'price' ලබා ගන්න.",
      id: "Dari kategori 'Electronics', tampilkan 3 produk termahal ('name' dan 'price').",
      vi: "Trong danh mục 'Electronics', lấy 3 sản phẩm đắt nhất gồm 'name' và 'price'.",
      zh: "从分类为“Electronics”的商品中，按价格由高到低排序获取前3件的“商品名”和“价格”。"
    },
    hint1: "WHERE 条件 ORDER BY 列名 DESC LIMIT 3;",
    hint2: "SELECT name, price FROM products WHERE category = 'Electronics' ORDER BY price DESC LIMIT 3;",
    answer: "SELECT name, price FROM products WHERE category = 'Electronics' ORDER BY price DESC LIMIT 3;",
    defaultSql: "SELECT name, price FROM products WHERE category = 'Electronics' ORDER BY price DESC LIMIT 3;"
  },
  {
    id: 6, table: "products",
    title: { ja: "問6: オフセット指定の抽出", en: "Q6: Offset Pagination", my: "မေးခွန်း ၆", bn: "প্রশ্ন ", si: "ප්‍රශ්නය 6", id: "Soal 6", vi: "Câu 6", zh: "第6题: 分页偏移查询" },
    desc: {
      ja: "2020年以降に発売された商品で、価格が安い順に「4番目と5番目（計2件）」の「商品名」と「価格」を取得してください。",
      en: "For products released in 2020 or later, sort by price (cheapest first) and retrieve the 4th and 5th items ('name' and 'price').",
      my: "၂၀၂၀ နှင့် နောက်ပိုင်းထုတ် ကုန်ပစ္စည်းများထဲမှ စျေးအသက်သာဆုံးအလိုက် ၄ ခုမြောက်နှင့် ၅ ခုမြောက် (၂ ခု) ကို ရယူပါ။",
      bn: "২০২০ বা তার পরের পণ্যের মধ্যে দামের ক্রমানুসারে ৪র্থ এবং ৫ম (২টি) পণ্যের 'name' ও 'price' বের করুন।",
      si: "2020 න් පසු නිකුත් කළ භာණ්ඩ අතරින් අඩුම මිල අනුව 4 වන සහ 5 වන (භာණ්ඩ 2) ලබා ගන්න.",
      id: "Untuk produk rilis 2020 ke atas, urutkan dari harga termurah, ambil produk ke-4 dan ke-5 (2 item).",
      vi: "Đối với sản phẩm từ 2020 trở đi, sắp theo giá tăng dần, lấy sản phẩm thứ 4 và 5 (2 món).",
      zh: "对于2020年及之后发布的商品，按价格升序排序，获取第4和第5件（共2件）商品的“商品名”和“价格”。"
    },
    hint1: "LIMIT 取得件数 OFFSET スキップ件数; (4番目から2件 = LIMIT 2 OFFSET 3)",
    hint2: "SELECT name, price FROM products WHERE release_year >= 2020 ORDER BY price ASC LIMIT 2 OFFSET 3;",
    answer: "SELECT name, price FROM products WHERE release_year >= 2020 ORDER BY price ASC LIMIT 2 OFFSET 3;",
    defaultSql: "SELECT name, price FROM products WHERE release_year >= 2020 ORDER BY price ASC LIMIT 2 OFFSET 3;"
  },

  // --- Part 2: Students ---
  {
    id: 7, table: "students",
    title: { ja: "問7: 学生情報の列選択", en: "Q7: Student Columns", my: "မေးခွန်း ၇", bn: "প্রশ্ন ৭", si: "ප්‍රශ්නය 7", id: "Soal 7", vi: "Câu 7", zh: "第7题: 学生列查询" },
    desc: {
      ja: "全学生の「名前（name）」と「専攻（major）」を取得してください。",
      en: "Retrieve 'name' and 'major' of all students.",
      my: "ကျောင်းသားအားလုံး၏ 'name' နှင့် 'major' ကို ရယူပါ။",
      bn: "সমস্ত শিক্ষার্থীর 'name' এবং 'major' বের করুন।",
      si: "සියලුම සිසුන්ගේ 'name' සහ 'major' ලබා ගන්න.",
      id: "Tampilkan 'name' dan 'major' dari semua siswa.",
      vi: "Lấy thông tin 'name' và 'major' của tất cả sinh viên.",
      zh: "获取所有学生的“姓名（name）”和“专业（major）”。"
    },
    hint1: "SELECT name, major FROM students;",
    hint2: "SELECT name, major FROM students;",
    answer: "SELECT name, major FROM students;",
    defaultSql: "SELECT name, major FROM students;"
  },
  {
    id: 8, table: "students",
    title: { ja: "問8: 点数の範囲検索", en: "Q8: Score Range", my: "မေးခွန်း ၈", bn: "প্রশ্ন ৮", si: "ප්‍රශ්නය 8", id: "Soal 8", vi: "Câu 8", zh: "第8题: 分数范围过滤" },
    desc: {
      ja: "点数（score）が「70点以上 90点以下」の学生のすべての情報を取得してください。",
      en: "Retrieve all columns for students with a test score between 70 and 90.",
      my: "အမှတ် (score) '70 နှင့် 90 ကြား' ရရှိသော ကျောင်းသားများ၏ အချက်အလက်အားလုံးကို ရယူပါ။",
      bn: "যে শিক্ষার্থীদের স্কোর (score) '৭০ থেকে ৯০ এর মধ্যে', তাদের সমস্ত তথ্য বের করুন।",
      si: "ලකුණු (score) '70 සහ 90 අතර' වන සිසුන්ගේ සියලුම තොරතුරු ලබා ගන්න.",
      id: "Tampilkan semua data siswa dengan nilai (score) antara 70 hingga 90.",
      vi: "Lấy toàn bộ thông tin của các sinh viên có điểm số (score) từ 70 đến 90.",
      zh: "获取考试分数（score）在“70以上 90以下”的所有学生信息（所有列）。"
    },
    hint1: "WHERE score BETWEEN 70 AND 90;",
    hint2: "SELECT * FROM students WHERE score BETWEEN 70 AND 90;",
    answer: "SELECT * FROM students WHERE score BETWEEN 70 AND 90;",
    defaultSql: "SELECT * FROM students WHERE score BETWEEN 70 AND 90;"
  },
  {
    id: 9, table: "students",
    title: { ja: "問9: 名前のあいまい検索", en: "Q9: Name Pattern", my: "မေးခွန်း ၉", bn: "প্রশ্ন ৯", si: "ප්‍රශ්නය 9", id: "Soal 9", vi: "Câu 9", zh: "第9题: 姓名模糊匹配" },
    desc: {
      ja: "名前に「an」が含まれる学生の「名前（name）」と「点数（score）」を取得してください。",
      en: "Retrieve 'name' and 'score' of students whose name contains 'an'.",
      my: "အမည်တွင် 'an' ပါဝင်သော ကျောင်းသားများ၏ 'name' နှင့် 'score' ကို ရယူပါ။",
      bn: "যে শিক্ষার্থীর নামের মধ্যে 'an' অক্ষর রয়েছে, তাদের 'name' এবং 'score' বের করুন।",
      si: "නමේ 'an' අඩංගු සිසුන්ගේ 'name' සහ 'score' ලබා ගන්න.",
      id: "Tampilkan 'name' dan 'score' dari siswa yang namanya mengandung 'an'.",
      vi: "Lấy 'name' và 'score' của các sinh viên có tên chứa chữ 'an'.",
      zh: "获取姓名包含“an”的学生的“姓名（name）”和“分数（score）”。"
    },
    hint1: "WHERE name LIKE '%an%';",
    hint2: "SELECT name, score FROM students WHERE name LIKE '%an%';",
    answer: "SELECT name, score FROM students WHERE name LIKE '%an%';",
    defaultSql: "SELECT name, score FROM students WHERE name LIKE '%an%';"
  },
  {
    id: 10, table: "students",
    title: { ja: "問10: 専攻の重複除外", en: "Q10: Distinct Majors", my: "မေးခွန်း ၁၀", bn: "প্রশ্ন ১০", si: "ප්‍රශ්නය 10", id: "Soal 10", vi: "Câu 10", zh: "第10题: 专业去重排序" },
    desc: {
      ja: "登録されている専攻（major）一覧を「重複なし・アルファベット順」で取得してください。",
      en: "Retrieve the list of majors in alphabetical order without duplicates.",
      my: "အထူးပြုဘာသာ (major) စာရင်းကို ထပ်နေခြင်းမရှိဘဲ အက္ခရာစဉ်အလိုက် ရယူပါ။",
      bn: "ডুপ্লিকেট ছাড়া বর্ণানুক্রমিকভাবে (A-Z) মেজরের (major) তালিকা বের করুন।",
      si: "අනුපිටපත් නොමැතිව හෝඩියේ අනුපිළිවෙලට ප්‍රධාන විෂයයන් (major) ලැයිස්තුව ලබා ගන්න.",
      id: "Tampilkan daftar jurusan (major) tanpa duplikat dan diurutkan abjad.",
      vi: "Lấy danh sách chuyên ngành (major) không trùng lặp và sắp xếp A-Z.",
      zh: "获取专业（major）列表，要求去重（无重复）并按字母升序排序。"
    },
    hint1: "SELECT DISTINCT major FROM students ORDER BY major ASC;",
    hint2: "SELECT DISTINCT major FROM students ORDER BY major ASC;",
    answer: "SELECT DISTINCT major FROM students ORDER BY major ASC;",
    defaultSql: "SELECT DISTINCT major FROM students;"
  },
  {
    id: 11, table: "students",
    title: { ja: "問11: 専攻別ハイスコアTOP3", en: "Q11: Top 3 in Major", my: "မေးခွန်း ၁၁", bn: "প্রশ্ন ১১", si: "ප්‍රශ්නය 11", id: "Soal 11", vi: "Câu 11", zh: "第11题: 专业高分TOP3" },
    desc: {
      ja: "専攻が「IT」の学生の中から、点数（score）が高い順に上位3名の「名前（name）」と「点数（score）」を取得してください。",
      en: "From the 'IT' major, retrieve the top 3 highest scoring students ('name' and 'score').",
      my: "'IT' အထူးပြုဘာသာမှ အမှတ်အများဆုံး ထိပ်တန်း ၃ ဦး၏ 'name' နှင့် 'score' ကို ရယူပါ။",
      bn: "'IT' মেজর থেকে সর্বোচ্চ স্কোরধারী সেরা ৩ জন শিক্ষার্থীর 'name' ও 'score' বের করুন।",
      si: "'IT' ප්‍රධාන විෂයය හදාරන සිසුන් අතරින් ඉහළම ලකුණු ලබාගත් මුල් සිසුන් 3 දෙනාගේ 'name' සහ 'score' ලබා ගන්න.",
      id: "Dari jurusan 'IT', tampilkan 3 siswa dengan nilai tertinggi ('name' dan 'score').",
      vi: "Trong chuyên ngành 'IT', lấy 3 sinh viên có điểm cao nhất gồm 'name' và 'score'.",
      zh: "从专业为“IT”的学生中，按分数由高到低排序，获取前3名学生的“姓名”和“分数”。"
    },
    hint1: "WHERE major = 'IT' ORDER BY score DESC LIMIT 3;",
    hint2: "SELECT name, score FROM students WHERE major = 'IT' ORDER BY score DESC LIMIT 3;",
    answer: "SELECT name, score FROM students WHERE major = 'IT' ORDER BY score DESC LIMIT 3;",
    defaultSql: "SELECT name, score FROM students WHERE major = 'IT' ORDER BY score DESC LIMIT 3;"
  },
  {
    id: 12, table: "students",
    title: { ja: "問12: 年齢ソートとオフセット", en: "Q12: Enrollment & Offset", my: "မေးခွန်း ၁၂", bn: "প্রশ্ন ১২", si: "ප්‍රශ්නය 12", id: "Soal 12", vi: "Câu 12", zh: "第12题: 年龄偏移分页" },
    desc: {
      ja: "2022年以降に入学（enrollment_year）した学生を対象に、年齢（age）が若い順に並べたときの「3番目と4番目（計2名）」の「名前（name）」と「年齢（age）」を取得してください。",
      en: "For students enrolled in 2022 or later, sort by age (youngest first) and retrieve the 3rd and 4th students ('name' and 'age').",
      my: "၂၀၂၂ ခုနှစ်နှင့် နောက်ပိုင်း ကျောင်းဝင်ခဲ့သော ကျောင်းသားများထဲမှ အသက်အငယ်ဆုံးအလိုက် စဉ်ပြီး ၃ ယောက်မြောက်နှင့် ၄ ယောက်မြောက် (၂ ယောက်) ကို ရယူပါ။",
      bn: "২০২২ বা তার পরে ভর্তি হওয়া শিক্ষার্থীদের মধ্যে বয়সের ক্রমানুসারে ৩য় এবং ৪র্থ (২ জন) শিক্ষার্থীর 'name' ও 'age' বের করুন।",
      si: "2022 හෝ ඊට පසු ඇතුළත් වූ සිසුන් අතරින් අඩුම වයස අනුව 3 වන සහ 4 වන (සිසුන් 2) ලබා ගන්න.",
      id: "Untuk siswa angkatan 2022 ke atas, urutkan dari yang termuda, ambil siswa ke-3 dan ke-4 (2 orang).",
      vi: "Đối với sinh viên nhập học từ 2022 trở đi, sắp theo tuổi tăng dần, lấy sinh viên thứ 3 và 4 (2 người).",
      zh: "对于2022年及之后入学的学生，按年龄由小到大排序，获取“第3和第4位（共2人）”学生的“姓名”和“年龄”。"
    },
    hint1: "WHERE enrollment_year >= 2022 ORDER BY age ASC LIMIT 2 OFFSET 2;",
    hint2: "SELECT name, age FROM students WHERE enrollment_year >= 2022 ORDER BY age ASC LIMIT 2 OFFSET 2;",
    answer: "SELECT name, age FROM students WHERE enrollment_year >= 2022 ORDER BY age ASC LIMIT 2 OFFSET 2;",
    defaultSql: "SELECT name, age FROM students WHERE enrollment_year >= 2022 ORDER BY age ASC LIMIT 2 OFFSET 2;"
  }
];