// ============================================================
// js/ui.js — UI Helpers: Toast, Loading, Navigation
// ============================================================

// ============================================================
// TOAST NOTIFICATIONS (แทน alert())
// ============================================================
const toast = (() => {
  let container;

  function getContainer() {
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      container.style.cssText = `
        position: fixed; top: 20px; right: 20px;
        z-index: 9999; display: flex;
        flex-direction: column; gap: 10px;
        max-width: 360px; pointer-events: none;
      `;
      document.body.appendChild(container);
    }
    return container;
  }

  function show(message, type = 'info', duration = 4000) {
    const icons = {
      success: '✅',
      error:   '❌',
      warning: '⚠️',
      info:    'ℹ️',
      loading: '⏳'
    };
    const colors = {
      success: '#1a7f4b',
      error:   '#c0392b',
      warning: '#d68910',
      info:    '#1a5276',
      loading: '#2471a3'
    };

    const el = document.createElement('div');
    el.style.cssText = `
      background: ${colors[type] || colors.info};
      color: white;
      padding: 14px 18px;
      border-radius: 10px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.25);
      font-family: 'Sarabun', sans-serif;
      font-size: 0.95rem;
      line-height: 1.5;
      pointer-events: all;
      cursor: pointer;
      display: flex;
      align-items: flex-start;
      gap: 10px;
      transform: translateX(120%);
      transition: transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
      max-width: 100%;
      word-break: break-word;
    `;
    el.innerHTML = `<span style="font-size:1.1rem;flex-shrink:0">${icons[type] || icons.info}</span><span>${message}</span>`;
    el.onclick = () => dismiss(el);

    getContainer().appendChild(el);

    // Slide in
    requestAnimationFrame(() => {
      requestAnimationFrame(() => { el.style.transform = 'translateX(0)'; });
    });

    if (type !== 'loading' && duration > 0) {
      setTimeout(() => dismiss(el), duration);
    }
    return el;
  }

  function dismiss(el) {
    el.style.transform = 'translateX(120%)';
    setTimeout(() => el.remove(), 350);
  }

  return {
    success: (msg, ms)  => show(msg, 'success', ms),
    error:   (msg, ms)  => show(msg, 'error', ms),
    warning: (msg, ms)  => show(msg, 'warning', ms),
    info:    (msg, ms)  => show(msg, 'info', ms),
    loading: (msg)      => show(msg, 'loading', 0),
    dismiss
  };
})();

// ============================================================
// LOADING OVERLAY
// ============================================================
const loader = (() => {
  let overlay;

  function show(text = 'กำลังประมวลผล...') {
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'loader-overlay';
      overlay.style.cssText = `
        position: fixed; inset: 0;
        background: rgba(10,20,40,0.55);
        backdrop-filter: blur(3px);
        z-index: 8888;
        display: flex; align-items: center; justify-content: center;
        flex-direction: column; gap: 14px;
        font-family: 'Sarabun', sans-serif;
      `;
      overlay.innerHTML = `
        <div style="width:48px;height:48px;border:4px solid rgba(255,255,255,0.3);border-top-color:#fff;border-radius:50%;animation:spin 0.8s linear infinite"></div>
        <span id="loader-text" style="color:white;font-size:1rem;letter-spacing:0.02em"></span>
        <style>@keyframes spin{to{transform:rotate(360deg)}}</style>
      `;
      document.body.appendChild(overlay);
    }
    document.getElementById('loader-text').textContent = text;
    overlay.style.display = 'flex';
  }

  function hide() {
    if (overlay) overlay.style.display = 'none';
  }

  return { show, hide };
})();

// ============================================================
// SECTION ROUTER — แสดง/ซ่อนหน้าต่าง ๆ
// ============================================================
const router = (() => {
  const sections = [
    'login-section', 'dashboard-section',
    'deputy-list-section', 'director-list-section',
    'teacher-task-section', 'tracking-section',
    'leave-section', 'approve-leave-section', 'stats-section',
    'outperm-section'
  ];

  function showOnly(sectionId) {
    sections.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.classList.toggle('hidden', id !== sectionId);
    });

    // Dashboard navbar ต้องแสดงเสมอเมื่อไม่ใช่ login
    const navbar = document.getElementById('main-navbar');
    if (navbar) navbar.classList.toggle('hidden', sectionId === 'login-section');

    // เลื่อนขึ้นบนสุดทุกครั้งที่เปลี่ยนหน้า
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  return { showOnly };
})();

