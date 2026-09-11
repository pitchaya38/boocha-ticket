import { getUserFromRequest, requireRole, jsonResponse } from '../../_utils/auth.js';

// GET /api/transactions?branch_id=1&type=จ่ายออก
export async function onRequestGet({ request, env }) {
  const user = await getUserFromRequest(request, env);
  if (!user) return jsonResponse({ error: 'กรุณา login' }, 401);

  const url = new URL(request.url);
  const branchId = url.searchParams.get('branch_id');
  const type = url.searchParams.get('type');

  let query = `
    SELECT t.*, l.lot_no, p.name AS product_name, p.sku, b.name AS branch_name
    FROM transactions t
    JOIN lots l ON l.id = t.lot_id
    JOIN products p ON p.id = l.product_id
    JOIN branches b ON b.id = t.branch_id
  `;
  const conditions = [];
  const binds = [];
  if (branchId) { conditions.push('t.branch_id = ?'); binds.push(branchId); }
  if (type) { conditions.push('t.type = ?'); binds.push(type); }
  if (conditions.length) query += ' WHERE ' + conditions.join(' AND ');
  query += ' ORDER BY t.created_at DESC';

  const { results } = await env.DB.prepare(query).bind(...binds).all();
  return jsonResponse({ items: results });
}

// POST /api/transactions -> ทำรายการจ่ายออก/รับคืน
// body: { type: 'จ่ายออก'|'รับคืน', branch_id, lot_id, qty, txn_date, contact_name, contact_phone }
// หมายเหตุ: หน้าบ้านต้อง popup ให้ user กด "ยืนยันทำรายการ" อีกครั้งก่อนยิง request นี้
export async function onRequestPost({ request, env }) {
  const user = await getUserFromRequest(request, env);
  if (!requireRole(user, ['inventory'])) {
    return jsonResponse({ error: 'สิทธิ์ Inventory เท่านั้น' }, 403);
  }

  const body = await request.json();
  const { type, branch_id, lot_id, qty, txn_date, contact_name, contact_phone } = body;

  if (!['จ่ายออก', 'รับคืน'].includes(type) || !branch_id || !lot_id || !qty || !txn_date) {
    return jsonResponse({ error: 'ข้อมูลไม่ครบ (วันที่และ Lot จำเป็นต้องระบุ)' }, 400);
  }

  const lot = await env.DB.prepare('SELECT * FROM lots WHERE id = ?').bind(lot_id).first();
  if (!lot) return jsonResponse({ error: 'ไม่พบ Lot นี้' }, 404);

  if (type === 'จ่ายออก' && lot.qty < qty) {
    return jsonResponse({ error: `ของใน Lot เหลือไม่พอ (เหลือ ${lot.qty})` }, 400);
  }

  const qtyDelta = type === 'จ่ายออก' ? -qty : qty;
  await env.DB.prepare('UPDATE lots SET qty = qty + ? WHERE id = ?').bind(qtyDelta, lot_id).run();

  const result = await env.DB
    .prepare(
      `INSERT INTO transactions (type, branch_id, lot_id, qty, txn_date, contact_name, contact_phone, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(type, branch_id, lot_id, qty, txn_date, contact_name || '', contact_phone || '', user.id)
    .run();

  return jsonResponse({ id: result.meta.last_row_id }, 201);
}
