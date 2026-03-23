// ═══════════════════════════════════════════════════════════════
// code.gs  —  E-Saraban Backend  (GitHub Pages Edition)
// โรงเรียนอนุบาลชุมแสง (วัดทับกฤชกลาง)
//
// LINE Notifications:
//  [A] มอบหมายงาน  → Flex Message 1:1 ถึงครูแต่ละคน
//  [B] ขอลา        → Flex Message 1:1 ถึง ผอ. ทันที
//  [C] อนุมัติลา   → Flex Message Group ประกาศกลุ่มโรงเรียน
//                  → Text 1:1 ถึงครูผู้ลา (+ PDF link)
//                  → Text 1:1 ถึงครูสอนแทนทุกคน
// ═══════════════════════════════════════════════════════════════

// ───────────────────────────────────────────────────────────────
// Script Properties ที่ต้องตั้งใน GAS
// GAS Editor → Project Settings → Script Properties
//
//  LINE_TOKEN       Channel Access Token ของ LINE Messaging API
//  LINE_GROUP_ID    Group ID กลุ่มไลน์โรงเรียน
//                   วิธีหา: พิมพ์ "groupid" ในกลุ่ม → บอทตอบ
//  TEMPLATE_ID      Google Doc ID แม่แบบใบลา
//  FOLDER_ID        Drive Folder ID เก็บ PDF ใบลา
//  DRIVE_FOLDER_ID  Drive Folder ID เก็บไฟล์แนบหนังสือ
//  SCHOOL_NAME      ชื่อโรงเรียน
//  APP_URL          URL GitHub Pages (ปุ่มเข้าระบบใน LINE)
// ───────────────────────────────────────────────────────────────
function getConfig() {
  var p = PropertiesService.getScriptProperties();
  return {
    LINE_TOKEN:      p.getProperty('LINE_TOKEN')      || '',
    LINE_GROUP_ID:   p.getProperty('LINE_GROUP_ID')   || '',
    TEMPLATE_ID:     p.getProperty('TEMPLATE_ID')     || '',
    FOLDER_ID:       p.getProperty('FOLDER_ID')       || '',
    DRIVE_FOLDER_ID: p.getProperty('DRIVE_FOLDER_ID') || '',
    SCHOOL_NAME:     p.getProperty('SCHOOL_NAME')     || 'โรงเรียนอนุบาลชุมแสง',
    APP_URL:         p.getProperty('APP_URL')         || ''
  };
}

function jsonOut(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
function doGet()  { return jsonOut({ status: 'ok', message: 'E-Saraban API running' }); }

function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents);
    if (body.events !== undefined && !body.action) return jsonOut(handleLineWebhook(body));
    var act = body.action;
    if (act !== 'checkLogin') {
      if (!validSession(body.sessionToken, body.userId))
        return jsonOut({ status: 'error', message: 'Session หมดอายุ กรุณาเข้าสู่ระบบใหม่' });
    }
    var res;
    switch (act) {
      case 'checkLogin':              res = checkLogin(body.username, body.password); break;
      case 'registerDocument':        res = registerDocument(body.formObj, body.fileDataArray); break;
      case 'getDeputyPendingDocs':    res = getDeputyPendingDocs(); break;
      case 'submitDeputyReview':      res = submitDeputyReview(body.docId, body.comment, body.userId); break;
      case 'getDirectorPendingDocs':  res = getDirectorPendingDocs(); break;
      case 'getTeacherList':          res = getTeacherList(); break;
      case 'submitDirectorCommand':   res = submitDirectorCommand(body.docId, body.command, body.teacherIds, body.userId); break;
      case 'getMyTasks':              res = getMyTasks(body.userId); break;
      case 'submitTaskReport':        res = submitTaskReport(body.taskId, body.reportMsg, body.fileDataArray); break;
      case 'getTrackingData':         res = getTrackingData(body.role, body.userId); break;
      case 'submitLeaveRequest':      res = submitLeaveRequest(body.form); break;
      case 'checkAndPropose':         res = checkAndPropose(body.leaveId, body.checkerId); break;
      case 'deputyReviewLeave':       res = deputyReviewLeave(body.leaveId, body.comment, body.deputyId); break;
      case 'directorApproveLeave':    res = directorApproveLeave(body.leaveId, body.directorId); break;
      case 'getPendingLeavesForRole': res = getPendingLeavesForRole(body.role); break;
      case 'getMyLeaves':             res = getMyLeaves(body.userId); break;
      case 'requestCancelLeave':      res = requestCancelLeave(body.leaveId, body.userId); break;
      case 'getAllTeacherStats':       res = getAllTeacherStats(); break;
      // ── Acting Director ──
      case 'setActingDirector':       res = setActingDirector(body.date, body.userId); break;
      case 'getActingDirectorList':   res = getActingDirectorList(); break;
      // ── Out Permission ──
      case 'submitOutPermission':     res = submitOutPermission(body.form); break;
      case 'approveOutPermission':    res = approveOutPermission(body.outId, body.userId); break;
      case 'rejectOutPermission':     res = rejectOutPermission(body.outId, body.userId, body.reason); break;
      case 'getOutPermissions':       res = getOutPermissions(body.role, body.userId); break;
      // ── Leave Stats (AcademicHead/PersonnelHead) ──
      case 'getLeaveStats':           res = getLeaveStats(body.role); break;
      case 'getPersonnelDashboard':   res = getPersonnelDashboard(); break;
      default: res = { status: 'error', message: 'Unknown action: ' + act };
    }
    return jsonOut(res);
  } catch (ex) {
    Logger.log('doPost error: ' + ex);
    return jsonOut({ status: 'error', message: 'Server error: ' + ex.toString() });
  }
}

// SESSION
function makeSession(uid)  { var t=Utilities.getUuid(); CacheService.getScriptCache().put('s_'+t,uid,28800); return t; }
function validSession(t,u) { return !!t && CacheService.getScriptCache().get('s_'+t)===u; }

// AUTH
function checkLogin(username, password) {
  var rows = ssheet().getSheetByName('Users').getDataRange().getValues();
  for (var i=1;i<rows.length;i++) {
    if (rows[i][1]==username && rows[i][2]==password)
      return { status:'success', message:'เข้าสู่ระบบสำเร็จ',
               user:{id:rows[i][0],name:rows[i][3],role:rows[i][4],position:rows[i][5]},
               sessionToken:makeSession(rows[i][0]) };
  }
  return { status:'error', message:'ชื่อผู้ใช้งานหรือรหัสผ่านไม่ถูกต้อง' };
}

function ssheet() { return SpreadsheetApp.getActiveSpreadsheet(); }

// ═══════════════════════════════════════════════════════════════
//  LINE API CORE
// ═══════════════════════════════════════════════════════════════

/** ส่ง Text ธรรมดา (1:1 หรือ Group) */
function lineText(to, text) {
  if (!to) return;
  var cfg = getConfig();
  if (!cfg.LINE_TOKEN) return;
  _push(cfg.LINE_TOKEN, to, [{ type:'text', text:text }]);
}

/** ส่ง Flex Message (1:1 หรือ Group)
 *  @param {string} to     LINE userId / groupId
 *  @param {string} alt    ข้อความใน notification bar
 *  @param {Object} bubble Flex bubble object
 */
