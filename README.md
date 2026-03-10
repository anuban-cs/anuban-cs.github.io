# ระบบสารบรรณอิเล็กทรอนิกส์ (E-Saraban)
### โรงเรียนอนุบาลชุมแสง (วัดทับกฤชกลาง)

---

## โครงสร้างไฟล์ทั้งหมด

```
esaraban/                        ← root (deploy ขึ้น GitHub Pages ทั้งโฟลเดอร์นี้)
│
├── index.html                   ← หน้าเว็บหลัก (HTML + Bootstrap + Modals ทั้งหมด)
├── config.js                    ← ⚙️  ตั้งค่า URL — แก้ไฟล์นี้ไฟล์เดียว
│
├── css/
│   └── style.css                ← Custom styles, Login card, Cards, Toast, Responsive
│
├── js/
│   ├── api.js                   ← HTTP fetch() wrapper แทน google.script.run ทุกจุด
│   ├── auth.js                  ← Login / Logout / Session (localStorage)
│   ├── ui.js                    ← Toast notifications, Loading overlay, Confirm dialog
│   ├── documents.js             ← ระบบสารบรรณ (ลงทะเบียน/พิจารณา/สั่งการ/รายงาน/ติดตาม)
│   ├── leaves.js                ← ระบบการลา (ขอลา/ตรวจสอบ/พิจารณา/อนุมัติ/สถิติ)
│   └── app.js                   ← Main controller, Menu generator, Event listeners
│
├── code.gs                      ← 🔧 Google Apps Script Backend
│                                   (copy วางใน GAS — ไม่ได้ deploy ขึ้น GitHub)
└── README.md                    ← คู่มือนี้
```

---

## สถาปัตยกรรมระบบ

```
GitHub Pages                    Google Apps Script (GAS)
┌─────────────────┐  fetch()    ┌──────────────────────┐
│  index.html     │ ──────────► │  doPost(e)           │
│  config.js      │  POST JSON  │  ├─ checkLogin        │
│  js/api.js      │ ◄────────── │  ├─ registerDocument  │
│  js/auth.js     │  JSON resp  │  ├─ submitLeaveRequest│
│  js/documents.js│             │  └─ ...              │
│  js/leaves.js   │             └──────────────────────┘
└─────────────────┘                        │
                                           ▼
                              ┌─────────────────────────┐
                              │  Google Sheets (DB)      │
                              │  ├─ Users                │
                              │  ├─ Documents            │
                              │  ├─ Workflow_Logs        │
                              │  ├─ Tasks                │
                              │  └─ Leaves               │
                              └─────────────────────────┘
                                           │
                              ┌─────────────────────────┐
                              │  LINE Messaging API      │
                              │  [A] มอบหมายงาน → Flex  │
                              │      1:1 ถึงครูแต่ละคน  │
                              │  [B] ขอลา → Flex 1:1    │
                              │      ถึง ผอ. ทันที       │
                              │  [C] อนุมัติลา → Flex   │
                              │      ประกาศกลุ่มโรงเรียน │
                              └─────────────────────────┘
```

---

## วิธีติดตั้ง (ทำครั้งเดียว)

### ขั้นตอนที่ 1 — เตรียม LINE Official Account

1. ไปที่ https://developers.line.biz/console/
2. สร้าง Provider → สร้าง Channel (เลือก **Messaging API**)
3. เปิด **Channel** → แท็บ **Messaging API**
4. เลื่อนหา **Channel access token** → กด **Issue** → คัดลอกไว้
5. เปิดฟีเจอร์ **Allow bot to join group chats** (ในแท็บ Messaging API)
6. เพิ่มบอทเข้ากลุ่มไลน์โรงเรียน

> **วิธีหา LINE User ID ของครูแต่ละคน**
> ให้ครูแต่ละคนเพิ่มเพื่อนบอท แล้วส่งข้อความว่า `id`
> บอทจะตอบกลับ LINE User ID → นำไปใส่คอลัมน์ LineToken ใน Google Sheets

> **วิธีหา Group ID ของกลุ่มโรงเรียน**
> เพิ่มบอทเข้ากลุ่ม แล้วพิมพ์ `groupid` ในกลุ่ม
> บอทจะตอบ Group ID → นำไปใส่ Script Properties

