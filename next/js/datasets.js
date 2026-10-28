/* =========================================================
 * datasets.js — all tables used by examples, practice and tests
 * 表の名前（日本語・英語…）は i18n/<言語>.js の ds.<table> にあります。
 * ---------------------------------------------------------
 * 演習データの追加方法（Adding a new practice theme）:
 *   1. SINGLE_DATASETS か JOIN_DATASETS にオブジェクトを1つ足すだけ。
 *   2. roles にそれぞれの列の役割を書く（name / cat / n1 / n2 / yr）。
 *   3. 数値列(n1, n2)の値は表の中で重複させない（並び替え問題の答えが1つに決まるように）。
 *   4. node tools/check.js で自動チェック。
 * ========================================================= */

/** Demo tables (from the original Lesson 1–5 / GROUP BY pages). */
export const DEMO_DATASETS = {
  products: {
    table: 'products',
    columns: [['id', 'INTEGER'], ['name', 'TEXT'], ['category', 'TEXT'], ['price', 'INTEGER'], ['stock', 'INTEGER'], ['release_year', 'INTEGER']],
    roles: { name: 'name', cat: 'category', n1: 'price', n2: 'stock', yr: 'release_year' },
    rows: [
      [1, 'Wireless Mouse', 'Electronics', 1500, 50, 2019],
      [2, 'Wireless Mouse Pro', 'Electronics', 4800, 20, 2021],
      [3, 'Mechanical Keyboard', 'Electronics', 8500, 15, 2020],
      [4, 'Noise Cancelling Headphones Pro', 'Electronics', 18000, 10, 2022],
      [5, 'Coffee Maker', 'Kitchen', 3500, 30, 2018],
      [6, 'Stainless Steel Kettle', 'Kitchen', 2800, 25, 2020],
      [7, 'Chef Knife Pro', 'Kitchen', 6200, 8, 2021],
      [8, 'SQL Beginner Guide', 'Books', 2200, 40, 2021],
      [9, 'Web Development Basics', 'Books', 3000, 12, 2019],
      [10, 'Graphic T-Shirt', 'Clothing', 1800, 60, 2022]
    ]
  },
  students: {
    table: 'students',
    columns: [['id', 'INTEGER'], ['name', 'TEXT'], ['major', 'TEXT'], ['score', 'INTEGER'], ['age', 'INTEGER'], ['enrollment_year', 'INTEGER']],
    roles: { name: 'name', cat: 'major', n1: 'score', n2: 'age', yr: 'enrollment_year' },
    rows: [
      [1, 'Ken Tanaka', 'IT', 85, 20, 2022],
      [2, 'Aung San', 'Business', 74, 22, 2021],
      [3, 'Maria Garcia', 'IT', 95, 19, 2023],
      [4, 'Rahman Khan', 'Design', 68, 24, 2020],
      [5, 'Silva Perera', 'Tourism', 82, 21, 2022],
      [6, 'Nguyen Van Minh', 'IT', 88, 20, 2023],
      [7, 'Chen Wei', 'Business', 58, 23, 2021],
      [8, 'John Smith', 'Design', 91, 25, 2022],
      [9, 'Siti Nurhaliza', 'Tourism', 78, 19, 2024],
      [10, 'Ali Santos', 'IT', 62, 22, 2022]
    ]
  },
  table_a: {
    table: 'table_a',
    columns: [['id', 'INTEGER'], ['class', 'TEXT'], ['column_a1', 'TEXT']],
    rows: [[1, 'A', 'data_a1'], [2, 'A', 'data_a2'], [3, 'B', 'data_a3'], [4, 'B', 'data_a4']]
  },
  table_b: {
    table: 'table_b',
    columns: [['id', 'INTEGER'], ['column_b1', 'TEXT'], ['column_b2', 'INTEGER']],
    rows: [[2, 'data_b2', 200], [3, 'data_b3', 300], [4, 'data_b4', 400], [5, 'data_b5', 500]]
  }
};

