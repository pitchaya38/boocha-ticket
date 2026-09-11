# ระบบคลังสินค้า (Web) - Cloudflare Pages + D1 + R2

โครง: static frontend (`public/`) + Cloudflare Pages Functions เป็น backend API (`functions/`)
DB: Cloudflare D1 (SQLite) / เก็บไฟล์ PDF ไว้บน R2 ถ้าต้องการ (ตอนนี้โค้ด PDF สร้างแบบ stream กลับตรงๆ ยังไม่ได้อัพขึ้น R2 - เพิ่มได้ทีหลังถ้าต้องการเก็บไฟล์ย้อนหลัง)

## 1) ติดตั้ง

```bash
npm install
npm install -g wrangler   # ถ้ายังไม่มี
wrangler login
```

## 2) สร้าง D1 database

```bash
wrangler d1 create warehouse-db
```

คัดลอก `database_id` ที่ได้ ไปแปะใน `wrangler.toml` (ตรง `database_id = "..."`)

## 3) รัน migration (สร้างตาราง)

```bash
npm run db:migrate:local     # ใช้ตอน dev เครื่องตัวเอง
npm run db:migrate:remote    # ใช้ตอน deploy จริงขึ้น Cloudflare
```

## 4) สร้าง R2 bucket (สำหรับเก็บ PDF ย้อนหลัง ถ้าต้องการ)

```bash
wrangler r2 bucket create warehouse-pdfs
```

## 5) ตั้งค่า secret

แก้ `JWT_SECRET` ใน `wrangler.toml` เป็นข้อความสุ่มยาวๆ (ห้ามใช้ค่าตัวอย่าง)

## 6) สร้าง user แรก (เพราะระบบยังไม่มีหน้าสมัครสมาชิก)

```bash
node scripts/hash-password.js "password ที่ต้องการ"
# เอา hash ที่ได้ไป insert ผ่าน wrangler d1 execute:

wrangler d1 execute warehouse-db --remote --command \
  "INSERT INTO users (username, password_hash, role, full_name) VALUES ('purchase1', '<hash ที่ได้>', 'purchase', 'ตาล ฝ่ายจัดซื้อ')"
```

ทำซ้ำสำหรับ role `inventory` และ `manager`

## 7) รันทดสอบในเครื่อง

```bash
npm run dev
```

## 8) Deploy ขึ้น Cloudflare Pages

```bash
npm run deploy
```

หรือเชื่อม repo กับ Cloudflare Pages dashboard แล้วตั้ง build command ว่างไว้ (เป็น static + Functions), output directory เป็น `public`

## หมายเหตุสำคัญที่ต้องทำต่อ

- **ฟอนต์ไทยใน PDF**: `pdf-lib` ไม่มีฟอนต์ไทยในตัว ตอนนี้ไฟล์ PDF ใช้ Helvetica (อังกฤษ/ตัวเลข) ไปก่อน ถ้าต้องการภาษาไทยในไฟล์ ต้อง embed ฟอนต์ `.ttf` (เช่น Sarabun) ผ่าน `doc.embedFont(fontBytes, { subset: true })` แล้วโหลดไฟล์ฟอนต์เป็น asset ไว้ใน `functions/_utils/fonts/`
- **สร้างสินค้า/บาร์โค้ด**: ตอนนี้มี endpoint `POST /api/products` ให้ inventory สร้างสินค้า+ผูก barcode เอง ยังไม่มีหน้า UI สร้างสินค้าโดยเฉพาะ (ใช้ผ่าน API ไปก่อน หรือแจ้งได้ถ้าจะให้เพิ่มหน้า)
- **role manager**: ตอนนี้ manager เข้าดู PO ทุกสถานะได้ (`manager.html`) และสามารถกด "ไม่อนุมัติ" ได้เหมือน purchase (ตาม backend `[id].js`) แต่ปุ่มนี้ยังไม่โชว์ในหน้า manager.html ถ้าต้องการให้ manager กดจากหน้านั้นได้เลย บอกได้ เดี๋ยวเพิ่มปุ่มให้
- **สแกนบาร์โค้ด**: ใช้ library `html5-qrcode` (รองรับทั้ง QR และบาร์โค้ด 1D อยู่แล้วในตัว) ทำงานผ่านกล้องมือถือ/เว็บแคม ต้องเปิดผ่าน HTTPS ถึงจะขอสิทธิ์กล้องได้ (Cloudflare Pages เป็น HTTPS อยู่แล้วไม่มีปัญหา)
