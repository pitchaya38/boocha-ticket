import { getUserFromRequest, requireRole, jsonResponse } from '../../_utils/auth.js';

// GET /api/zones?branch_id=1
export async function onRequestGet({ request, env }) {
  const user = await getUserFromRequest(request, env);
  if (!user) return jsonResponse({ error: 'กรุณา login' }, 401);
  const url = new URL(request.url);
  const branchId = url.searchParams.get('branch_id');
  let query = 'SELECT * FROM zones';
  const binds = [];
  if (branchId) {
    query += ' WHERE branch_id = ?';
    binds.push(branchId);
  }
  const { results } = await env.DB.prepare(query).bind(...binds).all();
  return jsonResponse({ items: results });
}

// POST /api/zones -> สร้าง zone ใหม่ในสาขา (Inventory)
export async function onRequestPost({ request, env }) {
  const user = await getUserFromRequest(request, env);
  if (!requireRole(user, ['inventory'])) {
    return jsonResponse({ error: 'สิทธิ์ Inventory เท่านั้น' }, 403);
  }
  const { branch_id, name, description } = await request.json();
  if (!branch_id || !name) return jsonResponse({ error: 'ข้อมูลไม่ครบ' }, 400);
  const result = await env.DB
    .prepare('INSERT INTO zones (branch_id, name, description) VALUES (?, ?, ?)')
    .bind(branch_id, name, description || '')
    .run();
  return jsonResponse({ id: result.meta.last_row_id }, 201);
}
