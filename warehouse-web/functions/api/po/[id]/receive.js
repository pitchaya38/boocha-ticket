import { getUserFromRequest, requireRole, jsonResponse } from '../../../_utils/auth.js';

// POST /api/po/:id/receive
// body: { branch_id, items: [{ po_item_id, product_id, qty_received, lot_no, received_date, expiry_date }] }
export async function onRequestPost({ request, env, params }) {
  const user = await getUserFromRequest(request, env);
  if (!requireRole(user, ['inventory'])) {
    return jsonResponse({ error: 'สิทธิ์ Inventory เท่านั้น' }, 403);
  }

  const body = await request.json();
  if (!body.branch_id || !Array.isArray(body.items) || body.items.length === 0) {
    return jsonResponse({ error: 'ข้อมูลไม่ครบ' }, 400);
  }

  const po = await env.DB.prepare('SELECT status FROM purchase_orders WHERE id = ?').bind(params.id).first();
  if (!po) return jsonResponse({ error: 'ไม่พบใบ PO' }, 404);
  if (po.status !== 'ชำระแล้ว') {
    return jsonResponse({ error: 'ตรวจรับได้เฉพาะ PO ที่สถานะชำระแล้ว' }, 400);
  }

  const statements = [];
  for (const it of body.items) {
    statements.push(
      env.DB.prepare(`UPDATE po_items SET qty_received = qty_received + ? WHERE id = ?`)
        .bind(it.qty_received, it.po_item_id)
    );
    statements.push(
      env.DB.prepare(
        `INSERT INTO lots (product_id, branch_id, lot_no, qty, received_date, expiry_date, po_id)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      ).bind(it.product_id, body.branch_id, it.lot_no, it.qty_received, it.received_date, it.expiry_date || null, params.id)
    );
  }
  await env.DB.batch(statements);

  return jsonResponse({ ok: true });
}