---

### ขั้นตอนที่ 2 — ตั้งค่า Google Apps Script

1. เปิด Google Sheets ที่ใช้เป็นฐานข้อมูล (ต้องมี Sheet: **Users, Documents, Workflow_Logs, Tasks, Leaves**)
2. ไปที่ **Extensions → Apps Script**
3. ลบโค้ดเดิมทั้งหมด แล้ว **paste โค้ดจาก `code.gs`**
4. ไปที่ **Project Settings (ไอคอนฟัน)** → **Script Properties** → **Add script property**
5. เพิ่ม Properties ดังนี้:

| Property Key    | ค่าที่ต้องใส่                              | ตัวอย่าง                              |
|----------------|------------------------------------------|---------------------------------------|
| `LINE_TOKEN`    | Channel Access Token ของ LINE Bot        | `eXXXXXXXXXXXXXXXXXXXXX...`          |
| `LINE_GROUP_ID` | Group ID ของกลุ่มไลน์โรงเรียน           | `C1234567890abcdef1234567890abcdef12` |
| `TEMPLATE_ID`   | Google Doc ID แม่แบบใบลา                | `1HgI0Is7Zt5d3Zt...`                  |
| `FOLDER_ID`     | Drive Folder ID เก็บ PDF ใบลา           | `1ROReQavDC5yn...`                    |
| `DRIVE_FOLDER_ID` | Drive Folder ID เก็บไฟล์แนบหนังสือ  | `1nETBibZnbjXlz...`                   |
| `SCHOOL_NAME`   | ชื่อโรงเรียน                             | `โรงเรียนอนุบาลชุมแสง`                |
| `APP_URL`       | URL ของ GitHub Pages (ปุ่มใน LINE card) | `https://username.github.io/esaraban/`|

6. **Deploy → New Deployment**
   - Type: **Web App**
   - Execute as: **Me** (บัญชี Google ของคุณ)
   - Who has access: **Anyone**  ← ⚠️ สำคัญมาก ต้องเลือก Anyone
7. กด **Deploy** → คัดลอก **Web App URL**

---

### ขั้นตอนที่ 3 — ตั้งค่า LINE Webhook

1. กลับไปที่ https://developers.line.biz/console/
2. เปิด Channel → แท็บ **Messaging API**
3. หา **Webhook URL** → กด **Edit** → วาง Web App URL จากขั้นตอนที่ 2
4. กด **Update** → กด **Verify** (ควรขึ้น Success)
5. เปิด **Use webhook** เป็น ON

---

### ขั้นตอนที่ 4 — ตั้งค่า Frontend

แก้ไขไฟล์ `config.js`:

```javascript
const APP_CONFIG = {
  GAS_URL: 'https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec',
  //        ↑ วาง Web App URL จากขั้นตอนที่ 2 ตรงนี้
  APP_NAME: 'ระบบสารบรรณอิเล็กทรอนิกส์',
  SCHOOL_NAME: 'โรงเรียนอนุบาลชุมแสง (วัดทับกฤชกลาง)',
  SESSION_KEY: 'esaraban_session',
  SESSION_TIMEOUT_HOURS: 8
};
```

---

### ขั้นตอนที่ 5 — Deploy ขึ้น GitHub Pages

```bash
# 1. สร้าง Repository ใหม่บน GitHub (ชื่ออะไรก็ได้ เช่น esaraban)
# 2. Push ไฟล์ทั้งหมด ยกเว้น code.gs
git init
git add index.html config.js css/ js/ README.md
git commit -m "Initial deploy E-Saraban"
git remote add origin https://github.com/YOUR_USERNAME/esaraban.git
git push -u origin main

# 3. ไปที่ GitHub Repository → Settings → Pages
#    Source: Deploy from a branch
#    Branch: main  /  (root)
#    กด Save
```

URL ระบบจะเป็น: `https://YOUR_USERNAME.github.io/esaraban/`

> คัดลอก URL นี้ไปใส่ใน Script Properties ชื่อ `APP_URL` และใน `config.js` ด้วย

---

## โครงสร้าง Google Sheets (Database)

