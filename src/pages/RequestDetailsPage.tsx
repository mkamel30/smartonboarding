import React, { useState, useRef } from 'react';
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
    ExternalLink,
    Upload
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
    const [kycType, setKycType] = useState<'KYC' | 'LKYC' | ''>('');
    const [salesFormFile, setSalesFormFile] = useState<File | null>(null);
    const [showExportMenu, setShowExportMenu] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleExportPDF = () => {
        setShowExportMenu(false);
        exportComponentToPDF();
    };

    const handleExportExcel = () => {
        if (!request) return;
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
            'نوع KYC': request.kycType,
            'رقم باتش الشحن': request.shipmentBatch?.batchNumber,
            'رقم البوليصة': request.waybillNumber,
            'المرحلة': request.stage,
            'الحالة': request.status,
            'المفوض إليه': request.ownerRole,
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

    const actionMutation = useMutation({
        mutationFn: async (data: { action: string, payload?: any }) => {
            let finalPayload = { ...data.payload, comment: comments };
            
            if (data.action === 'approve' && request?.stage === 'Sales Management Review') {
                if (!salesFormFile) throw new Error('الرجاء إرفاق النموذج الموقع');
                
                const formData = new FormData();
                formData.append('salesForm', salesFormFile);
                formData.append('requestId', id!);
                
                const uploadRes = await apiService.uploadSalesForm(formData);
                finalPayload.formFileId = uploadRes.fileId;
            }

            return apiService.requestAction(id!, data.action, finalPayload);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['request', id] });
            queryClient.invalidateQueries({ queryKey: ['requests'] });
            setComments('');
            setMerchantId('');
            setKycType('');
            setSalesFormFile(null);
            alert('تم تنفيذ الإجراء بنجاح');
        },
        onError: (error: any) => {
            alert(error.response?.data?.error || error.message || 'حدث خطأ أثناء تنفيذ الإجراء');
        }
    });

    if (isLoading || !request) return <div className="p-12 flex items-center justify-center"><Loader2 className="animate-spin text-blue-50" /></div>;

    const { remainingDays, isBreached } = calculateSLA(request.slaStartDate, request.slaTargetDays);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            setSalesFormFile(e.target.files[0]);
        }
    };

    const doAction = (action: string, payload: any = {}) => {
        if (['return', 'reject', 'bank_rejected', 'bank_modification'].includes(action) && !comments) {
            alert('يرجى كتابة تعليق يوضح السبب.');
            return;
        }
        actionMutation.mutate({ action, payload });
    };

    const translateStatus = (status: string) => {
        const map: any = {
            'Pending': 'قيد الانتظار',
            'Submitted': 'تم التقديم',
            'Activated': 'تم تعيين MID',
            'Completed': 'اكتملت التهيئة',
            'Returned': 'مُعاد للتعديل',
            'Rejected': 'تم الرفض',
            'Cancelled': 'تم الإلغاء',
            'Closed': 'مغلق'
        };
        return map[status] || status;
    };

    const roleTranslations: any = {
        'ADMIN': 'مدير نظام',
        'BRANCH_SALES': 'مسؤول مبيعات',
        'BRANCH_SUPERVISOR': 'مشرف الفرع',
        'BRANCH_MANAGER': 'مدير فرع',
        'BRANCH_MGMT': 'إدارة الفروع',
        'SALES_MGMT': 'إدارة المبيعات',
        'OPERATIONS': 'إدارة العمليات',
        'MANAGEMENT': 'الإدارة العليا'
    };

    const stageTranslations: any = {
        'Branch Submission': 'تقديم الفرع',
        'Supervisor Review': 'مراجعة مشرف الفرع',
        'Branch Management Review': 'مراجعة إدارة الفروع',
        'Sales Management Review': 'مراجعة إدارة المبيعات',
        'Operations Review': 'مراجعة إدارة العمليات',
        'Bank Review': 'مراجعة البنك',
        'Software Activation': 'تفعيل السوفتوير',
        'Completed': 'مكتمل',
        'Closed': 'مغلق'
    };

    const translateStage = (stage: string) => {
        return stageTranslations[stage] || stage;
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
                            {request.kycType && (
                                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-600 border border-purple-200">
                                    {request.kycType}
                                </span>
                            )}
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
                        <UserIcon size={14} /> عند: {request.ownerRole}
                    </div>
                    <div className="text-sm font-bold text-slate-800 bg-slate-100 px-3 py-1 rounded-full mt-1">
                        المرحلة: {translateStage(request.stage)}
                    </div>
                    
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
                                    </div>
                                </button>
                                <button 
                                    onClick={handleExportExcel}
                                    className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                                >
                                    <FileSpreadsheet size={18} className="text-emerald-500" />
                                    <div className="text-right flex-1">
                                        <p className="font-bold">تنزيل ملف Excel</p>
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

            {/* Tab Content */}
            <div id="request-details-content" className="grid grid-cols-1 lg:grid-cols-3 gap-8 text-right p-4 bg-white rounded-2xl border border-slate-100 shadow-sm">
                <div className="lg:col-span-2 space-y-8">
                    {activeTab === 'overview' && (
                        <div className="space-y-8">
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

                            <div className="bg-blue-600 p-6 sm:p-8 rounded-3xl shadow-lg shadow-blue-100 text-white overflow-hidden relative">
                                <div className="absolute -top-12 -left-12 w-48 h-48 bg-white/10 rounded-full blur-3xl" />
                                <h3 className="text-xl font-extrabold mb-8 flex items-center gap-3">
                                    <span className="w-1.5 h-6 bg-white rounded-full" />
                                    البيانات البنكية
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 sm:gap-12 relative z-10">
                                    <div className="space-y-2">
                                        <p className="text-[10px] font-bold uppercase tracking-widest text-blue-200">رقم الحساب (IBAN)</p>
                                        <p className="text-lg sm:text-xl md:text-2xl font-mono font-bold tracking-tight break-all">
                                            {request.iban || '---'}
                                        </p>
                                    </div>
                                    <div className="space-y-2">
                                        <p className="text-[10px] font-bold uppercase tracking-widest text-blue-200">البنك</p>
                                        <p className="text-lg sm:text-xl md:text-2xl font-bold">{request.bankName || '---'}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200">
                                <h3 className="text-xl font-extrabold mb-8 flex items-center gap-3 text-slate-800">
                                    <span className="w-1.5 h-6 bg-green-500 rounded-full" />
                                    المواصفات الفنية والتعاقد
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-12 gap-y-10">
                                    {[
                                        { label: 'نوع النشاط', value: request.activityType },
                                        { label: 'كود العميل', value: request.customerCode },
                                        { label: 'نوع الخدمة', value: request.serviceType },
                                        { label: 'قبول البطاقات', value: request.cardsAcceptance },
                                        { label: 'ماكينة موديل', value: request.machineType },
                                        { label: 'كود الماكينة', value: request.machineCode },
                                        { label: 'مسلسل الماكينة', value: request.machineSerial },
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
                                {request.driveFolderId && (
                                    <a
                                        href={`https://drive.google.com/drive/folders/${request.driveFolderId}`}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="text-sm font-bold text-blue-600 flex items-center gap-1 hover:underline"
                                    >
                                        <FolderOpen size={16} /> فتح مجلد التاجر
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
                                    <p>لم يتم العثور على أي ملفات.</p>
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
                                                </div>
                                            </div>
                                            <a
                                                href={file.webViewLink}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:border-blue-500 hover:text-blue-500 transition-all shadow-sm"
                                            >
                                                عرض <ExternalLink size={14} className="rtl-flip" />
                                            </a>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {request.waybillNumber && (
                                <div className="mt-8 p-6 bg-slate-50 border border-slate-200 rounded-2xl">
                                    <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                                        <Info size={18} className="text-slate-500" />
                                        بيانات الشحن الورقي
                                    </h4>
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div>
                                            <span className="text-slate-500 block mb-1">بوليصة الشحن</span>
                                            <span className="font-bold">{request.waybillNumber}</span>
                                        </div>
                                        <div>
                                            <span className="text-slate-500 block mb-1">تاريخ الإرسال</span>
                                            <span className="font-bold">{request.documentsSentAt ? format(new Date(request.documentsSentAt), 'yyyy-MM-dd') : '---'}</span>
                                        </div>
                                        <div className="col-span-2">
                                            <span className="text-slate-500 block mb-1">حالة الاستلام</span>
                                            <span className={`font-bold ${request.documentsReceivedAt ? 'text-green-600' : 'text-amber-500'}`}>
                                                {request.documentsReceivedAt ? 'تم الاستلام' : 'قيد الشحن'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'history' && (
                        <div className="bg-white p-10 rounded-3xl shadow-sm border border-slate-200">
                            <h3 className="text-xl font-extrabold text-slate-900 mb-10">سجل عمليات التدقيق والمراحل</h3>
                            <div className="space-y-6 relative before:absolute before:right-4 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-100">
                                {request.history?.map((entry: any, index: number) => (
                                    <div key={index} className="relative pr-12 animate-in fade-in slide-in-from-right duration-300" style={{ animationDelay: `${index * 100}ms` }}>
                                        <div className={`absolute right-0 top-1 w-8 h-8 rounded-full flex items-center justify-center z-10 shadow-sm ${index === 0 ? 'bg-blue-600 text-white ring-4 ring-blue-50' : 'bg-white text-slate-400 border border-slate-200'}`}>
                                            {index === 0 ? <div className="w-2 h-2 bg-white rounded-full animate-pulse" /> : <div className="w-1.5 h-1.5 bg-slate-300 rounded-full" />}
                                        </div>
                                        <div className={`p-5 rounded-2xl border transition-all ${index === 0 ? 'bg-white border-blue-100 shadow-md shadow-blue-50/50' : 'bg-slate-50/50 border-slate-100'}`}>
                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                                                <div>
                                                    <span className={`text-xs font-bold px-2.5 py-1 rounded-lg ${index === 0 ? 'bg-blue-50 text-blue-600' : 'bg-slate-200 text-slate-600'}`}>
                                                        {stageTranslations[entry.toStage] || entry.status}
                                                    </span>
                                                    <div className="mt-2 flex items-center gap-2">
                                                        <div className="w-6 h-6 bg-slate-200 rounded-full flex items-center justify-center text-[10px] font-bold text-slate-600">
                                                            {entry.changedByUser?.fullName?.charAt(0) || '?'}
                                                        </div>
                                                        <span className="text-sm font-bold text-slate-800">{entry.changedByUser?.fullName || 'النظام'}</span>
                                                        <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded text-slate-500 font-bold">
                                                            {roleTranslations[entry.changedByUser?.role] || entry.changedByUser?.role || 'إدارة النظام'}
                                                        </span>
                                                    </div>
                                                </div>
                                                <span className="text-[10px] font-mono text-slate-400 flex items-center gap-1 bg-white px-2 py-1 rounded-lg border border-slate-100">
                                                    <Clock size={10} />
                                                    {format(new Date(entry.createdAt), 'dd/MM/yyyy HH:mm')}
                                                </span>
                                            </div>
                                            {entry.comment && (
                                                <div className="text-sm text-slate-600 bg-white/50 p-3 rounded-xl border border-slate-100/50 italic leading-relaxed">
                                                    "{entry.comment}"
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Action Sidebar */}
                <div className="space-y-6 no-print">
                    <div className="bg-slate-900 text-white p-8 rounded-3xl shadow-xl shadow-slate-200">
                        <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                            <RotateCw size={20} className="text-blue-400 rtl-flip" />
                            الإجراءات المتاحة
                        </h3>

                        {['Completed', 'Closed', 'Rejected', 'Cancelled'].includes(request.stage) ? (
                            <div className="text-slate-400 italic text-center py-4 border border-white/10 rounded-xl">
                                هذا الطلب مغلق ({translateStage(request.stage)}).
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
                                            placeholder="اكتب ملاحظاتك/أسبابك هنا..."
                                        />
                                    </div>
                                )}

                                {(user?.role === 'BRANCH_SUPERVISOR' || user?.role === 'BRANCH_MANAGER' || user?.role === 'ADMIN') && request.stage === 'Supervisor Review' && (
                                    <div className="space-y-4">
                                        <button
                                            disabled={actionMutation.isPending}
                                            onClick={() => doAction('approve')}
                                            className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2"
                                        >
                                            <CheckCircle size={20} /> موافقة وإرسال لإدارة الفروع
                                        </button>
                                        <div className="grid grid-cols-2 gap-3">
                                            <button onClick={() => doAction('return')} disabled={actionMutation.isPending} className="py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl flex items-center justify-center gap-2 border border-slate-700"><RotateCw size={18} /> إرجاع للفرع</button>
                                            <button onClick={() => doAction('reject')} disabled={actionMutation.isPending} className="py-3 bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white font-bold rounded-xl flex items-center justify-center gap-2 border border-red-600/30"><XCircle size={18} /> رفض الطلب</button>
                                        </div>
                                    </div>
                                )}

                                {(user?.role === 'OPERATIONS' || user?.role === 'BRANCH_MGMT' || user?.role === 'ADMIN') && request.stage === 'Branch Management Review' && (
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-xs font-bold uppercase text-slate-400 mb-2">نوع التوثيق المطلق (إلزامي للموافقة)</label>
                                            <select
                                                value={kycType}
                                                onChange={(e) => setKycType(e.target.value as any)}
                                                className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-sm focus:border-blue-500 outline-none text-white"
                                            >
                                                <option value="">-- حدد النوع --</option>
                                                <option value="KYC">KYC</option>
                                                <option value="LKYC">LKYC</option>
                                            </select>
                                        </div>
                                        <button
                                            disabled={!kycType || actionMutation.isPending}
                                            onClick={() => doAction('approve', { kycType })}
                                            className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2"
                                        >
                                            <CheckCircle size={20} /> موافقة وتحديد النوع
                                        </button>
                                        <div className="grid grid-cols-2 gap-3">
                                            <button onClick={() => doAction('return')} disabled={actionMutation.isPending} className="py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl flex items-center justify-center gap-2 border border-slate-700"><RotateCw size={18} /> إرجاع للفرع</button>
                                            <button onClick={() => doAction('reject')} disabled={actionMutation.isPending} className="py-3 bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white font-bold rounded-xl flex items-center justify-center gap-2 border border-red-600/30"><XCircle size={18} /> رفض الطلب</button>
                                        </div>
                                    </div>
                                )}

                                {(user?.role === 'SALES_MGMT' || user?.role === 'ADMIN') && request.stage === 'Sales Management Review' && (
                                    <div className="space-y-4">
                                        <div className="p-4 bg-slate-800 rounded-xl border border-slate-700">
                                            <p className="text-xs font-bold text-slate-400 mb-3">نموذج الموافقة الموقع (إلزامي)</p>
                                            <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileSelect} accept=".pdf,image/*" />
                                            <button onClick={() => fileInputRef.current?.click()} className="w-full py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg flex items-center justify-center gap-2 text-sm">
                                                <Upload size={16} /> {salesFormFile ? salesFormFile.name : 'اختر ملف...'}
                                            </button>
                                        </div>
                                        <button
                                            disabled={!salesFormFile || actionMutation.isPending}
                                            onClick={() => doAction('approve')}
                                            className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-xl flex items-center justify-center gap-2"
                                        >
                                            {actionMutation.isPending ? <Loader2 className="animate-spin" /> : <CheckCircle size={20} />} موافقة وإرسال للعمليات
                                        </button>
                                        <div className="grid grid-cols-2 gap-3">
                                            <button onClick={() => doAction('return')} disabled={actionMutation.isPending} className="py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl flex items-center justify-center gap-2 border border-slate-700"><RotateCw size={18} /> إرجاع للفرع</button>
                                            <button onClick={() => doAction('reject')} disabled={actionMutation.isPending} className="py-3 bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white font-bold rounded-xl flex items-center justify-center gap-2 border border-red-600/30"><XCircle size={18} /> رفض الطلب</button>
                                        </div>
                                    </div>
                                )}

                                {(user?.role === 'OPERATIONS' || user?.role === 'ADMIN') && request.stage === 'Operations Review' && (
                                    <div className="space-y-4">
                                        <button onClick={() => doAction('send_to_bank')} disabled={actionMutation.isPending} className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl flex items-center justify-center gap-2"><ArrowRight size={20} className="rtl-flip" /> إرسال للبنك</button>
                                        <button onClick={() => doAction('return')} disabled={actionMutation.isPending} className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl flex items-center justify-center gap-2 border border-slate-700"><RotateCw size={18} /> طلب تعديل من الفرع</button>
                                    </div>
                                )}

                                {(user?.role === 'OPERATIONS' || user?.role === 'ADMIN') && request.stage === 'Bank Review' && (
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-xs font-bold uppercase text-slate-400 mb-2">كود التاجر المستلم من البنك (MID)</label>
                                            <input type="text" value={merchantId} onChange={(e) => setMerchantId(e.target.value)} className="w-full bg-slate-800 border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none text-white" placeholder="MID-XXXXXX" />
                                        </div>
                                        <button disabled={!merchantId || actionMutation.isPending} onClick={() => doAction('bank_approved', { mid: merchantId })} className="w-full py-3 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-bold rounded-xl flex items-center justify-center gap-2"><CheckCircle size={20} /> البنك وافق (حفظ الـ MID)</button>
                                        <div className="grid grid-cols-2 gap-3">
                                            <button onClick={() => doAction('bank_modification')} disabled={actionMutation.isPending} className="py-3 bg-amber-600/20 hover:bg-amber-600 text-amber-400 hover:text-white font-bold rounded-xl flex items-center justify-center gap-2"><RotateCw size={18} /> تعديل من البنك</button>
                                            <button onClick={() => doAction('bank_rejected')} disabled={actionMutation.isPending} className="py-3 bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white font-bold rounded-xl flex items-center justify-center gap-2"><XCircle size={18} /> البنك رفض</button>
                                        </div>
                                    </div>
                                )}

                                {(user?.role === 'BRANCH_SALES' || user?.role === 'ADMIN') && request.stage === 'Software Activation' && (
                                    <div className="space-y-4">
                                        <div className="p-4 bg-green-900/30 border border-green-500/20 rounded-xl text-green-400 text-sm mb-4">
                                            تم استلام MID: {request.merchantId}. يرجى تشغيل الماكينة ثم تأكيد التفعيل.
                                        </div>
                                        <button onClick={() => doAction('confirm_activation')} disabled={actionMutation.isPending} className="w-full py-4 bg-green-600 hover:bg-green-700 text-white font-extrabold rounded-2xl flex items-center justify-center gap-2 shadow-lg"><CheckCircle size={24} /> تأكيد تشغيل السوفتوير</button>
                                    </div>
                                )}

                                {(user?.role === 'BRANCH_SALES' || user?.role === 'ADMIN') && request.status === 'Returned' && (
                                    <div className="space-y-4">
                                        <div className="p-4 bg-blue-600/10 border border-blue-600/20 rounded-2xl text-blue-400 text-sm">
                                            الطلب مُرجع للتعديل. سيتم إرساله للجهة المطلوبة بعد التعديل.
                                        </div>
                                        <button onClick={() => navigate(`/edit/${id}`)} className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl flex items-center justify-center gap-2"><FileText size={20} /> تعديل البيانات</button>
                                        <button onClick={() => doAction('resubmit')} disabled={actionMutation.isPending} className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl flex items-center justify-center gap-2"><ArrowRight size={20} className="rtl-flip" /> إعادة تقديم الطلب بعد التعديل</button>
                                    </div>
                                )}

                                {request.ownerRole !== user?.role && request.status !== 'Returned' && (
                                    <div className="text-slate-500 italic text-center py-4 text-sm">
                                        الطلب حالياً بانتظار إجراء من: {request.ownerRole}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

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

            <div className="printable-report-wrapper">
                <PrintableReport request={request} />
            </div>
        </div>
    );
};

export default RequestDetailsPage;
