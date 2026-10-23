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
  viewRaw: { ja: "全データを見る", en: "View Raw Data", ne: "सबै डेटा हेर्नुहोस्", fr: "Voir toutes les données", my: "အချက်အလက်အားလုံးကြည့်ရန်", bn: "সব ডাটা দেখুন", si: "සියලු දත්ත බලන්න", id: "Lihat Semua Data", vi: "Xem toàn bộ dữ liệu", zh: "查看全部数据" },
  hint1: { ja: "💡 ヒント 1: 構文", en: "💡 Hint 1: Syntax", ne: "💡 सङ्केत १: वाक्य रचना", fr: "💡 Indice 1: Syntaxe", my: "💡 သဲလွန်စ ၁", bn: "💡 ইঙ্গিত ১", si: "💡 ඉඟිය 1", id: "💡 Petunjuk 1", vi: "💡 Gợi ý 1", zh: "💡 提示 1" },
  hint2: { ja: "🔍 ヒント 2: テンプレート", en: "🔍 Hint 2: Template", ne: "🔍 सङ्केत २: ढाँचा", fr: "🔍 Indice 2: Modèle", my: "🔍 သဲလွန်စ ၂", bn: "🔍 ইঙ্গিত ২", si: "🔍 ඉඟිය 2", id: "🔍 Petunjuk 2", vi: "🔍 Gợi ý 2", zh: "🔍 提示 2" },
  ans: { ja: "✅ 模範解答", en: "✅ Answer", ne: "✅ सही उत्तर", fr: "✅ Réponse modèle", my: "✅ အဖြေမှန်", bn: "✅ সঠিক উত্তর", si: "✅ පිළිතුර", id: "✅ Kunci Jawaban", vi: "✅ Đáp án", zh: "✅ 参考答案" },
  run: { ja: "実行 (Run)", en: "Run", ne: "चलाउनुहोस् (Run)", fr: "Exécuter (Run)", my: "အလုပ်လုပ်ရန်", bn: "রান করুন", si: "ක්‍රියාත්මක කරන්න", id: "Jalankan", vi: "Chạy", zh: "运行" },
  reset: { ja: "リセット", en: "Reset", ne: "रिसेट (Reset)", fr: "Réinitialiser", my: "မူလအတိုင်း", bn: "রিসেট", si: "යළි පිහිටුවන්න", id: "Reset", vi: "Đặt lại", zh: "重置" },
  success: { ja: "🎉 正解です！完璧です！", en: "🎉 Correct! Excellent job!", ne: "🎉 सही उत्तर! धेरै राम्रो!", fr: "🎉 Correct ! Excellent travail !", my: "🎉 မှန်ကန်ပါသည်! ကောင်းမွန်ပါသည်။", bn: "🎉 সঠিক উত্তর! চমৎকার!", si: "🎉 නිවැරදියි! විශිෂ්ටයි!", id: "🎉 Benar! Kerja bagus!", vi: "🎉 Chính xác! Làm rất tốt!", zh: "🎉 回答正确！太棒了！" },
  wrong: { ja: "🤔 結果が異なります。「正解の見本」タブと見比べてみましょう。", en: "🤔 Result differs. Compare with the 'Expected Output' tab.", ne: "🤔 नतिजा फरक छ। कृपया 'Expected Output' ट्याबसँग तुलना गर्नुहोस्।", fr: "🤔 Le résultat est différent. Comparez avec l'onglet 'Expected Output'.", my: "🤔 အဖြေမကိုက်ညီပါ။ 'Expected Output' နှင့် နှိုင်းယှဉ်ကြည့်ပါ။", bn: "🤔 ফলাফল মিলছে না। 'Expected Output' ট্যাবের সাথে মিলিয়ে দেখুন।", si: "🤔 ප්‍රතිඵලය වෙනස් වේ. 'Expected Output' සමඟ සසඳන්න.", id: "🤔 Hasil belum sesuai. Bandingkan dengan tab 'Expected Output'.", vi: "🤔 Chưa đúng. Hãy so sánh với tab 'Expected Output'.", zh: "🤔 结果不符，请对比“正解见本”标签页。" }
};

