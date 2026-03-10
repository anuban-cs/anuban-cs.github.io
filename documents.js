// ============================================================
// js/documents.js — ระบบสารบรรณ (E-Document)
// ============================================================

const docs = (() => {

  // ============================================================
  // ADMIN — ลงทะเบียนหนังสือรับ
  // ============================================================
  function openRegisterModal() {
    const user = auth.getUser();
    document.getElementById('reg-userId').value = user.id;
    document.getElementById('formRegister').reset();
    document.getElementById('reg-userId').value = user.id;
    new bootstrap.Modal(document.getElementById('modalRegister')).show();
  }

  async function submitRegister(e) {
    e.preventDefault();
    const btn = document.getElementById('btn-submit-reg');
    const fileInput = document.getElementById('docFile');

    if (fileInput.files.length > 5) {
      toast.warning('เลือกไฟล์ได้สูงสุด 5 ไฟล์ กรุณาเลือกใหม่');
      return;
    }

    setBtnLoading(btn, true, 'กำลังอัปโหลด...');

    const formEl = document.getElementById('formRegister');
    const formData = new FormData(formEl);
    const formObj = {
      refNo:   formData.get('refNo'),
      docDate: formData.get('docDate'),
      subject: formData.get('subject'),
      from:    formData.get('from'),
      to:      formData.get('to'),
      userId:  document.getElementById('reg-userId').value
    };

    const fileDataArray = await api.readFiles(fileInput);

    const res = await api.call('registerDocument', { formObj, fileDataArray });
    setBtnLoading(btn, false);

    if (res.status === 'success') {
      toast.success(res.message);
      bootstrap.Modal.getInstance(document.getElementById('modalRegister')).hide();
      formEl.reset();
    } else {
      toast.error(res.message);
    }
  }

  // ============================================================
  // DEPUTY — พิจารณาหนังสือ
  // ============================================================
  async function loadDeputyDocs() {
    router.showOnly('deputy-list-section');
    const tbody = document.getElementById('deputy-table-body');
    tbody.innerHTML = '<tr><td colspan="4" class="text-center py-4"><div class="spinner-border text-warning"></div></td></tr>';

    const res = await api.call('getDeputyPendingDocs');
    if (!Array.isArray(res)) { toast.error('โหลดข้อมูลไม่สำเร็จ'); return; }
    renderDeputyTable(res);
  }

  function renderDeputyTable(data) {
    const tbody = document.getElementById('deputy-table-body');
    const noMsg = document.getElementById('no-doc-msg');

    if (data.length === 0) {
      tbody.innerHTML = '';
      noMsg.classList.remove('hidden');
      return;
    }
    noMsg.classList.add('hidden');
    tbody.innerHTML = data.map(doc => `
      <tr>
        <td class="text-nowrap">${doc.date}</td>
        <td>
          <div class="fw-semibold">${doc.subject}</div>
          <small class="text-muted">${doc.refNo}</small>
        </td>
        <td>${doc.from}</td>
        <td>
          <button class="btn btn-sm btn-warning" onclick='docs.openDeputyModal(${JSON.stringify(doc)})'>
            <i class="bi bi-pencil-fill"></i> พิจารณา
          </button>
        </td>
      </tr>
    `).join('');
  }

  function openDeputyModal(doc) {
    document.getElementById('rev-docId').value   = doc.docId;
    document.getElementById('rev-subject').textContent = doc.subject;
    document.getElementById('rev-ref').textContent     = `เลขที่: ${doc.refNo}`;
    document.getElementById('rev-files-area').innerHTML = renderFileLinks(doc.fileUrls, true);
    document.getElementById('rev-comment').value = '';
    new bootstrap.Modal(document.getElementById('modalDeputyReview')).show();
  }

  async function submitDeputyReview(e) {
    e.preventDefault();
    const btn     = document.getElementById('btn-deputy-submit');
    const docId   = document.getElementById('rev-docId').value;
    const comment = document.getElementById('rev-comment').value;
    const userId  = auth.getUser().id;

    setBtnLoading(btn, true, 'กำลังบันทึก...');
    const res = await api.call('submitDeputyReview', { docId, comment, userId });
    setBtnLoading(btn, false);

    if (res.status === 'success') {
      toast.success(res.message);
      bootstrap.Modal.getInstance(document.getElementById('modalDeputyReview')).hide();
      loadDeputyDocs();
    } else {
      toast.error(res.message);
    }
  }

  // ============================================================
  // DIRECTOR — สั่งการ/มอบหมาย
  // ============================================================
  async function loadDirectorDocs() {
    router.showOnly('director-list-section');
    const tbody = document.getElementById('director-table-body');
    tbody.innerHTML = '<tr><td colspan="4" class="text-center py-4"><div class="spinner-border text-danger"></div></td></tr>';

    const res = await api.call('getDirectorPendingDocs');
    if (!Array.isArray(res)) { toast.error('โหลดข้อมูลไม่สำเร็จ'); return; }
    renderDirectorTable(res);
  }

  function renderDirectorTable(data) {
    const tbody = document.getElementById('director-table-body');
    const noMsg = document.getElementById('no-dir-doc-msg');

    if (data.length === 0) {
      tbody.innerHTML = '';
      noMsg.classList.remove('hidden');
      return;
    }
    noMsg.classList.add('hidden');
    tbody.innerHTML = data.map(doc => `
      <tr>
        <td class="text-nowrap">${doc.date}</td>
        <td>
          <div class="fw-semibold">${doc.subject}</div>
          <small class="text-muted">จาก: ${doc.from}</small>
        </td>
        <td class="fst-italic text-warning-emphasis">"${doc.deputyComment}"</td>
        <td>
          <button class="btn btn-sm btn-outline-danger" onclick='docs.openDirectorModal(${JSON.stringify(doc)})'>
            <i class="bi bi-megaphone-fill"></i> สั่งการ
          </button>
        </td>
      </tr>
    `).join('');
  }

  async function openDirectorModal(doc) {
    document.getElementById('dir-docId').value = doc.docId;
    document.getElementById('dir-subject').textContent      = doc.subject;
    document.getElementById('dir-ref').textContent          = `เลขที่: ${doc.refNo}`;
    document.getElementById('dir-deputy-comment').textContent = doc.deputyComment;
    document.getElementById('dir-files-area').innerHTML     = renderFileLinks(doc.fileUrls, true);
    document.getElementById('dir-command').value = '';

    // โหลด Checkbox ครู
    const container = document.getElementById('teacher-checkbox-list');
    container.innerHTML = '<span class="spinner-border spinner-border-sm"></span> กำลังโหลดรายชื่อ...';

    const teachers = await api.call('getTeacherList');
    container.innerHTML = '';
    if (Array.isArray(teachers) && teachers.length > 0) {
      teachers.forEach(t => {
        const div = document.createElement('div');
        div.className = 'form-check';
        div.innerHTML = `
          <input class="form-check-input teacher-check" type="checkbox" value="${t.id}" id="chk-${t.id}">
          <label class="form-check-label" for="chk-${t.id}">${t.name}</label>
        `;
        container.appendChild(div);
      });
    } else {
      container.innerHTML = '<small class="text-muted">ไม่พบรายชื่อครู</small>';
    }

    new bootstrap.Modal(document.getElementById('modalDirectorCommand')).show();
  }

  async function submitDirectorCommand(e) {
    e.preventDefault();
    const btn     = document.getElementById('btn-dir-submit');
    const docId   = document.getElementById('dir-docId').value;
    const command = document.getElementById('dir-command').value;
    const userId  = auth.getUser().id;
    const teacherIds = [...document.querySelectorAll('.teacher-check:checked')].map(c => c.value);

    setBtnLoading(btn, true, 'กำลังบันทึก...');
    const res = await api.call('submitDirectorCommand', { docId, command, teacherIds, userId });
    setBtnLoading(btn, false);

    if (res.status === 'success') {
      toast.success(res.message);
      bootstrap.Modal.getInstance(document.getElementById('modalDirectorCommand')).hide();
      loadDirectorDocs();
    } else {
      toast.error(res.message);
    }
  }

  // ============================================================
  // TEACHER — งานที่ได้รับมอบหมาย
  // ============================================================
  async function loadMyTasks() {
    router.showOnly('teacher-task-section');
    const container = document.getElementById('task-list-container');
    container.innerHTML = `
      <div class="col-12 text-center p-5">
        <div class="spinner-border text-primary"></div>
        <p class="mt-2 text-muted">กำลังโหลดข้อมูล...</p>
      </div>`;

    const tasks = await api.call('getMyTasks', { userId: auth.getUser().id });
    container.innerHTML = '';

    if (!Array.isArray(tasks) || tasks.length === 0) {
      container.innerHTML = `
        <div class="col-12 text-center">
          <div class="alert alert-success mx-auto" style="max-width:400px">
            <i class="bi bi-check-circle-fill fs-2 d-block mb-2"></i>
            ไม่มีงานค้าง เยี่ยมมาก! 🎉
          </div>
        </div>`;
      return;
    }

    container.innerHTML = tasks.map(t => {
      const fileHtml = t.fileUrls?.length > 0
        ? t.fileUrls.map((url, i) => `
          <a href="${url}" target="_blank" class="btn btn-sm btn-outline-danger me-1 mb-1">
            <i class="bi bi-file-earmark-pdf-fill"></i> ไฟล์ ${i + 1}
          </a>`).join('')
        : '<small class="text-muted">- ไม่มีไฟล์แนบ -</small>';

      const dirCmd = t.commandDisplay && t.commandDisplay !== '-'
        ? `<div class="alert alert-warning p-2 mt-2" style="border-left:3px solid #ffc107">
             <small class="fw-bold"><i class="bi bi-person-fill-exclamation"></i> ข้อสั่งการ ผอ.:</small><br>
             <span>${t.commandDisplay}</span>
           </div>`
        : '';

      return `
        <div class="col-md-6 mb-3">
          <div class="card shadow-sm h-100 border-start border-4 border-primary">
            <div class="card-body">
              <h5 class="card-title text-primary">${t.subject}</h5>
              <div class="d-flex justify-content-between mb-1">
                <span class="text-dark small"><strong>เลขที่:</strong> ${t.refNo || '-'}</span>
                <span class="text-muted small"><i class="bi bi-clock"></i> ${t.assignDate || '-'}</span>
              </div>
              ${dirCmd}
              <div class="mb-3">${fileHtml}</div>
              <hr class="mt-0">
              <div class="d-flex justify-content-end">
                <button class="btn btn-sm btn-primary"
                  onclick="docs.openReportModal('${t.taskId}','${t.subject.replace(/'/g,"\\'")}','${(t.refNo||'-').replace(/'/g,"\\'")}','${(t.commandDisplay||'-').replace(/'/g,"\\'")}')">
                  <i class="bi bi-send"></i> รายงานผล
                </button>
              </div>
            </div>
          </div>
        </div>`;
    }).join('');
  }

  function openReportModal(taskId, subject, refNo, command) {
    document.getElementById('rep-taskId').value = taskId;
    document.getElementById('rep-subject').textContent = subject;
    document.getElementById('rep-command').textContent = refNo || '-';

    const box     = document.getElementById('box-director-msg');
    const msgSpan = document.getElementById('rep-director-msg');
    if (command && command !== '-') {
      msgSpan.textContent = command;
      box.classList.remove('d-none');
    } else {
      box.classList.add('d-none');
    }

    document.getElementById('rep-msg').value  = '';
    document.getElementById('repFile').value  = '';
    new bootstrap.Modal(document.getElementById('modalTaskReport')).show();
  }

  async function submitTaskReport(e) {
    e.preventDefault();
    const btn   = document.getElementById('btn-rep-submit');
    const taskId = document.getElementById('rep-taskId').value;
    const msg   = document.getElementById('rep-msg').value;

    setBtnLoading(btn, true, 'กำลังส่งรายงาน...');
    const fileDataArray = await api.readFiles(document.getElementById('repFile'));
    const res = await api.call('submitTaskReport', { taskId, reportMsg: msg, fileDataArray });
    setBtnLoading(btn, false);

    if (res.status === 'success') {
      toast.success(res.message);
      bootstrap.Modal.getInstance(document.getElementById('modalTaskReport')).hide();
      loadMyTasks();
    } else {
      toast.error(res.message);
    }
  }

  // ============================================================
  // TRACKING — ติดตามสถานะ
  // ============================================================
  let trackingDataCache = [];

  async function loadTracking() {
    router.showOnly('tracking-section');
    const tbody = document.getElementById('tracking-table-body');
    tbody.innerHTML = '<tr><td colspan="6" class="text-center py-4"><div class="spinner-border text-secondary"></div></td></tr>';

    const user = auth.getUser();
    const data = await api.call('getTrackingData', { role: user.role, userId: user.id });
    if (!Array.isArray(data)) { toast.error('โหลดข้อมูลไม่สำเร็จ'); return; }

    trackingDataCache = data;
    renderTrackingTable(data);
  }

  function renderTrackingTable(data) {
    const tbody = document.getElementById('tracking-table-body');
    if (data.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" class="text-center py-4 text-muted">ไม่พบข้อมูล</td></tr>';
      return;
    }
    tbody.innerHTML = data.map(item => {
      const progressHtml = item.taskProgress !== '-'
        ? `<div class="progress" style="height:20px">
             <div class="progress-bar ${item.taskPercent===100?'bg-success':'bg-warning'}" style="width:${item.taskPercent}%">
               ${item.taskProgress}
             </div>
           </div>`
        : '-';

      return `
        <tr>
          <td class="text-nowrap">${item.date}</td>
          <td>
            <div class="fw-semibold">${item.subject}</div>
            <small class="text-muted">${item.refNo}</small>
          </td>
          <td class="text-center">${renderFileLinks(item.fileUrls, true)}</td>
          <td>${statusBadge(item.status)}</td>
          <td>${progressHtml}</td>
          <td>
            <button class="btn btn-sm btn-outline-info" onclick='docs.openTrackModal(${JSON.stringify(item)})'>
              <i class="bi bi-eye"></i>
            </button>
          </td>
        </tr>`;
    }).join('');
  }

  function filterTracking() {
    const kw = document.getElementById('search-input').value.toLowerCase();
    renderTrackingTable(trackingDataCache.filter(item =>
      item.subject.toLowerCase().includes(kw) || item.refNo.toLowerCase().includes(kw)
    ));
  }

  function openTrackModal(item) {
    document.getElementById('trk-subject').textContent = item.subject;
    const tbody = document.getElementById('trk-detail-body');

    if (!item.details?.length) {
      tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">ไม่ได้มีการมอบหมายงาน</td></tr>';
    } else {
      tbody.innerHTML = item.details.map(d => `
        <tr>
          <td>${d.assignee}</td>
          <td class="${d.status==='ดำเนินการแล้ว'?'text-success fw-bold':'text-danger'}">${d.status}</td>
          <td>${d.reportMsg || '-'}</td>
          <td>${d.finishTime}</td>
        </tr>`).join('');
    }
    new bootstrap.Modal(document.getElementById('modalTrackDetail')).show();
  }

  return {
    openRegisterModal, submitRegister,
    loadDeputyDocs, openDeputyModal, submitDeputyReview,
    loadDirectorDocs, openDirectorModal, submitDirectorCommand,
    loadMyTasks, openReportModal, submitTaskReport,
    loadTracking, filterTracking, openTrackModal
  };
})();
