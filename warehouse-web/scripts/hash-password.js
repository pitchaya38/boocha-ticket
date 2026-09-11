// วิธีใช้: node scripts/hash-password.js "รหัสผ่านที่ต้องการ"
// ได้ hash แบบเดียวกับที่ระบบใช้ตอน login (SHA-256) เอาไปใส่ตอน insert user เริ่มต้น
import crypto from 'crypto';

const password = process.argv[2];
if (!password) {
  console.error('ใช้งาน: node scripts/hash-password.js "รหัสผ่าน"');
  process.exit(1);
}

const hash = crypto.createHash('sha256').update(password).digest('hex');
console.log(hash);