function lineFlex(to, alt, bubble) {
  if (!to) return;
  var cfg = getConfig();
  if (!cfg.LINE_TOKEN) return;
  _push(cfg.LINE_TOKEN, to, [{ type:'flex', altText:alt, contents:bubble }]);
}

/** Reply ใน Webhook */
function lineReply(replyToken, text) {
  var cfg = getConfig();
  if (!cfg.LINE_TOKEN || !replyToken) return;
  try {
    UrlFetchApp.fetch('https://api.line.me/v2/bot/message/reply', {
      method:'post', muteHttpExceptions:true,
      headers:{'Content-Type':'application/json','Authorization':'Bearer '+cfg.LINE_TOKEN},
      payload:JSON.stringify({replyToken:replyToken, messages:[{type:'text',text:text}]})
    });
  } catch(e) { Logger.log('lineReply:'+e); }
}

function _push(token, to, messages) {
  try {
    var r = UrlFetchApp.fetch('https://api.line.me/v2/bot/message/push', {
      method:'post', muteHttpExceptions:true,
      headers:{'Content-Type':'application/json','Authorization':'Bearer '+token},
      payload:JSON.stringify({to:to, messages:messages})
    });
    if (r.getResponseCode()!==200) Logger.log('LINE '+r.getResponseCode()+': '+r.getContentText());
  } catch(e) { Logger.log('_push:'+e); }
}

// backward-compat
function sendLinePushMessage(to,msg)         { lineText(to,msg); }
function sendLineFlexMessage(to,alt,bubble)  { lineFlex(to,alt,bubble); }

// LINE WEBHOOK
function handleLineWebhook(data) {
  try {
    (data.events||[]).forEach(function(ev) {
      if (ev.type!=='message'||ev.message.type!=='text') return;
      var txt = ev.message.text.trim().toLowerCase();
      var src = ev.source;
      if (txt==='groupid') {
        lineReply(ev.replyToken, src.type==='group'
          ? '📍 Group ID:\n'+src.groupId+'\n\nใส่ใน Script Properties ชื่อ LINE_GROUP_ID'
          : '⚠️ กรุณาส่งคำสั่งนี้ในกลุ่มไลน์ที่ต้องการ');
        return;
      }
      if (txt==='id'||txt.includes('ลงทะเบียน')) {
        if (src.type==='user')
          lineReply(ev.replyToken,'🔑 LINE User ID:\n'+src.userId+'\n\nแจ้งเจ้าหน้าที่เพื่อลงทะเบียนรับการแจ้งเตือน');
      }
    });
  } catch(ex) { Logger.log('webhook:'+ex); }
  return {status:'ok'};
}

// ═══════════════════════════════════════════════════════════════
//  FLEX MESSAGE BUILDERS
// ═══════════════════════════════════════════════════════════════

// [A] แจ้งครูว่าได้รับมอบหมายงาน
function buildTaskFlex(teacherName, subject, refNo, command, schoolName, appUrl) {
  return {
    type:'bubble', size:'kilo',
    header:{
      type:'box', layout:'vertical', paddingAll:'14px', backgroundColor:'#1a56a0',
      contents:[
        {type:'text',text:'📋 มีงานมอบหมายใหม่',color:'#ffffff',size:'md',weight:'bold'},
        {type:'text',text:schoolName,color:'#cce0ff',size:'xs',margin:'xs'}
      ]
    },
    body:{
      type:'box', layout:'vertical', paddingAll:'16px', spacing:'md',
      contents:[
        {type:'box',layout:'vertical',paddingAll:'12px',backgroundColor:'#f0f4fb',cornerRadius:'10px',spacing:'sm',
          contents:[_row('เรียน',teacherName),_row('เรื่อง',subject),_row('เลขที่',refNo||'-')]},
        {type:'box',layout:'vertical',paddingAll:'10px',backgroundColor:'#fffbeb',cornerRadius:'10px',borderWidth:'1px',borderColor:'#f6c90e',
          contents:[
            {type:'text',text:'📌 คำสั่งการผู้อำนวยการ',size:'xs',color:'#b7791f',weight:'bold'},
            {type:'text',text:command||'-',size:'sm',color:'#1a202c',wrap:true,margin:'sm'}
          ]}
      ]
    },
    footer: appUrl ? {
      type:'box',layout:'vertical',paddingAll:'12px',
      contents:[{type:'button',style:'primary',color:'#1a56a0',height:'sm',
        action:{type:'uri',label:'📲 เข้าระบบรายงานผล',uri:appUrl}}]
    } : undefined
  };
}

// [B] แจ้ง ผอ. เมื่อมีคำขอลา
function buildLeaveNotifyFlex(requester, leaveType, startDate, endDate, days, reason, schoolName, appUrl) {
  var pals = {'ลาป่วย':{h:'#c53030',b:'#fc8181'},'ลากิจ':{h:'#c05621',b:'#f6ad55'},'ลาคลอด':{h:'#6b21a8',b:'#c084fc'}};
  var pal  = pals[leaveType] || {h:'#2d3748',b:'#a0aec0'};
  var icon = {'ลาป่วย':'🤒','ลากิจ':'📋','ลาคลอด':'👶'}[leaveType] || '📌';
  return {
    type:'bubble', size:'kilo',
    header:{
      type:'box',layout:'vertical',paddingAll:'14px',backgroundColor:pal.h,
      contents:[
        {type:'text',text:icon+' มีคำขอลาใหม่',color:'#fff',size:'md',weight:'bold'},
        {type:'text',text:schoolName,color:'rgba(255,255,255,0.75)',size:'xs',margin:'xs'}
      ]
    },
    body:{
      type:'box',layout:'vertical',paddingAll:'16px',spacing:'md',
      contents:[
        {type:'box',layout:'horizontal',spacing:'sm',
          contents:[
            {type:'box',layout:'vertical',paddingAll:'4px 10px',backgroundColor:pal.b,cornerRadius:'20px',
              contents:[{type:'text',text:leaveType,size:'xs',color:'#fff',weight:'bold'}]},
            {type:'text',text:days+' วัน',size:'sm',color:'#555',margin:'sm',gravity:'center'}
          ]},
        {type:'box',layout:'vertical',paddingAll:'12px',backgroundColor:'#f7fafc',cornerRadius:'10px',spacing:'sm',
          contents:[_row('ผู้ขอลา',requester),_row('วันที่เริ่ม',startDate),_row('วันสิ้นสุด',endDate)]},
        {type:'box',layout:'vertical',paddingAll:'10px',backgroundColor:'#f0f4f8',cornerRadius:'8px',
          contents:[
            {type:'text',text:'💬 เหตุผล',size:'xs',color:'#666',weight:'bold'},
            {type:'text',text:reason||'-',size:'sm',color:'#333',wrap:true,margin:'xs'}
          ]}
      ]
    },
    footer: appUrl ? {
      type:'box',layout:'vertical',paddingAll:'12px',
      contents:[{type:'button',style:'primary',color:pal.h,height:'sm',
        action:{type:'uri',label:'✅ เข้าระบบอนุมัติ',uri:appUrl}}]
    } : undefined
  };
}

