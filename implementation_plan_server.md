# خطة ترقية نظام تهيئة التجار - النسخة النهائية المعتمدة
> آخر تحديث: 29/04/2026 (راجع [WORKFLOW_V2.md](./docs/WORKFLOW_V2.md) للحصول على دورة العمل الأحدث المكونة من 7 مراحل)

## الوضع الحالي → الهدف

| البند | الآن | بعد التنفيذ |
|-------|------|-------------|
| قاعدة البيانات | SQLite (ملف محلي) | PostgreSQL |
| تسجيل الدخول | اختيار دور بدون كلمة مرور | Username + Password + JWT |
| MFA | غير موجود | TOTP (Google Authenticator) اختياري لكل مستخدم |
| الفروع | نص ثابت | جدول مُدار من Admin Panel |
| المستخدمون | غير موجودين في DB | جدول مُدار بأدوار محددة |
| عزل البيانات | لا يوجد | كل فرع يرى طلباته فقط |
| النشر | محلي فقط | Linux + PM2 + Nginx |

---

## تدفق العمل المعتمد (Workflow)

```
مسئول المبيعات (BRANCH_SALES)
    │
    ▼ يُنشئ الطلب
مشرف خدمة العملاء (BRANCH_SUPERVISOR)
    │
    ├──► يعتمد ويرسل للعمليات ──► إدارة العمليات (OPERATIONS)
    │                                    │
    │                                    ├──► يفعّل التاجر + MID = ✅ مكتمل
    │                                    ├──► يرجع للفرع ──► مشرف خدمة العملاء
    │                                    └──► يرفض = ❌ مرفوض
    │
    └──► يرجع للمبيعات للتعديل ──► مسئول المبيعات

مدير الفرع (BRANCH_MANAGER)     → Dashboard فرعه فقط (للاطلاع)
الإدارة العليا (MANAGEMENT)      → Dashboard كل الفروع (للاطلاع)
مدير النظام (ADMIN)              → إدارة كاملة + Admin Panel
```

### ملخص الصلاحيات:

| الدور | إنشاء طلب | مراجعة/اعتماد | تفعيل MID | Dashboard فرع | Dashboard عام | Admin Panel |
|-------|:---------:|:-------------:|:---------:|:-------------:|:-------------:|:-----------:|
| ADMIN | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| BRANCH_SALES | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| BRANCH_SUPERVISOR | ❌ | ✅ | ❌ | ✅ | ❌ | ❌ |
| BRANCH_MANAGER | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ |
| OPERATIONS | ❌ | ✅ | ✅ | ❌ | ✅ | ❌ |
| MANAGEMENT | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ |

---

## المرحلة 1: إعادة هيكلة قاعدة البيانات

### [MODIFY] prisma/schema.prisma

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

enum UserRole {
  ADMIN
  BRANCH_SALES
  BRANCH_SUPERVISOR
  BRANCH_MANAGER
  OPERATIONS
  MANAGEMENT
}

model Branch {
  id          String   @id @default(cuid())
  name        String   @unique
  code        String   @unique
  governorate String
  address     String?
  phone       String?
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  users       User[]
  requests    OnboardingRequest[]
}

model User {
  id           String   @id @default(cuid())
  username     String   @unique
  passwordHash String
  fullName     String
  role         UserRole
  isActive     Boolean  @default(true)
  branchId     String?
  branch       Branch?  @relation(fields: [branchId], references: [id])

  // MFA (TOTP)
  mfaEnabled   Boolean  @default(false)
  mfaSecret    String?              // TOTP secret (encrypted)
  mfaVerified  Boolean  @default(false) // تم التفعيل والتحقق بنجاح

  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  createdRequests  OnboardingRequest[] @relation("CreatedBy")
  historyEntries   StageHistory[]      @relation("ChangedByUser")
}

