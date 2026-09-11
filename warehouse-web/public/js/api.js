// เก็บ token ไว้ใน localStorage หลัง login
function getToken() {
  return localStorage.getItem('token') || sessionStorage.getItem('token');
}

function getUser() {
  const raw = localStorage.getItem('user') || sessionStorage.getItem('user');
  return raw ? JSON.parse(raw) : null;
}

function requireLogin() {
  if (!getToken()) window.location.href = '/index.html';
}

async function api(path, options = {}) {
  const res = await fetch('/api' + path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + getToken(),
      ...(options.headers || {}),
    },
  });
  if (res.status === 401) {
    localStorage.removeItem('token');
    window.location.href = '/index.html';
    return null;
  }
  const contentType = res.headers.get('Content-Type') || '';
  if (contentType.includes('application/json')) {
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'เกิดข้อผิดพลาด');
    return data;
  }
  return res; // เช่นกรณี PDF ที่ไม่ใช่ JSON
}

function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  sessionStorage.removeItem('token');
  sessionStorage.removeItem('user');
  window.location.href = '/index.html';
}