// [C] ประกาศในกลุ่มไลน์โรงเรียน
function buildGroupAnnounceFlex(requester, leaveType, startDate, endDate, days, reason, subs, schoolName) {
  var icon   = {'ลาป่วย':'🤒','ลากิจ':'📋','ลาคลอด':'👶'}[leaveType]||'📌';
  var hCol   = {'ลาป่วย':'#c53030','ลากิจ':'#c05621','ลาคลอด':'#6b21a8'}[leaveType]||'#2d3748';
  var subRows = [];
  if (subs && subs.length) {
    subRows.push({type:'separator',margin:'md'});
    subRows.push({type:'text',text:'🔄 ครูสอนแทน',size:'xs',color:'#276749',weight:'bold',margin:'md'});
    subs.forEach(function(s) {
      subRows.push({type:'box',layout:'horizontal',margin:'xs',
        contents:[
          {type:'text',text:'คาบ '+s.hour,size:'xs',color:'#888',flex:2},
          {type:'text',text:s.name||s.id,size:'xs',color:'#2d3748',flex:5,wrap:true}
        ]});
    });
  }
  return {
    type:'bubble', size:'kilo',
    header:{
      type:'box',layout:'horizontal',paddingAll:'14px',backgroundColor:hCol,spacing:'md',
      contents:[
        {type:'text',text:icon,size:'xxl',flex:0},
        {type:'box',layout:'vertical',flex:1,contents:[
          {type:'text',text:'ประกาศการลาบุคลากร',color:'#fff',size:'sm',weight:'bold'},
          {type:'text',text:schoolName,color:'rgba(255,255,255,0.7)',size:'xxs',margin:'xs'}
        ]}
      ]
    },
    body:{
      type:'box',layout:'vertical',paddingAll:'16px',spacing:'sm',
      contents:[
        {type:'text',text:requester,size:'xl',weight:'bold',color:'#1a202c'},
        {type:'box',layout:'horizontal',spacing:'sm',margin:'xs',
          contents:[
            {type:'box',layout:'vertical',paddingAll:'3px 8px',backgroundColor:hCol,cornerRadius:'12px',
              contents:[{type:'text',text:leaveType,size:'xxs',color:'#fff',weight:'bold'}]},
            {type:'text',text:days+' วัน',size:'sm',color:'#555',gravity:'center',margin:'sm'}
          ]},
        {type:'box',layout:'horizontal',margin:'sm',
          contents:[
            {type:'text',text:'📅',size:'sm',flex:0},
            {type:'text',text:startDate+'  —  '+endDate,size:'sm',color:'#4a5568',margin:'sm',wrap:true}
          ]},
        {type:'box',layout:'vertical',paddingAll:'8px',backgroundColor:'#f7fafc',cornerRadius:'8px',margin:'sm',
          contents:[{type:'text',text:'💬 '+(reason||'-'),size:'xs',color:'#555',wrap:true}]},
      ].concat(subRows)
    }
  };
}

function _row(label, value) {
  return {type:'box',layout:'horizontal',
    contents:[
      {type:'text',text:label,size:'xs',color:'#888888',flex:3},
      {type:'text',text:value||'-',size:'sm',color:'#1a202c',flex:5,wrap:true,align:'end',weight:'bold'}
    ]};
}

// ═══════════════════════════════════════════════════════════════
//  USER HELPERS
// ═══════════════════════════════════════════════════════════════
function getLineIdsByRole(role) {
  var rows=ssheet().getSheetByName('Users').getDataRange().getValues(), ids=[];
  for (var i=1;i<rows.length;i++) if (rows[i][4]===role&&rows[i][6]) ids.push(rows[i][6]);
  return ids;
}
function getLineId(uid) {
  var rows=ssheet().getSheetByName('Users').getDataRange().getValues();
  for (var i=1;i<rows.length;i++) if (rows[i][0]==uid) return rows[i][6]||null;
  return null;
}
function getUserInfo(uid) {
  var rows=ssheet().getSheetByName('Users').getDataRange().getValues();
  for (var i=1;i<rows.length;i++) if (rows[i][0]==uid) return {name:rows[i][3],position:rows[i][5]};
  return {name:uid,position:'-'};
}
function getTokensByRole(r)    { return getLineIdsByRole(r); }
function getTokenByUserId(uid) { return getLineId(uid); }
function notifyRole(role,text) { getLineIdsByRole(role).forEach(function(id){lineText(id,text);}); }
function notifyRoleFlex(role,alt,bubble) { getLineIdsByRole(role).forEach(function(id){lineFlex(id,alt,bubble);}); }

// ═══════════════════════════════════════════════════════════════
//  DOCUMENTS
// ═══════════════════════════════════════════════════════════════
function registerDocument(formObj, fileDataArray) {
  try {
    var cfg=getConfig(), dSh=ssheet().getSheetByName('Documents'),
        lSh=ssheet().getSheetByName('Workflow_Logs'), urls=[];
    if (fileDataArray&&fileDataArray.length) {
      var folder=DriveApp.getFolderById(cfg.DRIVE_FOLDER_ID);
      fileDataArray.forEach(function(f){
        urls.push(folder.createFile(Utilities.newBlob(Utilities.base64Decode(f.content),f.type,f.name)).getUrl());
      });
    }
    var newId=nextDocId(dSh), now=new Date();
    dSh.appendRow([newId,formObj.refNo,formObj.docDate,formObj.subject,
      formObj.from,formObj.to,urls.join(',\n'),'รอรอง ผอ. พิจารณา',formObj.userId,now]);
    lSh.appendRow([Utilities.getUuid(),newId,formObj.userId,'Register','ลงทะเบียนรับหนังสือ',now]);
    getLineIdsByRole('Deputy').forEach(function(id){
      lineText(id,'🔔 มีหนังสือราชการเข้าใหม่\nเลขที่: '+formObj.refNo+'\nเรื่อง: '+formObj.subject+'\nสถานะ: รอพิจารณา');
    });
    return {status:'success',message:'ลงทะเบียนหนังสือเรียบร้อย รหัส: '+newId};
  } catch(e){return {status:'error',message:e.toString()};}
}

function nextDocId(sheet) {
  var last=sheet.getLastRow();
  if (last<=1) return 'DOC-001';
  var n=parseInt(sheet.getRange(last,1).getValue().toString().replace('DOC-',''),10)||0;
  return 'DOC-'+('000'+(n+1)).slice(-3);
}

function getDeputyPendingDocs() {
  var rows=ssheet().getSheetByName('Documents').getDataRange().getValues(), out=[];
  for (var i=1;i<rows.length;i++) {
    if (rows[i][7]!=='รอรอง ผอ. พิจารณา') continue;
    out.push({docId:rows[i][0],refNo:rows[i][1],date:fmtDate(rows[i][2]),
      subject:rows[i][3],from:rows[i][4],to:rows[i][5],fileUrls:rows[i][6]});
  }
  return out;
}

function submitDeputyReview(docId, comment, userId) {
  var dSh=ssheet().getSheetByName('Documents'), lSh=ssheet().getSheetByName('Workflow_Logs');
  var d=dSh.getDataRange().getValues();
  for (var i=1;i<d.length;i++) {
    if (d[i][0]!=docId) continue;
    dSh.getRange(i+1,8).setValue('รอ ผอ. สั่งการ');
    lSh.appendRow([Utilities.getUuid(),docId,userId,'Review',comment,new Date()]);
    getLineIdsByRole('Director').forEach(function(id){
      lineText(id,'🟡 รอง ผอ. เสนอความเห็นแล้ว\nรหัส: '+docId+'\nความเห็น: '+comment+'\nสถานะ: รอสั่งการ');
    });
    return {status:'success',message:'บันทึกและเสนอ ผอ. เรียบร้อยแล้ว'};
  }
  return {status:'error',message:'ไม่พบรหัสหนังสือ'};
}