/** Practice themes for one-table lessons (Basics & Aggregation). */
export const SINGLE_DATASETS = [
  {
    table: 'books',
    columns: [['id', 'INTEGER'], ['title', 'TEXT'], ['genre', 'TEXT'], ['price', 'INTEGER'], ['pages', 'INTEGER'], ['published_year', 'INTEGER']],
    roles: { name: 'title', cat: 'genre', n1: 'price', n2: 'pages', yr: 'published_year' },
    likeTerms: ['Sun', 'The', 'Star', 'Night', 'Ocean', 'Water', 'Space'],
    rows: [
      [1, 'The Silent Sea', 'Novel', 1800, 320, 2019],
      [2, 'Sunflower Days', 'Novel', 1650, 280, 2021],
      [3, 'Moonlight Station', 'Novel', 2100, 410, 2022],
      [4, 'Ocean of Stars', 'Novel', 1950, 365, 2020],
      [5, 'Rain in Tokyo', 'Novel', 1500, 240, 2023],
      [6, 'Ninja Cats', 'Comic', 620, 190, 2021],
      [7, 'Space Pirates', 'Comic', 580, 210, 2022],
      [8, 'Robot Kitchen', 'Comic', 700, 175, 2020],
      [9, 'Sun Warriors', 'Comic', 650, 200, 2023],
      [10, 'Universe for Beginners', 'Science', 2400, 300, 2019],
      [11, 'The Story of Water', 'Science', 2250, 260, 2021],
      [12, 'Data and Society', 'Science', 2900, 350, 2022]
    ]
  },
  {
    table: 'employees',
    columns: [['id', 'INTEGER'], ['name', 'TEXT'], ['department', 'TEXT'], ['salary', 'INTEGER'], ['age', 'INTEGER'], ['hire_year', 'INTEGER']],
    roles: { name: 'name', cat: 'department', n1: 'salary', n2: 'age', yr: 'hire_year' },
    likeTerms: ['an', 'ar', 'Ra', 'in', 'Li'],
    rows: [
      [1, 'Yuki Sato', 'Sales', 320000, 29, 2018],
      [2, 'Ravi Sharma', 'IT', 410000, 34, 2016],
      [3, 'Anna Muller', 'HR', 298000, 41, 2015],
      [4, 'Tran Thi Lan', 'Sales', 275000, 25, 2022],
      [5, 'Kofi Mensah', 'IT', 385000, 31, 2019],
      [6, 'Sara Rossi', 'Sales', 350000, 38, 2017],
      [7, 'Min Thu', 'IT', 300000, 27, 2021],
      [8, 'Lina Haddad', 'HR', 330000, 36, 2018],
      [9, 'Bikash Rai', 'Sales', 262000, 23, 2023],
      [10, 'Emily Clark', 'IT', 455000, 45, 2014],
      [11, 'Dewi Lestari', 'Sales', 289000, 28, 2021],
      [12, 'Omar Farouk', 'HR', 312000, 33, 2020]
    ]
  },
  {
    table: 'menu',
    columns: [['id', 'INTEGER'], ['item', 'TEXT'], ['type', 'TEXT'], ['price', 'INTEGER'], ['calories', 'INTEGER'], ['added_year', 'INTEGER']],
    roles: { name: 'item', cat: 'type', n1: 'price', n2: 'calories', yr: 'added_year' },
    likeTerms: ['Mango', 'Chocolate', 'Tea', 'Coffee', 'Rice', 'Cake'],
    rows: [
      [1, 'Iced Coffee', 'Drink', 450, 15, 2019],
      [2, 'Matcha Latte', 'Drink', 520, 190, 2021],
      [3, 'Mango Smoothie', 'Drink', 580, 240, 2022],
      [4, 'Hot Chocolate', 'Drink', 490, 310, 2020],
      [5, 'Lemon Tea', 'Drink', 400, 70, 2023],
      [6, 'Chicken Curry', 'Food', 980, 720, 2018],
      [7, 'Veggie Sandwich', 'Food', 650, 430, 2021],
      [8, 'Tomato Pasta', 'Food', 890, 610, 2019],
      [9, 'Rice Bowl', 'Food', 760, 560, 2022],
      [10, 'Cheese Cake', 'Dessert', 540, 380, 2020],
      [11, 'Chocolate Cookie', 'Dessert', 300, 250, 2021],
      [12, 'Mango Pudding', 'Dessert', 420, 210, 2023]
    ]
  },
  {
    table: 'movies',
    columns: [['id', 'INTEGER'], ['title', 'TEXT'], ['genre', 'TEXT'], ['minutes', 'INTEGER'], ['rating', 'INTEGER'], ['release_year', 'INTEGER']],
    roles: { name: 'title', cat: 'genre', n1: 'minutes', n2: 'rating', yr: 'release_year' },
    likeTerms: ['Night', 'Party', 'Dragon', 'Fire', 'Star'],
    rows: [
      [1, 'Fast River', 'Action', 128, 72, 2019],
      [2, 'Iron Night', 'Action', 141, 81, 2021],
      [3, 'Last Mission', 'Action', 117, 68, 2022],
      [4, 'Night Runner', 'Action', 109, 77, 2020],
      [5, 'Fire Line', 'Action', 133, 85, 2023],
      [6, 'Happy Family', 'Comedy', 98, 74, 2018],
      [7, 'Office Party', 'Comedy', 102, 63, 2021],
      [8, 'My Funny Dog', 'Comedy', 95, 79, 2019],
      [9, 'Party Time', 'Comedy', 90, 70, 2022],
      [10, 'Sky Dragon', 'Anime', 112, 88, 2020],
      [11, 'Little Star', 'Anime', 104, 83, 2021],
      [12, 'Dragon Night', 'Anime', 121, 91, 2023]
    ]
  },
  {
    table: 'hotels',
    columns: [['id', 'INTEGER'], ['name', 'TEXT'], ['city', 'TEXT'], ['price', 'INTEGER'], ['rooms', 'INTEGER'], ['opened_year', 'INTEGER']],
    roles: { name: 'name', cat: 'city', n1: 'price', n2: 'rooms', yr: 'opened_year' },
    likeTerms: ['Hotel', 'Hostel', 'Inn', 'House', 'Park'],
    rows: [
      [1, 'Sakura Inn', 'Osaka', 8500, 40, 2015],
      [2, 'River Hotel', 'Osaka', 12000, 120, 2018],
      [3, 'Station Hostel', 'Osaka', 3800, 25, 2020],
      [4, 'Bay View Hotel', 'Osaka', 15500, 210, 2012],
      [5, 'Castle Stay', 'Osaka', 9800, 60, 2021],
      [6, 'Garden Ryokan', 'Kyoto', 22000, 18, 2010],
      [7, 'Temple Hostel', 'Kyoto', 4200, 30, 2019],
      [8, 'Kyoto Central Hotel', 'Kyoto', 13500, 150, 2016],
      [9, 'Bamboo House', 'Kyoto', 7600, 12, 2022],
      [10, 'Deer Park Inn', 'Nara', 6900, 22, 2017],
      [11, 'Nara Hotel Plus', 'Nara', 11200, 80, 2014],
      [12, 'Old Town Guesthouse', 'Nara', 5200, 15, 2021]
    ]
  },
  {
    table: 'smartphones',
    columns: [['id', 'INTEGER'], ['model', 'TEXT'], ['brand', 'TEXT'], ['price', 'INTEGER'], ['battery', 'INTEGER'], ['release_year', 'INTEGER']],
    roles: { name: 'model', cat: 'brand', n1: 'price', n2: 'battery', yr: 'release_year' },
    likeTerms: ['Lite', 'Mini', 'Pro', 'Plus', '12'],
    rows: [
      [1, 'Nova 10', 'Nova', 59800, 4500, 2021],
      [2, 'Nova 11 Lite', 'Nova', 39800, 4200, 2022],
      [3, 'Nova 12', 'Nova', 74800, 4800, 2023],
      [4, 'Nova 12 Pro', 'Nova', 99800, 5000, 2023],
      [5, 'Nova 9 Mini', 'Nova', 45800, 3600, 2020],
      [6, 'Orion S', 'Orion', 88000, 4700, 2021],
      [7, 'Orion S Plus', 'Orion', 112000, 5100, 2022],
      [8, 'Orion A', 'Orion', 42000, 4300, 2020],
      [9, 'Orion A Lite', 'Orion', 33000, 4000, 2022],
      [10, 'Zen One', 'Zen', 51000, 4400, 2021],
      [11, 'Zen Two', 'Zen', 64000, 4600, 2022],
      [12, 'Zen Mini', 'Zen', 36000, 3900, 2023]
    ]
  },
  {
    table: 'players',
    columns: [['id', 'INTEGER'], ['name', 'TEXT'], ['team', 'TEXT'], ['goals', 'INTEGER'], ['matches', 'INTEGER'], ['join_year', 'INTEGER']],
    roles: { name: 'name', cat: 'team', n1: 'goals', n2: 'matches', yr: 'join_year' },
    likeTerms: ['Ma', 'os', 'ar', 'Ra', 'Sa'],
    rows: [
      [1, 'Kenji Mori', 'Tigers', 12, 30, 2019],
      [2, 'Lucas Silva', 'Tigers', 18, 34, 2018],
      [3, 'Hamid Noor', 'Tigers', 7, 22, 2021],
      [4, 'Arjun Das', 'Tigers', 15, 31, 2020],
      [5, 'Leo Martin', 'Tigers', 3, 12, 2023],
      [6, 'Pedro Alves', 'Eagles', 21, 36, 2017],
      [7, 'Tomas Novak', 'Eagles', 9, 25, 2020],
      [8, 'Ibrahim Sow', 'Eagles', 5, 18, 2022],
      [9, 'Nam Hoang', 'Eagles', 14, 29, 2021],
      [10, 'Rafael Costa', 'Sharks', 11, 27, 2019],
      [11, 'Sanjay Gurung', 'Sharks', 8, 20, 2022],
      [12, 'Mario Rossi', 'Sharks', 16, 33, 2018]
    ]
  },
  {
    table: 'courses',
    columns: [['id', 'INTEGER'], ['title', 'TEXT'], ['level', 'TEXT'], ['fee', 'INTEGER'], ['hours', 'INTEGER'], ['start_year', 'INTEGER']],
    roles: { name: 'title', cat: 'level', n1: 'fee', n2: 'hours', yr: 'start_year' },
    likeTerms: ['Python', 'Web', 'Japanese', 'Data', 'Basics'],
    rows: [
      [1, 'Python Basics', 'Beginner', 12000, 20, 2020],
      [2, 'Excel for Work', 'Beginner', 8000, 12, 2019],
      [3, 'Web Design Intro', 'Beginner', 15000, 24, 2021],
      [4, 'SQL Basics', 'Beginner', 9500, 15, 2022],
      [5, 'Japanese N5', 'Beginner', 6000, 30, 2023],
      [6, 'Python Data Analysis', 'Intermediate', 28000, 36, 2021],
      [7, 'Web App Development', 'Intermediate', 35000, 48, 2022],
      [8, 'Business English', 'Intermediate', 18000, 32, 2020],
      [9, 'Japanese N3', 'Intermediate', 14000, 40, 2019],
      [10, 'Machine Learning', 'Advanced', 52000, 60, 2022],
      [11, 'Cloud Security', 'Advanced', 46000, 44, 2023],
      [12, 'Data Engineering', 'Advanced', 58000, 54, 2021]
    ]
  }
];

