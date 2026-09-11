import { SignJWT, jwtVerify } from 'jose';

function getSecretKey(env) {
  return new TextEncoder().encode(env.JWT_SECRET);
}

// สร้าง token อายุ 8 ชั่วโมง
export async function createToken(env, user) {
  return await new SignJWT({ id: user.id, username: user.username, role: user.role })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('8h')
    .sign(getSecretKey(env));
}

export async function verifyToken(env, token) {
  try {
    const { payload } = await jwtVerify(token, getSecretKey(env));
    return payload;
  } catch {
    return null;
  }
}

// ดึง user จาก request (อ่าน Authorization: Bearer <token>)
export async function getUserFromRequest(request, env) {
  const authHeader = request.headers.get('Authorization') || '';
  const token = authHeader.replace('Bearer ', '');
  if (!token) return null;
  return await verifyToken(env, token);
}

// เช็คว่า role ที่ login อยู่ อยู่ใน allowed list ไหม ใช้คุมสิทธิ์แต่ละ endpoint
export function requireRole(user, allowedRoles) {
  return user && allowedRoles.includes(user.role);
}

// hash password ง่ายๆ ด้วย SHA-256 (ใช้ Web Crypto ที่มีอยู่แล้วใน Workers runtime)
export async function hashPassword(password) {
  const data = new TextEncoder().encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(hashBuffer)].map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function verifyPassword(password, hash) {
  const computed = await hashPassword(password);
  return computed === hash;
}

export function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
