import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiService } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { Package, Send, CheckCircle2, Upload } from 'lucide-react';
import { format } from 'date-fns';

const BatchShipmentPage: React.FC = () => {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    
    const [selectedRequests, setSelectedRequests] = useState<string[]>([]);
    const [waybillNumber, setWaybillNumber] = useState('');
    const [waybillFile, setWaybillFile] = useState<File | null>(null);

    // Get requests that need physical shipping
    const { data: requests, isLoading } = useQuery({
        queryKey: ['requests', 'pending-shipment'],
        queryFn: async () => {
            const allRequests = await apiService.getRequests();
            // Show requests that are currently in the process but not yet shipped
            // Typically, branch ships documents once it's created or requested by Operations
            return allRequests.filter(req => 
                req.status !== 'Pending' && 
                req.status !== 'Cancelled' &&
                !req.shipmentBatchId // Not already in a batch
            );
        }
    });

    const createBatchMutation = useMutation({
        mutationFn: async () => {
            if (!waybillFile) throw new Error("يرجى إرفاق صورة بوليصة الشحن");
            if (!waybillNumber) throw new Error("يرجى إدخال رقم البوليصة");
            if (selectedRequests.length === 0) throw new Error("يرجى تحديد طلب واحد على الأقل");

            const formData = new FormData();
            formData.append('requestIds', JSON.stringify(selectedRequests));
            formData.append('waybillNumber', waybillNumber);
            formData.append('waybillDoc', waybillFile);

            return apiService.createBatch(formData);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['requests'] });
            queryClient.invalidateQueries({ queryKey: ['batches'] });
            alert('تم إنشاء باتش الشحن بنجاح!');
            navigate('/batches');
        },
        onError: (err: any) => {
            alert(err.message || 'حدث خطأ أثناء الإنشاء');
        }
    });

    const toggleRequest = (id: string) => {
        setSelectedRequests(prev => 
            prev.includes(id) ? prev.filter(rId => rId !== id) : [...prev, id]
        );
    };

    if (isLoading) return <div className="p-12 text-center">جاري التحميل...</div>;

    return (
        <div className="max-w-4xl mx-auto space-y-6 pb-20" dir="rtl">
            <div className="flex items-center gap-4 mb-8">
                <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center">
                    <Package size={32} />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">إرسال مستندات ورقية (إنشاء باتش)</h1>
                    <p className="text-slate-500">قم بتحديد الطلبات وإدخال بيانات بوليصة الشحن لإرسال المستندات للإدارة</p>
                </div>
            </div>

            <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200 space-y-8">
                {/* Requests Selection */}
                <div>
                    <h2 className="text-lg font-bold mb-4">1. تحديد الطلبات المراد شحنها</h2>
                    {requests && requests.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {requests.map(req => (
                                <div 
                                    key={req.id}
                                    onClick={() => toggleRequest(req.id)}
                                    className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${selectedRequests.includes(req.id) ? 'border-blue-600 bg-blue-50/50' : 'border-slate-100 hover:border-blue-300'}`}
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="font-mono font-bold text-slate-700">{req.id}</span>
                                        {selectedRequests.includes(req.id) && <CheckCircle2 size={20} className="text-blue-600" />}
                                    </div>
                                    <div className="font-bold text-slate-900">{req.merchantNameAr}</div>
                                    <div className="text-xs text-slate-500 mt-1">تاريخ الإنشاء: {format(new Date(req.createdAt), 'yyyy/MM/dd')}</div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center p-8 text-slate-500 border border-slate-200 border-dashed rounded-xl">
                            لا يوجد طلبات جاهزة للشحن حالياً.
                        </div>
                    )}
                </div>

                {/* Waybill Details */}
                <div className="pt-6 border-t border-slate-100">
                    <h2 className="text-lg font-bold mb-4">2. بيانات بوليصة الشحن</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">رقم بوليصة الشحن</label>
                            <input 
                                type="text"
                                value={waybillNumber}
                                onChange={e => setWaybillNumber(e.target.value)}
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                                placeholder="مثال: 123456789"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">صورة بوليصة الشحن</label>
                            <div className="relative">
                                <input 
                                    type="file" 
                                    onChange={e => setWaybillFile(e.target.files ? e.target.files[0] : null)}
                                    className="hidden" 
                                    id="waybill-upload" 
                                    accept="image/*,.pdf" 
                                />
                                <label 
                                    htmlFor="waybill-upload"
                                    className="w-full px-4 py-3 border border-slate-200 rounded-xl flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors"
                                >
                                    <span className="text-slate-500 truncate">{waybillFile ? waybillFile.name : 'اختر صورة/ملف...'}</span>
                                    <Upload size={18} className="text-blue-500" />
                                </label>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="pt-6 flex justify-end">
                    <button 
                        onClick={() => {
                            if (window.confirm(`هل أنت متأكد من إرسال بوليصة الشحن رقم (${waybillNumber}) التي تحتوي على ${selectedRequests.length} طلب؟`)) {
                                createBatchMutation.mutate();
                            }
                        }}
                        disabled={createBatchMutation.isPending || selectedRequests.length === 0 || !waybillNumber || !waybillFile}
                        className="px-8 py-3 bg-blue-600 text-white font-bold rounded-xl shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all disabled:opacity-50 flex items-center gap-2"
                    >
                        {createBatchMutation.isPending ? 'جاري الإنشاء...' : <><Send size={20} className="rtl-flip" /> إرسال للمركز الرئيسي</>}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default BatchShipmentPage;
