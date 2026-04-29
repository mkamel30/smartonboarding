import React, { useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiService } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import {
    Building,
    Home,
    FileUp,
    Save,
    CheckCircle2,
    CheckCircle,
    Settings,
    FileText,
    Info,
    X,
    Loader2,
    AlertCircle
} from 'lucide-react';

const SubmissionPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const isEditMode = !!id;
    
    const { user } = useAuth();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { t } = useTranslation();
    const [isSuccess, setIsSuccess] = useState(false);
    const [selectedFiles, setSelectedFiles] = useState<{ [key: string]: File }>({});
    const [uploading, setUploading] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const [currentDocType, setCurrentDocType] = useState<string | null>(null);
    const [selectedServiceTypes, setSelectedServiceTypes] = useState<string[]>([]);

    // Fetch existing request if in edit mode
    const { data: existingRequest, isLoading: isLoadingRequest } = useQuery({
        queryKey: ['request', id],
        queryFn: async () => {
            const data = await apiService.getRequestDetails(id!);
            if (data?.serviceType) {
                setSelectedServiceTypes(data.serviceType.split(', '));
            }
            return data;
        },
        enabled: isEditMode,
    });

    const mutation = useMutation({
        mutationFn: async (formData: any) => {
            let request;
            
            if (isEditMode) {
                // Update existing request
                request = await apiService.updateRequest(id!, {
                    ...formData,
                    stage: 'Branch Management Review',
                    status: 'Submitted',
                    ownerRole: 'BRANCH_MGMT',
                    historyEntry: {
                        fromStage: existingRequest?.stage || 'Unknown',
                        toStage: 'Branch Management Review',
                        status: 'Submitted',
                        comment: 'تم تعديل الطلب وإعادة تقديمه'
                    }
                });
            } else {
                // Create new request
                request = await apiService.createRequest(formData);
            }

            // Upload files to Drive if any new ones are selected
            const filesToUpload = Object.values(selectedFiles);
            if (filesToUpload.length > 0) {
                setUploading(true);
                try {
                    const branchName = user?.branch?.name || 'Unknown';
                    const uploadData = new FormData();
                    uploadData.append('requestId', request.id);
                    uploadData.append('branchName', branchName);
                    uploadData.append('merchantName', request.merchantNameAr);
                    
                    Object.entries(selectedFiles).forEach(([docType, file]) => {
                        uploadData.append('docs', file);
                        uploadData.append('docTypes', docType);
                    });

                    await apiService.uploadDocs(uploadData);
                } catch (err) {
                    console.error('File upload failed but request was processed', err);
                } finally {
                    setUploading(false);
                }
            }

            return request;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['requests'] });
            if (isEditMode) queryClient.invalidateQueries({ queryKey: ['request', id] });
            setIsSuccess(true);
            setTimeout(() => navigate('/requests'), 2000);
        },
    });

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0] && currentDocType) {
            setSelectedFiles(prev => ({
                ...prev,
                [currentDocType]: e.target.files![0]
            }));
        }
    };

    const triggerFileInput = (docType: string) => {
        setCurrentDocType(docType);
        fileInputRef.current?.click();
    };

    const removeFile = (docType: string, e: React.MouseEvent) => {
        e.stopPropagation();
        const newFiles = { ...selectedFiles };
        delete newFiles[docType];
        setSelectedFiles(newFiles);
    };

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const data = Object.fromEntries(formData.entries());
        
        // Add serviceType as a comma-separated string
        data.serviceType = selectedServiceTypes.join(', ');
        
        // Validation for mandatory files (only for new requests)
        if (!isEditMode) {
            const mandatoryDocs = ['السجل التجاري', 'البطاقة الضريبية', 'البطاقة الشخصية', 'عقد الخدمة الموقّع'];
            const missingDocs = mandatoryDocs.filter(doc => !selectedFiles[doc]);
            
            if (missingDocs.length > 0) {
                alert(`يرجى رفع المستندات التالية أولاً: ${missingDocs.join('، ')}`);
                return;
            }
        }
        
        mutation.mutate(data);
    };

    const toggleServiceType = (service: string) => {
        setSelectedServiceTypes(prev => 
            prev.includes(service) 
                ? prev.filter(s => s !== service)
                : [...prev, service]
        );
    };

    if (isLoadingRequest) return <div className="p-12 flex items-center justify-center"><Loader2 className="animate-spin text-blue-500" /></div>;
    
    if (isSuccess) {
        return (
            <div className="h-full flex flex-col items-center justify-center p-8 text-center" dir="rtl">
                <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-6 animate-bounce">
                    <CheckCircle2 size={48} />
                </div>
                <h1 className="text-3xl font-bold text-slate-900 mb-2">
                    {isEditMode ? 'تم تحديث الطلب بنجاح!' : 'تم تقديم الطلب بنجاح!'}
                </h1>
                <p className="text-slate-600 max-w-md">تم إرسال الطلب لمدير الفرع للمراجعة. جاري التحويل للمتتبع...</p>
            </div>
        );
    }

    // Permission check for edit mode
    if (isEditMode && existingRequest && user?.role === 'BRANCH_SALES' && existingRequest.status !== 'Returned') {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-center gap-4" dir="rtl">
                <AlertCircle size={48} className="text-red-500" />
                <h1 className="text-2xl font-bold">عذراً، لا يمكنك تعديل هذا الطلب</h1>
                <p className="text-slate-500">يمكن تعديل الطلبات فقط عندما يتم إرجاعها للمراجعة من قبل مدير الفرع أو العمليات.</p>
                <button onClick={() => navigate('/requests')} className="px-6 py-2 bg-blue-600 text-white rounded-lg">العودة للمتتبع</button>
            </div>
        );
    }


    return (
        <div className="max-w-4xl mx-auto space-y-8" dir="rtl">
            <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                onChange={handleFileChange}
                accept=".pdf,.jpg,.jpeg,.png"
            />

            <div>
                <h1 className="text-2xl font-bold text-slate-900">
                    {isEditMode ? `تعديل طلب: ${id}` : 'طلب تهيئة تاجر جديد'}
                </h1>
                <p className="text-slate-500">يرجى ملء جميع بيانات التاجر ورفع المستندات المطلوبة.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8 pb-12">
                {/* Basic Information */}
                <section className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
                    <h2 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2 text-right">
                        <Building size={20} className="text-blue-500" />
                        البيانات الأساسية للتاجر
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-slate-700">اسم التاجر / المسمى القانوني (عربي)</label>
                            <input required name="merchantNameAr" type="text" defaultValue={existingRequest?.merchantNameAr} placeholder="اسم التاجر" className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-right" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-slate-700">اسم التاجر / المسمى القانوني (انجليزي)</label>
                            <input required name="merchantNameEn" type="text" defaultValue={existingRequest?.merchantNameEn} placeholder="Merchant Name" className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-left" />
                        </div>
                        
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-slate-700">اسم المسئول</label>
                            <input name="responsiblePerson" type="text" defaultValue={existingRequest?.responsiblePerson} className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-right" placeholder="اسم الشخص المسئول" />
                        </div>
                        
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-slate-700">رقم الهاتف</label>
                            <input name="phone" type="tel" defaultValue={existingRequest?.phone} className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-right" placeholder="01XXXXXXXXX" />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-slate-700">المحافظة</label>
                            <select name="governorate" defaultValue={existingRequest?.governorate} className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-right leading-tight">
                                <option>القاهرة</option>
                                <option>الجيزة</option>
                                <option>الإسكندرية</option>
                                <option>القليوبية</option>
                                <option>الدقهلية</option>
                                <option>الغربية</option>
                                <option>الشرقية</option>
                                <option>المنوفية</option>
                                <option>البحيرة</option>
                                <option>كفر الشيخ</option>
                                <option>دمياط</option>
                                <option>بورسعيد</option>
                                <option>الإسماعيلية</option>
                                <option>السويس</option>
                                <option>الفيوم</option>
                                <option>بني سويف</option>
                                <option>المنيا</option>
                                <option>أسيوط</option>
                                <option>سوهاج</option>
                                <option>قنا</option>
                                <option>الأقصر</option>
                                <option>أسوان</option>
                                <option>البحر الأحمر</option>
                                <option>الوادي الجديد</option>
                                <option>مطروح</option>
                                <option>شمال سيناء</option>
                                <option>جنوب سيناء</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-slate-700">العنوان بالتفصيل</label>
                            <div className="relative">
                                <Home className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                <input name="address" type="text" defaultValue={existingRequest?.address} className="w-full pr-10 pl-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-right" placeholder="رقم الشارع، الحي..." />
                            </div>
                        </div>
                        
                        <div className="space-y-2 md:col-span-2">
                            <label className="text-sm font-semibold text-slate-700">البريد الإلكتروني</label>
                            <input name="email" type="email" defaultValue={existingRequest?.email} className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-left" placeholder="example@domain.com" />
                        </div>
                    </div>
                </section>

                {/* Identity & Legal Info */}
                <section className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
                    <h2 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                        <FileText size={20} className="text-blue-500" />
                        أرقام الهوية والوثائق القانونية
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-slate-700">رقم السجل التجاري <span className="text-red-500">*</span></label>
                            <input required name="commercialRegistryNo" type="text" defaultValue={existingRequest?.commercialRegistryNo} className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-right" placeholder="سجل تجاري رقم..." />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-slate-700">رقم البطاقة الضريبية <span className="text-red-500">*</span></label>
                            <input required name="taxCardNo" type="text" defaultValue={existingRequest?.taxCardNo} className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-right" placeholder="رقم التسجيل الضريبي..." />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-slate-700">رقم الرخصة</label>
                            <input name="licenseNo" type="text" defaultValue={existingRequest?.licenseNo} className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-right" placeholder="الرخصة رقم..." />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-slate-700">الرقم القومي (لصاحب النشاط) <span className="text-red-500">*</span></label>
                            <input required name="nationalIdNo" type="text" defaultValue={existingRequest?.nationalIdNo} className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-right" placeholder="14 رقم..." />
                        </div>
                    </div>
                </section>

                {/* Financial Details */}
                <section className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
                    <h2 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                        <CheckCircle size={20} className="text-blue-500" />
                        البيانات البنكية والمالية
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-slate-700">رقم الحساب البنكي (IBAN)</label>
                            <input name="iban" type="text" defaultValue={existingRequest?.iban} className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-left" placeholder="EGXXXXXXXXXXXXXXXXXXXXXXXX" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-slate-700">اسم البنك</label>
                            <input name="bankName" type="text" defaultValue={existingRequest?.bankName} className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-right" placeholder="اسم البنك التابع له الحساب" />
                        </div>
                    </div>
                </section>

                {/* Technical & Operational Details */}
                <section className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
                    <h2 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                        <Settings size={20} className="text-blue-500" />
                        {t('technical_details')} والتشغيل
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-slate-700">نوع النشاط</label>
                            <select name="activityType" defaultValue={existingRequest?.activityType} className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-right">
                                <option value="">اختر نوع النشاط...</option>
                                <option>تموين</option>
                                <option>استبدال</option>
                                <option>مخبز</option>
                                <option>مستودع</option>
                                <option>محطة بنزين</option>
                                <option>تاجر خارجي</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-slate-700">كود العميل / المخبز / المحطة</label>
                            <input name="customerCode" type="text" defaultValue={existingRequest?.customerCode} className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-right" placeholder="كود تعريفي..." />
                        </div>
                        
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-slate-700">نوع الخدمة المقدمة</label>
                            <div className="flex gap-4 mt-2">
                                {['سحب وإيداع', 'قبول بطاقات'].map(service => (
                                    <label key={service} className="flex items-center gap-2 cursor-pointer">
                                        <input 
                                            type="checkbox" 
                                            checked={selectedServiceTypes.includes(service)}
                                            onChange={() => toggleServiceType(service)}
                                            className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                                        />
                                        <span className="text-sm font-medium text-slate-700">{service}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-slate-700">قبول البطاقات (Service ID)</label>
                            <input name="cardsAcceptance" type="text" defaultValue={existingRequest?.cardsAcceptance} className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-right" placeholder="نوع البطاقات أو كود الخدمة" />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-slate-700">نوع الماكينة</label>
                            <input name="machineType" type="text" defaultValue={existingRequest?.machineType} className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-right" placeholder="مثلاً: VX520, A920" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-slate-700">كود الماكينة</label>
                            <input name="machineCode" type="text" defaultValue={existingRequest?.machineCode} className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-right" placeholder="كود الاستبدال أو كود التموين" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-slate-700">مسلسل الماكينة (Serial No)</label>
                            <input name="machineSerial" type="text" defaultValue={existingRequest?.machineSerial} className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-right" placeholder="S/N: XXXXXXXX" />
                        </div>
                        
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-slate-700">كود ضامن {selectedServiceTypes.includes('سحب وإيداع') && <span className="text-red-500">* (إلزامي للسحب والإيداع)</span>}</label>
                            <input 
                                name="damanCode" 
                                type="text" 
                                required={selectedServiceTypes.includes('سحب وإيداع')}
                                defaultValue={existingRequest?.damanCode} 
                                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-right" 
                                placeholder="كود ضامن" 
                            />
                        </div>
                        
                        <div className="space-y-2 md:col-span-2">
                            <label className="text-sm font-semibold text-slate-700">تاريخ التعاقد / تاريخ التوقيع</label>
                            <input name="contractDate" type="date" defaultValue={existingRequest?.contractDate} className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-right" />
                        </div>
                    </div>
                </section>

                {/* Document Upload */}
                <section className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
                    <h2 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                        <FileUp size={20} className="text-blue-500" />
                        {t('required_documents')}
                    </h2>

                    {isEditMode && (
                        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-100 rounded-xl flex items-start gap-3">
                            <Info size={20} className="text-yellow-600 shrink-0 mt-0.5" />
                            <p className="text-sm text-yellow-800 font-medium leading-relaxed">
                                يمكنك رفع نسخ جديدة من المستندات في حال طلب التعديل عليها. الملفات الحالية موجودة بالفعل في المجلد الخاص بالطلب.
                            </p>
                        </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {[
                            'السجل التجاري', 'البطاقة الضريبية', 'البطاقة الشخصية', 
                            'الرخصة', 'عقد الإيجار/الملكية', 'عقد الخدمة الموقّع',
                            'التوكيل', 'بطاقة صاحب التوكيل'
                        ].map(doc => (
                            <div
                                key={doc}
                                onClick={() => triggerFileInput(doc)}
                                className={`p-4 border rounded-xl transition-all cursor-pointer group ${selectedFiles[doc] ? 'bg-blue-50 border-blue-200 shadow-sm' : 'border-dashed border-slate-200 hover:border-blue-400 hover:bg-blue-50/30'}`}
                            >
                                <div className="flex items-center justify-between">
                                    <div className="text-right flex-1 overflow-hidden">
                                        <p className="text-sm font-bold text-slate-700">
                                            {doc} {['السجل التجاري', 'البطاقة الضريبية', 'البطاقة الشخصية', 'عقد الخدمة الموقّع'].includes(doc) && <span className="text-red-500">*</span>}
                                        </p>
                                        <p className="text-[10px] text-slate-400 truncate">
                                            {selectedFiles[doc] 
                                                ? selectedFiles[doc].name 
                                                : (['السجل التجاري', 'البطاقة الضريبية', 'البطاقة الشخصية', 'عقد الخدمة الموقّع'].includes(doc) ? 'اضغط لرفع الملف (إلزامي)' : 'رفع نسخة جديدة (اختياري)')
                                            }
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {selectedFiles[doc] ? (
                                            <button
                                                onClick={(e) => removeFile(doc, e)}
                                                className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded"
                                            >
                                                <X size={16} />
                                            </button>
                                        ) : (
                                            <FileUp size={20} className="text-slate-200 group-hover:text-blue-500 transition-colors shrink-0" />
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                <div className="flex items-center justify-end gap-4">
                    <button type="button" onClick={() => navigate('/requests')} className="px-6 py-3 font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">
                        إلغاء
                    </button>
                    <button
                        type="submit"
                        disabled={mutation.isPending || uploading}
                        className="px-10 py-3 bg-blue-600 text-white font-bold rounded-xl shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2"
                    >
                        {mutation.isPending || uploading ? (
                            <><Loader2 className="animate-spin" size={20} /> {isEditMode ? 'جاري التحديث...' : 'جاري التقديم...'}</>
                        ) : (
                            <><Save size={20} className="rtl-flip" /> {isEditMode ? 'حفظ التعديلات' : 'تقديم الطلب'}</>
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default SubmissionPage;
