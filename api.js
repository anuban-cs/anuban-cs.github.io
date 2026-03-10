// ============================================================
// js/api.js — HTTP API wrapper (แทน google.script.run)
// ทุกการเรียก Backend ผ่านฟังก์ชัน api.call() เท่านั้น
// ============================================================

const api = (() => {

  // ดึง session จาก localStorage
  function getSession() {
    try {
      const raw = localStorage.getItem(APP_CONFIG.SESSION_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  }

  // ส่ง request ไป GAS
  async function call(action, params = {}) {
    const session = getSession();

    const body = {
      action,
      ...params,
      // แนบ session token ทุก request (ยกเว้น checkLogin)
      ...(session && action !== 'checkLogin' ? {
        sessionToken: session.token,
        userId: session.user.id
      } : {})
    };

    try {
      const response = await fetch(APP_CONFIG.GAS_URL, {
        method: 'POST',
        // GAS ต้องการ text/plain เพื่อหลีก CORS preflight
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      // ถ้า session หมดอายุ ให้ logout
      if (data.status === 'error' && data.message?.includes('Session หมดอายุ')) {
        auth.logout(true);
        return data;
      }

      return data;

    } catch (err) {
      console.error(`API Error [${action}]:`, err);
      return {
        status: 'error',
        message: 'ไม่สามารถเชื่อมต่อ Server ได้ กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ต'
      };
    }
  }

  // ฟังก์ชันช่วยอ่านไฟล์เป็น Base64
  function readFileAsBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve({
        name: file.name,
        type: file.type,
        content: e.target.result.split(',')[1]
      });
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  // อ่านหลายไฟล์พร้อมกัน
  async function readFiles(fileInput) {
    const files = Array.from(fileInput.files || []);
    if (files.length === 0) return [];
    return Promise.all(files.map(readFileAsBase64));
  }

  return { call, readFiles };
})();