function getTeacherList() {
  // แสดงบุคลากรทุกคน ยกเว้น Director
  var rows=ssheet().getSheetByName('Users').getDataRange().getValues(), out=[];
  for (var i=1;i<rows.length;i++) {
    if (rows[i][4]==='Director') continue; // ยกเว้น ผอ.
    if (!rows[i][0] || !rows[i][3]) continue; // ข้ามแถวว่าง
    out.push({id:rows[i][0], name:rows[i][3], role:rows[i][4], position:rows[i][5]});
  }
  return out;
}

function getDirectorPendingDocs() {
  var dR=ssheet().getSheetByName('Documents').getDataRange().getValues(),
      lR=ssheet().getSheetByName('Workflow_Logs').getDataRange().getValues(), out=[];
  for (var i=1;i<dR.length;i++) {
    if (dR[i][7]!=='รอ ผอ. สั่งการ') continue;
    var dId=dR[i][0], cmt='-';
    for (var j=lR.length-1;j>=0;j--) { if (lR[j][1]==dId&&lR[j][3]==='Review'){cmt=lR[j][4];break;} }
    out.push({docId:dId,refNo:dR[i][1],date:fmtDate(dR[i][2]),subject:dR[i][3],
      from:dR[i][4],fileUrls:dR[i][6],deputyComment:cmt});
  }
  return out;
}

// [A] มอบหมายงาน → Flex 1:1 ถึงครูแต่ละคน
function submitDirectorCommand(docId, command, teacherIds, userId) {
  var cfg=getConfig(), dSh=ssheet().getSheetByName('Documents'),
      lSh=ssheet().getSheetByName('Workflow_Logs'), tSh=ssheet().getSheetByName('Tasks');
  var dR=dSh.getDataRange().getValues(), info={subject:'-',refNo:'-'};
  for (var i=1;i<dR.length;i++) {
    if (dR[i][0]!=docId) continue;
    dSh.getRange(i+1,8).setValue('มอบหมายแล้ว');
    info={subject:dR[i][3],refNo:dR[i][1]};
    break;
  }
  lSh.appendRow([Utilities.getUuid(),docId,userId,'Command',command,new Date()]);
  teacherIds.forEach(function(tId) {
    tSh.appendRow([Utilities.getUuid(),docId,tId,'รอดำเนินการ','','','']);
    var lid=getLineId(tId);
    if (lid) {
      lineFlex(lid,'📋 มีงานมอบหมายใหม่: '+info.subject,
        buildTaskFlex(getUserInfo(tId).name,info.subject,info.refNo,command,cfg.SCHOOL_NAME,cfg.APP_URL));
    }
  });
  return {status:'success',message:'สั่งการและมอบหมายงานเรียบร้อยแล้ว'};
}

function getMyTasks(userId) {
  var tR=ssheet().getSheetByName('Tasks').getDataRange().getValues(),
      dR=ssheet().getSheetByName('Documents').getDataRange().getValues(),
      lR=ssheet().getSheetByName('Workflow_Logs').getDataRange().getValues();
  var cmdMap={}, dMap={};
  for (var k=1;k<lR.length;k++) if (lR[k][3]==='Command'&&lR[k][4]) cmdMap[lR[k][1].toString()]=lR[k][4];
  for (var i=1;i<dR.length;i++) {
    var raw=dR[i][6]?dR[i][6].toString():'';
    dMap[dR[i][0].toString()]={refNo:dR[i][1],subject:dR[i][3],
      fileUrls:raw?raw.split(',').map(function(x){return x.trim();}).filter(Boolean):[]};
  }
  var out=[];
  for (var i=1;i<tR.length;i++) {
    if (tR[i][2].toString()!==userId.toString()||tR[i][3]!=='รอดำเนินการ') continue;
    var dId=tR[i][1].toString(), dInf=dMap[dId]||{refNo:'-',subject:'ไม่พบข้อมูล',fileUrls:[]};
    out.push({taskId:tR[i][0],docId:dId,refNo:dInf.refNo,subject:dInf.subject,
      commandDisplay:cmdMap[dId]||'-',assignDate:fmtDate(tR[i][6]),status:tR[i][3],fileUrls:dInf.fileUrls});
  }
  return out;
}

function submitTaskReport(taskId, reportMsg, fileDataArray) {
  try {
    var cfg=getConfig(), tSh=ssheet().getSheetByName('Tasks'), urls=[];
    if (fileDataArray&&fileDataArray.length) {
      var folder=DriveApp.getFolderById(cfg.DRIVE_FOLDER_ID);
      fileDataArray.forEach(function(f){
        urls.push(folder.createFile(Utilities.newBlob(Utilities.base64Decode(f.content),f.type,f.name)).getUrl());
      });
    }
    var d=tSh.getDataRange().getValues();
    for (var i=1;i<d.length;i++) {
      if (d[i][0]!=taskId) continue;
      tSh.getRange(i+1,4).setValue('ดำเนินการแล้ว');
      tSh.getRange(i+1,5).setValue(reportMsg);
      tSh.getRange(i+1,6).setValue(urls.join(',\n'));
      tSh.getRange(i+1,7).setValue(new Date());
      return {status:'success',message:'รายงานผลเรียบร้อยแล้ว'};
    }
    return {status:'error',message:'ไม่พบรหัสงาน'};
  } catch(e){return {status:'error',message:e.toString()};}
}

function getTrackingData(role, userId) {
  var dR=ssheet().getSheetByName('Documents').getDataRange().getValues(),
      tR=ssheet().getSheetByName('Tasks').getDataRange().getValues(),
      uR=ssheet().getSheetByName('Users').getDataRange().getValues();
  var uMap={};
  for (var u=1;u<uR.length;u++) uMap[uR[u][0]]=uR[u][3];
  var out=[];
  for (var i=dR.length-1;i>=1;i--) {
    var dId=dR[i][0], raw=dR[i][6]?dR[i][6].toString():'';
    var lnks=raw?raw.split(',').map(function(x){return x.trim();}).filter(Boolean):[];
    var rel=[],cT=0,cD=0;
    for (var t=1;t<tR.length;t++) {
      if (tR[t][1]!=dId) continue;
      cT++; if (tR[t][3]==='ดำเนินการแล้ว') cD++;
      rel.push({assignee:uMap[tR[t][2]]||tR[t][2],status:tR[t][3],
        reportMsg:tR[t][4],finishTime:tR[t][6]?fmtDate(tR[t][6]):'-'});
    }
    out.push({docId:dId,date:fmtDate(dR[i][2]),refNo:dR[i][1],subject:dR[i][3],status:dR[i][7],
      taskProgress:cT>0?cD+'/'+cT:'-',taskPercent:cT>0?Math.round((cD/cT)*100):0,
      details:rel,fileUrls:lnks});
  }
  return out;
}

// ═══════════════════════════════════════════════════════════════
//  LEAVES
// ═══════════════════════════════════════════════════════════════

