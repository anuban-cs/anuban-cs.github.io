// ============================================================
// js/outperm.js — Out Permission + Acting Director + Leave Stats
// ============================================================

// แปลงวันที่เป็นรูปแบบไทย
function formatThaiDate(dateStr) {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    if (isNaN(d)) return dateStr; // ถ้าแปลงไม่ได้ คืนค่าเดิม
    return d.toLocaleDateString('th-TH', {
      year: 'numeric', month: 'short', day: 'numeric'
    });
  } catch(e) { return dateStr; }
}

const outperm = (() => {

  // ============================================================
  // ขออนุญาตออกนอกโรงเรียน — SUBMIT FORM
  // ============================================================
  function openSubmitModal() {
    router.showOnly('outperm-section');
    document.getElementById('outperm-form-area').innerHTML = `
      <div class="d-flex justify-content-between align-items-center mb-3">
        <h5><i class="bi bi-door-open-fill me-2 text-success"></i>ขออนุญาตออกนอกโรงเรียน</h5>
        <button class="btn btn-sm btn-secondary" onclick="app.showDashboard(auth.getUser())">
          <i class="bi bi-arrow-left me-1"></i>กลับหน้าหลัก
        </button>
      </div>
      <div class="card shadow-sm">
        <div class="card-header bg-success text-white">
          <h5 class="mb-0"><i class="bi bi-door-open-fill me-2"></i>กรอกคำขออนุญาต</h5>
        </div>
        <div class="card-body">
          <form id="formOutPerm">
            <div class="row g-3">
              <div class="col-md-4">
                <label class="form-label fw-bold">วันที่ <span class="text-danger">*</span></label>
                <input type="date" class="form-control" id="out-date" required>
              </div>
              <div class="col-md-4">
                <label class="form-label fw-bold">เวลาออก <span class="text-danger">*</span></label>
                <input type="time" class="form-control" id="out-time-out" required>
              </div>
              <div class="col-md-4">
                <label class="form-label fw-bold">เวลากลับ <span class="text-danger">*</span></label>
                <input type="time" class="form-control" id="out-time-return" required>
              </div>
              <div class="col-12">
                <label class="form-label fw-bold">สถานที่ไป <span class="text-danger">*</span></label>
                <input type="text" class="form-control" id="out-destination" placeholder="ระบุสถานที่" required>
              </div>
              <div class="col-12">
                <label class="form-label fw-bold">เหตุผล <span class="text-danger">*</span></label>
                <textarea class="form-control" id="out-reason" rows="3" placeholder="ระบุเหตุผล" required></textarea>
              </div>
              <div class="col-md-6">
                <label class="form-label fw-bold">เบอร์ติดต่อ</label>
                <input type="tel" class="form-control" id="out-contact" placeholder="เบอร์โทรศัพท์">
              </div>
            </div>
            <div class="d-flex gap-2 mt-4">
              <button type="submit" class="btn btn-success">
                <i class="bi bi-send-fill me-1"></i>ส่งคำขอ
              </button>
              <button type="button" class="btn btn-secondary" onclick="app.showDashboard(auth.getUser())">
                ยกเลิก
              </button>
            </div>
          </form>
        </div>
      </div>
      <div class="card shadow-sm mt-4">
        <div class="card-header"><h6 class="mb-0">ประวัติคำขอของฉัน</h6></div>
        <div class="card-body" id="my-outperm-list">
          <div class="text-center text-muted py-3">กำลังโหลด...</div>
        </div>
      </div>
    `;

    // Set default date = today
    document.getElementById('out-date').value = new Date().toISOString().split('T')[0];

    document.getElementById('formOutPerm').addEventListener('submit', submitOutPerm);
    loadMyOutPerms();
  }

  async function submitOutPerm(e) {
    e.preventDefault();
    const user = auth.getUser();
    const form = {
      userId:      user.id,
      date:        document.getElementById('out-date').value,
      timeOut:     document.getElementById('out-time-out').value,
      timeReturn:  document.getElementById('out-time-return').value,
      destination: document.getElementById('out-destination').value.trim(),
      reason:      document.getElementById('out-reason').value.trim(),
      contact:     document.getElementById('out-contact').value.trim()
    };

    showLoading('กำลังส่งคำขอ...');
    const res = await api.call('submitOutPermission', { form, ...auth.getSessionParams() });
    hideLoading();

    if (res.status === 'success') {
      toast.success(res.message);
      document.getElementById('formOutPerm').reset();
      document.getElementById('out-date').value = new Date().toISOString().split('T')[0];
      loadMyOutPerms();
    } else {
      toast.error(res.message);
    }
  }

  async function loadMyOutPerms() {
    const user = auth.getUser();
    const res  = await api.call('getOutPermissions', { role: 'Teacher', userId: user.id, ...auth.getSessionParams() });
    const el   = document.getElementById('my-outperm-list');
    if (!el) return;
    if (!res || !res.length) { el.innerHTML = '<p class="text-muted text-center py-2">ยังไม่มีประวัติ</p>'; return; }

    el.innerHTML = `
      <div class="table-responsive">
        <table class="table table-sm table-hover">
          <thead class="table-light"><tr>
            <th>วันที่</th><th>เวลา</th><th>สถานที่</th><th>เหตุผล</th><th>สถานะ</th>
          </tr></thead>
          <tbody>${res.map(r => `
            <tr>
              <td>${formatThaiDate(r.date)}</td>
              <td>${r.timeOut || "-"} — ${r.timeReturn || "-"}</td>
              <td>${r.destination}</td>
              <td class="text-muted small">${r.reason}</td>
              <td>${statusBadge(r.status)}</td>
            </tr>
          `).join('')}</tbody>
        </table>
      </div>
    `;
  }

  // ============================================================
  // อนุมัติออกนอกโรงเรียน — สำหรับ Director / รักษาการ
  // ============================================================
  async function loadApprovals() {
    router.showOnly('outperm-section');
    const user = auth.getUser();
    showLoading('กำลังโหลด...');
    const res = await api.call('getOutPermissions', { role: user.role, userId: user.id, ...auth.getSessionParams() });
    hideLoading();

    const pending = (res || []).filter(r => r.status === 'รอนุมัติ');
    const done    = (res || []).filter(r => r.status !== 'รอนุมัติ');

    document.getElementById('outperm-form-area').innerHTML = `
      <div class="d-flex justify-content-between align-items-center mb-3">
        <h5><i class="bi bi-door-open-fill me-2 text-warning"></i>อนุมัติออกนอกโรงเรียน</h5>
        <button class="btn btn-sm btn-secondary" onclick="app.showDashboard(auth.getUser())">
          <i class="bi bi-arrow-left me-1"></i>กลับ
        </button>
      </div>

      <h6 class="text-warning"><i class="bi bi-hourglass-split me-1"></i>รออนุมัติ (${pending.length})</h6>
      ${pending.length === 0 ? '<p class="text-muted">ไม่มีรายการรออนุมัติ</p>' : `
        <div class="row g-3 mb-4">
          ${pending.map(r => `
            <div class="col-md-6">
              <div class="card border-warning shadow-sm">
                <div class="card-body">
                  <h6 class="fw-bold">${r.requester}</h6>
                  <p class="mb-1 small"><i class="bi bi-calendar3 me-1"></i>${formatThaiDate(r.date)} เวลา ${r.timeOut||"-"} — ${r.timeReturn||"-"}</p>
                  <p class="mb-1 small"><i class="bi bi-geo-alt me-1"></i>${r.destination}</p>
                  <p class="mb-2 text-muted small">${r.reason}</p>
                  <div class="d-flex gap-2">
                    <button class="btn btn-sm btn-success" onclick="outperm.approve('${r.id}')">
                      <i class="bi bi-check-circle-fill me-1"></i>อนุมัติ
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="outperm.reject('${r.id}')">
                      <i class="bi bi-x-circle-fill me-1"></i>ไม่อนุมัติ
                    </button>
                  </div>
                </div>
              </div>
            </div>
          `).join('')}
        </div>
      `}

      <h6 class="text-secondary"><i class="bi bi-archive me-1"></i>ประวัติ</h6>
      <div class="table-responsive">
        <table class="table table-sm table-hover">
          <thead class="table-light"><tr>
            <th>ผู้ขอ</th><th>วันที่</th><th>สถานที่</th><th>สถานะ</th>
          </tr></thead>
          <tbody>${done.map(r => `
            <tr>
              <td>${r.requester}</td>
              <td>${formatThaiDate(r.date)}</td>
              <td>${r.destination}</td>
              <td>${statusBadge(r.status)}</td>
            </tr>
          `).join('')}</tbody>
        </table>
      </div>
    `;
  }

  async function approve(outId) {
    const confirmed = await confirmDialog('ยืนยันอนุมัติคำขอนี้?');
    if (!confirmed) return;
    const user = auth.getUser();
    showLoading('กำลังอนุมัติ...');
    const res = await api.call('approveOutPermission', { outId, ...auth.getSessionParams() });
    hideLoading();
    res.status === 'success' ? toast.success(res.message) : toast.error(res.message);
    loadApprovals();
  }

  async function reject(outId) {
    const reason = prompt('ระบุเหตุผลที่ไม่อนุมัติ:');
    if (!reason) return;
    const user = auth.getUser();
    showLoading('กำลังบันทึก...');
    const res = await api.call('rejectOutPermission', { outId, reason, ...auth.getSessionParams() });
    hideLoading();
    res.status === 'success' ? toast.success(res.message) : toast.error(res.message);
    loadApprovals();
  }

  // ============================================================
  // LEAVE STATS — หัวหน้าวิชาการ / หัวหน้าบุคคล
  // ============================================================
  async function loadLeaveStats() {
    router.showOnly('outperm-section');
    const user = auth.getUser();
    showLoading('กำลังโหลด...');
    const res = await api.call('getLeaveStats', { role: user.role, ...auth.getSessionParams() });
    hideLoading();

    document.getElementById('outperm-form-area').innerHTML = `
      <div class="d-flex justify-content-between align-items-center mb-3">
        <h5><i class="bi bi-calendar2-week-fill me-2 text-primary"></i>รายการการลาบุคลากร</h5>
        <button class="btn btn-sm btn-secondary" onclick="app.showDashboard(auth.getUser())">
          <i class="bi bi-arrow-left me-1"></i>กลับ
        </button>
      </div>
      <div class="table-responsive">
        <table class="table table-hover table-bordered table-sm">
          <thead class="table-primary">
            <tr><th>ชื่อ</th><th>ประเภทลา</th><th>วันเริ่ม</th><th>วันสิ้นสุด</th><th>จำนวน</th><th>เหตุผล</th></tr>
          </thead>
          <tbody>
            ${!res || !res.length
              ? '<tr><td colspan="6" class="text-center text-muted">ไม่มีข้อมูล</td></tr>'
              : res.map(r => `
                <tr>
                  <td class="fw-bold">${r.requester}</td>
                  <td>${r.type}</td>
                  <td>${r.startDate}</td>
                  <td>${r.endDate}</td>
                  <td class="text-center">${r.days} วัน</td>
                  <td class="text-muted small">${r.reason}</td>
                </tr>
              `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  // ============================================================
  // PERSONNEL DASHBOARD — หัวหน้าบุคคล
  // ============================================================
  async function loadPersonnelDashboard() {
    router.showOnly('outperm-section');
    showLoading('กำลังโหลด Dashboard...');
    const res = await api.call('getPersonnelDashboard', auth.getSessionParams());
    hideLoading();

    const maxDays = Math.max(...(res || []).map(r => r.total), 1);

    document.getElementById('outperm-form-area').innerHTML = `
      <div class="d-flex justify-content-between align-items-center mb-3">
        <h5><i class="bi bi-graph-up-arrow me-2 text-danger"></i>Dashboard สถิติการลาบุคลากร</h5>
        <button class="btn btn-sm btn-secondary" onclick="app.showDashboard(auth.getUser())">
          <i class="bi bi-arrow-left me-1"></i>กลับ
        </button>
      </div>

      <!-- Summary Cards -->
      <div class="row g-3 mb-4">
        <div class="col-md-3">
          <div class="card text-center border-danger shadow-sm">
            <div class="card-body py-3">
              <h2 class="text-danger fw-bold">${(res||[]).reduce((s,r)=>s+r.sick,0)}</h2>
              <p class="mb-0 small text-muted">รวมวันลาป่วย</p>
            </div>
          </div>
        </div>
        <div class="col-md-3">
          <div class="card text-center border-warning shadow-sm">
            <div class="card-body py-3">
              <h2 class="text-warning fw-bold">${(res||[]).reduce((s,r)=>s+r.personal,0)}</h2>
              <p class="mb-0 small text-muted">รวมวันลากิจ</p>
            </div>
          </div>
        </div>
        <div class="col-md-3">
          <div class="card text-center border-purple shadow-sm">
            <div class="card-body py-3">
              <h2 class="text-purple fw-bold">${(res||[]).reduce((s,r)=>s+r.birth,0)}</h2>
              <p class="mb-0 small text-muted">รวมวันลาคลอด</p>
            </div>
          </div>
        </div>
        <div class="col-md-3">
          <div class="card text-center border-dark shadow-sm">
            <div class="card-body py-3">
              <h2 class="text-dark fw-bold">${(res||[]).reduce((s,r)=>s+r.total,0)}</h2>
              <p class="mb-0 small text-muted">รวมวันลาทั้งหมด</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Bar Chart -->
      <div class="card shadow-sm mb-4">
        <div class="card-header"><h6 class="mb-0">สถิติรายบุคคล</h6></div>
        <div class="card-body">
          ${(res||[]).map(r => `
            <div class="mb-3">
              <div class="d-flex justify-content-between mb-1">
                <span class="fw-bold small">${r.name}</span>
                <span class="small text-muted">${r.total} วัน</span>
              </div>
              <div class="progress" style="height:20px;">
                <div class="progress-bar bg-danger" style="width:${r.sick/maxDays*100}%"
                  title="ลาป่วย ${r.sick} วัน">${r.sick > 0 ? r.sick+'ป่วย' : ''}</div>
                <div class="progress-bar bg-warning" style="width:${r.personal/maxDays*100}%"
                  title="ลากิจ ${r.personal} วัน">${r.personal > 0 ? r.personal+'กิจ' : ''}</div>
                <div class="progress-bar bg-info" style="width:${r.birth/maxDays*100}%"
                  title="ลาคลอด ${r.birth} วัน">${r.birth > 0 ? r.birth+'คลอด' : ''}</div>
              </div>
            </div>
          `).join('')}
        </div>
        <div class="card-footer text-muted small">
          <span class="badge bg-danger me-1">ลาป่วย</span>
          <span class="badge bg-warning text-dark me-1">ลากิจ</span>
          <span class="badge bg-info text-dark">ลาคลอด</span>
        </div>
      </div>

      <!-- Detail Table -->
      <div class="card shadow-sm">
        <div class="card-header"><h6 class="mb-0">ตารางสรุป</h6></div>
        <div class="table-responsive">
          <table class="table table-sm table-hover table-bordered mb-0">
            <thead class="table-light">
              <tr><th>ชื่อ</th><th>ตำแหน่ง</th><th class="text-center text-danger">ลาป่วย</th>
              <th class="text-center text-warning">ลากิจ</th>
              <th class="text-center text-info">ลาคลอด</th>
              <th class="text-center fw-bold">รวม</th></tr>
            </thead>
            <tbody>
              ${(res||[]).map(r => `
                <tr>
                  <td class="fw-bold">${r.name}</td>
                  <td class="small text-muted">${r.position||'-'}</td>
                  <td class="text-center text-danger">${r.sick}</td>
                  <td class="text-center text-warning">${r.personal}</td>
                  <td class="text-center text-info">${r.birth}</td>
                  <td class="text-center fw-bold">${r.total}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  return {
    openSubmitModal, loadApprovals,
    approve, reject,
    loadLeaveStats, loadPersonnelDashboard
  };
})();
