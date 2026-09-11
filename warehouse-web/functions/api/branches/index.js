import { getUserFromRequest, requireRole, jsonResponse } from '../../_utils/auth.js';

export async function onRequestGet({ request, env }) {
  const user = await getUserFromRequest(request, env);
  if (!user) return jsonResponse({ error: 'กรุณา login' }, 401);
  const { results } = await env.DB.prepare('SELECT * FROM branches ORDER BY name').all();
  return jsonResponse({ items: results });
}

// POST /api/branches -> สร้างสาขาใหม่ (Inventory)
export async function onRequestPost({ request, env }) {
  const user = await getUserFromRequest(request, env);
  if (!requireRole(user, ['inventory', 'manager'])) {
    return jsonResponse({ error: 'สิทธิ์ Inventory เท่านั้น' }, 403);
  }
  const { name, address } = await request.json();
  if (!name) return jsonResponse({ error: 'ต้องระบุชื่อสาขา' }, 400);
  const result = await env.DB.prepare('INSERT INTO branches (name, address) VALUES (?, ?)').bind(name, address || '').run();
  return jsonResponse({ id: result.meta.last_row_id }, 201);
}
