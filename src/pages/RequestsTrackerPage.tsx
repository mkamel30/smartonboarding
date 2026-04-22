import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiService } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { calculateSLA, getStatusColor } from '../utils/slaUtils';
import { useTranslation } from 'react-i18next';
import {
    Search,
    Filter,
    AlertCircle,
    Clock,
    ExternalLink,
    Download
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { exportToExcel } from '../utils/exportUtils';

const RequestsTrackerPage: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const { t } = useTranslation();
    const [searchTerm, setSearchTerm] = useState('');

    const { data: requests, isLoading } = useQuery({
        queryKey: ['requests', user?.role],
        queryFn: () => apiService.getRequests(),
        enabled: !!user,
    });

    const filteredRequests = requests?.filter(r =>
        r.merchantNameAr.includes(searchTerm) ||
        (r.merchantNameEn && r.merchantNameEn.toLowerCase().includes(searchTerm.toLowerCase())) ||
        r.id.includes(searchTerm)
    );

    const translateStatus = (status: string) => {
        const map: any = {
            'Pending': 'قيد الانتظار',
            'Submitted': 'تم التقديم',
            'Activated': 'تم التفعيل',
            'Returned': 'مُعاد للتعديل',
            'Rejected': 'تم الرفض',
            'Cancelled': 'تم الإلغاء'
        };
        return map[status] || status;
    };

    const translateStage = (stage: string) => {
        const map: any = {
            'Supervisor Review': 'مراجعة المشرف',
            'Operations Review': 'مراجعة العمليات',
            'Returned to Branch': 'مُعاد للفرع',
            'Completed': 'مكتمل',
            'Closed': 'مغلق'
        };
        return map[stage] || stage;
    };

    return (
        <div className="space-y-6" dir="rtl">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">{t('requests_tracker')}</h1>
                    <p className="text-slate-500">مراقبة وإدارة جميع طلبات تهيئة التاجر بنظام البنك.</p>
                </div>

                <div className="flex items-center gap-3">
                    <div className="relative">
                        <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder={t('search')}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pr-10 pl-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-64 md:w-80 transition-all text-right"
                        />
                    </div>
                    <button 
                        onClick={() => {
                            if (filteredRequests) {
                                exportToExcel(filteredRequests.map(r => ({
                                    'رقم الطلب': r.id,
                                    'اسم التاجر (عربي)': r.merchantNameAr,
                                    'اسم التاجر (إنجليزي)': r.merchantNameEn,
                                    'الفرع': r.branch?.name,
                                    'المحافظة': r.governorate,
                                    'نوع النشاط': r.activityType,
                                    'نوع الخدمة': r.serviceType,
                                    'كود العميل': r.customerCode,
                                    'نوع الماكينة': r.machineType,
                                    'الشخص المسؤول': r.responsiblePerson,
                                    'العنوان': r.address,
                                    'رقم الهاتف': r.phone,
                                    'البريد الإلكتروني': r.email,
                                    'رقم السجل التجاري': r.commercialRegistryNo,
                                    'رقم البطاقة الضريبية': r.taxCardNo,
                                    'رقم الرخصة': r.licenseNo,
                                    'الرقم القومي': r.nationalIdNo,
                                    'رقم الحساب (IBAN)': r.iban,
                                    'اسم البنك': r.bankName,
                                    'كود الماكينة': r.machineCode,
                                    'سيريال الماكينة': r.machineSerial,
                                    'قبول الكروت': r.cardsAcceptance,
                                    'تاريخ التعاقد': r.contractDate,
                                    'كود الضامن': r.damanCode,
                                    'كود التاجر (Merchant ID)': r.merchantId,
                                    'المرحلة': translateStage(r.stage),
                                    'الحالة': translateStatus(r.status),
                                    'المفوض إليه': r.assignedTo,
                                    'دور المسؤول': r.ownerRole,
                                    'تاريخ الإنشاء': format(new Date(r.createdAt), 'yyyy-MM-dd HH:mm'),
                                    'تاريخ التحديث': format(new Date(r.updatedAt), 'yyyy-MM-dd HH:mm'),
                                })), `Comprehensive_Requests_Data_${format(new Date(), 'yyyyMMdd')}`);
                            }
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors shadow-sm font-bold"
                        title="Export to Excel"
                    >
                        <Download size={18} />
                        تصدير إكسيل
                    </button>
                    <button className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors text-slate-600">
                        <Filter size={20} />
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-right">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-sm font-semibold uppercase tracking-wider">
                                <th className="px-6 py-4">رقم الطلب</th>
                                <th className="px-6 py-4">{t('merchant_name')}</th>
                                <th className="px-6 py-4">{t('branch')}</th>
                                <th className="px-6 py-4">{t('stage')}</th>
                                <th className="px-6 py-4">{t('status')}</th>
                                <th className="px-6 py-4">{t('sla_status')}</th>
                                <th className="px-6 py-4">{t('owner')}</th>
                                <th className="px-6 py-4"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {isLoading ? (
                                Array(5).fill(0).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan={8} className="px-6 py-4"><div className="h-4 bg-slate-100 rounded w-full"></div></td>
                                    </tr>
                                ))
                            ) : filteredRequests?.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="px-12 py-12 text-center text-slate-400">
                                        لم يتم العثور على طلبات مطابقة للبحث.
                                    </td>
                                </tr>
                            ) : (
                                filteredRequests?.map((request) => {
                                    const { remainingDays, isBreached } = calculateSLA(request.slaStartDate, request.slaTargetDays);
                                    return (
                                        <tr
                                            key={request.id}
                                            className="hover:bg-slate-50 group cursor-pointer transition-colors"
                                            onClick={() => navigate(`/details/${request.id}`)}
                                        >
                                            <td className="px-6 py-4 font-mono text-sm font-semibold text-blue-600">{request.id}</td>
                                            <td className="px-6 py-4">
                                                <p className="font-medium text-slate-900">{request.merchantNameAr}</p>
                                                <p className="text-xs text-slate-400">{request.merchantNameEn}</p>
                                            </td>
                                            <td className="px-6 py-4 text-slate-600 text-sm">{request.branch?.name || 'N/A'}</td>
                                            <td className="px-6 py-4">
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                                                    {translateStage(request.stage)}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${getStatusColor(request.status, false)}`}>
                                                    {translateStatus(request.status)}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col gap-1">
                                                    <div className={`flex items-center gap-1.5 text-xs font-bold uppercase ${isBreached ? 'text-red-500' : remainingDays <= 1 ? 'text-amber-500' : 'text-slate-400'}`}>
                                                        {isBreached ? (
                                                            <><AlertCircle size={14} /> متجاوز</>
                                                        ) : (
                                                            <><Clock size={14} /> متبقي {remainingDays} يوم</>
                                                        )}
                                                    </div>
                                                    {isBreached && (
                                                        <span className="text-[10px] text-red-400 font-medium whitespace-nowrap">تم التصعيد للإدارة</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-slate-600">
                                                {request.assignedTo}
                                                <p className="text-[10px] text-slate-400">{request.ownerRole}</p>
                                            </td>
                                            <td className="px-6 py-4 text-left">
                                                <button className="text-slate-200 group-hover:text-blue-600 transition-colors">
                                                    <ExternalLink size={18} className="rtl-flip" />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default RequestsTrackerPage;
