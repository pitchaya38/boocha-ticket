import { getUserFromRequest, requireRole, jsonResponse } from '../../_utils/auth.js';

// GET /api/po?status=รอชำระ  -> list ใบ PO (ทุก role ดูได้ เพื่อให้ manager เห็นด้วย)
export async function onRequestGet({ request, env }) {
  const user = await getUserFromRequest(request, env);
  if (!user) return jsonResponse({ error: 'กรุณา login' }, 401);

  const url = new URL(request.url);
  const status = url.searchParams.get('status');

  let query = `
    SELECT po.*, s.name AS supplier_name, u.full_name AS created_by_name
    FROM purchase_orders po
    JOIN suppliers s ON s.id = po.supplier_id
    JOIN users u ON u.id = po.created_by
  `;
  const binds = [];
  if (status) {
    query += ' WHERE po.status = ?';
    binds.push(status);
  }
  query += ' ORDER BY po.created_at DESC';

  const { results } = await env.DB.prepare(query).bind(...binds).all();
  return jsonResponse({ items: results });
}

// POST /api/po  -> สร้างใบ PO ใหม่ (Purchase เท่านั้น)
// body: { supplier_id, note, items: [{ product_id, qty_ordered, unit_price }] }
export async function onRequestPost({ request, env }) {
  const user = await getUserFromRequest(request, env);
  if (!requireRole(user, ['purchase'])) {
    return jsonResponse({ error: 'สิทธิ์ Purchase เท่านั้น' }, 403);
  }

  const body = await request.json();
  if (!body.supplier_id || !Array.isArray(body.items) || body.items.length === 0) {
    return jsonResponse({ error: 'ข้อมูลไม่ครบ ต้องมี supplier และรายการสินค้าอย่างน้อย 1 รายการ' }, 400);
  }

  const poNumber = 'PO' + Date.now();
  const totalAmount = body.items.reduce((sum, it) => sum + it.qty_ordered * it.unit_price, 0);

  const poResult = await env.DB
    .prepare(
      `INSERT INTO purchase_orders (po_number, supplier_id, created_by, status, total_amount, note)
       VALUES (?, ?, ?, 'รอชำระ', ?, ?)`
    )
    .bind(poNumber, body.supplier_id, user.id, totalAmount, body.note || '')
    .run();

  const poId = poResult.meta.last_row_id;

  const insertItem = env.DB.prepare(
    `INSERT INTO po_items (po_id, product_id, qty_ordered, unit_price) VALUES (?, ?, ?, ?)`
  );
  const batch = body.items.map(it => insertItem.bind(poId, it.product_id, it.qty_ordered, it.unit_price));
  await env.DB.batch(batch);

  return jsonResponse({ id: poId, po_number: poNumber }, 201);
}
