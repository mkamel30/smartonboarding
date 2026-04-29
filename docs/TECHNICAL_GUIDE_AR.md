# الدليل الفني لمدير النظام (Technical Guide)

شرح المكونات التقنية للنظام، كيفية التشغيل، الصيانة، وإدارة بيئة الإنتاج (Production).

## 🚀 استراتيجية النشر (Deployment Strategy)
نتبع استراتيجية **البناء المحلي والرفع (Local Build & Push)** لتجنب استهلاك موارد السيرفر المحدودة (Low Memory VPS).

### خطوات تحديث النظام:
1.  **في الجهاز المحلي (Local):**
    ```bash
    npm run build
    git add .
    git commit -m "update message"
    git push
    ```
2.  **على السيرفر (Server):**
    ```bash
    git pull origin main
    pm2 restart onboarding-server
    ```

---

## 🛠️ إدارة العمليات (Runtime Management)
نستخدم **PM2** لإدارة تشغيل عملية الـ Backend لضمان استمرارية التشغيل.

- **ملف الإعدادات**: `ecosystem.config.cjs`
- **أوامر PM2 الهامة**:
    - `pm2 status`: عرض حالة السيرفرات.
    - `pm2 logs onboarding-server`: عرض سجل الأخطاء.
    - `pm2 restart onboarding-server`: إعادة التشغيل.
    - `pm2 delete onboarding-server`: حذف العملية من الذاكرة (يُستخدم عند تعديل مسار الملف التشغيلي).
    - `pm2 start ecosystem.config.cjs`: بدء التشغيل من ملف الإعدادات.

---

## 💾 قاعدة البيانات (Database)
النظام يستخدم **PostgreSQL** كقاعدة بيانات أساسية و **Prisma ORM** للتعامل مع البيانات.

- **تحديث الجداول**: `npx prisma migrate deploy`
- **توليد عميل بريسما**: `npx prisma generate`
- **إضافة البيانات التأسيسية**: `npm run seed`

---

## 🌐 إعدادات Nginx
يعمل Nginx كخادم أمامي (Reverse Proxy) لاستقبال الطلبات على بورت **8080** وتوجيهها للـ Backend (بورت 3001) أو ملفات الـ Frontend الثابتة.

- **المسار**: `/etc/nginx/sites-available/onboarding`
- **المنطق**: يتم توجيه أي طلب يبدأ بـ `/api` للـ Backend، وباقي الطلبات تذهب لمجلد الـ `dist`.

---

## 🛡️ الأمان (Security)
- تم تفعيل نظام **MFA (TOTP)** الاختياري للمستخدمين.
- جميع كلمات المرور مشفرة باستخدام `bcrypt`.
- يتم استخدام `JWT` لتأمين جلسة الدخول.

---

## 📂 هيكل المجلدات (Folder Structure)
- `src/`: كود الواجهة الأمامية (React).
- `server/`: كود الخلفية (Express + API).
- `dist/`: الملفات الجاهزة للإنتاج (بعد البناء).
- `prisma/`: مخطط قاعدة البيانات (Schema) والهجرات (Migrations).
