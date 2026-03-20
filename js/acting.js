// ============================================================
// js/acting.js — Acting Director Management
// ============================================================

const acting = (() => {

  async function openModal() {
    router.showOnly('outperm-section');
    const user = auth.getUser();
    ui.showLoading('กำลังโหลด...');
    const [teachers, actingList] = await Promise.all([
      api.call('getTeacherList', auth.getSessionParams()),
      api.call('getActingDirectorList', auth.getSessionParams())
    ]);
    ui.hideLoading();

    const allUsers = [...(teachers || [])];

    document.getElementById('outperm-form-area').innerHTML = `
      <div class="d-flex justify-content-between align-items-center mb-3">
        <h5><i class="bi bi-person-badge-fill me-2 text-dark"></i>ตั้งค่าผู้รักษาการผู้อำนวยการ</h5>
        <button class="btn btn-sm btn-secondary" onclick="app.showDashboard(auth.getUser())">
          <i class="bi bi-arrow-left me-1"></i>กลับ
        </button>
      </div>

      <!-- Form เพิ่มรักษาการ -->
      <div class="card shadow-sm mb-4">
        <div class="card-header bg-dark text-white">
          <h6 class="mb-0"><i class="bi bi-plus-circle me-1"></i>กำหนดผู้รักษาการ</h6>
        </div>
        <div class="card-body">
          <div class="row g-3">
            <div class="col-md-5">
              <label class="form-label fw-bold">วันที่ <span class="text-danger">*</span></label>
              <input type="date" class="form-control" id="acting-date"
                value="${new Date().toISOString().split('T')[0]}" required>
            </div>
            <div class="col-md-5">
              <label class="form-label fw-bold">ผู้รักษาการ <span class="text-danger">*</span></label>
              <select class="form-select" id="acting-user">
                <option value="">-- เลือกบุคลากร --</option>
                ${allUsers.map(u => `<option value="${u.id}">${u.name}</option>`).join('')}
              </select>
            </div>
            <div class="col-md-2 d-flex align-items-end">
              <button class="btn btn-dark w-100" onclick="acting.save()">
                <i class="bi bi-save-fill me-1"></i>บันทึก
              </button>
            </div>
          </div>
          <p class="text-muted small mt-2 mb-0">
            <i class="bi bi-info-circle me-1"></i>
            ถ้าวันนั้นมีรักษาการอยู่แล้วจะถูกอัปเดตโดยอัตโนมัติ
          </p>
        </div>
      </div>

      <!-- รายการรักษาการ -->
      <div class="card shadow-sm">
        <div class="card-header"><h6 class="mb-0">รายการรักษาการที่ตั้งค่าไว้</h6></div>
        <div class="table-responsive">
          <table class="table table-sm table-hover mb-0">
            <thead class="table-light">
              <tr><th>วันที่</th><th>ผู้รักษาการ</th></tr>
            </thead>
            <tbody>
              ${!actingList || !actingList.length
                ? '<tr><td colspan="2" class="text-center text-muted py-3">ยังไม่มีข้อมูล</td></tr>'
                : actingList.map(a => `
                    <tr>
                      <td>${a.date}</td>
                      <td class="fw-bold">${a.name}</td>
                    </tr>
                  `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  async function save() {
    const date   = document.getElementById('acting-date').value;
    const userId = document.getElementById('acting-user').value;
    if (!date || !userId) { ui.toast.warning('กรุณาเลือกวันที่และผู้รักษาการ'); return; }

    ui.showLoading('กำลังบันทึก...');
    const res = await api.call('setActingDirector', { date, userId, ...auth.getSessionParams() });
    ui.hideLoading();

    if (res.status === 'success') {
      ui.toast.success(res.message);
      openModal(); // reload
    } else {
      ui.toast.error(res.message);
    }
  }

  return { openModal, save };
})();
