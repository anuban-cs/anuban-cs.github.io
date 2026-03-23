// ============================================================
// js/app.js — Main Application Controller
// ============================================================

const app = (() => {

  // ============================================================
  // DASHBOARD & MENU
  // ============================================================
  function showDashboard(user) {
    router.showOnly('dashboard-section');
    document.getElementById('nav-user-info').textContent  = user.name;
    document.getElementById('user-fullname').textContent  = user.name;
    document.getElementById('user-position').textContent  = user.position;
    document.getElementById('user-role').textContent      = `สิทธิ์: ${user.role}`;
    document.getElementById('user-id').textContent        = `ID: ${user.id}`;
    generateMenuByRole(user.role);
  }

  function generateMenuByRole(role) {
    const menus = {
      Admin: [
        { title: 'ลงทะเบียนรับหนังสือ', sub: 'บันทึกหนังสือเข้าใหม่',          color: 'success',   icon: 'bi-envelope-plus-fill',   fn: 'docs.openRegisterModal()' },
        { title: 'ติดตามสถานะ',          sub: 'ดูรายการหนังสือทั้งหมด',          color: 'secondary', icon: 'bi-search',                fn: 'docs.loadTracking()' },
        { title: 'ตรวจสอบใบลา',          sub: 'ตรวจสอบความถูกต้องก่อนเสนอ',     color: 'warning',   icon: 'bi-clipboard-check-fill',  fn: "leaves.loadLeaveApprovals('Admin')" },
        { title: 'ขออนุญาตออกนอกโรงเรียน', sub: 'บันทึกคำขอออกนอกสถานที่',     color: 'info',      icon: 'bi-door-open-fill',        fn: 'outperm.openSubmitModal()' },
        { title: 'ตั้งค่ารักษาการ ผอ.',  sub: 'กำหนดผู้รักษาการแต่ละวัน',       color: 'dark',      icon: 'bi-person-badge-fill',     fn: 'acting.openModal()' }
      ],
      Deputy: [
        { title: 'พิจารณาหนังสือ', sub: 'หนังสือรอความเห็นจากท่าน',  color: 'warning', icon: 'bi-file-earmark-text-fill', fn: 'docs.loadDeputyDocs()' },
        { title: 'พิจารณาใบลา',   sub: 'ใบลาที่รอความเห็น',          color: 'info',    icon: 'bi-calendar-check-fill',   fn: "leaves.loadLeaveApprovals('Deputy')" },
        { title: 'ขออนุญาตออกนอกโรงเรียน', sub: 'บันทึกคำขอออกนอกสถานที่', color: 'success', icon: 'bi-door-open-fill', fn: 'outperm.openSubmitModal()' }
      ],
      Director: [
        { title: 'สั่งการ/เกษียนหนังสือ', sub: 'หนังสือรอสั่งการ',           color: 'danger',  icon: 'bi-megaphone-fill',       fn: 'docs.loadDirectorDocs()' },
        { title: 'ติดตามสถานะ',           sub: 'ตรวจสอบความคืบหน้างาน',     color: 'info',    icon: 'bi-bar-chart-steps',      fn: 'docs.loadTracking()' },
        { title: 'อนุมัติใบลา',           sub: 'รายการใบลาคงค้าง',           color: 'primary', icon: 'bi-person-check-fill',    fn: "leaves.loadLeaveApprovals('Director')" },
        { title: 'สถิติการลา',            sub: 'ดูภาพรวมวันลาทั้งโรงเรียน', color: 'dark',    icon: 'bi-graph-up',             fn: 'leaves.openStatsSystem()' },
        { title: 'อนุมัติออกนอกโรงเรียน', sub: 'รายการขออนุญาตคงค้าง',      color: 'warning', icon: 'bi-door-open-fill',       fn: 'outperm.loadApprovals()' },
        { title: 'ตั้งค่ารักษาการ ผอ.',   sub: 'กำหนดผู้รักษาการแต่ละวัน',  color: 'secondary',icon: 'bi-person-badge-fill',   fn: 'acting.openModal()' },
        { title: 'งานวิจัยในชั้นเรียน',   sub: 'ดูและจัดการงานวิจัยทั้งหมด', color: 'info',   icon: 'bi-journal-bookmark-fill', fn: "window.open('research.html','_blank')" }
      ],
      AcademicHead: [
        { title: 'รายการการลา',   sub: 'ดูการลาเพื่อจัดตารางสอนแทน', color: 'primary', icon: 'bi-calendar2-week-fill', fn: 'outperm.loadLeaveStats()' },
        { title: 'ขออนุญาตออกนอกโรงเรียน', sub: 'บันทึกคำขอออกนอกสถานที่', color: 'info', icon: 'bi-door-open-fill', fn: 'outperm.openSubmitModal()' }
      ],
      PersonnelHead: [
        { title: 'Dashboard สถิติการลา', sub: 'ภาพรวมวันลาครูทุกคน',      color: 'danger',  icon: 'bi-graph-up-arrow',      fn: 'outperm.loadPersonnelDashboard()' },
        { title: 'รายการการลา',          sub: 'บันทึกสถิติวันลา',          color: 'primary', icon: 'bi-calendar2-week-fill', fn: 'outperm.loadLeaveStats()' },
        { title: 'ขออนุญาตออกนอกโรงเรียน', sub: 'บันทึกคำขอออกนอกสถานที่', color: 'info',  icon: 'bi-door-open-fill',      fn: 'outperm.openSubmitModal()' }
      ]
    };

    const commonMenus = [
      { title: 'ระบบการลา',              sub: 'ขอลาป่วย/ลากิจ/ตรวจสอบสถิติ', color: 'success', icon: 'bi-calendar2-check-fill', fn: 'leaves.openLeaveSystem()' },
      { title: 'งานที่ได้รับมอบหมาย',    sub: 'ตรวจสอบและรายงานผล',           color: 'primary', icon: 'bi-person-workspace',     fn: 'docs.loadMyTasks()' },
      { title: 'ขออนุญาตออกนอกโรงเรียน', sub: 'บันทึกคำขอออกนอกสถานที่',     color: 'info',    icon: 'bi-door-open-fill',       fn: 'outperm.openSubmitModal()' },
      { title: 'ส่งงานวิจัยในชั้นเรียน', sub: 'อัปโหลดและติดตามงานวิจัย',    color: 'warning', icon: 'bi-journal-bookmark-fill', fn: "window.open('research.html','_blank')" }
    ];

    // Teacher ใช้ commonMenus เท่านั้น, Role อื่นๆ ใช้ roleMenus + commonMenus (ไม่ซ้ำ)
    let allMenus;
    if (role === 'Teacher') {
      allMenus = commonMenus;
    } else {
      const roleMenus = menus[role] || [];
      const roleFns = new Set(roleMenus.map(m => m.fn));
      const filtered = commonMenus.filter(m => !roleFns.has(m.fn));
      allMenus = [...roleMenus, ...filtered];
    }

    // เพิ่มเมนูโปรไฟล์ให้ทุก Role เสมอ (วางท้ายสุด)
    const profileMenu = {
      title: 'ข้อมูลส่วนตัว', sub: 'แก้ไขชื่อ ตำแหน่ง รหัสผ่าน LINE ID',
      color: 'secondary', icon: 'bi-person-circle',
      fn: 'profile.openProfile()'
    };
    allMenus = [...allMenus, profileMenu];

    document.getElementById('menu-area').innerHTML = allMenus.map(m => `
      <div class="col-md-4 mb-3">
        <div class="card h-100 text-center border-${m.color} border-2 shadow-sm menu-card">
          <div class="card-body py-4">
            <i class="bi ${m.icon} fs-1 text-${m.color} mb-3 d-block"></i>
            <h5 class="card-title fw-bold">${m.title}</h5>
            <p class="card-text text-muted small">${m.sub}</p>
            <button class="btn btn-${m.color} w-100 mt-2" onclick="${m.fn}">เข้าสู่เมนู</button>
          </div>
        </div>
      </div>
    `).join('');
  }

  // ============================================================
  // INIT
  // ============================================================
  function init() {
    if (!auth.checkAutoLogin()) router.showOnly('login-section');

    document.getElementById('loginForm').addEventListener('submit', auth.handleLogin);
    document.getElementById('btn-logout').addEventListener('click', () => auth.logout());
    document.querySelectorAll('[data-back-dashboard]').forEach(btn => {
      btn.addEventListener('click', () => showDashboard(auth.getUser()));
    });

    // Document forms
    document.getElementById('formRegister').addEventListener('submit', docs.submitRegister);
    document.getElementById('formDeputyReview').addEventListener('submit', docs.submitDeputyReview);
    document.getElementById('formDirectorCommand').addEventListener('submit', docs.submitDirectorCommand);
    document.getElementById('formTaskReport').addEventListener('submit', docs.submitTaskReport);

    // Leave forms
    document.getElementById('formLeave').addEventListener('submit', leaves.submitLeaveForm);
    document.getElementById('formApproveAction').addEventListener('submit', leaves.submitLeaveAction);

    // Search
    document.getElementById('search-input').addEventListener('keyup', (e) => {
      if (e.key === 'Enter') docs.filterTracking();
    });

    console.log('✅ E-Saraban initialized');
  }

  return { showDashboard, init };
})();

document.addEventListener('DOMContentLoaded', app.init);