const PROBLEMS = [
  // ==========================================
  // Part 1: 集計関数の基礎 (COUNT, SUM, AVG, MAX, MIN)
  // ==========================================
  {
    id: 1, part: 1, table: "products",
    title: { ja: "問1: 行数のカウント (COUNT)", en: "Q1: Row Count (COUNT)", ne: "प्रश्न १: संख्या गन्ती (COUNT)", fr: "Q1 : Compter les lignes (COUNT)", my: "မေးခွန်း ၁: အရေအတွက် ရေတွက်ခြင်း", bn: "প্রশ্ন ১: সারি গণনা (COUNT)", si: "ප්‍රශ්නය 1: පේළි ගණන් කිරීම", id: "Soal 1: Menghitung Baris (COUNT)", vi: "Câu 1: Đếm số dòng (COUNT)", zh: "第1题: 统计行数 (COUNT)" },
    desc: {
      ja: "products テーブルに登録されている「全商品の総数（行数）」を取得してください。",
      en: "Retrieve the total number of products (row count) from the products table.",
      ne: "products तालिकामा भएका 'सबै उत्पादनहरूको जम्मा संख्या (हरफ संख्या)' निकाल्नुहोस्।",
      fr: "Récupérez le nombre total de produits (nombre de lignes) de la table products.",
      my: "products ဇယားရှိ 'ထုတ်ကုန်အားလုံး၏ စုစုပေါင်းအရေအတွက်' ကို ရယူပါ။",
      bn: "products টেবিলে থাকা 'মোট পণ্যের সংখ্যা' বের করুন।",
      si: "products වගුවේ ඇති 'සියලුම භාණ්ඩ ගණන' ලබා ගන්න.",
      id: "Tampilkan jumlah total produk (jumlah baris) dari tabel products.",
      vi: "Lấy tổng số lượng sản phẩm (số dòng) trong bảng products.",
      zh: "获取 products 表中“全部商品的数量（行数）”。"
    },
    hint1: "SELECT COUNT(*) FROM テーブル名;",
    hint2: "SELECT COUNT(*) FROM products;",
    answer: "SELECT COUNT(*) FROM products;",
    defaultSql: "SELECT COUNT() FROM products;"
  },
  {
    id: 2, part: 1, table: "products",
    title: { ja: "問2: 合計と平均 (SUM, AVG)", en: "Q2: Sum and Average (SUM, AVG)", ne: "प्रश्न २: जोड र औसत (SUM, AVG)", fr: "Q2 : Somme et Moyenne (SUM, AVG)", my: "မေးခွန်း ၂: စုစုပေါင်းနှင့် ပျမ်းမျှ", bn: "প্রশ্ন ২: যোগফল ও গড় (SUM, AVG)", si: "ප්‍රශ්නය 2: එකතුව සහ සාමාන්‍යය", id: "Soal 2: Total dan Rata-rata (SUM, AVG)", vi: "Câu 2: Tổng và Trung bình (SUM, AVG)", zh: "第2题: 总和与平均值 (SUM, AVG)" },
    desc: {
      ja: "全商品の「総在庫数（stock の合計）」と「平均価格（price の平均）」を取得してください。",
      en: "Retrieve the total stock (SUM of stock) and the average price (AVG of price) of all products.",
      ne: "सबै उत्पादनहरूको 'कुल मौज्दात (stock को जोड)' र 'औसत मूल्य (price को औसत)' निकाल्नुहोस्।",
      fr: "Récupérez le stock total (SUM) et le prix moyen (AVG) de tous les produits.",
      my: "ထုတ်ကုန်အားလုံး၏ 'စုစုပေါင်းလက်ကျန် (stock)' နှင့် 'ပျမ်းမျှစျေးနှုန်း (price)' ကို ရယူပါ။",
      bn: "সব পণ্যের 'মোট স্টক (SUM)' এবং 'গড় মূল্য (AVG)' বের করুন।",
      si: "සියලු භාණ්ඩවල 'මුළු තොගය (stock)' සහ 'සාමාන්‍ය මිල (price)' ලබා ගන්න.",
      id: "Tampilkan total stok (SUM) dan harga rata-rata (AVG) dari semua produk.",
      vi: "Lấy tổng tồn kho (SUM của stock) và giá trung bình (AVG của price) của tất cả sản phẩm.",
      zh: "获取所有商品的“总库存（stock的SUM）”和“平均价格（price的AVG）”。"
    },
    hint1: "SELECT SUM(列名), AVG(列名) FROM テーブル名;",
    hint2: "SELECT SUM(stock), AVG(price) FROM products;",
    answer: "SELECT SUM(stock), AVG(price) FROM products;",
    defaultSql: "SELECT SUM(stock),  FROM products;"
  },
  {
    id: 3, part: 1, table: "students",
    title: { ja: "問3: 最高点と最低点 (MAX, MIN)", en: "Q3: Max and Min (MAX, MIN)", ne: "प्रश्न ३: अधिकतम र न्यूनतम (MAX, MIN)", fr: "Q3 : Maximum et Minimum (MAX, MIN)", my: "မေးခွန်း ၃: အများဆုံးနှင့် အနည်းဆုံး", bn: "প্রশ্ন ৩: সর্বোচ্চ ও সর্বনিম্ন (MAX, MIN)", si: "ප්‍රශ්නය 3: උපරිම සහ අවම අගය", id: "Soal 3: Nilai Tertinggi dan Terendah", vi: "Câu 3: Điểm cao nhất và thấp nhất", zh: "第3题: 最大值与最小值 (MAX, MIN)" },
    desc: {
      ja: "students テーブルから、テストの「最高点（score の MAX）」と「最低点（score の MIN）」を取得してください。",
      en: "From the students table, retrieve the highest test score (MAX) and the lowest test score (MIN).",
      ne: "students तालिकाबाट परीक्षाको 'अधिकतम अङ्क (MAX)' र 'न्यूनतम अङ्क (MIN)' निकाल्नुहोस्।",
      fr: "Dans la table students, récupérez le score maximum (MAX) et le score minimum (MIN).",
      my: "students ဇယားမှ စာမေးပွဲ၏ 'အမြင့်ဆုံးအမှတ် (MAX)' နှင့် 'အနိမ့်ဆုံးအမှတ် (MIN)' ကို ရယူပါ။",
      bn: "students টেবিল থেকে পরীক্ষার 'সর্বোচ্চ নম্বর (MAX)' এবং 'সর্বনিম্ন নম্বর (MIN)' বের করুন।",
      si: "students වගුවෙන් විභාගයේ 'ඉහළම ලකුණ (MAX)' සහ 'අඩුම ලකුණ (MIN)' ලබා ගන්න.",
      id: "Dari tabel students, tampilkan nilai ujian tertinggi (MAX) dan terendah (MIN).",
      vi: "Trong bảng students, lấy điểm thi cao nhất (MAX của score) và thấp nhất (MIN của score).",
      zh: "从 students 表中获取考试的“最高分（score的MAX）”和“最低分（score的MIN）”。"
    },
    hint1: "SELECT MAX(列名), MIN(列名) FROM テーブル名;",
    hint2: "SELECT MAX(score), MIN(score) FROM students;",
    answer: "SELECT MAX(score), MIN(score) FROM students;",
    defaultSql: "SELECT MAX(score),  FROM students;"
  },
  {
    id: 4, part: 1, table: "students",
    title: { ja: "問4: 条件付き集計 (WHERE ＋ AVG)", en: "Q4: Aggregate with WHERE", ne: "प्रश्न ४: सर्तसहितको औसत (WHERE + AVG)", fr: "Q4 : Agrégation conditionnelle (WHERE + AVG)", my: "မေးခွန်း ၄: အခြေအနေဖြင့် ပျမ်းမျှတွက်ခြင်း", bn: "প্রশ্ন ৪: শর্তযুক্ত গড় (WHERE + AVG)", si: "ප්‍රශ්නය 4: කොන්දේසි සහිත සාමාන්‍යය", id: "Soal 4: Agregasi dengan WHERE", vi: "Câu 4: Tính trung bình có điều kiện", zh: "第4题: 带条件的聚合 (WHERE + AVG)" },
    desc: {
      ja: "専攻（major）が 'IT' の学生のみを対象に、テストの「平均点（AVG）」を取得してください。",
      en: "Retrieve the average score (AVG) for students whose major is 'IT'.",
      ne: "विषय (major) 'IT' भएका विद्यार्थीहरूको मात्र परीक्षाको 'औसत अङ्क (AVG)' निकाल्नुहोस्।",
      fr: "Récupérez le score moyen (AVG) uniquement pour les étudiants de la filière 'IT'.",
      my: "အထူးပြုဘာသာ (major) 'IT' ဖြစ်သော ကျောင်းသားများ၏ စာမေးပွဲ 'ပျမ်းမျှအမှတ် (AVG)' ကို ရယူပါ။",
      bn: "যে শিক্ষার্থীদের মেজর (major) 'IT', শুধু তাদের পরীক্ষার 'গড় নম্বর (AVG)' বের করুন।",
      si: "ප්‍රධාන විෂයය 'IT' වන සිසුන්ගේ පමණක් විභාගයේ 'සාමාන්‍ය ලකුණ (AVG)' ලබා ගන්න.",
      id: "Tampilkan nilai rata-rata (AVG) hanya untuk siswa dengan jurusan (major) 'IT'.",
      vi: "Lấy điểm thi trung bình (AVG của score) của riêng các sinh viên chuyên ngành (major) 'IT'.",
      zh: "仅针对专业（major）为 'IT' 的学生，获取其考试的“平均分（AVG）”。"
    },
    hint1: "SELECT AVG(score) FROM students WHERE major = 'IT';",
    hint2: "SELECT AVG(score) FROM students WHERE major = 'IT';",
    answer: "SELECT AVG(score) FROM students WHERE major = 'IT';",
    defaultSql: "SELECT AVG(score) FROM students WHERE "
  },

  // ==========================================
  // Part 2: グループ化 (GROUP BY)
  // ==========================================
  {
    id: 5, part: 2, table: "products",
    title: { ja: "問5: カテゴリごとの集計 (GROUP BY)", en: "Q5: Group by Category", ne: "प्रश्न ५: वर्ग अनुसार गन्ती (GROUP BY)", fr: "Q5 : Regroupement par catégorie", my: "မေးခွန်း ၅: အမျိုးအစားအလိုက် အုပ်စုဖွဲ့ခြင်း", bn: "প্রশ্ন ৫: ক্যাটাগরি অনুযায়ী গ্রুপিং", si: "ප්‍රශ්නය 5: කාණ්ඩ අනුව සමූහනය", id: "Soal 5: Pengelompokan Kategori (GROUP BY)", vi: "Câu 5: Nhóm theo danh mục (GROUP BY)", zh: "第5题: 按分类分组统计 (GROUP BY)" },
    desc: {
      ja: "商品カテゴリ（category）ごとに、商品数（COUNT）を取得してください。「category」と「商品数」を表示します。",
      en: "Retrieve the count of products for each category. Show 'category' and the product count.",
      ne: "प्रत्येक वर्ग (category) अनुसार उत्पादनको संख्या (COUNT) निकाल्नुहोस्। 'category' र संख्या देखाउनुहोस्।",
      fr: "Pour chaque catégorie (category), récupérez le nombre de produits. Affichez 'category' et le total.",
      my: "ကုန်ပစ္စည်းအမျိုးအစား (category) အလိုက် ကုန်ပစ္စည်းအရေအတွက်ကို ရယူပါ။",
      bn: "প্রতিটি ক্যাটাগরি (category) অনুযায়ী পণ্যের সংখ্যা (COUNT) বের করুন।",
      si: "එක් එක් කාණ්ඩය (category) අනුව භාණ්ඩ ගණන (COUNT) ලබා ගන්න.",
      id: "Untuk setiap kategori produk (category), tampilkan 'category' dan jumlah produknya (COUNT).",
      vi: "Đếm số lượng sản phẩm theo từng danh mục (category). Hiển thị 'category' và số lượng.",
      zh: "按商品分类（category）分组，获取每个分类的商品数量。显示“category”和“商品数量”。"
    },
    hint1: "SELECT category, COUNT(*) FROM products GROUP BY category;",
    hint2: "SELECT category, COUNT(*) FROM products GROUP BY category;",
    answer: "SELECT category, COUNT(*) FROM products GROUP BY category;",
    defaultSql: "SELECT category, COUNT(*) FROM products GROUP BY "
  },
  {
    id: 6, part: 2, table: "students",
    title: { ja: "問6: 専攻別の学生数と平均点", en: "Q6: Count & Average by Major", ne: "प्रश्न ६: विषय अनुसार संख्या र औसत", fr: "Q6 : Effectif et moyenne par filière", my: "မေးခွန်း ၆: အထူးပြုဘာသာအလိုက် ပျမ်းမျှ", bn: "প্রশ্ন ৬: মেজর অনুযায়ী সংখ্যা ও গড়", si: "ප්‍රශ්නය 6: ප්‍රධාන විෂයය අනුව ගණන හා සාමාන්‍යය", id: "Soal 6: Jumlah dan Rata-rata per Jurusan", vi: "Câu 6: Số lượng và điểm trung bình theo ngành", zh: "第6题: 各专业人数与平均分" },
    desc: {
      ja: "専攻（major）ごとに、「専攻名（major）」「学生数」「平均点（AVG(score)）」を取得してください。",
      en: "For each major, retrieve the major name, number of students (COUNT), and average score (AVG).",
      ne: "प्रत्येक विषय (major) अनुसार 'विषयको नाम', 'विद्यार्थी संख्या' र 'औसत अङ्क' निकाल्नुहोस्।",
      fr: "Pour chaque filière ('major'), récupérez son nom, le nombre d'étudiants et le score moyen.",
      my: "အထူးပြုဘာသာ (major) အလိုက် 'အမည်'၊ 'ကျောင်းသားဦးရေ' နှင့် 'ပျမ်းမျှအမှတ်' တို့ကို ရယူပါ။",
      bn: "প্রতিটি মেজর (major) অনুযায়ী 'মেজর নাম', 'শিক্ষার্থী সংখ্যা' এবং 'গড় নম্বর' বের করুন।",
      si: "එක් එක් ප්‍රධාන විෂයය (major) අනුව 'නම', 'සිසුන් ගණන' සහ 'සාමාන්‍ය ලකුණ' ලබා ගන්න.",
      id: "Untuk setiap jurusan (major), tampilkan 'major', jumlah siswa (COUNT), dan nilai rata-rata (AVG).",
      vi: "Với mỗi chuyên ngành (major), lấy 'major', số lượng sinh viên và điểm trung bình (AVG(score)).",
      zh: "按专业（major）分组，获取“专业名（major）”、“学生人数”和“平均分（AVG(score)）”。"
    },
    hint1: "SELECT major, COUNT(*), AVG(score) FROM students GROUP BY major;",
    hint2: "SELECT major, COUNT(*), AVG(score) FROM students GROUP BY major;",
    answer: "SELECT major, COUNT(*), AVG(score) FROM students GROUP BY major;",
    defaultSql: "SELECT major, COUNT(*), AVG(score) FROM students GROUP BY "
  },
  {
    id: 7, part: 2, table: "products",
    title: { ja: "問7: グループ化と並び替え (GROUP BY ＋ ORDER BY)", en: "Q7: GROUP BY with Sorting", ne: "प्रश्न ७: समूह र क्रमबद्धता", fr: "Q7 : GROUP BY avec Tri", my: "မေးခွန်း ၇: အုပ်စုဖွဲ့ခြင်းနှင့် စီခြင်း", bn: "প্রশ্ন ৭: গ্রুপিং এবং সাজানো", si: "ප්‍රශ්නය 7: සමූහනය සහ පෙළගැස්වීම", id: "Soal 7: GROUP BY dengan Pengurutan", vi: "Câu 7: Nhóm và sắp xếp kết quả", zh: "第7题: 分组并排序 (GROUP BY + ORDER BY)" },
    desc: {
      ja: "カテゴリごとの「平均価格」を算出し、平均価格が高い順（降順）に「category」と「平均価格」を取得してください。",
      en: "Calculate the average price for each category, and sort by average price descending (highest first).",
      ne: "प्रत्येक वर्गको औसत मूल्य निकाल्नुहोस् र औसत मूल्यको घट्दो क्रममा 'category' र 'औसत मूल्य' देखाउनुहोस्।",
      fr: "Calculez le prix moyen par catégorie et triez par ordre décroissant du prix moyen.",
      my: "အမျိုးအစားအလိုက် ပျမ်းမျှစျေးနှုန်းကို တွက်ပြီး စျေးအကြီးဆုံးမှ အငယ်ဆုံးသို့ စဉ်၍ ရယူပါ။",
      bn: "প্রতিটি ক্যাटाগরির গড় মূল্য হিসাব করুন এবং সর্বোচ্চ গড় মূল্যের ক্রমানুসারে সাজিয়ে বের করুন।",
      si: "එක් එක් කාණ්ඩයේ සාමාන්‍ය මිල ගණනය කර, සාමාන්‍ය මිල වැඩිම අගයේ සිට අවරෝහණව පෙළගස්වන්න.",
      id: "Hitung harga rata-rata per kategori, lalu urutkan dari harga rata-rata tertinggi (DESC).",
      vi: "Tính giá trung bình theo từng danh mục, sắp xếp theo giá trung bình giảm dần.",
      zh: "计算各分类的“平均价格”，并按平均价格由高到低（降序）获取“category”和“平均价格”。"
    },
    hint1: "GROUP BY category ORDER BY AVG(price) DESC;",
    hint2: "SELECT category, AVG(price) FROM products GROUP BY category ORDER BY AVG(price) DESC;",
    answer: "SELECT category, AVG(price) FROM products GROUP BY category ORDER BY AVG(price) DESC;",
    defaultSql: "SELECT category, AVG(price) FROM products GROUP BY category ORDER BY "
  },
  {
    id: 8, part: 2, table: "students",
    title: { ja: "問8: 複数列でのグループ化", en: "Q8: Group by Multiple Columns", ne: "प्रश्न ८: बहु-स्तम्भ समूह", fr: "Q8 : Regroupement sur plusieurs colonnes", my: "မေးခွန်း ၈: ကော်လံအများဖြင့် အုပ်စုဖွဲ့ခြင်း", bn: "প্রশ্ন ৮: একাধিক কলামে গ্রুপিং", si: "ප්‍රශ්නය 8: බහු තීරු අනුව සමූහනය", id: "Soal 8: Pengelompokan Multi-Kolom", vi: "Câu 8: Nhóm theo nhiều cột", zh: "第8题: 多列组合分组" },
    desc: {
      ja: "「入学年（enrollment_year）」と「専攻（major）」の組み合わせごとに、学生数（COUNT）を取得してください。",
      en: "Retrieve the student count for each combination of 'enrollment_year' and 'major'.",
      ne: "'भर्ना वर्ष (enrollment_year)' र 'विषय (major)' को संयोजन अनुसार विद्यार्थी संख्या निकाल्नुहोस्।",
      fr: "Récupérez le nombre d'étudiants pour chaque combinaison de 'enrollment_year' et 'major'.",
      my: "'ကျောင်းဝင်နှစ် (enrollment_year)' နှင့် 'အထူးပြုဘာသာ (major)' ပေါင်းစပ်မှုအလိုက် ကျောင်းသားဦးရေကို ရယူပါ။",
      bn: "'ভর্তির বছর (enrollment_year)' এবং 'মেজর (major)' এর সংমিশ্রণ অনুযায়ী শিক্ষার্থী সংখ্যা বের করুন।",
      si: "'ඇතුළත් වූ වර්ෂය' සහ 'ප්‍රධාන විෂයය' සංයෝජනය අනුව සිසුන් ගණන ලබා ගන්න.",
      id: "Tampilkan jumlah siswa untuk setiap kombinasi 'enrollment_year' dan 'major'.",
      vi: "Đếm số sinh viên theo từng nhóm kết hợp giữa 'năm nhập học' và 'chuyên ngành'.",
      zh: "按“入学年份（enrollment_year）”和“专业（major）”的组合进行分组，获取学生人数。"
    },
    hint1: "SELECT enrollment_year, major, COUNT(*) FROM students GROUP BY enrollment_year, major;",
    hint2: "SELECT enrollment_year, major, COUNT(*) FROM students GROUP BY enrollment_year, major;",
    answer: "SELECT enrollment_year, major, COUNT(*) FROM students GROUP BY enrollment_year, major;",
    defaultSql: "SELECT enrollment_year, major, COUNT(*) FROM students GROUP BY "
  },

  // ==========================================
  // Part 3: グループの絞り込み (HAVING)
  // ==========================================
  {
    id: 9, part: 3, table: "students",
    title: { ja: "問9: グループ条件の基本 (HAVING)", en: "Q9: Basic HAVING Clause", ne: "प्रश्न ९: समूह सर्तको आधारभूत (HAVING)", fr: "Q9 : Filtrage de groupe (HAVING)", my: "မေးခွန်း ၉: အုပ်စုစစ်ထုတ်ခြင်း (HAVING)", bn: "প্রশ্ন ৯: গ্রুপ ফিল্টারিং (HAVING)", si: "ප්‍රශ්නය 9: මූලික HAVING කොන්දේසිය", id: "Soal 9: Dasar Klausa HAVING", vi: "Câu 9: Lọc nhóm với HAVING", zh: "第9题: 分组后筛选 (HAVING 基础)" },
    desc: {
      ja: "専攻（major）ごとに学生数を集計し、「学生数が3人以上」いる専攻のみを抽出してください。",
      en: "Group by major and retrieve only majors with 3 or more students (HAVING COUNT(*) >= 3).",
      ne: "विषय अनुसार विद्यार्थी संख्या निकाल्नुहोस् र 'विद्यार्थी संख्या ३ वा बढी' भएका विषय मात्र देखाउनुहोस्।",
      fr: "Regroupez par filière et affichez uniquement celles comptant 3 étudiants ou plus.",
      my: "အထူးပြုဘာသာအလိုက် စစ်ထုတ်ပြီး 'ကျောင်းသားဦးရေ ၃ ဦးနှင့်အထက်' ရှိသော ဘာသာများကိုသာ ရယူပါ။",
      bn: "মেজর অনুযায়ী গ্রুপিং করুন এবং কেবল '৩ বা ততোধিক শিক্ষার্থী' থাকা মেজরগুলি বের করুন।",
      si: "ප්‍රධාන විෂයයන් සමූහනය කර 'සිසුන් 3ක් හෝ ඊට වැඩි' විෂයයන් පමණක් ලබා ගන්න.",
      id: "Kelompokkan berdasarkan major, tampilkan hanya jurusan yang memiliki 3 siswa atau lebih.",
      vi: "Nhóm theo ngành học và chỉ lấy những ngành có từ 3 sinh viên trở lên (HAVING COUNT(*) >= 3).",
      zh: "按专业（major）统计人数，仅筛选出“学生人数在3人及以上”的专业。"
    },
    hint1: "GROUP BY major HAVING COUNT(*) >= 3;",
    hint2: "SELECT major, COUNT(*) FROM students GROUP BY major HAVING COUNT(*) >= 3;",
    answer: "SELECT major, COUNT(*) FROM students GROUP BY major HAVING COUNT(*) >= 3;",
    defaultSql: "SELECT major, COUNT(*) FROM students GROUP BY major HAVING "
  },
  {
    id: 10, part: 3, table: "products",
    title: { ja: "問10: 平均値によるグループ絞込", en: "Q10: Filter by Average (HAVING)", ne: "प्रश्न १०: औसत अनुसार समूह छनोट", fr: "Q10 : Filtrer par moyenne (HAVING)", my: "မေးခွန်း ၁၀: ပျမ်းမျှဖြင့် စစ်ထုတ်ခြင်း", bn: "প্রশ্ন ১০: গড় মান অনুযায়ী ফিল্টার", si: "ප්‍රශ්නය 10: සාමාන්‍යය අනුව සමූහ පෙරීම", id: "Soal 10: Filter berdasarkan Rata-rata", vi: "Câu 10: Lọc theo giá trị trung bình", zh: "第10题: 按平均值筛选分组" },
    desc: {
      ja: "カテゴリごとの平均価格を求め、「平均価格が5,000円以上」のカテゴリ名と平均価格を取得してください。",
      en: "Calculate average price per category and retrieve categories where the average price is 5,000 or more.",
      ne: "वर्ग अनुसार औसत मूल्य निकाल्नुहोस् र 'औसत मूल्य ५,००० वा बढी' भएका वर्ग र औसत मूल्य देखाउनुहोस्।",
      fr: "Récupérez les catégories dont le prix moyen est supérieur ou égal à 5 000, avec leur prix moyen.",
      my: "အမျိုးအစားအလိုက် ပျမ်းမျှစျေးနှုန်းကို တွက်ပြီး 'ပျမ်းမျှစျေး ၅,၀၀၀ နှင့်အထက်' ရှိသော အုပ်စုများကို ရယူပါ။",
      bn: "ক্যাটাগরি অনুযায়ী গড় মূল্য হিসাব করে যেগুলির 'গড় মূল্য ৫,০০০ বা বেশি' সেগুলি বের করুন।",
      si: "සාමාන්‍ය මිල 5,000 හෝ ඊට වැඩි කාණ්ඩ සහ ඒවායේ සාමාන්‍ය මිල ලබා ගන්න.",
      id: "Tampilkan kategori yang memiliki harga rata-rata 5.000 ke atas beserta harga rata-ratanya.",
      vi: "Lấy các danh mục có giá trung bình từ 5.000 trở lên kèm theo giá trung bình của chúng.",
      zh: "求各分类的平均价格，仅获取“平均价格在5,000円以上”的分类名和平均价格。"
    },
    hint1: "GROUP BY category HAVING AVG(price) >= 5000;",
    hint2: "SELECT category, AVG(price) FROM products GROUP BY category HAVING AVG(price) >= 5000;",
    answer: "SELECT category, AVG(price) FROM products GROUP BY category HAVING AVG(price) >= 5000;",
    defaultSql: "SELECT category, AVG(price) FROM products GROUP BY category HAVING "
  },
  {
    id: 11, part: 3, table: "products",
    title: { ja: "問11: WHERE と HAVING の併用", en: "Q11: WHERE and HAVING Together", ne: "प्रश्न ११: WHERE र HAVING को सँगै प्रयोग", fr: "Q11 : Combinaison WHERE et HAVING", my: "မေးခွန်း ၁၁: WHERE နှင့် HAVING တွဲသုံးခြင်း", bn: "প্রশ্ন ১১: WHERE এবং HAVING এর যৌথ ব্যবহার", si: "ප්‍රශ්නය 11: WHERE සහ HAVING එකට භාවිතය", id: "Soal 11: Kombinasi WHERE dan HAVING", vi: "Câu 11: Kết hợp WHERE và HAVING", zh: "第11题: WHERE 与 HAVING 结合使用" },
    desc: {
      ja: "「2020年以降に発売された商品」に絞り込んだ上でカテゴリごとに集計し、該当商品が「2点以上」あるカテゴリと商品数を取得してください。",
      en: "Filter for products released in 2020 or later (WHERE), group by category, and keep only categories with 2 or more products (HAVING).",
      ne: "'२०२० वा पछि रिलिज भएका उत्पादनहरू' मात्र छानेर वर्ग अनुसार गन्ती गर्नुहोस् र '२ वा बढी उत्पादन' भएका वर्ग देखाउनुहोस्।",
      fr: "Filtrez les produits sortis en 2020 ou après (WHERE), regroupez par catégorie et gardez celles ayant 2 produits ou plus (HAVING).",
      my: "'၂၀၂၀ နောက်ပိုင်းထုတ်' များကို အရင်စစ်ထုတ်ပြီး ကုန်ပစ္စည်း '၂ ခုနှင့်အထက်' ရှိသော အမျိုးအစားကို ရယူပါ။",
      bn: "'২০২০ বা তার পরে প্রকাশিত' পণ্য ফিল্টার করে যে ক্যাটাগরিতে '২টি বা ততোধিক পণ্য' আছে সেগুলি বের করুন।",
      si: "2020න් පසු නිකුත් වූ භාණ්ඩ පෙරීම කර (WHERE), භාණ්ඩ 2ක් හෝ වැඩි කාණ්ඩ පමණක් ලබා ගන්න (HAVING).",
      id: "Filter produk rilis tahun 2020 ke atas (WHERE), lalu tampilkan kategori yang memiliki 2 produk atau lebih (HAVING).",
      vi: "Lọc sản phẩm từ năm 2020 trở đi (WHERE), nhóm theo danh mục và chỉ lấy các nhóm có từ 2 sản phẩm trở lên (HAVING).",
      zh: "先筛选出“2020年及之后发布的商品”（WHERE），再按分类统计，仅获取商品数“在2件及以上”的分类和数量（HAVING）。"
    },
    hint1: "WHERE release_year >= 2020 GROUP BY category HAVING COUNT(*) >= 2;",
    hint2: "SELECT category, COUNT(*) FROM products WHERE release_year >= 2020 GROUP BY category HAVING COUNT(*) >= 2;",
    answer: "SELECT category, COUNT(*) FROM products WHERE release_year >= 2020 GROUP BY category HAVING COUNT(*) >= 2;",
    defaultSql: "SELECT category, COUNT(*) FROM products WHERE release_year >= 2020 GROUP BY category HAVING "
  },
  {
    id: 12, part: 3, table: "students",
    title: { ja: "問12: 集計の総合問題", en: "Q12: Aggregation Mastery", ne: "प्रश्न १२: पूर्ण समूह अभ्यास", fr: "Q12 : Synthèse complète des agrégations", my: "မေးခွန်း ၁၂: အုပ်စုဖွဲ့ခြင်း စုစည်းလေ့ကျင့်ခန်း", bn: "প্রশ্ন ১২: গ্রুপিং এর চূড়ান্ত অনুশীলন", si: "ප්‍රශ්නය 12: සමූහනයේ ප්‍රධාන අභ්‍යාසය", id: "Soal 12: Latihan Lengkap Agregasi", vi: "Câu 12: Tổng hợp toàn diện về nhóm và lọc", zh: "第12题: 分组聚合综合演练" },
    desc: {
      ja: "専攻（major）ごとにテストの平均点を算出し、「平均点が75点以上」の専攻を「平均点が高い順（降順）」に並べて取得してください。",
      en: "Calculate the average score for each major, filter for majors with an average of 75 or higher (HAVING), and sort by average score descending.",
      ne: "विषय अनुसार औसत अङ्क निकाल्नुहोस्, 'औसत अङ्क ७५ वा बढी' भएका विषय मात्र छानेर उच्च औसतको आधारमा घट्दो क्रममा मिलाउनुहोस्।",
      fr: "Calculez la moyenne par filière, gardez celles avec une moyenne >= 75 (HAVING) et triez par moyenne décroissante (ORDER BY).",
      my: "အထူးပြုဘာသာအလိုက် ပျမ်းမျှအမှတ်တွက်ပြီး 'ပျမ်းမျှ ၇၅ နှင့်အထက်' ရှိသည်များကို အမှတ်အများဆုံးမှ အနည်းဆုံးသို့ စဉ်၍ ရယူပါ။",
      bn: "প্রতিটি মেজরের গড় নম্বর হিসাব করে 'গড় নম্বর ৭৫ বা বেশি' থাকা মেজরগুলি গড় নম্বরের ক্রমানুসারে (বড় থেকে ছোট) সাজিয়ে বের করুন।",
      si: "සාමාන්‍ය ලකුණ 75 හෝ වැඩි ප්‍රධාන විෂයයන් තෝරා, සාමාන්‍ය ලකුණ වැඩිම අගයේ සිට අවරෝහණව පෙළගස්වන්න.",
      id: "Hitung nilai rata-rata per major, filter yang memiliki rata-rata >= 75 (HAVING), lalu urutkan dari yang tertinggi (DESC).",
      vi: "Tính điểm trung bình theo ngành, lọc các ngành có điểm trung bình từ 75 trở lên và sắp xếp giảm dần.",
      zh: "按专业（major）计算平均分，筛选出“平均分在75分及以上”的专业，并按平均分由高到低（降序）排序输出。"
    },
    hint1: "GROUP BY major HAVING AVG(score) >= 75 ORDER BY AVG(score) DESC;",
    hint2: "SELECT major, AVG(score) FROM students GROUP BY major HAVING AVG(score) >= 75 ORDER BY AVG(score) DESC;",
    answer: "SELECT major, AVG(score) FROM students GROUP BY major HAVING AVG(score) >= 75 ORDER BY AVG(score) DESC;",
    defaultSql: "SELECT major, AVG(score) FROM students GROUP BY major HAVING "
  }
];