/**
 * Practice themes for JOIN lessons. Each is a pair of tables:
 *   left  : id, name, group
 *   right : key (points to left.id), text, number
 * Some left rows have no partner, some right rows point to ids that do not exist —
 * exactly like table_a / table_b in the demo.
 */
export const JOIN_DATASETS = [
  {
    key: 'shop',
    left: { table: 'customers', columns: [['id', 'INTEGER'], ['name', 'TEXT'], ['city', 'TEXT']], roles: { id: 'id', name: 'name', grp: 'city' },
      rows: [[1, 'Aiko', 'Osaka'], [2, 'Ben', 'Tokyo'], [3, 'Chandra', 'Osaka'], [4, 'Dina', 'Tokyo'], [5, 'Eko', 'Osaka']] },
    right: { table: 'orders', columns: [['customer_id', 'INTEGER'], ['item', 'TEXT'], ['amount', 'INTEGER']], roles: { key: 'customer_id', text: 'item', num: 'amount' },
      rows: [[2, 'Laptop', 98000], [3, 'Desk', 24000], [5, 'Chair', 15000], [6, 'Lamp', 4200], [7, 'Monitor', 32000]] }
  },
  {
    key: 'office',
    left: { table: 'staff', columns: [['id', 'INTEGER'], ['name', 'TEXT'], ['team', 'TEXT']], roles: { id: 'id', name: 'name', grp: 'team' },
      rows: [[1, 'Hana', 'Sales'], [2, 'Ivan', 'Dev'], [3, 'Jun', 'Dev'], [4, 'Kim', 'Sales'], [5, 'Lea', 'Dev'], [6, 'Mo', 'Sales']] },
    right: { table: 'parking', columns: [['staff_id', 'INTEGER'], ['spot', 'TEXT'], ['fee', 'INTEGER']], roles: { key: 'staff_id', text: 'spot', num: 'fee' },
      rows: [[1, 'P-01', 5000], [3, 'P-02', 4500], [4, 'P-05', 5200], [6, 'P-07', 4800], [8, 'P-09', 3900]] }
  },
  {
    key: 'library',
    left: { table: 'members', columns: [['id', 'INTEGER'], ['name', 'TEXT'], ['plan', 'TEXT']], roles: { id: 'id', name: 'name', grp: 'plan' },
      rows: [[1, 'Nina', 'Gold'], [2, 'Oscar', 'Basic'], [3, 'Priya', 'Gold'], [4, 'Quan', 'Basic'], [5, 'Rosa', 'Basic']] },
    right: { table: 'loans', columns: [['member_id', 'INTEGER'], ['book', 'TEXT'], ['days', 'INTEGER']], roles: { key: 'member_id', text: 'book', num: 'days' },
      rows: [[1, 'Ocean Diary', 7], [2, 'Star Map', 14], [4, 'Green Hill', 10], [6, 'City Light', 21], [9, 'Blue Moon', 3]] }
  },
  {
    key: 'pets',
    left: { table: 'pets', columns: [['id', 'INTEGER'], ['name', 'TEXT'], ['species', 'TEXT']], roles: { id: 'id', name: 'name', grp: 'species' },
      rows: [[1, 'Coco', 'Dog'], [2, 'Momo', 'Cat'], [3, 'Rex', 'Dog'], [4, 'Luna', 'Cat'], [5, 'Pochi', 'Dog'], [6, 'Tama', 'Cat']] },
    right: { table: 'checkups', columns: [['pet_id', 'INTEGER'], ['clinic', 'TEXT'], ['weight', 'INTEGER']], roles: { key: 'pet_id', text: 'clinic', num: 'weight' },
      rows: [[2, 'Green Clinic', 4], [3, 'Happy Vet', 28], [5, 'Green Clinic', 11], [6, 'Happy Vet', 5], [7, 'City Vet', 9]] }
  },
  {
    key: 'streaming',
    left: { table: 'users', columns: [['id', 'INTEGER'], ['name', 'TEXT'], ['country', 'TEXT']], roles: { id: 'id', name: 'name', grp: 'country' },
      rows: [[1, 'Sam', 'Japan'], [2, 'Tina', 'Nepal'], [3, 'Umar', 'Japan'], [4, 'Vera', 'Vietnam'], [5, 'Wan', 'Nepal']] },
    right: { table: 'subscriptions', columns: [['user_id', 'INTEGER'], ['plan', 'TEXT'], ['price', 'INTEGER']], roles: { key: 'user_id', text: 'plan', num: 'price' },
      rows: [[1, 'Premium', 1200], [3, 'Standard', 800], [4, 'Premium', 1250], [5, 'Family', 1800], [8, 'Standard', 780]] }
  },
  {
    key: 'delivery',
    left: { table: 'drivers', columns: [['id', 'INTEGER'], ['name', 'TEXT'], ['area', 'TEXT']], roles: { id: 'id', name: 'name', grp: 'area' },
      rows: [[1, 'Ali', 'North'], [2, 'Bao', 'South'], [3, 'Chloe', 'North'], [4, 'Dev', 'South'], [5, 'Ema', 'North']] },
    right: { table: 'deliveries', columns: [['driver_id', 'INTEGER'], ['package', 'TEXT'], ['distance', 'INTEGER']], roles: { key: 'driver_id', text: 'package', num: 'distance' },
      rows: [[2, 'Box-A', 12], [3, 'Box-B', 7], [4, 'Box-C', 18], [6, 'Box-D', 5], [9, 'Box-E', 22]] }
  },
  {
    key: 'school',
    left: { table: 'pupils', columns: [['id', 'INTEGER'], ['name', 'TEXT'], ['grade', 'TEXT']], roles: { id: 'id', name: 'name', grp: 'grade' },
      rows: [[1, 'Aya', 'G1'], [2, 'Binod', 'G2'], [3, 'Carla', 'G1'], [4, 'Duc', 'G2'], [5, 'Elif', 'G1'], [6, 'Farah', 'G2']] },
    right: { table: 'clubs', columns: [['pupil_id', 'INTEGER'], ['club', 'TEXT'], ['hours', 'INTEGER']], roles: { key: 'pupil_id', text: 'club', num: 'hours' },
      rows: [[1, 'Music', 4], [2, 'Soccer', 6], [3, 'Art', 3], [5, 'Chess', 2], [9, 'Drama', 5]] }
  },
  {
    key: 'hotel',
    left: { table: 'rooms', columns: [['id', 'INTEGER'], ['name', 'TEXT'], ['floor', 'TEXT']], roles: { id: 'id', name: 'name', grp: 'floor' },
      rows: [[1, 'R101', '1F'], [2, 'R102', '1F'], [3, 'R201', '2F'], [4, 'R202', '2F'], [5, 'R301', '3F']] },
    right: { table: 'bookings', columns: [['room_id', 'INTEGER'], ['guest', 'TEXT'], ['nights', 'INTEGER']], roles: { key: 'room_id', text: 'guest', num: 'nights' },
      rows: [[1, 'Kumar', 3], [3, 'Laura', 1], [4, 'Mei', 5], [5, 'Nabil', 2], [7, 'Olga', 4]] }
  },
  {
    key: 'farm',
    left: { table: 'farms', columns: [['id', 'INTEGER'], ['name', 'TEXT'], ['region', 'TEXT']], roles: { id: 'id', name: 'name', grp: 'region' },
      rows: [[1, 'Green Field', 'East'], [2, 'Sunny Hill', 'West'], [3, 'River Farm', 'East'], [4, 'Blue Sky', 'West'], [5, 'Old Oak', 'East'], [6, 'Rice Valley', 'West']] },
    right: { table: 'shipments', columns: [['farm_id', 'INTEGER'], ['crop', 'TEXT'], ['kg', 'INTEGER']], roles: { key: 'farm_id', text: 'crop', num: 'kg' },
      rows: [[2, 'Tomato', 120], [3, 'Rice', 450], [4, 'Potato', 300], [6, 'Rice', 520], [8, 'Onion', 90]] }
  },
  {
    key: 'clinic',
    left: { table: 'patients', columns: [['id', 'INTEGER'], ['name', 'TEXT'], ['blood', 'TEXT']], roles: { id: 'id', name: 'name', grp: 'blood' },
      rows: [[1, 'Ana', 'A'], [2, 'Bilal', 'O'], [3, 'Chika', 'A'], [4, 'Dmitri', 'B'], [5, 'Esra', 'O']] },
    right: { table: 'appointments', columns: [['patient_id', 'INTEGER'], ['doctor', 'TEXT'], ['minutes', 'INTEGER']], roles: { key: 'patient_id', text: 'doctor', num: 'minutes' },
      rows: [[1, 'Dr. Ito', 15], [2, 'Dr. Ray', 30], [3, 'Dr. Ito', 20], [5, 'Dr. Ray', 45], [6, 'Dr. Kim', 10]] }
  }
];

/** Build the CREATE/INSERT script for a list of table objects. */
export function datasetSQL(tables) {
  const q = v => (v === null ? 'NULL' : typeof v === 'number' ? String(v) : `'${String(v).replace(/'/g, "''")}'`);
  return tables.map(t =>
    `CREATE TABLE ${t.table} (${t.columns.map(([n, ty]) => `${n} ${ty}`).join(', ')});\n` +
    `INSERT INTO ${t.table} VALUES\n` + t.rows.map(r => `(${r.map(q).join(', ')})`).join(',\n') + ';'
  ).join('\n\n');
}

/** Every table by name (so the engine can build a DB for any problem). */
export const ALL_TABLES = (() => {
  const m = {};
  Object.values(DEMO_DATASETS).forEach(t => (m[t.table] = t));
  SINGLE_DATASETS.forEach(t => (m[t.table] = t));
  JOIN_DATASETS.forEach(p => { m[p.left.table] = Object.assign({ pair: p.key }, p.left); m[p.right.table] = Object.assign({ pair: p.key }, p.right); });
  return m;
})();

