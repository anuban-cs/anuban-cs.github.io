// ============================================================
// js/auth.js — Authentication & Session Management
// ============================================================

const auth = (() => {

  // ============================================================
  // SESSION (localStorage)
  // ============================================================
  function saveSession(user, token) {
    const session = {
      user,
      token,
      expiresAt: Date.now() + (APP_CONFIG.SESSION_TIMEOUT_HOURS * 3600 * 1000)
    };
    localStorage.setItem(APP_CONFIG.SESSION_KEY, JSON.stringify(session));
  }

  function getSession() {
    try {
      const raw = localStorage.getItem(APP_CONFIG.SESSION_KEY);
      if (!raw) return null;
      const session = JSON.parse(raw);
      if (Date.now() > session.expiresAt) {
        clearSession();
        return null;
      }
      return session;
    } catch { return null; }
  }

  function clearSession() {
    localStorage.removeItem(APP_CONFIG.SESSION_KEY);
  }

  function getUser() {
    return getSession()?.user || null;
  }

  // ============================================================
  // LOGIN HANDLER
  // ============================================================
  async function handleLogin(e) {
    e.preventDefault();
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    const btn      = document.getElementById('btn-login');
    const alert    = document.getElementById('login-alert');

    if (!username || !password) {
      showLoginError('กรุณากรอกชื่อผู้ใช้งานและรหัสผ่าน');
      return;
    }

    alert.classList.add('hidden');
    setBtnLoading(btn, true, 'กำลังตรวจสอบ...');

    const res = await api.call('checkLogin', { username, password });

    setBtnLoading(btn, false);

    if (res.status === 'success') {
      saveSession(res.user, res.sessionToken);
      toast.success(`ยินดีต้อนรับ ${res.user.name} 👋`);
      app.showDashboard(res.user);
    } else {
      showLoginError(res.message || 'เข้าสู่ระบบไม่สำเร็จ');
    }
  }

  function showLoginError(msg) {
    const el = document.getElementById('login-alert');
    el.textContent = msg;
    el.classList.remove('hidden');
  }

  // ============================================================
  // LOGOUT
  // ============================================================
  async function logout(sessionExpired = false) {
    clearSession();
    if (sessionExpired) {
      toast.warning('Session หมดอายุ กรุณาเข้าสู่ระบบใหม่');
    } else {
      toast.info('ออกจากระบบเรียบร้อยแล้ว');
    }
    // รอ toast แสดงก่อนแล้วค่อย reload
    setTimeout(() => {
      router.showOnly('login-section');
      document.getElementById('loginForm').reset();
      document.getElementById('login-alert').classList.add('hidden');
    }, 600);
  }

  // ============================================================
  // AUTO-LOGIN จาก session ที่ยังไม่หมดอายุ
  // ============================================================
  function checkAutoLogin() {
    const session = getSession();
    if (session?.user) {
      app.showDashboard(session.user);
      return true;
    }
    return false;
  }

  return { handleLogin, logout, getSession, getUser, checkAutoLogin };
})();