### Sheet: Users
| Col | ชื่อ | ตัวอย่าง |
|-----|------|--------|
| A | UserID | U001 |
| B | Username | teacher01 |
| C | Password | pass1234 |
| D | FullName | นางสาวสมใจ รักเรียน |
| E | Role | Teacher / Admin / Deputy / Director |
| F | Position | ครูวิชาการ |
| G | LineToken | **LINE User ID** ของบุคลากรคนนั้น |

### Roles ที่รองรับ
| Role | สิทธิ์ |
|------|--------|
| `Director` | สั่งการ / อนุมัติทุกอย่าง / ดูสถิติ |
| `Deputy` | เกษียนหนังสือ / พิจารณาใบลา |
| `Admin` | ลงทะเบียนหนังสือ / ตรวจสอบใบลา |
| `Teacher` | รับงาน-รายงาน / ขอลา |

---

## LINE Notifications ที่ระบบส่ง

### [A] มอบหมายงาน → ครูแต่ละคน (Flex Message 1:1)
เมื่อ ผอ. กดยืนยันสั่งการ ระบบส่งการ์ด LINE ถึงครูทุกคนที่ถูกมอบหมายทันที พร้อมปุ่มเข้าระบบรายงานผล

### [B] ขอลา → ผอ. ทันที (Flex Message 1:1)
เมื่อครูยื่นใบลา ระบบแจ้ง Admin (ข้อความธรรมดา) และส่งการ์ดสีสวยถึง ผอ. ทันที ให้รับทราบล่วงหน้าก่อนเอกสารจะถึงมือ

### [C] อนุมัติลา → 3 ช่องทาง
เมื่อ ผอ. กดอนุมัติใบลา ระบบส่งพร้อมกัน 3 อย่าง:
- ครูผู้ลา → ข้อความยืนยัน + link ดาวน์โหลด PDF ใบลา
- ครูสอนแทนแต่ละคน → แจ้งคาบที่ต้องสอนแทน
- กลุ่มไลน์โรงเรียน → การ์ดประกาศ (แสดงชื่อครู ประเภทลา ช่วงวันที่ รายชื่อครูสอนแทน)

---

## การแก้ปัญหาเบื้องต้น

| ปัญหา | วิธีแก้ |
|-------|---------|
| Login แล้วขึ้น "ไม่สามารถเชื่อมต่อ" | ตรวจ `GAS_URL` ใน `config.js` ให้ถูกต้อง |
| CORS error ใน Console | Redeploy GAS ให้ตั้ง Who has access: **Anyone** |
| LINE ไม่ได้รับข้อความ | ตรวจ `LINE_TOKEN` และ LineToken ของครูใน Sheets |
| กลุ่มไม่ได้รับประกาศ | ตรวจ `LINE_GROUP_ID` และตรวจว่าบอทอยู่ในกลุ่มแล้ว |
| Webhook Verify ไม่ผ่าน | ตรวจสอบว่า GAS Deploy เป็น **Anyone** และ URL ถูกต้อง |
| ไฟล์แนบ Upload ไม่ได้ | ตรวจ `DRIVE_FOLDER_ID` ใน Script Properties |
| Session หมดอายุเร็วเกินไป | แก้ `SESSION_TIMEOUT_HOURS` ใน `config.js` |

---

## ทดสอบ LINE ก่อน Deploy จริง

ใน GAS Editor → เลือก Function แล้วกด ▶️ Run:

```javascript
// ทดสอบส่ง Flex มอบหมายงาน (แก้ YOUR_LINE_ID ก่อน)
TEST_taskFlex()

// ทดสอบส่ง Flex แจ้งคำขอลา
TEST_leaveNotifyFlex()

// ทดสอบส่ง Flex ประกาศกลุ่มโรงเรียน
TEST_groupAnnounceFlex()
```

แก้ `'YOUR_LINE_ID'` ใน `code.gs` ให้เป็น LINE User ID ของตัวเองก่อน แล้วค่อย Run ทดสอบ

---

*พัฒนาโดย นายมงคล อู๋สูงเนิน ผู้อำนวยการโรงเรียนอนุบาลชุมแสง (วัดทับกฤชกลาง)*