// [B] ขอลา → แจ้ง Admin (text) + แจ้ง ผอ. ทันที (Flex 1:1)
function submitLeaveRequest(form) {
  var cfg=getConfig(), lSh=ssheet().getSheetByName('Leaves');
  var tz=Session.getScriptTimeZone();
  var user=getUserInfo(form.userId);
  var newId='L-'+Utilities.formatDate(new Date(),tz,'yyMMddHHmm');
  var sDate=Utilities.formatDate(new Date(form.startDate),tz,'d MMM yyyy');
  var eDate=Utilities.formatDate(new Date(form.endDate),tz,'d MMM yyyy');
  lSh.appendRow([newId,form.userId,form.type,form.startDate,form.endDate,form.totalDays,
    form.reason,form.contact,JSON.stringify(form.substitutes||[]),'รอตรวจสอบ',
    JSON.stringify(getLastLeaveInfo(form.userId,form.type)),JSON.stringify(calcStats(form.userId)),'','','']);

  // 1. Admin — ข้อความธรรมดา
  notifyRole('Admin',
    '📝 มีคำขอลาใหม่ ('+form.type+')\n'
    +'จาก: '+user.name+'\n'
    +sDate+' — '+eDate+' ('+form.totalDays+' วัน)\n'
    +'เหตุผล: '+form.reason);

  // 2. ผอ. — Flex Message 1:1
  notifyRoleFlex('Director',
    '📝 '+user.name+' ขอ'+form.type+' '+form.totalDays+' วัน',
    buildLeaveNotifyFlex(user.name,form.type,sDate,eDate,form.totalDays,
      form.reason,cfg.SCHOOL_NAME,cfg.APP_URL));

  return {status:'success',message:'บันทึกคำขอเรียบร้อย รอเจ้าหน้าที่ตรวจสอบ'};
}

function checkAndPropose(leaveId, checkerId) {
  setLeaveStatus(leaveId,'รอความเห็นรองฯ',checkerId,13);
  notifyRole('Deputy','🔍 ใบลาผ่านตรวจสอบแล้ว\nรหัส: '+leaveId+'\nสถานะ: รอความเห็นรองผู้อำนวยการ');
  return {status:'success',message:'ตรวจสอบแล้ว ส่งต่อรองฯ เรียบร้อย'};
}

function deputyReviewLeave(leaveId, comment, deputyId) {
  setLeaveStatus(leaveId,'รออนุมัติ',deputyId,null);
  notifyRole('Director','🟡 รองฯ ให้ความเห็นแล้ว\nรหัส: '+leaveId+'\nสถานะ: รออนุมัติ');
  return {status:'success',message:'บันทึกความเห็นเรียบร้อย'};
}

// [C] อนุมัติลา → แจ้งครูผู้ลา + ครูสอนแทน + กลุ่มไลน์
function directorApproveLeave(leaveId, directorId) {
  var cfg=getConfig(), lSh=ssheet().getSheetByName('Leaves');
  var uRows=ssheet().getSheetByName('Users').getDataRange().getValues();
  var data=lSh.getDataRange().getValues();
  var tz=Session.getScriptTimeZone();
  var nameMap={};
  for (var u=1;u<uRows.length;u++) nameMap[uRows[u][0]]=uRows[u][3];

  for (var i=1;i<data.length;i++) {
    if (data[i][0]!=leaveId) continue;
    lSh.getRange(i+1,10).setValue('อนุมัติ');
    lSh.getRange(i+1,14).setValue(directorId);
    var lv={
      id:data[i][0],userId:data[i][1],type:data[i][2],
      start:Utilities.formatDate(data[i][3],tz,'d MMM yyyy'),
      end:Utilities.formatDate(data[i][4],tz,'d MMM yyyy'),
      days:data[i][5],reason:data[i][6],contact:data[i][7],
      subs:JSON.parse(data[i][8]||'[]'),
      last:JSON.parse(data[i][10]||'{}'),
      stats:JSON.parse(data[i][11]||'{}')
    };
    var requester=getUserInfo(lv.userId);
    var checker=getUserInfo(data[i][12]);
    var director=getUserInfo(directorId);
    var pdfUrl=makeLeavePdf(lv,requester,checker,'รองผู้อำนวยการ',director);
    lSh.getRange(i+1,15).setValue(pdfUrl);

    // 1. แจ้งครูเจ้าของใบลา (text + PDF)
    var ownerLine=getLineId(lv.userId);
    if (ownerLine) {
      lineText(ownerLine,
        '✅ ใบลาของคุณอนุมัติแล้ว!\n'
        +'─────────────────\n'
        +'📋 ประเภท: '+lv.type+'\n'
        +'📅 '+lv.start+' — '+lv.end+'\n'
        +'🗓️ จำนวน: '+lv.days+' วัน\n'
        +'─────────────────\n'
        +'📄 ดาวน์โหลดใบลา:\n'+pdfUrl);
    }

    // 2. แจ้งครูสอนแทนแต่ละคน (text)
    lv.subs.forEach(function(sub) {
      var sl=getLineId(sub.id);
      if (sl) lineText(sl,
        '🔔 แจ้งการสอนแทน\n'
        +'─────────────────\n'
        +'👩‍🏫 ครู '+requester.name+' '+lv.type+'\n'
        +'📅 '+lv.start+' — '+lv.end+'\n'
        +'⏰ คาบที่ '+sub.hour+' — กรุณาสอนแทนด้วยนะครับ/ค่ะ');
    });

    // 3. ประกาศกลุ่มไลน์โรงเรียน (Flex)
    if (cfg.LINE_GROUP_ID) {
      var subsNamed=lv.subs.map(function(s){return {id:s.id,hour:s.hour,name:nameMap[s.id]||s.id};});
      lineFlex(cfg.LINE_GROUP_ID,
        '📢 '+requester.name+' '+lv.type+' '+lv.days+' วัน ('+lv.start+' — '+lv.end+')',
        buildGroupAnnounceFlex(requester.name,lv.type,lv.start,lv.end,
          lv.days,lv.reason,subsNamed,cfg.SCHOOL_NAME));
    }
    return {status:'success',message:'อนุมัติและออกใบลาเรียบร้อย'};
  }
  return {status:'error',message:'ไม่พบรหัสใบลา'};
}

function getPendingLeavesForRole(role) {
  var lR=ssheet().getSheetByName('Leaves').getDataRange().getValues();
  var uR=ssheet().getSheetByName('Users').getDataRange().getValues();
  var uMap={};
  for (var u=1;u<uR.length;u++) uMap[uR[u][0]]=uR[u][3];
  var tgt={Admin:'รอตรวจสอบ',Deputy:'รอความเห็นรองฯ',Director:'รออนุมัติ'}[role]||'';
  var out=[];
  for (var i=lR.length-1;i>=1;i--) {
    if (lR[i][9]!==tgt) continue;
    out.push({id:lR[i][0],requester:uMap[lR[i][1]]||lR[i][1],type:lR[i][2],
      days:lR[i][5],reason:lR[i][6],status:lR[i][9],
      dates:fmtDate(lR[i][3])+' – '+fmtDate(lR[i][4])});
  }
  return out;
}

function getMyLeaves(userId) {
  var rows=ssheet().getSheetByName('Leaves').getDataRange().getValues();
  var tz=Session.getScriptTimeZone(), out=[];
  for (var i=rows.length-1;i>=1;i--) {
    if (rows[i][1]!=userId) continue;
    out.push({id:rows[i][0],type:rows[i][2],
      startDate:Utilities.formatDate(rows[i][3],tz,'yyyy-MM-dd'),
      displayDate:fmtDate(rows[i][3])+' – '+fmtDate(rows[i][4]),
      days:rows[i][5],status:rows[i][9],pdfUrl:rows[i][14]});
  }
  return out;
}

