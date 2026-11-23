# ค้นหารายการตรวจทางห้องปฏิบัติการ

ระบบค้นหารายการแล็บ + สรุปภาชนะที่ต้องเตรียม  
รองรับ **ฐานข้อมูล Neon Postgres**, ขึ้น **Vercel**, และเก็บโค้ดบน **GitHub**

---

## สิ่งที่ได้

| ส่วน | รายละเอียด |
|---|---|
| หน้าเว็บ | `index.html` — UI ค้นหา / เลือก / สรุปภาชนะ |
| หลังบ้าน | `admin.html` — ล็อกอิน / เพิ่ม-แก้-ลบ / seed |
| API | `GET /api/labs`, ` /api/admin` |
| ฐานข้อมูล | Neon Postgres (`DATABASE_URL`) |
| Seed | `npm run seed` หรือปุ่มในหลังบ้าน |
| Fallback | ถ้ายังไม่ตั้ง DB จะใช้ `data/labs.json` |

---

## 1) เตรียมเครื่อง (ครั้งแรก)

ต้องมี Node.js แล้วรัน:

```bash
cd c:\xampp\htdocs\LAB
npm install
copy .env.example .env.local
```

รันแบบท้องถิ่น (ยังไม่ต้องมี DB ก็ได้):

```bash
npm run dev
```

