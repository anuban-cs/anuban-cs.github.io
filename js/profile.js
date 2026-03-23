// ============================================================
// js/profile.js — User Profile Management
// ============================================================

const profile = (() => {

  // ============================================================
  // เปิดหน้าโปรไฟล์
  // ============================================================
  async function openProfile() {
    router.showOnly('outperm-section');
    const user = auth.getUser();

    showLoading('กำลังโหลดข้อมูล...');
    const res = await api.call('getUserProfile', auth.getSessionParams());
    hideLoading();

    if (res.status !== 'success') {
      toast.error(res.message);
      return;
    }

    const p = res.profile;

    document.getElementById('outperm-form-area').innerHTML = `
      <div class="d-flex justify-content-between align-items-center mb-3">
        <h5><i class="bi bi-person-circle me-2 text-primary"></i>ข้อมูลส่วนตัว</h5>
        <button class="btn btn-sm btn-secondary" onclick="app.showDashboard(auth.getUser())">
          <i class="bi bi-arrow-left me-1"></i>กลับหน้าหลัก
        </button>
      </div>

      <div class="row g-4">

        <!-- การ์ดข้อมูลส่วนตัว -->
        <div class="col-md-6">
          <div class="card shadow-sm h-100">
            <div class="card-header bg-primary text-white">
              <h6 class="mb-0"><i class="bi bi-person-fill me-2"></i>แก้ไขข้อมูลส่วนตัว</h6>
            </div>
            <div class="card-body">

              <!-- Avatar -->
              <div class="text-center mb-4">
                <div class="rounded-circle bg-primary d-inline-flex align-items-center justify-content-center"
                  style="width:80px;height:80px;font-size:2rem;color:white">
                  ${p.name ? p.name.charAt(0) : '?'}
                </div>
                <p class="mt-2 mb-0 fw-bold">${p.name}</p>
                <small class="text-muted">${p.role} — ${p.position || '-'}</small>
              </div>

              <form id="formProfile">
                <div class="mb-3">
                  <label class="form-label fw-bold">ชื่อ-นามสกุล <span class="text-danger">*</span></label>
                  <input type="text" class="form-control" id="prof-name"
                    value="${p.name || ''}" required>
                </div>
                <div class="mb-3">
                  <label class="form-label fw-bold">ตำแหน่ง</label>
                  <input type="text" class="form-control" id="prof-position"
                    value="${p.position || ''}" placeholder="เช่น ครูวิชาการ, เจ้าหน้าที่ธุรการ">
                </div>
                <div class="mb-3">
                  <label class="form-label fw-bold">
                    <i class="bi bi-line me-1 text-success"></i>LINE User ID
                    <span class="badge bg-success ms-1 small">แจ้งเตือน</span>
                  </label>
                  <input type="text" class="form-control font-monospace" id="prof-line"
                    value="${p.lineToken || ''}" placeholder="Uxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx">
                  <div class="form-text">
                    <i class="bi bi-info-circle me-1"></i>
                    ส่ง <code>id</code> ให้บอท LINE แล้วนำ ID มาวางที่นี่เพื่อรับการแจ้งเตือน
                  </div>
                </div>
                <div class="mb-3">
                  <label class="form-label fw-bold text-muted">ชื่อผู้ใช้งาน (แก้ไขไม่ได้)</label>
                  <input type="text" class="form-control bg-light" value="${p.username || ''}" disabled>
                </div>
                <button type="submit" class="btn btn-primary w-100">
                  <i class="bi bi-save-fill me-1"></i>บันทึกข้อมูล
                </button>
              </form>
            </div>
          </div>
        </div>

        <!-- การ์ดเปลี่ยนรหัสผ่าน -->
        <div class="col-md-6">
          <div class="card shadow-sm h-100">
            <div class="card-header bg-warning text-dark">
              <h6 class="mb-0"><i class="bi bi-shield-lock-fill me-2"></i>เปลี่ยนรหัสผ่าน</h6>
            </div>
            <div class="card-body">
              <form id="formPassword">
                <div class="mb-3">
                  <label class="form-label fw-bold">รหัสผ่านเดิม <span class="text-danger">*</span></label>
                  <div class="input-group">
                    <input type="password" class="form-control" id="old-password"
                      placeholder="รหัสผ่านปัจจุบัน" required>
                    <button class="btn btn-outline-secondary" type="button"
                      onclick="togglePwd('old-password', this)">
                      <i class="bi bi-eye"></i>
                    </button>
                  </div>
                </div>
                <div class="mb-3">
                  <label class="form-label fw-bold">รหัสผ่านใหม่ <span class="text-danger">*</span></label>
                  <div class="input-group">
                    <input type="password" class="form-control" id="new-password"
                      placeholder="อย่างน้อย 6 ตัวอักษร" required minlength="6">
                    <button class="btn btn-outline-secondary" type="button"
                      onclick="togglePwd('new-password', this)">
                      <i class="bi bi-eye"></i>
                    </button>
                  </div>
                </div>
                <div class="mb-4">
                  <label class="form-label fw-bold">ยืนยันรหัสผ่านใหม่ <span class="text-danger">*</span></label>
                  <div class="input-group">
                    <input type="password" class="form-control" id="confirm-password"
                      placeholder="พิมพ์รหัสผ่านใหม่อีกครั้ง" required minlength="6">
                    <button class="btn btn-outline-secondary" type="button"
                      onclick="togglePwd('confirm-password', this)">
                      <i class="bi bi-eye"></i>
                    </button>
                  </div>
                </div>

                <!-- Password strength indicator -->
                <div class="mb-3" id="pwd-strength-area" style="display:none">
                  <div class="d-flex justify-content-between mb-1">
                    <small class="text-muted">ความแข็งแกร่งของรหัสผ่าน</small>
                    <small id="pwd-strength-label"></small>
                  </div>
                  <div class="progress" style="height:6px">
                    <div class="progress-bar" id="pwd-strength-bar" style="width:0%"></div>
                  </div>
                </div>

                <button type="submit" class="btn btn-warning w-100">
                  <i class="bi bi-shield-check me-1"></i>เปลี่ยนรหัสผ่าน
                </button>
              </form>
            </div>
          </div>

          <!-- ข้อมูลบัญชี (read-only) -->
          <div class="card shadow-sm mt-3">
            <div class="card-header bg-light">
              <h6 class="mb-0 text-muted"><i class="bi bi-info-circle me-1"></i>ข้อมูลบัญชี</h6>
            </div>
            <div class="card-body py-2">
              <table class="table table-sm table-borderless mb-0">
                <tr>
                  <td class="text-muted small" style="width:40%">รหัสผู้ใช้</td>
                  <td class="fw-bold small font-monospace">${p.id}</td>
                </tr>
                <tr>
                  <td class="text-muted small">สิทธิ์การใช้งาน</td>
                  <td><span class="badge bg-primary">${p.role}</span></td>
                </tr>
              </table>
            </div>
          </div>
        </div>

      </div>
    `;

    // ผูก form events
    document.getElementById('formProfile').addEventListener('submit', saveProfile);
    document.getElementById('formPassword').addEventListener('submit', savePassword);

    // Password strength checker
    document.getElementById('new-password').addEventListener('input', checkPwdStrength);
  }

  // ============================================================
  // บันทึกข้อมูลส่วนตัว
  // ============================================================
  async function saveProfile(e) {
    e.preventDefault();
    const params = {
      ...auth.getSessionParams(),
      profile: {
        name:      document.getElementById('prof-name').value.trim(),
        position:  document.getElementById('prof-position').value.trim(),
        lineToken: document.getElementById('prof-line').value.trim()
      }
    };

    showLoading('กำลังบันทึก...');
    const res = await api.call('updateUserProfile', params);
    hideLoading();

    if (res.status === 'success') {
      toast.success(res.message);
      // อัปเดตชื่อใน session
      const s = auth.getSession();
      if (s) {
        s.user.name     = params.profile.name;
        s.user.position = params.profile.position;
        localStorage.setItem(APP_CONFIG.SESSION_KEY, JSON.stringify(s));
        // อัปเดต navbar
        const navInfo = document.getElementById('nav-user-info');
        if (navInfo) navInfo.textContent = params.profile.name;
      }
      // Reload โปรไฟล์
      openProfile();
    } else {
      toast.error(res.message);
    }
  }

  // ============================================================
  // เปลี่ยนรหัสผ่าน
  // ============================================================
  async function savePassword(e) {
    e.preventDefault();
    const oldPwd  = document.getElementById('old-password').value;
    const newPwd  = document.getElementById('new-password').value;
    const confPwd = document.getElementById('confirm-password').value;

    if (newPwd !== confPwd) {
      toast.error('รหัสผ่านใหม่และการยืนยันไม่ตรงกัน');
      return;
    }
    if (newPwd.length < 6) {
      toast.error('รหัสผ่านใหม่ต้องมีอย่างน้อย 6 ตัวอักษร');
      return;
    }

    const confirmed = await confirmDialog('ยืนยันการเปลี่ยนรหัสผ่าน?');
    if (!confirmed) return;

    showLoading('กำลังเปลี่ยนรหัสผ่าน...');
    const res = await api.call('changePassword', {
      ...auth.getSessionParams(),
      oldPassword: oldPwd,
      newPassword: newPwd
    });
    hideLoading();

    if (res.status === 'success') {
      toast.success(res.message + ' กรุณา Login ใหม่');
      document.getElementById('formPassword').reset();
      document.getElementById('pwd-strength-area').style.display = 'none';
      // Logout หลัง 2 วินาที
      setTimeout(() => auth.logout(), 2000);
    } else {
      toast.error(res.message);
    }
  }

  // ============================================================
  // HELPERS
  // ============================================================
  function togglePwd(inputId, btn) {
    const input = document.getElementById(inputId);
    const icon  = btn.querySelector('i');
    if (input.type === 'password') {
      input.type = 'text';
      icon.className = 'bi bi-eye-slash';
    } else {
      input.type = 'password';
      icon.className = 'bi bi-eye';
    }
  }

  function checkPwdStrength() {
    const val  = document.getElementById('new-password').value;
    const area = document.getElementById('pwd-strength-area');
    const bar  = document.getElementById('pwd-strength-bar');
    const lbl  = document.getElementById('pwd-strength-label');

    if (!val) { area.style.display = 'none'; return; }
    area.style.display = 'block';

    let score = 0;
    if (val.length >= 6)  score++;
    if (val.length >= 10) score++;
    if (/[A-Z]/.test(val)) score++;
    if (/[0-9]/.test(val)) score++;
    if (/[^A-Za-z0-9]/.test(val)) score++;

    const levels = [
      { w:'20%',  cls:'bg-danger',  txt:'อ่อนมาก',  color:'text-danger' },
      { w:'40%',  cls:'bg-danger',  txt:'อ่อน',     color:'text-danger' },
      { w:'60%',  cls:'bg-warning', txt:'ปานกลาง',   color:'text-warning' },
      { w:'80%',  cls:'bg-info',    txt:'ดี',        color:'text-info' },
      { w:'100%', cls:'bg-success', txt:'แข็งแกร่ง', color:'text-success' }
    ];
    const lv = levels[Math.min(score, 4)];
    bar.style.width   = lv.w;
    bar.className     = 'progress-bar ' + lv.cls;
    lbl.textContent   = lv.txt;
    lbl.className     = 'small ' + lv.color;
  }

  return { openProfile };
})();
