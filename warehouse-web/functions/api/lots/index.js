import { getUserFromRequest, jsonResponse } from '../../_utils/auth.js';

// GET /api/lots?branch_id=1&near_expiry_days=30&product_id=5
export async function onRequestGet({ request, env }) {
  const user = await getUserFromRequest(request, env);
  if (!user) return jsonResponse({ error: 'กรุณา login' }, 401);

  const url = new URL(request.url);
  const branchId = url.searchParams.get('branch_id');
  const productId = url.searchParams.get('product_id');
  const nearExpiryDays = url.searchParams.get('near_expiry_days'); // เช่น 30

  let query = `
    SELECT l.*, p.name AS product_name, p.sku, p.unit, b.name AS branch_name
    FROM lots l
    JOIN products p ON p.id = l.product_id
    JOIN branches b ON b.id = l.branch_id
  `;
  const conditions = [];
  const binds = [];

  if (branchId) { conditions.push('l.branch_id = ?'); binds.push(branchId); }
  if (productId) { conditions.push('l.product_id = ?'); binds.push(productId); }
  if (nearExpiryDays) {
    conditions.push(`l.expiry_date IS NOT NULL AND date(l.expiry_date) <= date('now', '+' || ? || ' days')`);
    binds.push(nearExpiryDays);
  }
  if (conditions.length) query += ' WHERE ' + conditions.join(' AND ');
  query += ' ORDER BY l.expiry_date ASC';

  const { results } = await env.DB.prepare(query).bind(...binds).all();
  return jsonResponse({ items: results });
}
