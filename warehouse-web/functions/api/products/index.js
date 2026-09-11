import { getUserFromRequest, requireRole, jsonResponse } from '../../_utils/auth.js';

// GET /api/products?zone_id=1&barcode=xxxx (barcode ใช้ตอนสแกน)
export async function onRequestGet({ request, env }) {
  const user = await getUserFromRequest(request, env);
  if (!user) return jsonResponse({ error: 'กรุณา login' }, 401);
  const url = new URL(request.url);
  const zoneId = url.searchParams.get('zone_id');
  const barcode = url.searchParams.get('barcode');

  let query = 'SELECT * FROM products';
  const conditions = [];
  const binds = [];
  if (zoneId) { conditions.push('zone_id = ?'); binds.push(zoneId); }
  if (barcode) { conditions.push('barcode = ?'); binds.push(barcode); }
  if (conditions.length) query += ' WHERE ' + conditions.join(' AND ');

  const { results } = await env.DB.prepare(query).bind(...binds).all();
  return jsonResponse({ items: results });
}

// POST /api/products -> สร้างสินค้าใหม่ + กำหนด zone และ barcode (Inventory)
export async function onRequestPost({ request, env }) {
  const user = await getUserFromRequest(request, env);
  if (!requireRole(user, ['inventory'])) {
    return jsonResponse({ error: 'สิทธิ์ Inventory เท่านั้น' }, 403);
  }
  const { sku, name, unit, zone_id, barcode } = await request.json();
  if (!sku || !name) return jsonResponse({ error: 'ข้อมูลไม่ครบ' }, 400);
  const result = await env.DB
    .prepare('INSERT INTO products (sku, name, unit, zone_id, barcode) VALUES (?, ?, ?, ?, ?)')
    .bind(sku, name, unit || 'ชิ้น', zone_id || null, barcode || null)
    .run();
  return jsonResponse({ id: result.meta.last_row_id }, 201);
}