model OnboardingRequest {
  id                   String   @id @default(cuid())

  // بيانات التاجر
  merchantNameAr       String
  merchantNameEn       String?
  governorate          String?
  activityType         String?
  serviceType          String?
  customerCode         String?
  machineType          String?
  responsiblePerson    String?
  address              String?
  phone                String?
  email                String?

  // أرقام الهوية
  commercialRegistryNo String?
  taxCardNo            String?
  licenseNo            String?
  nationalIdNo         String?

  // بيانات بنكية
  iban                 String?
  bankName             String?

  // بيانات فنية
  machineCode          String?
  machineSerial        String?
  cardsAcceptance      String?

  // تعاقد
  contractDate         String?
  damanCode            String?

  // ربط بالفرع والمستخدم المُنشئ
  branchId             String
  branch               Branch   @relation(fields: [branchId], references: [id])
  createdById          String
  createdBy            User     @relation("CreatedBy", fields: [createdById], references: [id])

  // Workflow
  stage                String   @default("Supervisor Review")
  status               String   @default("Pending")
  assignedTo           String   @default("System")
  ownerRole            String   @default("BRANCH_SUPERVISOR")

  // SLA
  slaStartDate         DateTime @default(now())
  slaTargetDays        Int      @default(3)

  // Post-approval
  merchantId           String?

  // Drive
  driveFolderId        String?

  createdAt            DateTime @default(now())
  updatedAt            DateTime @updatedAt

  history              StageHistory[]
}

model StageHistory {
  id            String   @id @default(cuid())
  requestId     String
  fromStage     String
  toStage       String
  status        String
  changedById   String
  comment       String?
  createdAt     DateTime @default(now())

  request       OnboardingRequest @relation(fields: [requestId], references: [id], onDelete: Cascade)
  changedByUser User              @relation("ChangedByUser", fields: [changedById], references: [id])
}
```

### [MODIFY] .env

```
DATABASE_URL="postgresql://onboarding_user:secure_password@localhost:5432/merchant_onboarding"
JWT_SECRET="change-this-to-a-random-64-char-string"
JWT_EXPIRES_IN="8h"
MFA_ISSUER="Merchant Onboarding System"
```

---

## المرحلة 2: نظام المصادقة + MFA

### [NEW] server/auth.ts

المحتويات:

#### 2.1 تسجيل الدخول (بدون MFA)
```
POST /api/auth/login
Body: { username, password }
Response: { token, user, requireMfa: false }
```

#### 2.2 تسجيل الدخول (مع MFA)
```
POST /api/auth/login
Body: { username, password }
Response: { tempToken, requireMfa: true }

POST /api/auth/verify-mfa
Body: { tempToken, totpCode }
Response: { token, user }
```

#### 2.3 تفعيل MFA للمستخدم
```
POST /api/auth/mfa/setup        → يولّد QR Code + Secret
Body: (none, يستخدم الـ token)
Response: { qrCodeUrl, secret }

POST /api/auth/mfa/verify-setup → يتحقق من أول كود TOTP
Body: { code }
Response: { success: true }

DELETE /api/auth/mfa/disable    → يعطّل MFA
Body: { password }              (يطلب كلمة المرور للأمان)
Response: { success: true }
```

#### 2.4 Middleware
```typescript
// authMiddleware: يتحقق من JWT في كل طلب
// requireRole(...roles): يتحقق من الدور المطلوب
// requireFullAuth: يرفض الـ tempToken (للمعاملات الحساسة)
```

#### تدفق MFA:
```
المستخدم يفتح "الإعدادات" ← يضغط "تفعيل MFA"
    ↓
Server يولّد TOTP secret + QR Code
    ↓
المستخدم يمسح QR بتطبيق Google Authenticator
    ↓
المستخدم يدخل أول كود من التطبيق للتأكيد
    ↓
