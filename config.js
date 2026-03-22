// ============================================================
// config.js — ตั้งค่า URL ของ Google Apps Script Web App
// ============================================================
// วิธีหา GAS_URL:
//   1. เปิด Google Apps Script Editor
//   2. Deploy → Manage deployments → คัดลอก Web App URL
//   3. วางตรง GAS_URL ด้านล่าง (แทนที่ YOUR_DEPLOYMENT_ID)
// ============================================================

const APP_CONFIG = {
  GAS_URL: 'https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec',
  APP_NAME: 'ระบบสารบรรณอิเล็กทรอนิกส์',
  SCHOOL_NAME: 'โรงเรียนอนุบาลชุมแสง (วัดทับกฤชกลาง)',
  SESSION_KEY: 'esaraban_session',
  SESSION_TIMEOUT_HOURS: 8
};
