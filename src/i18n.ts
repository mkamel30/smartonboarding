import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
    ar: {
        translation: {
            "app_name": "نظام تهيئة التجار",
            "login_title": "تسجيل الدخول للنظام",
            "select_role": "اختر دورك الوظيفي للمتابعة",
            "dashboard": "لوحة القيادة",
            "requests_tracker": "متتبع الطلبات",
            "new_request": "طلب جديد",
            "logout": "تسجيل الخروج",
            "total_requests": "إجمالي الطلبات",
            "activated": "مفعّل",
            "pending": "قيد الانتظار",
            "returned": "مُعاد",
            "rejected": "مرفوض",
            "sla_compliance": "الالتزام بمدة الخدمة",
            "merchant_name": "اسم التاجر",
            "branch": "الفرع",
            "stage": "المرحلة",
            "status": "الحالة",
            "sla_status": "حالة SLA",
            "owner": "المسؤول",
            "search": "بحث باسم التاجر أو الرقم المرجعي...",
            "back_to_tracker": "العودة للمتتبع",
            "overview": "نظرة عامة",
            "documents": "المستندات",
            "history": "سجل الاعتمادات",
            "workflow_actions": "إجراءات سير العمل",
            "approve_to_ops": "اعتماد وإرسال للعمليات",
            "return_to_branch": "إعادة للفرع",
            "activate_merchant": "تفعيل التاجر",
            "reject_request": "رفض الطلب",
            "comments": "ملاحظات (اختياري)",
            "merchant_id": "رقم التاجر (MID)",
            "technical_details": "التفاصيل الفنية والخدمة",
            "required_documents": "المستندات المطلوبة"
        }
    }
};

i18n
    .use(initReactI18next)
    .init({
        resources,
        lng: 'ar',
        fallbackLng: 'ar',
        interpolation: {
            escapeValue: false
        }
    });

export default i18n;