function requestCancelLeave(leaveId, userId) {
  var lSh=ssheet().getSheetByName('Leaves'), rows=lSh.getDataRange().getValues();
  for (var i=1;i<rows.length;i++) {
    if (rows[i][0]!=leaveId) continue;
    if (rows[i][1]!=userId) return {status:'error',message:'คุณไม่มีสิทธิ์ยกเลิกรายการนี้'};
    var dl=new Date(rows[i][3]); dl.setHours(8,0,0,0);
    if (new Date()>dl) return {status:'error',message:'ไม่สามารถยกเลิกได้ (เลยกำหนด 08:00 น. ของวันที่ลา)'};
    lSh.getRange(i+1,10).setValue('ยกเลิก');
    notifyRole('Admin','❌ '+getUserInfo(userId).name+' ยกเลิกใบลา\nรหัส: '+leaveId);
    return {status:'success',message:'ยกเลิกใบลาเรียบร้อยแล้ว'};
  }
  return {status:'error',message:'ไม่พบข้อมูลใบลา'};
}

function getAllTeacherStats() {
  var lR=ssheet().getSheetByName('Leaves').getDataRange().getValues();
  var uR=ssheet().getSheetByName('Users').getDataRange().getValues();
  var st={};
  for (var i=1;i<uR.length;i++)
    if (uR[i][4]!=='Director') st[uR[i][0]]={name:uR[i][3],sick:0,personal:0,birth:0,total:0};
  for (var i=1;i<lR.length;i++) {
    var uid=lR[i][1],d=parseFloat(lR[i][5])||0;
    if (!st[uid]||lR[i][9]!=='อนุมัติ') continue;
    if (lR[i][2]==='ลาป่วย') st[uid].sick+=d;
    if (lR[i][2]==='ลากิจ')  st[uid].personal+=d;
    if (lR[i][2]==='ลาคลอด') st[uid].birth+=d;
    st[uid].total+=d;
  }
  return Object.keys(st).map(function(k){return st[k];}).sort(function(a,b){return a.name.localeCompare(b.name);});
}

// ═══════════════════════════════════════════════════════════════
//  LEAVE HELPERS
// ═══════════════════════════════════════════════════════════════
function calcStats(userId) {
  var today=new Date(), fy=new Date(today.getFullYear(),9,1);
  if (today.getMonth()<9) fy.setFullYear(today.getFullYear()-1);
  var rows=ssheet().getSheetByName('Leaves').getDataRange().getValues();
  var s={sick:0,personal:0,birth:0};
  for (var i=1;i<rows.length;i++) {
    if (rows[i][1]!=userId||rows[i][9]!=='อนุมัติ'||new Date(rows[i][3])<fy) continue;
    var d=parseFloat(rows[i][5]);
    if (rows[i][2]==='ลาป่วย') s.sick+=d;
    if (rows[i][2]==='ลากิจ')  s.personal+=d;
    if (rows[i][2]==='ลาคลอด') s.birth+=d;
  }
  return s;
}

function getLastLeaveInfo(userId, type) {
  var rows=ssheet().getSheetByName('Leaves').getDataRange().getValues();
  var tz=Session.getScriptTimeZone();
  for (var i=rows.length-1;i>=1;i--) {
    if (rows[i][1]==userId&&rows[i][2]==type&&rows[i][9]=='อนุมัติ')
      return {dateStart:Utilities.formatDate(new Date(rows[i][3]),tz,'d MMM yy'),
              dateEnd:Utilities.formatDate(new Date(rows[i][4]),tz,'d MMM yy'),days:rows[i][5]};
  }
  return {dateStart:'-',dateEnd:'-',days:'-'};
}

function setLeaveStatus(leaveId, status, actorId, col) {
  var sh=ssheet().getSheetByName('Leaves'), d=sh.getDataRange().getValues();
  for (var i=1;i<d.length;i++) {
    if (d[i][0]!=leaveId) continue;
    sh.getRange(i+1,10).setValue(status);
    if (actorId&&col) sh.getRange(i+1,col).setValue(actorId);
    break;
  }
}

function makeLeavePdf(lv, user, checker, deputyTitle, director) {
  var cfg=getConfig(), tz=Session.getScriptTimeZone();
  var file=DriveApp.getFileById(cfg.TEMPLATE_ID).makeCopy('ใบลา_'+user.name);
  var body=DocumentApp.openById(file.getId()).getBody();
  var r={
    '{{date_full}}':Utilities.formatDate(new Date(),tz,'d MMMM yyyy'),
    '{{name}}':user.name,'{{position}}':user.position,
    '{{leave_type}}':lv.type,'{{reason}}':lv.reason,
    '{{start_date}}':lv.start,'{{end_date}}':lv.end,'{{total_days}}':String(lv.days),
    '{{contact_tel}}':lv.contact,
    '{{last_start}}':(lv.last||{}).dateStart||'-',
    '{{last_end}}':(lv.last||{}).dateEnd||'-',
    '{{last_total}}':String((lv.last||{}).days||'-'),
    '{{sick_taken}}':String((lv.stats||{}).sick||0),
    '{{sick_this}}':String(lv.type==='ลาป่วย'?lv.days:0),
    '{{sick_total}}':String(((lv.stats||{}).sick||0)+(lv.type==='ลาป่วย'?parseFloat(lv.days):0)),
    '{{personal_taken}}':String((lv.stats||{}).personal||0),
    '{{personal_this}}':String(lv.type==='ลากิจ'?lv.days:0),
    '{{personal_total}}':String(((lv.stats||{}).personal||0)+(lv.type==='ลากิจ'?parseFloat(lv.days):0)),
    '{{sig_user}}':user.name,
    '{{sig_checker}}':checker?checker.name:'',
    '{{sig_director}}':director?director.name:''
  };
  Object.keys(r).forEach(function(k){body.replaceText(k,r[k]);});
  var doc=DocumentApp.openById(file.getId());
  doc.saveAndClose();
  var pdfFile=DriveApp.getFolderById(cfg.FOLDER_ID).createFile(file.getAs(MimeType.PDF));
  file.setTrashed(true);
  return pdfFile.getUrl();
}

// ═══════════════════════════════════════════════════════════════
//  UTILITIES
// ═══════════════════════════════════════════════════════════════
function fmtDate(d) {
  if (!d) return '-';
  try{return Utilities.formatDate(new Date(d),Session.getScriptTimeZone(),'dd/MM/yyyy');}catch(e){return '-';}
}

