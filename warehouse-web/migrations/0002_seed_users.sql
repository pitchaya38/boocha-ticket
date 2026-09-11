-- user ตัวอย่างไว้ทดสอบระบบ (username / password)
-- purchase1  / purchase123
-- inventory1 / inventory123
-- manager1   / manager123
-- แนะนำให้เปลี่ยนรหัสผ่านจริงทีหลัง (ขอ hash ใหม่ได้ตลอด)

INSERT INTO users (username, password_hash, role, full_name) VALUES
('purchase1', '4747443f7b0863d63c33a567bd84ebc73495aed21f4d81db502b7a04cb5c1df8', 'purchase', 'ฝ่ายจัดซื้อ'),
('inventory1', 'cd63ef271f9f5c81c3ac9e24e544f7e982360ebc027bf4e6b6960485b13f89e7', 'inventory', 'ฝ่ายคลัง'),
('manager1', '866485796cfa8d7c0cf7111640205b83076433547577511d81f8030ae99ecea5', 'manager', 'ผู้จัดการ');
