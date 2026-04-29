import React from 'react';
import { format } from 'date-fns';
import { ShieldCheck } from 'lucide-react';

interface PrintableReportProps {
    request: any;
}

const PrintableReport: React.FC<PrintableReportProps> = ({ request }) => {
    const now = new Date();

    return (
        <div className="printable-report" dir="rtl">
            {/* Report Header */}
            <div className="report-header">
                <div className="report-header-top">
                    <div className="report-logo">
                        <img 
                            src="/Smart-Logo-Horizontal.png" 
                            alt="Logo" 
                            className="report-logo-img"
                        />
                        <div>
                            <h1 className="report-title">نظام تهيئة تجار المدفوعات الموحد - سمارت</h1>
                            <p className="report-subtitle">Merchant Onboarding System - Official Report</p>
                        </div>
                    </div>
                    <div className="report-meta">
                        <p>تاريخ التقرير: {format(now, 'dd/MM/yyyy')}</p>
                        <p>الوقت: {format(now, 'HH:mm')}</p>
                        <p className="report-id">رقم الطلب: {request.id}</p>
                    </div>
                </div>
                <div className="report-divider"></div>
            </div>

            {/* Merchant Summary Banner */}
            <div className="report-banner">
                <div className="report-banner-content">
                    <h2 className="report-merchant-name">{request.merchantNameAr}</h2>
                    <p className="report-merchant-name-en">{request.merchantNameEn}</p>
                </div>
                <div className="report-status-box">
                    <span className="report-status-label">الحالة</span>
                    <span className="report-status-value">
                        {request.status === 'Pending' ? 'قيد الانتظار' :
                         request.status === 'Submitted' ? 'تم التقديم' :
                         request.status === 'Activated' ? 'تم التفعيل' :
                         request.status === 'Returned' ? 'مُعاد للتعديل' :
                         request.status === 'Rejected' ? 'تم الرفض' :
                         request.status === 'Cancelled' ? 'تم الإلغاء' : request.status}
                    </span>
                </div>
            </div>

            {/* Section 1: Merchant & Contact Info */}
            <div className="report-section">
                <h3 className="report-section-title">
                    <span className="report-section-bullet blue"></span>
                    بيانات التاجر والتواصل
                </h3>
                <table className="report-table">
                    <tbody>
                        <tr>
                            <td className="report-cell-label">اسم المسئول</td>
                            <td className="report-cell-value">{request.responsiblePerson || '---'}</td>
                            <td className="report-cell-label">رقم الهاتف</td>
                            <td className="report-cell-value">{request.phone || '---'}</td>
                        </tr>
                        <tr>
                            <td className="report-cell-label">البريد الإلكتروني</td>
                            <td className="report-cell-value">{request.email || '---'}</td>
                            <td className="report-cell-label">المحافظة</td>
                            <td className="report-cell-value">{request.governorate || '---'}</td>
                        </tr>
                        <tr>
                            <td className="report-cell-label">العنوان بالتفصيل</td>
                            <td className="report-cell-value" colSpan={3}>{request.address || '---'}</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            {/* Section 2: Identity & Legal */}
            <div className="report-section">
                <h3 className="report-section-title">
                    <span className="report-section-bullet amber"></span>
                    أرقام الهوية والوثائق
                </h3>
                <table className="report-table">
                    <tbody>
                        <tr>
                            <td className="report-cell-label">سجل تجاري رقم</td>
                            <td className="report-cell-value">{request.commercialRegistryNo || '---'}</td>
                            <td className="report-cell-label">بطاقة ضريبية رقم</td>
                            <td className="report-cell-value">{request.taxCardNo || '---'}</td>
                        </tr>
                        <tr>
                            <td className="report-cell-label">رخصة رقم</td>
                            <td className="report-cell-value">{request.licenseNo || '---'}</td>
                            <td className="report-cell-label">رقم قومي</td>
                            <td className="report-cell-value">{request.nationalIdNo || '---'}</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            {/* Section 3: Financial / Banking */}
            <div className="report-section report-section-highlight">
                <h3 className="report-section-title">
                    <span className="report-section-bullet dark"></span>
                    البيانات البنكية
                </h3>
                <table className="report-table">
                    <tbody>
                        <tr>
                            <td className="report-cell-label">رقم الحساب (IBAN)</td>
                            <td className="report-cell-value report-cell-mono">{request.iban || '---'}</td>
                            <td className="report-cell-label">البنك</td>
                            <td className="report-cell-value">{request.bankName || '---'}</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            {/* Section 4: Technical & Operational */}
            <div className="report-section">
                <h3 className="report-section-title">
                    <span className="report-section-bullet green"></span>
                    المواصفات الفنية والتعاقد
                </h3>
                <table className="report-table">
                    <tbody>
                        <tr>
                            <td className="report-cell-label">نوع النشاط</td>
                            <td className="report-cell-value">{request.activityType || '---'}</td>
                            <td className="report-cell-label">كود العميل</td>
                            <td className="report-cell-value">{request.customerCode || '---'}</td>
                        </tr>
                        <tr>
                            <td className="report-cell-label">نوع الخدمة</td>
                            <td className="report-cell-value">{request.serviceType || '---'}</td>
                            <td className="report-cell-label">قبول البطاقات</td>
                            <td className="report-cell-value">{request.cardsAcceptance || '---'}</td>
                        </tr>
                        <tr>
                            <td className="report-cell-label">ماكينة موديل</td>
                            <td className="report-cell-value">{request.machineType || '---'}</td>
                            <td className="report-cell-label">كود الماكينة</td>
                            <td className="report-cell-value">{request.machineCode || '---'}</td>
                        </tr>
                        <tr>
                            <td className="report-cell-label">مسلسل الماكينة (S/N)</td>
                            <td className="report-cell-value report-cell-mono">{request.machineSerial || '---'}</td>
                            <td className="report-cell-label">كود ضامن</td>
                            <td className="report-cell-value">{request.damanCode || '---'}</td>
                        </tr>
                        <tr>
                            <td className="report-cell-label">تاريخ التعاقد</td>
                            <td className="report-cell-value">{request.contractDate || '---'}</td>
                            <td className="report-cell-label">رقم التاجر (MID)</td>
                            <td className="report-cell-value report-cell-mono">{request.merchantId || 'لم يتم التعيين بعد'}</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            {/* Section 5: Workflow History */}
            {request.history && request.history.length > 0 && (
                <div className="report-section">
                    <h3 className="report-section-title">
                        <span className="report-section-bullet purple"></span>
                        سجل العمليات
                    </h3>
                    <table className="report-table report-table-striped">
                        <thead>
                            <tr>
                                <th className="report-th">التاريخ</th>
                                <th className="report-th">الحالة</th>
                                <th className="report-th">المرحلة</th>
                                <th className="report-th">بواسطة</th>
                                <th className="report-th">ملاحظات</th>
                            </tr>
                        </thead>
                        <tbody>
                            {request.history.map((item: any, idx: number) => (
                                <tr key={idx}>
                                    <td className="report-td">{format(new Date(item.createdAt), 'dd/MM/yyyy HH:mm')}</td>
                                    <td className="report-td">
                                        {item.status === 'Pending' ? 'قيد الانتظار' :
                                         item.status === 'Submitted' ? 'تم التقديم' :
                                         item.status === 'Activated' ? 'تم التفعيل' :
                                         item.status === 'Returned' ? 'مُعاد للتعديل' :
                                         item.status === 'Rejected' ? 'تم الرفض' : item.status}
                                    </td>
                                    <td className="report-td">{item.toStage || '---'}</td>
                                    <td className="report-td">{item.changedByUser?.fullName || 'النظام'}</td>
                                    <td className="report-td">{item.comment || '---'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Report Footer */}
            <div className="report-footer">
                <div className="report-footer-line"></div>
                <div className="report-footer-content">
                    <p>تم إنشاء هذا التقرير آلياً بواسطة نظام تهيئة تجار المدفوعات الموحد - سمارت</p>
                    <p>Request ID: {request.id}</p>
                </div>
            </div>
        </div>
    );
};

export default PrintableReport;
