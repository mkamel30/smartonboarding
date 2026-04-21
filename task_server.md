# مهام ترقية نظام تهيئة التجار
> آخر تحديث: 21/04/2026

---

## المرحلة 1: قاعدة البيانات (PostgreSQL)
- `[x]` تثبيت PostgreSQL (تم التكوين برمجياً)
- `[x]` تحديث `schema.prisma` (الجداول الجديدة: Branch, User + UserRole enum + MFA fields)
- `[x]` تحديث `.env` (DATABASE_URL لـ PostgreSQL + JWT_SECRET + MFA_ISSUER)
- `[x]` تشغيل `npx prisma migrate dev --name init_production_schema` (تم بنجاح)
- `[x]` التأكد من إنشاء الجداول بنجاح
- `[x]` إزالة مكتبات SQLite (`better-sqlite3`, `@prisma/adapter-better-sqlite3`)

## المرحلة 2: نظام المصادقة (JWT + bcrypt)
- `[x]` تثبيت المكتبات: `bcrypt`, `jsonwebtoken`
- `[x]` إنشاء `server/auth.ts`: (تم التنفيذ بالكامل)
- `[x]` `POST /api/auth/login` (username + password → JWT)
- `[x]` `GET /api/auth/me` (Token → User data)
- `[x]` `authMiddleware` (التحقق من JWT في كل طلب)
- `[x]` `requireRole(...roles)` (التحقق من الدور)

## المرحلة 3: نظام MFA (TOTP)
- `[x]` تثبيت المكتبات: `otplib`, `qrcode`
- `[x]` إضافة endpoints في `server/auth.ts`: (تم التنفيذ بالكامل)
- `[x]` `POST /api/auth/mfa/setup` (توليد QR Code + Secret)
- `[x]` `POST /api/auth/mfa/verify-setup` (تأكيد أول كود TOTP)
- `[x]` `DELETE /api/auth/mfa/disable` (تعطيل MFA)
- `[x]` `POST /api/auth/verify-mfa` (التحقق عند تسجيل الدخول)
- `[x]` تحديث Login flow ليدعم MFA (tempToken → verify → fullToken)

## المرحلة 4: Admin API
- `[x]` إنشاء `server/adminRoutes.ts`: (تم التنفيذ بالكامل)
- `[x]` CRUD الفروع (GET, POST, PATCH, toggle)
- `[x]` CRUD المستخدمين (GET, POST, PATCH, toggle, reset-password)
- `[x]` سجل العمليات الإدارية (GET audit-log)
- `[x]` ربط الـ routes في `server/index.ts`

## المرحلة 5: تحديث Server endpoints
- `[x]` تحديث `server/index.ts`: (تم التنفيذ بالكامل)
- `[x]` إضافة `authMiddleware` لكل الـ API routes
- `[x]` تحديث `GET /api/requests` (عزل حسب الفرع)
- `[x]` تحديث `POST /api/requests` (ربط branchId + createdById)
- `[x]` تحديث `PATCH /api/requests/:id` (changedById بدلاً من changedBy)
- `[x]` تحديث `GET /api/activity` (include changedByUser)
- `[x]` تحديث `GET /api/dashboard/stats` (فلترة حسب الدور/الفرع)
- `[x]` التأكد من أن كل endpoint يتحقق من الصلاحيات

## المرحلة 6: تحديث Frontend Auth
- `[x]` تحديث `src/types/index.ts`: (تم التنفيذ بالكامل)
- `[x]` تحديث `UserRole` enum (6 أدوار احترافية)
- `[x]` إضافة `Branch` type
- `[x]` تحديث `User` type (branchId, mfaEnabled)
- `[x]` تحديث `src/services/api.ts`: (تم التنفيذ بالكامل)
- `[x]` إضافة Authorization header (axios interceptor)
- `[x]` إضافة auth endpoints (login, me, mfa/*)
- `[x]` إضافة admin endpoints (branches/*, users/*)
- `[x]` إضافة profile endpoints (change-password, mfa/*)
- `[x]` معالجة 401 Unauthorized (auto-logout)
- `[x]` تحديث `src/contexts/AuthContext.tsx`: (تم التنفيذ بالكامل)
- `[x]` `login(username, password)` بدلاً من `login(role)`
- `[x]` MFA flow (2-step login)
- `[x]` حفظ JWT في localStorage
- `[x]` Auto-logout عند انتهاء Token

## المرحلة 7: شاشة تسجيل الدخول الجديدة
- `[x]` إعادة تصميم `src/pages/LoginPage.tsx`: (تصميم احترافي ممتاز)
- `[x]` حقل اسم المستخدم + كلمة المرور
- `[x]` خطوة MFA (إدخال كود TOTP إذا مفعّل)
- `[x]` رسائل خطأ واضحة باللغة العربية
- `[x]` تصميم زجاجي (Glassmorphism) مع هوية البنك

## المرحلة 8: صفحة Admin Panel
- `[x]` إنشاء `src/pages/AdminPage.tsx`: (تم التنفيذ بالكامل)
- `[x]` تبويب إدارة الفروع (تفاعلي بالكامل)
- `[x]` تبويب إدارة المستخدمين (إضافة، تعديل، كلمات مرور)
- `[x]` تبويب سجل النظام (Audit Log)

## المرحلة 9: صفحة الملف الشخصي + MFA
- `[x]` إنشاء `src/pages/ProfilePage.tsx`: (تم التنفيذ بالكامل)
- `[x]` عرض معلومات الحساب بالتفصيل
- `[x]` تغيير كلمة المرور
- `[x]` عملية تفعيل/تعطيل MFA بالكامل وبأمان

## المرحلة 10: تحديث بقية الصفحات
- `[x]` تحديث `src/components/Layout.tsx` (الـ Sidebar والـ Header)
- `[x]` تحديث `src/App.tsx` (الـ Routes والحماية)
- `[x]` تحديث `src/pages/RequestsTrackerPage.tsx`
- `[x]` تحديث `src/pages/RequestDetailsPage.tsx`
- `[x]` تحديث `src/pages/SubmissionPage.tsx`
- `[x]` تحديث `src/pages/DashboardPage.tsx`

## المرحلة 11: Seed + بيانات أولية
- `[x]` إنشاء `prisma/seed.ts` (Admin account)
- `[x]` تحديث `package.json`
- `[x]` تشغيل `npx prisma db seed` (تم إنشاء حساب الأدمن الافتراضي)

## المرحلة 12: ملفات النشر (Linux)
- `[x]` إنشاء `ecosystem.config.js` (PM2)
- `[x]` إنشاء `nginx.conf`
- `[x]` إنشاء `deploy.sh`
- `[x]` اختبار الإنتاج النهائي على السيرفر (تم التحقق بنجاح)

---

## ملاحظات مهمة
- ❗ لإتمام الترقية، يجب تشغيل: `npx prisma migrate dev` ثم `npx prisma db seed`.
- ❗ بيانات المسؤول الافتراضي: `admin` / `Admin@2026`.
- ❗ تم تكوين نظام Linux ليعمل باستخدام PM2 و Nginx.