// ═══════════════════════════════════════════════════════════════
//  TEST FUNCTIONS  — แก้ YOUR_LINE_ID ก่อนรัน
// ═══════════════════════════════════════════════════════════════
function TEST_taskFlex() {
  var cfg=getConfig();
  lineFlex('YOUR_LINE_ID','📋 ทดสอบมอบหมายงาน',
    buildTaskFlex('ครูทดสอบ','ทบทวนแผนการสอน ภาคเรียนที่ 2',
      'ศธ 04073/ว999','มอบฝ่ายวิชาการดำเนินการภายใน 3 วันทำการ',
      cfg.SCHOOL_NAME,cfg.APP_URL));
}
function TEST_leaveNotifyFlex() {
  var cfg=getConfig();
  lineFlex('YOUR_LINE_ID','📝 ทดสอบแจ้งขอลา',
    buildLeaveNotifyFlex('ครูทดสอบ','ลากิจ','10 มี.ค. 2569','10 มี.ค. 2569',
      1,'ไปธุระครอบครัว',cfg.SCHOOL_NAME,cfg.APP_URL));
}
function TEST_groupAnnounceFlex() {
  var cfg=getConfig();
  if (!cfg.LINE_GROUP_ID){Logger.log('ยังไม่ได้ตั้ง LINE_GROUP_ID');return;}
  lineFlex(cfg.LINE_GROUP_ID,'📢 ทดสอบประกาศการลา',
    buildGroupAnnounceFlex('ครูทดสอบ ระบบ','ลาป่วย','10 มี.ค. 2569','12 มี.ค. 2569',
      3,'เป็นไข้หวัดใหญ่',
      [{id:'u005',name:'ครูสมชาย ตัวอย่าง',hour:'1'},{id:'u006',name:'ครูสมหญิง ทดสอบ',hour:'3'}],
      cfg.SCHOOL_NAME));
}
function TEST_drive(){Logger.log(DriveApp.getFolderById(getConfig().DRIVE_FOLDER_ID).getName());}


// ═══════════════════════════════════════════════════════════════
//  ACTING DIRECTOR — ผู้รักษาการผู้อำนวยการ
// ═══════════════════════════════════════════════════════════════

/** ดึง userId ของผู้รักษาการ ณ วันนี้
 *  Sheet "ActingDirector" columns: A=Date, B=UserId
 *  ถ้าไม่มีรักษาการวันนั้น → ใช้ Director จริง
 */
function getActingDirectorId() {
  var tz  = Session.getScriptTimeZone();
  var today = Utilities.formatDate(new Date(), tz, 'yyyy-MM-dd');
  try {
    var sh   = ssheet().getSheetByName('ActingDirector');
    if (!sh) return null; // ไม่มี Sheet → ใช้ Director จริง
    var rows = sh.getDataRange().getValues();
    for (var i = 1; i < rows.length; i++) {
      var d = Utilities.formatDate(new Date(rows[i][0]), tz, 'yyyy-MM-dd');
      if (d === today && rows[i][1]) return rows[i][1].toString();
    }
  } catch(e) { Logger.log('getActingDirectorId: '+e); }
  return null;
}

/** ส่ง Line ถึงผู้รักษาการ (ถ้าไม่มี → ส่งถึง Director จริง)
 *  @param {string} alt    alt text
 *  @param {Object} bubble Flex bubble (ถ้าไม่ส่งจะเป็น text)
 *  @param {string} text   ข้อความธรรมดา (ถ้าไม่ใช้ Flex)
 */
function notifyActingOrDirector(alt, bubble, text) {
  var actId = getActingDirectorId();
  if (actId) {
    // มีรักษาการ → ส่งหารักษาการ
    if (bubble) lineFlex(actId, alt, bubble);
    else        lineText(actId, text);
  } else {
    // ไม่มีรักษาการ → ส่งหา Director ทุกคน
    if (bubble) notifyRoleFlex('Director', alt, bubble);
    else        notifyRole('Director', text);
  }
}

/** CRUD ActingDirector */
function setActingDirector(date, userId) {
  var sh = ssheet().getSheetByName('ActingDirector');
  if (!sh) return {status:'error', message:'ไม่พบ Sheet ActingDirector'};
  var tz   = Session.getScriptTimeZone();
  var dStr = Utilities.formatDate(new Date(date), tz, 'yyyy-MM-dd');
  var rows = sh.getDataRange().getValues();
  for (var i = 1; i < rows.length; i++) {
    var d = Utilities.formatDate(new Date(rows[i][0]), tz, 'yyyy-MM-dd');
    if (d === dStr) {
      sh.getRange(i+1, 2).setValue(userId);
      return {status:'success', message:'อัปเดตรักษาการเรียบร้อย'};
    }
  }
  sh.appendRow([date, userId]);
  return {status:'success', message:'บันทึกรักษาการเรียบร้อย'};
}

function getActingDirectorList() {
  var sh = ssheet().getSheetByName('ActingDirector');
  if (!sh) return [];
  var rows = sh.getDataRange().getValues();
  var uRows = ssheet().getSheetByName('Users').getDataRange().getValues();
  var uMap = {};
  for (var u=1;u<uRows.length;u++) uMap[uRows[u][0]] = uRows[u][3];
  var tz = Session.getScriptTimeZone();
  var out = [];
  for (var i=1;i<rows.length;i++) {
    if (!rows[i][0]) continue;
    out.push({
      date:   Utilities.formatDate(new Date(rows[i][0]), tz, 'dd/MM/yyyy'),
      userId: rows[i][1],
      name:   uMap[rows[i][1]] || rows[i][1]
    });
  }
  return out.reverse(); // ล่าสุดก่อน
}

// ═══════════════════════════════════════════════════════════════
//  OUT PERMISSION — ขออนุญาตออกนอกโรงเรียน
// ═══════════════════════════════════════════════════════════════

function submitOutPermission(form) {
  var cfg  = getConfig();
  var sh   = ssheet().getSheetByName('OutPermissions');
  var tz   = Session.getScriptTimeZone();
  var user = getUserInfo(form.userId);
  var newId = 'OUT-' + Utilities.formatDate(new Date(), tz, 'yyMMddHHmmss');

  // แปลงวันที่เป็นรูปแบบไทย dd/MM/yyyy
  var dateDisplay = '';
  try { dateDisplay = Utilities.formatDate(new Date(form.date), tz, 'dd/MM/yyyy'); }
  catch(e) { dateDisplay = form.date; }

  sh.appendRow([
    newId, form.userId,
    dateDisplay, form.timeOut, form.timeReturn,
    form.destination, form.reason, form.contact,
    'รอนุมัติ', Utilities.formatDate(new Date(), tz, 'dd/MM/yyyy HH:mm')
  ]);

  // Flex Card แจ้งผู้อำนวยการ หรือ รักษาการ
  var timeStr    = form.timeOut + ' — ' + form.timeReturn;
  var dateDisp   = dateDisplay || form.date;
  var bubble     = buildOutPermissionFlex(
    user.name, dateDisp, timeStr,
    form.destination, form.reason, cfg.SCHOOL_NAME, cfg.APP_URL
  );
  var alt = '🚗 '+user.name+' ขออนุญาตออกนอกโรงเรียน';

  // 1. แจ้งรักษาการ (ถ้ามี)
  var actId = getActingDirectorId();
  if (actId) lineFlex(actId, alt, bubble);

  // 2. แจ้ง Director ทุกคนเสมอ (ไม่ว่าจะมีรักษาการหรือไม่)
  notifyRoleFlex('Director', alt, bubble);

  // 3. แจ้ง Admin (text)
  notifyRole('Admin',
    '🚗 '+user.name+' ขออนุญาตออกนอกโรงเรียน\n'
    +'📅 '+dateDisp+' เวลา '+timeStr+'\n'
    +'📍 '+form.destination+'\n'
    +'เหตุผล: '+form.reason);

  return {status:'success', message:'บันทึกคำขอเรียบร้อยแล้ว'};
}