MFA مفعّل ← في كل تسجيل دخول لاحق يطلب الكود
```

### المكتبات المطلوبة:
```bash
npm install bcrypt jsonwebtoken otplib qrcode
npm install -D @types/bcrypt @types/jsonwebtoken @types/qrcode
```

| المكتبة | الاستخدام |
|---------|-----------|
| `bcrypt` | تشفير كلمات المرور |
| `jsonwebtoken` | إنشاء والتحقق من JWT Tokens |
| `otplib` | توليد والتحقق من أكواد TOTP |
| `qrcode` | توليد صورة QR Code لربط التطبيق |

---

## المرحلة 3: Admin API Endpoints

### [NEW] server/adminRoutes.ts

| Method | Endpoint | الوصف |
|--------|----------|-------|
| `GET` | `/api/admin/branches` | قائمة الفروع |
| `POST` | `/api/admin/branches` | إنشاء فرع |
| `PATCH` | `/api/admin/branches/:id` | تعديل فرع |
| `PATCH` | `/api/admin/branches/:id/toggle` | تفعيل/تعطيل |
| `GET` | `/api/admin/users` | قائمة المستخدمين (مع فلترة) |
| `POST` | `/api/admin/users` | إنشاء مستخدم |
| `PATCH` | `/api/admin/users/:id` | تعديل مستخدم |
| `PATCH` | `/api/admin/users/:id/toggle` | تفعيل/تعطيل |
| `POST` | `/api/admin/users/:id/reset-password` | إعادة تعيين كلمة المرور |
| `GET` | `/api/admin/audit-log` | سجل العمليات الإدارية |

---

## المرحلة 4: صفحة Admin Panel

### [NEW] src/pages/AdminPage.tsx

**3 تبويبات:**

#### تبويب 1: إدارة الفروع
- جدول (الاسم، الكود، المحافظة، عدد المستخدمين، الحالة)
- إضافة/تعديل/تفعيل/تعطيل

#### تبويب 2: إدارة المستخدمين
- جدول (الاسم، username، الدور، الفرع، MFA، الحالة)
- إضافة/تعديل/تفعيل/تعطيل/إعادة كلمة مرور
- فلترة بالفرع والدور

#### تبويب 3: سجل النظام
- آخر 100 عملية إدارية
- فلترة بالتاريخ ونوع العملية

---

## المرحلة 5: صفحة إعدادات المستخدم + MFA

### [NEW] src/pages/ProfilePage.tsx

صفحة شخصية لكل مستخدم تحتوي:
- **معلومات الحساب**: الاسم، اسم المستخدم، الدور، الفرع
- **تغيير كلمة المرور**: كلمة المرور الحالية + الجديدة + تأكيد
- **المصادقة الثنائية (MFA)**:
  - زر "تفعيل MFA" ← يعرض QR Code ← إدخال الكود للتأكيد
  - حالة MFA (مفعّل/معطّل) مع زر "تعطيل" (يطلب كلمة المرور)

---

## المرحلة 6: تحديث الواجهة الأمامية

### الملفات المتأثرة:

| الملف | التغيير |
|-------|---------|
| `LoginPage.tsx` | شاشة username + password + خطوة MFA إضافية |
| `AuthContext.tsx` | JWT login (2-step if MFA) + axios interceptor |
| `api.ts` | Authorization header + endpoints جديدة |
| `types/index.ts` | أنواع بيانات جديدة (UserRole, Branch, MfaStatus) |
| `Layout.tsx` | رابط Admin + Profile + اسم الفرع الحقيقي |
| `App.tsx` | إضافة routes: `/admin`, `/profile` |
| `RequestsTrackerPage.tsx` | فلترة تلقائية حسب الفرع |
| `RequestDetailsPage.tsx` | أسماء مستخدمين حقيقية في السجل |
| `SubmissionPage.tsx` | ربط branchId + createdById تلقائياً |
| `DashboardPage.tsx` | فلترة حسب الفرع للأدوار المقيدة |

### أزرار الإجراءات حسب الأدوار:

```
BRANCH_SUPERVISOR + طلب "Supervisor Review":
  → [اعتماد وإرسال للعمليات] [إرجاع للمبيعات] [إلغاء]

OPERATIONS + طلب "Operations Review":
  → [تفعيل التاجر + MID] [إرجاع للفرع] [رفض]

BRANCH_SALES + طلب مُرجع:
  → [تعديل وإعادة تقديم]

BRANCH_MANAGER / MANAGEMENT:
  → (لا أزرار - عرض فقط)
