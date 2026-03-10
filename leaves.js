// ============================================================
// js/leaves.js — ระบบการลาออนไลน์ (E-Leave)
// ============================================================

const leaves = (() => {
  let teacherListCache = [];

  // ============================================================
  // TEACHER — หน้าการลาของฉัน
  // ============================================================
  async function openLeaveSystem() {
    router.showOnly('leave-section');
    document.getElementById('my-leave-body').innerHTML =
      '<tr><td colspan="4" class="text-center py-3"><span class="spinner-border spinner-border-sm"></span> กำลังโหลด...</td></tr>';
    document.getElementById('no-leave-msg').classList.add('hidden');

    const user = auth.getUser();

    // โหลดพร้อมกัน 2 อย่าง
    const [teacherData, leaveData] = await Promise.all([
      api.call('getTeacherList'),
      api.call('getMyLeaves', { userId: user.id })
    ]);

    if (Array.isArray(teacherData)) teacherListCache = teacherData;
    if (Array.isArray(leaveData)) renderMyLeaves(leaveData);
    else toast.error('โหลดประวัติการลาไม่สำเร็จ');
  }

  function renderMyLeaves(data) {
    const tbody = document.getElementById('my-leave-body');
    const noMsg = document.getElementById('no-leave-msg');

    if (data.length === 0) {
      tbody.innerHTML = '';
      noMsg.classList.remove('hidden');
      return;
    }
    noMsg.classList.add('hidden');

    tbody.innerHTML = data.map(l => {
      let actionBtns = '';
      if (l.status === 'อนุมัติ' && l.pdfUrl) {
        actionBtns += `<a href="${l.pdfUrl}" target="_blank" class="btn btn-sm btn-outline-primary me-1"><i class="bi bi-file-earmark-pdf"></i> ใบลา</a>`;
      }

      const deadline = new Date(l.startDate);
      deadline.setHours(8, 0, 0, 0);
      const canCancel = l.status !== 'ยกเลิก' && l.status !== 'ไม่อนุมัติ' && new Date() < deadline;
      if (canCancel) {
        actionBtns += `<button class="btn btn-sm btn-outline-danger" onclick="leaves.cancelLeave('${l.id}')">ยกเลิก</button>`;
      }

      return `
        <tr>
          <td>
            <span class="fw-semibold">${l.displayDate}</span><br>
            <small class="text-muted">${l.days} วัน</small>
          </td>
          <td>${l.type}</td>
          <td>${statusBadge(l.status)}</td>
          <td class="text-end">${actionBtns}</td>
        </tr>`;
    }).join('');
  }

  async function cancelLeave(leaveId) {
    const confirmed = await confirmDialog(
      'ยืนยันที่จะยกเลิกการลานี้ใช่หรือไม่?<br><small class="text-muted">(ทำรายการได้ก่อน 08:00 น. ของวันที่เริ่มลา)</small>'
    );
    if (!confirmed) return;

    const res = await api.call('requestCancelLeave', {
      leaveId, userId: auth.getUser().id
    });

    if (res.status === 'success') {
      toast.success(res.message);
      openLeaveSystem();
    } else {
      toast.error(res.message);
    }
  }

  // ============================================================
  // LEAVE MODAL — เขียนใบลา
  // ============================================================
  function openLeaveModal() {
    document.getElementById('formLeave').reset();
    document.getElementById('sub-rows').innerHTML = '';
    toggleSubArea();
    new bootstrap.Modal(document.getElementById('modalLeave')).show();
  }

  function toggleSubArea() {
    const type = document.querySelector('input[name="leaveType"]:checked')?.value;
    const area = document.getElementById('substitute-area');
    const container = document.getElementById('sub-rows');
    if (type === 'ลากิจ') {
      area.classList.remove('d-none');
      if (!container.children.length) addSubRow();
    } else {
      area.classList.add('d-none');
    }
  }

  function addSubRow() {
    const container = document.getElementById('sub-rows');
    const options = teacherListCache.map(t =>
      `<option value="${t.id}">${t.name}</option>`
    ).join('');

    container.insertAdjacentHTML('beforeend', `
      <div class="row mb-2 align-items-center sub-row-item">
        <div class="col-6">
          <select class="form-select form-select-sm sub-teacher" required>
            <option value="">-- เลือกครู --</option>
            ${options}
          </select>
        </div>
        <div class="col-4">
          <select class="form-select form-select-sm sub-hour" required>
            ${[1,2,3,4,5,6,7,8].map(n => `<option value="${n}">คาบ ${n}</option>`).join('')}
          </select>
        </div>
        <div class="col-2">
          <button type="button" class="btn btn-sm btn-outline-danger" onclick="this.closest('.sub-row-item').remove()">
            <i class="bi bi-trash3"></i>
          </button>
        </div>
      </div>
    `);
  }

  async function submitLeaveForm(e) {
    e.preventDefault();
    const btn  = document.getElementById('btn-leave-submit');
    const form = e.target;
    const user = auth.getUser();

    const formObj = {
      userId:    user.id,
      type:      form.leaveType.value,
      startDate: form.startDate.value,
      endDate:   form.endDate.value,
      totalDays: form.totalDays.value,
      reason:    form.reason.value,
      contact:   form.contact.value,
      substitutes: []
    };

    if (formObj.type === 'ลากิจ') {
      document.querySelectorAll('.sub-row-item').forEach(row => {
        const tId = row.querySelector('.sub-teacher').value;
        const hr  = row.querySelector('.sub-hour').value;
        if (tId) formObj.substitutes.push({ id: tId, hour: hr });
      });
    }

    // Validate
    if (new Date(formObj.startDate) > new Date(formObj.endDate)) {
      toast.warning('วันที่เริ่มลาต้องไม่มากกว่าวันสิ้นสุด');
      return;
    }

    setBtnLoading(btn, true, 'กำลังบันทึก...');
    const res = await api.call('submitLeaveRequest', { form: formObj });
    setBtnLoading(btn, false);

    if (res.status === 'success') {
      toast.success(res.message);
      bootstrap.Modal.getInstance(document.getElementById('modalLeave')).hide();
      openLeaveSystem();
    } else {
      toast.error(res.message);
    }
  }

  // ============================================================
  // ADMIN/DEPUTY/DIRECTOR — อนุมัติใบลา
  // ============================================================
  async function loadLeaveApprovals(role) {
    router.showOnly('approve-leave-section');
    const titles = {
      Admin:    'ตรวจสอบใบลา (สำหรับเจ้าหน้าที่)',
      Deputy:   'พิจารณาใบลา (สำหรับ รอง ผอ.)',
      Director: 'อนุมัติใบลา (สำหรับ ผอ.)'
    };
    const colors = { Admin: 'text-warning', Deputy: 'text-info', Director: 'text-primary' };

    const title = document.getElementById('approve-title');
    title.textContent = titles[role] || 'รายการใบลา';
    title.className = `mb-3 ${colors[role] || ''}`;

    const tbody = document.getElementById('approve-leave-body');
    tbody.innerHTML = '<tr><td colspan="4" class="text-center py-4"><div class="spinner-border"></div></td></tr>';

    const btnColors = { Admin: 'btn-warning', Deputy: 'btn-info', Director: 'btn-primary' };
    const list = await api.call('getPendingLeavesForRole', { role });
    if (!Array.isArray(list)) { toast.error('โหลดข้อมูลไม่สำเร็จ'); return; }

    renderApproveTable(list, role, btnColors[role] || 'btn-secondary');
  }

  function renderApproveTable(list, role, btnColor) {
    const tbody = document.getElementById('approve-leave-body');
    const noMsg = document.getElementById('no-approve-msg');

    if (list.length === 0) {
      tbody.innerHTML = '';
      noMsg.classList.remove('hidden');
      return;
    }
    noMsg.classList.add('hidden');
    tbody.innerHTML = list.map(item => `
      <tr>
        <td class="fw-semibold">${item.requester}</td>
        <td>
          <span class="badge bg-secondary">${item.type}</span><br>
          <small class="text-muted">${item.dates}</small>
        </td>
        <td>${item.days} วัน</td>
        <td>
          <button class="btn btn-sm ${btnColor}" onclick='leaves.openActionModal(${JSON.stringify(item)}, "${role}")'>
            จัดการ
          </button>
        </td>
      </tr>`).join('');
  }

  function openActionModal(item, role) {
    document.getElementById('act-leaveId').value = item.id;
    document.getElementById('act-role').value    = role;
    document.getElementById('act-name').textContent   = item.requester;
    document.getElementById('act-reason').textContent = item.reason;

    const defaults = {
      Admin:    'ตรวจสอบแล้ว ข้อมูลถูกต้อง',
      Deputy:   'เห็นควรอนุญาต',
      Director: 'อนุญาต'
    };
    document.getElementById('act-comment').value = defaults[role] || '';
    new bootstrap.Modal(document.getElementById('modalApproveAction')).show();
  }

  async function submitLeaveAction(e) {
    e.preventDefault();
    const btn     = document.getElementById('btn-act-submit');
    const leaveId = document.getElementById('act-leaveId').value;
    const role    = document.getElementById('act-role').value;
    const comment = document.getElementById('act-comment').value;
    const userId  = auth.getUser().id;

    setBtnLoading(btn, true, 'กำลังบันทึก...');

    const actionMap = {
      Admin:    () => api.call('checkAndPropose',    { leaveId, checkerId: userId }),
      Deputy:   () => api.call('deputyReviewLeave',  { leaveId, comment, deputyId: userId }),
      Director: () => api.call('directorApproveLeave', { leaveId, directorId: userId })
    };

    const res = await (actionMap[role] || (() => Promise.resolve({ status: 'error', message: 'Role ไม่ถูกต้อง' })))();
    setBtnLoading(btn, false);

    if (res.status === 'success') {
      toast.success(res.message);
      bootstrap.Modal.getInstance(document.getElementById('modalApproveAction')).hide();
      loadLeaveApprovals(role);
    } else {
      toast.error(res.message);
    }
  }

  // ============================================================
  // DIRECTOR STATS — สถิติการลา
  // ============================================================
  let myChart = null;

  async function openStatsSystem() {
    router.showOnly('stats-section');
    document.getElementById('stats-table-body').innerHTML =
      '<tr><td colspan="5" class="text-center py-4"><div class="spinner-border text-primary"></div></td></tr>';

    const data = await api.call('getAllTeacherStats');
    if (!Array.isArray(data)) { toast.error('โหลดข้อมูลไม่สำเร็จ'); return; }
    renderStatsDashboard(data);
  }

  function renderStatsDashboard(data) {
    const tbody = document.getElementById('stats-table-body');
    const names = [], sickData = [], personalData = [];

    tbody.innerHTML = data.map(item => {
      names.push(item.name);
      sickData.push(item.sick);
      personalData.push(item.personal);
      return `
        <tr>
          <td class="text-start">${item.name}</td>
          <td>${item.sick}</td>
          <td>${item.personal}</td>
          <td>${item.birth}</td>
          <td class="fw-bold">${item.total}</td>
        </tr>`;
    }).join('');

    const ctx = document.getElementById('leaveChart').getContext('2d');
    if (myChart) myChart.destroy();
    myChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: names,
        datasets: [
          { label: 'ลาป่วย',  data: sickData,     backgroundColor: 'rgba(220,53,69,0.7)',  borderColor: '#dc3545', borderWidth: 1 },
          { label: 'ลากิจ',   data: personalData, backgroundColor: 'rgba(255,193,7,0.7)', borderColor: '#ffc107', borderWidth: 1 }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: { beginAtZero: true, title: { display: true, text: 'จำนวนวัน' } },
          x: { ticks: { autoSkip: false, maxRotation: 45, minRotation: 45 } }
        },
        plugins: {
          title: { display: true, text: 'เปรียบเทียบสถิติการลา (ป่วย/กิจ) ของบุคลากร', font: { size: 16 } }
        }
      }
    });
  }

  return {
    openLeaveSystem, cancelLeave,
    openLeaveModal, toggleSubArea, addSubRow, submitLeaveForm,
    loadLeaveApprovals, openActionModal, submitLeaveAction,
    openStatsSystem
  };
})();