เปิด [http://localhost:3000](http://localhost:3000)

หลังบ้าน: [http://localhost:3000/admin](http://localhost:3000/admin)  
รหัสเข้าสู่ระบบ = ค่า `ADMIN_SECRET` ใน `.env.local`

> บน XAMPP เดิม (`http://localhost/LAB/`) หน้าค้นหายังใช้ได้จาก JSON  
> แต่หลังบ้านต้องรันผ่าน `npm run dev` หรือ Vercel เพราะใช้ API ของ Node

---

## หลังบ้าน (Admin)

1. เปิด `/admin`
2. ใส่ `ADMIN_SECRET`
3. จัดการรายการได้:
   - ดูจำนวนรายการ
   - เพิ่ม / แก้ไข / ลบ
   - ค้นในตาราง
   - กด **Seed ใหม่จาก JSON** เพื่อโหลดชุดข้อมูลตั้งต้นกลับมา

รหัสถูกเก็บใน `sessionStorage` ของเบราว์เซอร์ (ปิดแท็บแล้วต้องล็อกอินใหม่)

---

## 2) สร้างฐานข้อมูล (Neon — ฟรี)

1. สมัคร/เข้า [https://neon.tech](https://neon.tech)
2. สร้างโปรเจกต์ใหม่ (เลือก region ใกล้ เช่น Singapore)
3. คัดลอก **Connection string** (URI)
4. วางใน `.env.local`:

```env
DATABASE_URL=postgresql://USER:PASSWORD@HOST/neondb?sslmode=require
ADMIN_SECRET=ใส่รหัสลับยาวๆของคุณ
```

5. สร้างตาราง + นำเข้าข้อมูล:

```bash
npm run db:schema
npm run seed
```

ควรเห็นประมาณ `Seed เสร็จแล้ว: 208 รายการ`

แก้ข้อมูลภายหลังได้ที่ Neon Console → Tables → `labs`

### คอลัมน์ในตาราง `labs`

| คอลัมน์ | ความหมาย |
|---|---|
| `test_name` | รายการตรวจ |
| `specimen_type` | ประเภทสิ่งส่งตรวจ |
| `container` | ภาชนะเก็บสิ่งส่งตรวจ (ต้องมีคำบอกสี เช่น ม่วง/แดง) |
| `price` | ราคา |
| `tat` | ระยะเวลารอผล |
| `description` | คำอธิบายเพิ่มเติม / ลิงก์ |
| `category` | หมวดหมู่ใบ Lab |

---

## 3) เก็บขึ้น GitHub

```bash
cd c:\xampp\htdocs\LAB
git init
git add .
git commit -m "Initial lab search app with Neon + Vercel support"
```

สร้าง repo บน GitHub แล้ว:

```bash
git branch -M main
git remote add origin https://github.com/<USERNAME>/<REPO>.git
git push -u origin main
```

**อย่า commit ไฟล์** `.env` / `.env.local` (มีใน `.gitignore` แล้ว)

---

## 4) Deploy ขึ้น Vercel

1. เข้า [https://vercel.com](https://vercel.com) → **Add New Project**
2. Import จาก GitHub repo นี้
3. Framework Preset: **Other** (ไม่เป็นไร)
4. ใส่ Environment Variables:

| Name | Value |
|---|---|
| `DATABASE_URL` | connection string จาก Neon |
| `ADMIN_SECRET` | รหัสลับเดียวกับ `.env.local` |

5. กด **Deploy**
6. ได้ลิงก์ประมาณ `https://your-app.vercel.app`

### Seed ข้อมูลบน production (ครั้งแรก)

หลัง deploy แล้วรันบนเครื่อง (ชี้ไปที่ DATABASE_URL ชุดเดียวกับ Vercel):

```bash
npm run seed
```

หรือเรียก API:

```bash
curl -X POST https://your-app.vercel.app/api/labs ^
  -H "Content-Type: application/json" ^
  -H "x-admin-secret: YOUR_ADMIN_SECRET" ^
  -d "{\"action\":\"seed\",\"replace\":true}"
```

ตรวจสุขภาพระบบ: `https://your-app.vercel.app/api/health`

---

## วิธีใช้งานหน้าเว็บ

1. พิมพ์ชื่อแล็บ เช่น `CBC`, `HbA1c`
2. กด **+ เลือก**
3. ดูสรุปภาชนะด้านขวา (มือถือใช้แถบล่าง)
4. ปรับขนาดตัวอักษรด้วย A− / A+

---

## API

### `GET /api/labs`
คืนค่าเป็น array:

```json
[
  ["รายการตรวจ", "ประเภทสิ่งส่งตรวจ", "ภาชนะเก็บสิ่งส่งตรวจ", "..."],
  ["CBC", "Blood", "K3-EDTA Tube (ม่วง)", "..."]
]
```

Header `X-Lab-Source`: `database` | `json` | `database-empty`

### `GET /api/health`
บอกว่าตั้ง DB แล้วหรือยัง

### `POST /api/labs` (ต้องมี `x-admin-secret`)

Seed ใหม่:

```json
{ "action": "seed", "replace": true }
```

---

## โครงสร้างโปรเจกต์

```
LAB/
├── index.html          # หน้าเว็บ
├── data/labs.json      # ข้อมูลสำรอง + ใช้ seed
├── api/
│   ├── labs.js         # GET/POST labs
│   └── health.js
├── lib/labs.js         # เชื่อม Neon + fallback JSON
├── sql/schema.sql      # schema อ้างอิง
├── scripts/
│   ├── dev-server.mjs  # npm run dev
│   ├── seed.mjs        # npm run seed
│   └── apply-schema.mjs
├── gas/                # เวอร์ชัน Google Apps Script (อ้างอิง)
├── package.json
├── vercel.json
├── .env.example
└── README.md
```

---

## แก้ปัญหาเร็วๆ

| อาการ | แก้ |
|---|---|
| `npm` ไม่รู้จัก | เปิดเทอร์มินัลใหม่หลังติดตั้ง Node |
| API 500 บน Vercel | ตรวจ `DATABASE_URL` ใน Project → Settings → Environment Variables แล้ว Redeploy |
| ได้ 0 รายการจาก DB | รัน `npm run seed` |
| หน้าเว็บโหลดไม่ได้บน XAMPP API | ปกติ — ใช้ fallback JSON หรือรัน `npm run dev` |
| Unauthorized ตอน seed ผ่าน API | ตรวจ header `x-admin-secret` ให้ตรงกับ `ADMIN_SECRET` |
