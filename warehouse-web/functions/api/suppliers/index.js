import { getUserFromRequest, requireRole, jsonResponse } from '../../_utils/auth.js';

export async function onRequestGet({ request, env }) {
  const user = await getUserFromRequest(request, env);
  if (!user) return jsonResponse({ error: 'กรุณา login' }, 401);
  const { results } = await env.DB.prepare('SELECT * FROM suppliers ORDER BY name').all();
  return jsonResponse({ items: results });
}

// POST /api/suppliers -> Purchase สร้างผู้จัดจำหน่ายใหม่
export async function onRequestPost({ request, env }) {
  const user = await getUserFromRequest(request, env);
  if (!requireRole(user, ['purchase'])) {
    return jsonResponse({ error: 'สิทธิ์ Purchase เท่านั้น' }, 403);
  }
  const { name, contact_name, phone, address } = await request.json();
  if (!name) return jsonResponse({ error: 'ต้องระบุชื่อผู้จัดจำหน่าย' }, 400);
  const result = await env.DB
    .prepare('INSERT INTO suppliers (name, contact_name, phone, address) VALUES (?, ?, ?, ?)')
    .bind(name, contact_name || '', phone || '', address || '')
    .run();
  return jsonResponse({ id: result.meta.last_row_id }, 201);
}
