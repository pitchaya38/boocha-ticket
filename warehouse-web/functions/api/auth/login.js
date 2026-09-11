import { verifyPassword, createToken, jsonResponse } from '../../_utils/auth.js';

export async function onRequestPost({ request, env }) {
  const { username, password } = await request.json();
  if (!username || !password) {
    return jsonResponse({ error: 'กรอก username และ password ให้ครบ' }, 400);
  }

  const user = await env.DB
    .prepare('SELECT * FROM users WHERE username = ?')
    .bind(username)
    .first();

  if (!user || !(await verifyPassword(password, user.password_hash))) {
    return jsonResponse({ error: 'username หรือ password ไม่ถูกต้อง' }, 401);
  }

  const token = await createToken(env, user);
  return jsonResponse({
    token,
    user: { id: user.id, username: user.username, role: user.role, full_name: user.full_name },
  });
}