// ============================================================
// BUTTON STATE — disable ระหว่างโหลด
// ============================================================
function setBtnLoading(btn, loading, originalText) {
  if (loading) {
    btn.disabled = true;
    btn.dataset.originalText = btn.innerHTML;
    btn.innerHTML = `<span class="spinner-border spinner-border-sm me-1" role="status"></span>${originalText || 'กำลังบันทึก...'}`;
  } else {
    btn.disabled = false;
    btn.innerHTML = btn.dataset.originalText || originalText || 'บันทึก';
  }
}

// ============================================================
// STATUS BADGE HELPER
// ============================================================
function statusBadge(status) {
  const map = {
    'มอบหมายแล้ว':        'bg-primary',
    'ดำเนินการแล้ว':       'bg-success',
    'รอดำเนินการ':         'bg-warning text-dark',
    'อนุมัติ':             'bg-success',
    'ไม่อนุมัติ':          'bg-danger',
    'ยกเลิก':              'bg-dark',
    'ยกเลิกแล้ว':          'bg-dark',
    'รอตรวจสอบ':           'bg-secondary',
    'รอความเห็นรองฯ':      'bg-warning text-dark',
    'รออนุมัติ':           'bg-warning text-dark',
    'รอรอง ผอ. พิจารณา':   'bg-warning text-dark',
    'รอ ผอ. สั่งการ':      'bg-orange text-dark'
  };
  const cls = map[status] || 'bg-secondary';
  return `<span class="badge ${cls}">${status}</span>`;
}

// ============================================================
// FILE LINKS RENDERER
// ============================================================
function renderFileLinks(fileUrls, compact = false) {
  if (!fileUrls) return '<span class="text-muted small">-</span>';

  // รับได้ทั้ง Array และ String คั่นด้วย comma
  const urls = Array.isArray(fileUrls)
    ? fileUrls
    : fileUrls.split(',').map(u => u.trim()).filter(Boolean);

  if (urls.length === 0) return '<span class="text-muted small">-</span>';

  return urls.map((url, i) => `
    <a href="${url}" target="_blank" rel="noopener"
       class="btn btn-sm btn-outline-primary ${compact ? 'd-inline-block mb-1 me-1' : 'd-block mb-1'}"
       style="font-size:0.8rem">
      <i class="bi bi-file-earmark-arrow-down-fill"></i> ไฟล์ ${i + 1}
    </a>
  `).join('');
}

// ============================================================
// CONFIRM DIALOG (async-friendly)
// ============================================================
function confirmDialog(message) {
  return new Promise(resolve => {
    // ใช้ Bootstrap Modal แทน confirm() แบบ native
    const id = 'confirm-modal-' + Date.now();
    const html = `
      <div class="modal fade" id="${id}" tabindex="-1" data-bs-backdrop="static">
        <div class="modal-dialog modal-dialog-centered">
          <div class="modal-content">
            <div class="modal-body p-4 text-center">
              <div style="font-size:2rem">⚠️</div>
              <p class="mt-2 mb-4" style="font-family:'Sarabun',sans-serif">${message}</p>
              <button class="btn btn-outline-secondary me-2" id="${id}-cancel">ยกเลิก</button>
              <button class="btn btn-danger" id="${id}-ok">ยืนยัน</button>
            </div>
          </div>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', html);
    const modal = new bootstrap.Modal(document.getElementById(id));
    modal.show();

    document.getElementById(`${id}-ok`).onclick = () => { modal.hide(); resolve(true); };
    document.getElementById(`${id}-cancel`).onclick = () => { modal.hide(); resolve(false); };

    document.getElementById(id).addEventListener('hidden.bs.modal', () => {
      document.getElementById(id)?.remove();
    });
  });
}

// ============================================================
// GLOBAL ALIASES — ให้ไฟล์อื่นเรียกใช้ได้สะดวก
// ============================================================
const showLoading = (text) => loader.show(text);
const hideLoading = ()     => loader.hide();
