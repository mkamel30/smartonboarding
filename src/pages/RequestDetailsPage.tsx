import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiService } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { calculateSLA, getStatusColor } from '../utils/slaUtils';
import { useTranslation } from 'react-i18next';
import {
    ArrowRight,
    CheckCircle,
    XCircle,
    RotateCw,
    FileText,
    History as HistoryIcon,
    Info,
    Calendar,
    User as UserIcon,
    Building,
    Home,
    FolderOpen,
    Download,
    FileSpreadsheet,
    ChevronDown,
    Loader2,
    Clock,
    ExternalLink
} from 'lucide-react';
import { format } from 'date-fns';
import { exportComponentToPDF, exportToExcel } from '../utils/exportUtils';
import PrintableReport from '../components/PrintableReport';

const RequestDetailsPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const { t } = useTranslation();
    const [activeTab, setActiveTab] = useState<'overview' | 'documents' | 'history'>('overview');
    const [comments, setComments] = useState('');
    const [merchantId, setMerchantId] = useState('');
    const [showExportMenu, setShowExportMenu] = useState(false);

    const handleExportPDF = () => {
        setShowExportMenu(false);
        exportComponentToPDF();
    };

    const handleExportExcel = () => {
        exportToExcel([{
            'رقم الطلب': request.id,
            'اسم التاجر (عربي)': request.merchantNameAr,
            'اسم التاجر (إنجليزي)': request.merchantNameEn,
            'الفرع': request.branch?.name,
            'المحافظة': request.governorate,
            'نوع النشاط': request.activityType,
            'نوع الخدمة': request.serviceType,
            'كود العميل': request.customerCode,
            'نوع الماكينة': request.machineType,
            'الشخص المسؤول': request.responsiblePerson,
            'العنوان': request.address,
            'رقم الهاتف': request.phone,
            'البريد الإلكتروني': request.email,
            'رقم السجل التجاري': request.commercialRegistryNo,
            'رقم البطاقة الضريبية': request.taxCardNo,
            'رقم الرخصة': request.licenseNo,
            'الرقم القومي': request.nationalIdNo,
            'رقم الحساب (IBAN)': request.iban,
            'اسم البنك': request.bankName,
            'كود الماكينة': request.machineCode,
            'سيريال الماكينة': request.machineSerial,
            'قبول الكروت': request.cardsAcceptance,
            'تاريخ التعاقد': request.contractDate,
            'كود الضامن': request.damanCode,
            'كود التاجر (Merchant ID)': request.merchantId,
            'المرحلة': translateStatus(request.status),
            'الحالة': request.status,
            'المفوض إليه': request.assignedTo,
            'تاريخ الإنشاء': format(new Date(request.createdAt), 'yyyy-MM-dd HH:mm'),
        }], `Merchant_Data_${request.id.substring(0, 8)}`);
        setShowExportMenu(false);
    };

    const { data: request, isLoading } = useQuery({
        queryKey: ['request', id],
        queryFn: () => apiService.getRequestDetails(id!),
        enabled: !!id,
    });

    const { data: driveFiles, isLoading: isLoadingFiles } = useQuery({
        queryKey: ['drive-files', id, request?.branch?.name],
        queryFn: () => apiService.getFiles(request?.branch?.name || '', id!),
        enabled: !!id && !!request,
    });

    const mutation = useMutation({
        mutationFn: (data: { updates: any, historyEntry?: any }) => 
            apiService.updateRequest(id!, { ...data.updates, historyEntry: data.historyEntry }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['request', id] });
            queryClient.invalidateQueries({ queryKey: ['requests'] });
            setComments('');
        },
    });

    if (isLoading || !request) return <div className="p-12 flex items-center justify-center"><Loader2 className="animate-spin text-blue-500" /></div>;

    const { remainingDays, isBreached } = calculateSLA(request.slaStartDate, request.slaTargetDays);

    const handleAction = (action: 'approve' | 'return' | 'reject' | 'activate' | 'cancel') => {
        if ((action === 'return' || action === 'reject' || action === 'cancel') && !comments) {
            alert('يرجى كتابة تعليق يوضح سبب الإجراء.');
            return;
        }

        let updates: any = {
            status: 
                action === 'approve' ? 'Submitted' : 
                action === 'activate' ? 'Activated' : 
                action === 'return' ? 'Returned' : 
                action === 'cancel' ? 'Cancelled' : 'Rejected',
        };

        const historyEntry: any = {
            fromStage: request.stage,
            status: updates.status,
            comment: comments || (action === 'approve' ? 'تمت الموافقة والتحصيل للإدارة المركزية' : '')
        };

        if (user?.role === 'BRANCH_SUPERVISOR') {
            if (action === 'approve') {
                updates.stage = 'Operations Review';
                updates.ownerRole = 'OPERATIONS';
                updates.assignedTo = 'إدارة العمليات';
                updates.slaStartDate = new Date().toISOString();
                historyEntry.toStage = 'Operations Review';
            } else if (action === 'return') {
                updates.stage = 'Returned to Branch';
                updates.ownerRole = 'BRANCH_SALES';
                updates.assignedTo = request.createdBy?.fullName || 'مسئول المبيعات';
                historyEntry.toStage = 'Returned to Branch';
            } else if (action === 'cancel') {
                updates.stage = 'Closed';
                updates.ownerRole = 'MANAGEMENT';
                historyEntry.toStage = 'Closed';
            }
        } else if (user?.role === 'OPERATIONS') {
            if (action === 'activate') {
                updates.status = 'Activated';
                updates.stage = 'Completed';
                updates.merchantId = merchantId;
                updates.ownerRole = 'OPERATIONS';
                historyEntry.toStage = 'Completed';
            } else if (action === 'return') {
                updates.stage = 'Returned to Branch';
                updates.ownerRole = 'BRANCH_SALES';
                updates.assignedTo = request.createdBy?.fullName || 'مسئول المبيعات';
                historyEntry.toStage = 'Returned to Branch';
            } else if (action === 'reject') {
                updates.status = 'Rejected';
                updates.stage = 'Closed';
                historyEntry.toStage = 'Closed';
            }
        }

        mutation.mutate({
            updates,
            historyEntry
        });
    };

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

    return (
        <div className="max-w-6xl mx-auto space-y-6 pb-20" dir="rtl">
            <button onClick={() => navigate('/requests')} className="flex items-center gap-2 text-slate-500 hover:text-blue-600 transition-colors no-print">
                <ArrowRight size={20} /> العودة للمتتبع
            </button>

            {/* Header Card */}
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200 flex flex-col md:flex-row justify-between gap-6">
                <div className="flex items-start gap-6">
                    <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center shrink-0">
                        <Building size={32} />
                    </div>
                    <div className="text-right">
                        <div className="flex items-center gap-3 mb-1">
                            <h1 className="text-2xl font-bold font-mono text-slate-900">{request.id}</h1>
                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${getStatusColor(request.status, isBreached)}`}>
                                {translateStatus(request.status)}
                            </span>
                        </div>
                        <h2 className="text-xl text-slate-800 font-bold">{request.merchantNameAr}</h2>
                        <p className="text-slate-500">{request.merchantNameEn}</p>
                    </div>
                </div>

                <div className="flex flex-col items-start md:items-end gap-2 text-right">
                    <div className={`text-xl font-extrabold ${isBreached ? 'text-red-500' : 'text-blue-600'}`}>
                        {isBreached ? 'تجاوز مدة الخدمة (SLA)' : `متبقي ${remainingDays} أيام`}
                    </div>
                    <div className="text-sm text-slate-500 flex items-center gap-1.5">
                        <Calendar size={14} /> بدأ في {format(new Date(request.slaStartDate), 'dd/MM/yyyy')}
                    </div>
                    <div className="text-sm text-slate-500 flex items-center gap-1.5 justify-end">
                        <UserIcon size={14} /> المسؤول: {request.assignedTo} ({request.ownerRole})
                    </div>
                    
                    {/* Consolidated Export Menu */}
                    <div className="relative mt-2">
                        <button 
                            onClick={() => setShowExportMenu(!showExportMenu)}
                            className="no-print flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all font-bold shadow-lg"
                        >
                            <Download size={18} />
                            تصدير البيانات
                            <ChevronDown size={16} />
                        </button>
                        
                        {showExportMenu && (
                            <div className="export-menu absolute left-0 mt-2 w-56 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden py-1 animate-in fade-in slide-in-from-top-2">
                                <button 
                                    onClick={handleExportPDF}
                                    className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 transition-colors border-b border-slate-50"
                                >
                                    <FileText size={18} className="text-red-500" />
                                    <div className="text-right flex-1">
                                        <p className="font-bold">تنزيل ملف PDF</p>
                                        <p className="text-[10px] text-slate-400">مثالي للطباعة ومعاينة البيانات</p>
                                    </div>
                                </button>
                                <button 
                                    onClick={handleExportExcel}
                                    className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                                >
                                    <FileSpreadsheet size={18} className="text-emerald-500" />
                                    <div className="text-right flex-1">
                                        <p className="font-bold">تنزيل ملف Excel</p>
                                        <p className="text-[10px] text-slate-400">مثالي للبيانات والجداول الحسابية</p>
                                    </div>
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="border-b border-slate-200 flex gap-8 px-4 no-print">
                {[
                    { id: 'overview', icon: Info, label: t('overview') },
                    { id: 'documents', icon: FileText, label: t('documents') },
                    { id: 'history', icon: HistoryIcon, label: t('history') }
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`flex items-center gap-2 py-4 border-b-2 transition-all font-bold ${activeTab === tab.id
                            ? 'border-blue-600 text-blue-600'
                            : 'border-transparent text-slate-400 hover:text-slate-600'
                            }`}
                    >
                        <tab.icon size={18} />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Tab Content - TARGET FOR PDF EXPORT */}
            <div id="request-details-content" className="grid grid-cols-1 lg:grid-cols-3 gap-8 text-right p-4 bg-white rounded-2xl border border-slate-100 shadow-sm">
                <div className="lg:col-span-2 space-y-8">
                    {activeTab === 'overview' && (
                        <div className="space-y-8">
                            {/* Merchant & Contact Section */}
                            <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200">
                                <h3 className="text-xl font-extrabold mb-8 flex items-center gap-3 text-slate-800">
                                    <span className="w-1.5 h-6 bg-blue-600 rounded-full" />
                                    بيانات التاجر والتواصل
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                    {[
                                        { label: 'اسم المسئول', value: request.responsiblePerson, icon: UserIcon },
                                        { label: 'رقم الهاتف', value: request.phone, icon: Clock },
                                        { label: 'البريد الإلكتروني', value: request.email, icon: Info },
                                        { label: 'المحافظة', value: request.governorate, icon: Building },
                                        { label: 'العنوان بالتفصيل', value: request.address, icon: Home },
                                    ].map((item, idx) => (
                                        <div key={idx} className="space-y-1.5 group p-4 border border-transparent hover:border-blue-50 hover:bg-blue-50/20 rounded-2xl transition-all">
                                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{item.label}</p>
                                            <p className="text-base font-bold text-slate-800 break-words">{item.value || '---'}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Identity and Legal Section */}
                            <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200">
                                <h3 className="text-xl font-extrabold mb-8 flex items-center gap-3 text-slate-800">
                                    <span className="w-1.5 h-6 bg-amber-500 rounded-full" />
                                    أرقام الهوية والوثائق
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                                    {[
                                        { label: 'سجل تجاري رقم', value: request.commercialRegistryNo },
                                        { label: 'بطاقة ضريبية رقم', value: request.taxCardNo },
                                        { label: 'رخصة رقم', value: request.licenseNo },
                                        { label: 'رقم قومي', value: request.nationalIdNo },
                                    ].map((item, idx) => (
                                        <div key={idx} className="bg-slate-50/50 p-5 rounded-2xl border border-slate-100 flex flex-col justify-center">
                                            <p className="text-xs font-bold text-slate-400 mb-1">{item.label}</p>
                                            <p className="text-base font-mono font-bold text-slate-900">{item.value || '---'}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Financial Section */}
                            <div className="bg-blue-600 p-8 rounded-3xl shadow-lg shadow-blue-100 text-white overflow-hidden relative">
                                <div className="absolute -top-12 -left-12 w-48 h-48 bg-white/10 rounded-full blur-3xl" />
                                <h3 className="text-xl font-extrabold mb-8 flex items-center gap-3">
                                    <span className="w-1.5 h-6 bg-white rounded-full" />
                                    البيانات البنكية
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-12 relative z-10">
                                    <div className="space-y-2">
                                        <p className="text-xs font-bold uppercase tracking-widest text-blue-200">رقم الحساب (IBAN)</p>
                                        <p className="text-2xl font-mono font-bold tracking-tight">{request.iban || '---'}</p>
                                    </div>
                                    <div className="space-y-2">
                                        <p className="text-xs font-bold uppercase tracking-widest text-blue-200">البنك</p>
                                        <p className="text-2xl font-bold">{request.bankName || '---'}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Technical & Operational Section */}
                            <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200">
                                <h3 className="text-xl font-extrabold mb-8 flex items-center gap-3 text-slate-800">
                                    <span className="w-1.5 h-6 bg-green-500 rounded-full" />
                                    المواصفات الفنية والتعاقد
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-12 gap-y-10">
                                    {[
                                        { label: 'نوع النشاط', value: request.activityType },
                                        { label: 'كود العميل/المخبز', value: request.customerCode },
                                        { label: 'نوع الخدمة', value: request.serviceType },
                                        { label: 'قبول البطاقات (ID)', value: request.cardsAcceptance },
                                        { label: 'ماكينة موديل', value: request.machineType },
                                        { label: 'كود الماكينة', value: request.machineCode },
                                        { label: 'مسلسل الماكينة (S/N)', value: request.machineSerial },
                                        { label: 'كود ضامن', value: request.damanCode },
                                        { label: 'تاريخ التعاقد', value: request.contractDate },
                                        { label: 'رقم التاجر (MID)', value: request.merchantId || 'لم يتم التعيين بعد' },
                                    ].map((item, idx) => (
                                        <div key={idx} className="flex flex-col gap-1 border-r-2 border-slate-50 pr-4">
                                            <p className="text-[11px] font-bold text-slate-400 uppercase">{item.label}</p>
                                            <p className="text-base font-bold text-slate-800">{item.value || '---'}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'documents' && (
                        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
                            <div className="flex items-center justify-between mb-8">
                                <h3 className="text-lg font-bold">المستندات المرفوعة (Google Drive)</h3>
                                {driveFiles && driveFiles.length > 0 && (
                                    <a
                                        href={`https://drive.google.com/drive/folders/${driveFiles[0].folderId}`}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="text-sm font-bold text-blue-600 flex items-center gap-1 hover:underline"
                                    >
                                        <FolderOpen size={16} /> فتح المجلد بالكامل
                                    </a>
                                )}
                            </div>

                            {isLoadingFiles ? (
                                <div className="flex flex-col items-center justify-center py-12 text-slate-400 gap-3">
                                    <Loader2 className="animate-spin" size={32} />
                                    <p>جاري جلب الملفات من Google Drive...</p>
                                </div>
                            ) : !driveFiles || driveFiles.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-12 text-slate-400 border-2 border-dashed border-slate-100 rounded-3xl">
                                    <FolderOpen size={48} className="mb-4 opacity-20" />
                                    <p>لم يتم رفع أي مستندات لهذا الطلب بعد.</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 gap-3">
                                    {driveFiles.map((file: any) => (
                                        <div key={file.id} className="flex items-center justify-between p-5 border border-slate-100 rounded-2xl hover:bg-slate-50 transition-colors group">
                                            <div className="flex items-center gap-4">
                                                <div className="p-3 bg-blue-50 text-blue-500 rounded-xl">
                                                    <FileText size={24} />
                                                </div>
                                                <div className="text-right">
                                                    <p className="font-bold text-slate-800">{file.name}</p>
                                                    <p className="text-xs text-slate-400">{file.mimeType.split('/').pop()?.toUpperCase()}</p>
                                                </div>
                                            </div>
                                            <a
                                                href={file.webViewLink}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:border-blue-500 hover:text-blue-500 transition-all shadow-sm"
                                            >
                                                عرض المستند <ExternalLink size={14} className="rtl-flip" />
                                            </a>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'history' && (
                        <div className="bg-white p-10 rounded-3xl shadow-sm border border-slate-200">
                            <div className="flex items-center justify-between mb-10">
                                <h3 className="text-xl font-extrabold text-slate-900">سجل عمليات التدقيق</h3>
                                <div className="text-xs font-bold text-slate-400 bg-slate-50 px-3 py-1.5 rounded-full border border-slate-100 flex items-center gap-1.5">
                                    <HistoryIcon size={14} /> تحديث تلقائي
                                </div>
                            </div>
                            
                            <div className="relative space-y-12 before:absolute before:right-[22px] before:top-2 before:bottom-2 before:w-[2px] before:bg-gradient-to-b before:from-blue-500/20 before:via-slate-100 before:to-slate-50">
                                {request.history.map((item, idx) => {
                                    const StatusIcon = 
                                        item.status === 'Activated' ? CheckCircle :
                                        item.status === 'Rejected' ? XCircle :
                                        item.status === 'Returned' ? RotateCw :
                                        item.status === 'Submitted' ? ArrowRight : Info;
                                    
                                    const statusColors: any = {
                                        'Activated': 'bg-green-100 text-green-600 border-green-200',
                                        'Rejected': 'bg-red-100 text-red-600 border-red-200',
                                        'Returned': 'bg-amber-100 text-amber-600 border-amber-200',
                                        'Submitted': 'bg-blue-100 text-blue-600 border-blue-200',
                                        'Pending': 'bg-slate-100 text-slate-600 border-slate-200'
                                    };

                                    return (
                                        <div key={idx} className="relative pr-16 animate-in fade-in slide-in-from-right-4 duration-500">
                                            {/* Icon Circle */}
                                            <div className={`absolute right-0 top-0 w-11 h-11 rounded-2xl border-4 border-white shadow-sm flex items-center justify-center z-10 ${statusColors[item.status] || 'bg-slate-100 text-slate-600'}`}>
                                                <StatusIcon size={20} className={item.status === 'Returned' ? 'rtl-flip' : ''} />
                                            </div>

                                            <div className="flex flex-col md:flex-row md:items-start justify-between gap-2 mb-3">
                                                <div>
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="text-lg font-extrabold text-slate-900">{translateStatus(item.status)}</span>
                                                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                                                            {item.changedByUser?.role || '---'}
                                                        </span>
                                                    </div>
                                                    <p className="text-sm font-bold text-slate-600 flex items-center gap-1.5">
                                                        <UserIcon size={14} className="text-slate-400" /> {item.changedByUser?.fullName || 'System'}
                                                    </p>
                                                </div>
                                                <div className="text-right">
                                                    <span className="block text-xs font-bold text-slate-900 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-100">
                                                        {format(new Date(item.createdAt), 'dd/MM/yyyy HH:mm')}
                                                    </span>
                                                </div>
                                            </div>

                                            {item.comment && (
                                                <div className="bg-slate-50/80 p-5 rounded-2xl text-slate-600 leading-relaxed border border-slate-100/50 relative overflow-hidden group">
                                                    <div className="absolute top-0 right-0 w-1 h-full bg-blue-500/20 group-hover:bg-blue-500 transition-colors" />
                                                    <p className="italic font-medium pr-1">"{item.comment}"</p>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>

                {/* Action Sidebar */}
                <div className="space-y-6 no-print">
                    <div className="bg-slate-900 text-white p-8 rounded-3xl shadow-xl shadow-slate-200">
                        <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                            <RotateCw size={20} className="text-blue-400 rtl-flip" />
                            {t('workflow_actions')}
                        </h3>

                        {request.status === 'Activated' || request.status === 'Rejected' || request.status === 'Cancelled' ? (
                            <div className="text-slate-400 italic text-center py-4 border border-white/10 rounded-xl">
                                هذا الطلب مغلق ({translateStatus(request.status)}).
                            </div>
                        ) : (
                            <div className="space-y-6">
                                {user?.role && (
                                    <div>
                                        <label className="block text-xs font-bold uppercase text-slate-400 mb-2">{t('comments')}</label>
                                        <textarea
                                            value={comments}
                                            onChange={(e) => setComments(e.target.value)}
                                            className="w-full bg-slate-800 border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none min-h-[100px] text-right"
                                            placeholder="اكتب ملاحظاتك هنا..."
                                        />
                                    </div>
                                )}

                                {user?.role === 'BRANCH_SUPERVISOR' && request.ownerRole === 'BRANCH_SUPERVISOR' && (
                                    <div className="grid grid-cols-1 gap-3">
                                        <button
                                            onClick={() => handleAction('approve')}
                                            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-900/40"
                                        >
                                            <CheckCircle size={20} /> الموافقة والتقديم للعمليات
                                        </button>
                                        <div className="grid grid-cols-2 gap-3">
                                            <button
                                                onClick={() => handleAction('return')}
                                                className="py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl transition-all flex items-center justify-center gap-2 border border-slate-700"
                                            >
                                                <RotateCw size={18} className="rtl-flip" /> إرجاع للفرع
                                            </button>
                                            <button
                                                onClick={() => handleAction('cancel')}
                                                className="py-3 bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 border border-red-600/30"
                                            >
                                                <XCircle size={18} /> إلغاء الطلب
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {user?.role === 'OPERATIONS' && request.ownerRole === 'OPERATIONS' && (
                                    <div className="space-y-6">
                                        <div>
                                            <label className="block text-xs font-bold uppercase text-slate-400 mb-2">تعيين رقم التاجر MID</label>
                                            <input
                                                type="text"
                                                value={merchantId}
                                                onChange={(e) => setMerchantId(e.target.value)}
                                                className="w-full bg-slate-800 border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                                placeholder="MID-XXXXXX"
                                            />
                                        </div>
                                        <div className="grid grid-cols-1 gap-3">
                                            <button
                                                disabled={!merchantId}
                                                onClick={() => handleAction('activate')}
                                                className="w-full py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-green-900/40 disabled:opacity-50"
                                            >
                                                <CheckCircle size={20} /> {t('activate_merchant')}
                                            </button>
                                            <div className="grid grid-cols-2 gap-3">
                                                <button
                                                    onClick={() => handleAction('return')}
                                                    className="py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl transition-all flex items-center justify-center gap-2 border border-slate-700"
                                                >
                                                    <RotateCw size={18} className="rtl-flip" /> إرجاع للفرع
                                                </button>
                                                <button
                                                    onClick={() => handleAction('reject')}
                                                    className="py-3 bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 border border-red-600/30"
                                                >
                                                    <XCircle size={18} /> رفض الطلب
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {user?.role === 'BRANCH_SALES' && request.status === 'Returned' && (
                                    <div className="space-y-4">
                                        <div className="p-4 bg-blue-600/10 border border-blue-600/20 rounded-2xl text-blue-400 text-sm">
                                            هذا الطلب بانتظار تعديلاتك حالياً. يمكنك تعديل البيانات وإعادة التقديم.
                                        </div>
                                        <button
                                            onClick={() => navigate(`/edit/${id}`)}
                                            className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2"
                                        >
                                            <FileText size={20} /> تعديل وإعادة تقديم
                                        </button>
                                    </div>
                                )}
                                
                                {request.ownerRole !== user?.role && request.status !== 'Returned' && (
                                    <div className="text-slate-500 italic text-center py-4 text-sm">
                                        الطلب حالياً بانتظار إجراء من: {request.ownerRole === 'BRANCH_SUPERVISOR' ? 'مشرف الفرع' : request.ownerRole}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* SLA Card */}
                    <div className="bg-white p-6 rounded-3xl border border-slate-200 no-print">
                        <h4 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                            <Clock size={18} className="text-blue-500" />
                            مؤشر الالتزام (SLA)
                        </h4>
                        <div className="relative pt-1">
                            <div className="overflow-hidden h-3 mb-4 text-xs flex rounded-full bg-slate-100">
                                <div
                                    style={{ width: `${Math.max(0, Math.min(100, (remainingDays / request.slaTargetDays) * 100))}%` }}
                                    className={`shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center ${isBreached ? 'bg-red-500' : 'bg-blue-600'}`}
                                ></div>
                            </div>
                            <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase">
                                <span>البداية</span>
                                <span>الموعد النهائي</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Hidden Printable Report - Only visible during print */}
            <div className="printable-report-wrapper">
                <PrintableReport request={request} />
            </div>
        </div>
    );
};

export default RequestDetailsPage;