function approveOutPermission(outId, approverId) {
  var sh   = ssheet().getSheetByName('OutPermissions');
  var rows = sh.getDataRange().getValues();
  for (var i=1;i<rows.length;i++) {
    if (rows[i][0] != outId) continue;
    sh.getRange(i+1, 9).setValue('อนุมัติ');
    sh.getRange(i+1,11).setValue(approverId);
    var user = getUserInfo(rows[i][1]);
    var lid  = getLineId(rows[i][1]);
    if (lid) lineText(lid,
      '✅ คำขอออกนอกโรงเรียนของคุณได้รับการอนุมัติแล้ว\n'
      +'📅 '+rows[i][2]+' เวลา '+rows[i][3]+' — '+rows[i][4]+'\n'
      +'📍 '+rows[i][5]);
    return {status:'success', message:'อนุมัติเรียบร้อย'};
  }
  return {status:'error', message:'ไม่พบคำขอ'};
}

function rejectOutPermission(outId, approverId, reason) {
  var sh   = ssheet().getSheetByName('OutPermissions');
  var rows = sh.getDataRange().getValues();
  for (var i=1;i<rows.length;i++) {
    if (rows[i][0] != outId) continue;
    sh.getRange(i+1, 9).setValue('ไม่อนุมัติ');
    sh.getRange(i+1,11).setValue(approverId);
    var lid = getLineId(rows[i][1]);
    if (lid) lineText(lid,
      '❌ คำขอออกนอกโรงเรียนไม่ได้รับการอนุมัติ\n'
      +'📅 '+rows[i][2]+'\n'
      +'เหตุผล: '+reason);
    return {status:'success', message:'ไม่อนุมัติเรียบร้อย'};
  }
  return {status:'error', message:'ไม่พบคำขอ'};
}

function getOutPermissions(role, userId) {
  var sh    = ssheet().getSheetByName('OutPermissions');
  var rows  = sh.getDataRange().getValues();
  var uRows = ssheet().getSheetByName('Users').getDataRange().getValues();
  var uMap  = {};
  for (var u=1;u<uRows.length;u++) uMap[uRows[u][0]] = uRows[u][3];
  var out = [];
  for (var i=rows.length-1;i>=1;i--) {
    if (role==='Teacher' && rows[i][1]!=userId) continue;
    out.push({
      id:          rows[i][0],
      requester:   uMap[rows[i][1]] || rows[i][1],
      date:        rows[i][2],
      timeOut:     rows[i][3],
      timeReturn:  rows[i][4],
      destination: rows[i][5],
      reason:      rows[i][6],
      status:      rows[i][8]
    });
  }
  return out;
}

// ═══════════════════════════════════════════════════════════════
//  FLEX BUILDER — ขออนุญาตออกนอกโรงเรียน
// ═══════════════════════════════════════════════════════════════
function buildOutPermissionFlex(requester, date, timeStr, destination, reason, schoolName, appUrl) {
  return {
    type:'bubble', size:'kilo',
    header:{
      type:'box', layout:'horizontal', paddingAll:'14px',
      backgroundColor:'#2d6a4f', spacing:'md',
      contents:[
        {type:'text', text:'🚗', size:'xxl', flex:0},
        {type:'box', layout:'vertical', flex:1, contents:[
          {type:'text', text:'ขออนุญาตออกนอกโรงเรียน',
            color:'#fff', size:'sm', weight:'bold'},
          {type:'text', text:schoolName,
            color:'rgba(255,255,255,0.7)', size:'xxs', margin:'xs'}
        ]}
      ]
    },
    body:{
      type:'box', layout:'vertical', paddingAll:'16px', spacing:'md',
      contents:[
        {type:'text', text:requester, size:'xl', weight:'bold', color:'#1a202c'},
        {type:'box', layout:'vertical', paddingAll:'12px',
          backgroundColor:'#f0faf4', cornerRadius:'10px', spacing:'sm',
          contents:[
            _row('วันที่',     date),
            _row('เวลา',      timeStr),
            _row('สถานที่',   destination)
          ]},
        {type:'box', layout:'vertical', paddingAll:'10px',
          backgroundColor:'#f7fafc', cornerRadius:'8px',
          contents:[
            {type:'text', text:'💬 เหตุผล', size:'xs', color:'#666', weight:'bold'},
            {type:'text', text:reason||'-', size:'sm', color:'#333', wrap:true, margin:'xs'}
          ]}
      ]
    },
    footer: appUrl ? {
      type:'box', layout:'vertical', paddingAll:'12px',
      contents:[{type:'button', style:'primary', color:'#2d6a4f', height:'sm',
        action:{type:'uri', label:'✅ เข้าระบบอนุมัติ', uri:appUrl}}]
    } : undefined
  };
}

// ═══════════════════════════════════════════════════════════════
//  LEAVE STATS — สำหรับ AcademicHead และ PersonnelHead
// ═══════════════════════════════════════════════════════════════
function getLeaveStats(role) {
  var lRows = ssheet().getSheetByName('Leaves').getDataRange().getValues();
  var uRows = ssheet().getSheetByName('Users').getDataRange().getValues();
  var uMap  = {};
  for (var u=1;u<uRows.length;u++) uMap[uRows[u][0]] = uRows[u][3];
  var tz = Session.getScriptTimeZone();
  var out = [];
  // แสดงเฉพาะที่อนุมัติแล้ว
  for (var i=lRows.length-1;i>=1;i--) {
    if (lRows[i][9] !== 'อนุมัติ') continue;
    out.push({
      id:        lRows[i][0],
      requester: uMap[lRows[i][1]] || lRows[i][1],
      type:      lRows[i][2],
      startDate: Utilities.formatDate(new Date(lRows[i][3]), tz, 'dd/MM/yyyy'),
      endDate:   Utilities.formatDate(new Date(lRows[i][4]), tz, 'dd/MM/yyyy'),
      days:      lRows[i][5],
      reason:    lRows[i][6],
      status:    lRows[i][9]
    });
  }
  return out;
}

function getPersonnelDashboard() {
  var lRows = ssheet().getSheetByName('Leaves').getDataRange().getValues();
  var uRows = ssheet().getSheetByName('Users').getDataRange().getValues();
  var st    = {};
  for (var u=1;u<uRows.length;u++) {
    if (uRows[u][4] !== 'Director')
      st[uRows[u][0]] = {
        name: uRows[u][3], position: uRows[u][5],
        sick:0, personal:0, birth:0, total:0,
        history:[]
      };
  }
  var tz = Session.getScriptTimeZone();
  for (var i=1;i<lRows.length;i++) {
    var uid = lRows[i][1];
    if (!st[uid] || lRows[i][9]!=='อนุมัติ') continue;
    var d = parseFloat(lRows[i][5])||0;
    if (lRows[i][2]==='ลาป่วย')  st[uid].sick     += d;
    if (lRows[i][2]==='ลากิจ')   st[uid].personal += d;
    if (lRows[i][2]==='ลาคลอด') st[uid].birth    += d;
    st[uid].total += d;
    st[uid].history.push({
      type:      lRows[i][2],
      startDate: Utilities.formatDate(new Date(lRows[i][3]), tz, 'dd/MM/yyyy'),
      endDate:   Utilities.formatDate(new Date(lRows[i][4]), tz, 'dd/MM/yyyy'),
      days:      lRows[i][5]
    });
  }
  return Object.keys(st).map(function(k){return st[k];})
    .sort(function(a,b){return b.total-a.total;});
}