```

---

## المرحلة 7: النشر على Linux (PM2 + Nginx)

### المتطلبات على السيرفر:
```bash
# Node.js 22
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs

# PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# PM2
sudo npm install -g pm2

# Nginx
sudo apt install -y nginx
```

### [NEW] ecosystem.config.js (PM2)
```javascript
module.exports = {
  apps: [{
    name: 'merchant-onboarding',
    script: 'server/index.ts',
    interpreter: 'node',
    interpreter_args: '--import tsx',
    env: {
      NODE_ENV: 'production',
      PORT: 3001
    },
    instances: 1,
    max_memory_restart: '300M',
    log_date_format: 'DD/MM/YYYY HH:mm:ss'
  }]
};
```

### [NEW] nginx config
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        root /var/www/onboarding/dist;
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### [NEW] deploy.sh
```bash
#!/bin/bash
cd /var/www/onboarding
git pull origin main
npm ci
npm run build
npx prisma migrate deploy
pm2 restart merchant-onboarding
echo "✅ Deployed at $(date '+%d/%m/%Y %H:%M')"
```

### [NEW] prisma/seed.ts
- يُنشئ فقط مستخدم Admin الافتراضي
- باقي الفروع والمستخدمين يضيفهم الأدمن من Admin Panel

---

## المكتبات الجديدة

```bash
# إضافة
npm install bcrypt jsonwebtoken otplib qrcode
npm install -D @types/bcrypt @types/jsonwebtoken @types/qrcode

# إزالة (لم نعد نحتاجها)
npm uninstall better-sqlite3 @prisma/adapter-better-sqlite3
npm uninstall -D @types/better-sqlite3
```

---

## خطوات التنفيذ بالترتيب

| # | المهمة | الملفات | الأولوية |
|---|--------|---------|----------|
| 1 | تحديث Schema + Migration لـ PostgreSQL | `schema.prisma`, `.env` | 🔴 |
| 2 | نظام المصادقة (JWT + bcrypt) | `server/auth.ts` | 🔴 |
| 3 | نظام MFA (TOTP + QR) | `server/auth.ts` (إضافة) | 🔴 |
| 4 | Admin API (فروع + مستخدمين) | `server/adminRoutes.ts` | 🔴 |
| 5 | تحديث Server endpoints (isolation + auth) | `server/index.ts` | 🔴 |
| 6 | تحديث Frontend Auth (JWT + MFA flow) | `AuthContext.tsx`, `api.ts`, `types/` | 🟡 |
| 7 | شاشة تسجيل الدخول الجديدة + MFA step | `LoginPage.tsx` | 🟡 |
| 8 | صفحة Admin Panel (فروع + مستخدمين + سجل) | `AdminPage.tsx` | 🟡 |
| 9 | صفحة الملف الشخصي + إعدادات MFA | `ProfilePage.tsx` | 🟡 |
| 10 | تحديث بقية الصفحات (Roles + Branch) | `Layout`, `Tracker`, `Details`, `Dashboard` | 🟢 |
| 11 | Seed file (Admin user فقط) | `prisma/seed.ts` | 🟢 |
| 12 | ملفات النشر (PM2 + Nginx + deploy.sh) | `ecosystem.config.js`, `nginx.conf`, `deploy.sh` | 🔵 |

---

## Verification Plan

### Automated Tests
1. `npx prisma migrate dev` — التأكد من إنشاء الجداول بنجاح
2. `npx prisma db seed` — إنشاء مستخدم Admin
3. اختبار Login API (بدون MFA + مع MFA)
4. اختبار عزل البيانات (فرع A لا يرى طلبات فرع B)

### Manual Verification
1. Admin → إنشاء فروع → إنشاء مستخدمين
2. مسئول مبيعات → إنشاء طلب → ظهوره فقط في فرعه
3. مشرف خدمة عملاء → مراجعة → اعتماد
4. عمليات → تفعيل التاجر
5. مدير فرع → Dashboard فقط
6. مستخدم عادي → تفعيل MFA → تسجيل خروج → تسجيل دخول بـ TOTP
7. النشر على Linux + اختبار شامل
