-- ระบบคลังสินค้า: schema สำหรับ Cloudflare D1 (SQLite)

CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('purchase','inventory','manager')),
  full_name TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE suppliers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  contact_name TEXT,
  phone TEXT,
  address TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE branches (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  address TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE zones (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  branch_id INTEGER NOT NULL REFERENCES branches(id),
  name TEXT NOT NULL,
  description TEXT
);

CREATE TABLE products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sku TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  unit TEXT DEFAULT 'ชิ้น',
  zone_id INTEGER REFERENCES zones(id),
  barcode TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE purchase_orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  po_number TEXT UNIQUE NOT NULL,
  supplier_id INTEGER NOT NULL REFERENCES suppliers(id),
  created_by INTEGER NOT NULL REFERENCES users(id),
  status TEXT NOT NULL DEFAULT 'รอชำระ' CHECK (status IN ('รอชำระ','ชำระแล้ว','ไม่อนุมัติ')),
  total_amount REAL DEFAULT 0,
  note TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE po_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  po_id INTEGER NOT NULL REFERENCES purchase_orders(id),
  product_id INTEGER NOT NULL REFERENCES products(id),
  qty_ordered REAL NOT NULL,
  unit_price REAL NOT NULL,
  qty_received REAL DEFAULT 0
);

CREATE TABLE lots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL REFERENCES products(id),
  branch_id INTEGER NOT NULL REFERENCES branches(id),
  lot_no TEXT NOT NULL,
  qty REAL NOT NULL DEFAULT 0,
  received_date TEXT NOT NULL,
  expiry_date TEXT,
  po_id INTEGER REFERENCES purchase_orders(id),
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL CHECK (type IN ('จ่ายออก','รับคืน')),
  branch_id INTEGER NOT NULL REFERENCES branches(id),
  lot_id INTEGER NOT NULL REFERENCES lots(id),
  qty REAL NOT NULL,
  txn_date TEXT NOT NULL,
  contact_name TEXT,
  contact_phone TEXT,
  created_by INTEGER NOT NULL REFERENCES users(id),
  pdf_key TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_po_status ON purchase_orders(status);
CREATE INDEX idx_lots_expiry ON lots(expiry_date);
CREATE INDEX idx_lots_product ON lots(product_id);
CREATE INDEX idx_txn_branch ON transactions(branch_id);
