import { getUserFromRequest, requireRole, jsonResponse } from '../../_utils/auth.js';

// GET /api/po/:id -> รายละเอียดใบ PO พร้อมรายการสินค้า
export async function onRequestGet({ request, env, params }) {
  const user = await getUserFromRequest(request, env);
  if (!user) return jsonResponse({ error: 'กรุณา login' }, 401);

  const po = await env.DB
    .prepare(
      `SELECT po.*, s.name AS supplier_name, s.contact_name, s.phone AS supplier_phone
       FROM purchase_orders po JOIN suppliers s ON s.id = po.supplier_id
       WHERE po.id = ?`
    )
    .bind(params.id)
    .first();

  if (!po) return jsonResponse({ error: 'ไม่พบใบ PO' }, 404);

  const { results: items } = await env.DB
    .prepare(
      `SELECT pi.*, p.name AS product_name, p.sku, p.unit
       FROM po_items pi JOIN products p ON p.id = pi.product_id
       WHERE pi.po_id = ?`
    )
    .bind(params.id)
    .all();

  return jsonResponse({ ...po, items });
}

// PATCH /api/po/:id -> อัพเดทสถานะ (Purchase กดเองตามที่ตกลงกันไว้)
// body: { status: 'ชำระแล้ว' | 'ไม่อนุมัติ' }
export async function onRequestPatch({ request, env, params }) {
  const user = await getUserFromRequest(request, env);
  if (!requireRole(user, ['purchase', 'manager'])) {
    return jsonResponse({ error: 'สิทธิ์ Purchase หรือ Manager เท่านั้น' }, 403);
  }

  const { status } = await request.json();
  if (!['รอชำระ', 'ชำระแล้ว', 'ไม่อนุมัติ'].includes(status)) {
    return jsonResponse({ error: 'สถานะไม่ถูกต้อง' }, 400);
  }

  await env.DB
    .prepare(`UPDATE purchase_orders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`)
    .bind(status, params.id)
    .run();

  return jsonResponse({ ok: true, status });
}
