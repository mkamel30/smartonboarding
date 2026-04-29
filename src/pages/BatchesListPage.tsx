import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiService } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { Package, FileText, CheckCircle, Clock } from 'lucide-react';
import { format } from 'date-fns';

const BatchesListPage: React.FC = () => {
    const { user } = useAuth();
    const queryClient = useQueryClient();

    const { data: batches, isLoading } = useQuery({
        queryKey: ['batches'],
        queryFn: apiService.getBatches
    });

    const receiveMutation = useMutation({
        mutationFn: (id: string) => apiService.receiveBatch(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['batches'] });
            alert('تم تأكيد استلام الباتش بنجاح');
        }
    });

    if (isLoading) return <div className="p-12 text-center">جاري التحميل...</div>;

    const canReceive = user?.role === 'BRANCH_MGMT' || user?.role === 'ADMIN';

    return (
        <div className="max-w-6xl mx-auto space-y-6 pb-20" dir="rtl">
            <div className="flex items-center gap-4 mb-8">
                <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center">
                    <Package size={32} />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">سجل بواليص الشحن</h1>
                    <p className="text-slate-500">متابعة وحالة استلام المستندات الورقية من الفروع</p>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
                {batches?.map((batch: any) => (
                    <div key={batch.id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6 transition-all hover:shadow-md">
                        <div className="flex items-start gap-4">
                            <div className={`p-4 rounded-xl shrink-0 ${batch.status === 'Received' ? 'bg-green-50 text-green-600' : 'bg-amber-50 text-amber-600'}`}>
                                {batch.status === 'Received' ? <CheckCircle size={28} /> : <Clock size={28} />}
                            </div>
                            <div>
                                <div className="flex items-center gap-3 mb-1">
                                    <h3 className="font-bold text-lg text-slate-800">{batch.batchNumber}</h3>
                                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${batch.status === 'Received' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                                        {batch.status === 'Received' ? 'تم الاستلام' : 'جاري الشحن'}
                                    </span>
                                </div>
                                <div className="text-sm text-slate-500 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
                                    <p>بوليصة: <span className="font-bold text-slate-700">{batch.waybillNumber}</span></p>
                                    <p>الفرع: <span className="font-bold text-slate-700">{batch.senderBranch?.name}</span></p>
                                    <p>عدد الطلبات: <span className="font-bold text-slate-700">{batch._count?.requests} طلب</span></p>
                                    <p>الإرسال: <span className="font-bold text-slate-700">{format(new Date(batch.createdAt), 'yyyy/MM/dd')}</span></p>
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col gap-2 w-full md:w-auto">
                            {canReceive && batch.status !== 'Received' && (
                                <button 
                                    onClick={() => receiveMutation.mutate(batch.id)}
                                    disabled={receiveMutation.isPending}
                                    className="px-6 py-2 bg-green-600 text-white rounded-xl font-bold shadow-sm hover:bg-green-700 transition-colors w-full"
                                >
                                    تأكيد الاستلام
                                </button>
                            )}
                            
                            {batch.status === 'Received' && (
                                <div className="text-xs text-slate-400 bg-slate-50 px-3 py-2 rounded-lg border border-slate-100 text-center">
                                    استلم بواسطة: {batch.receivedBy?.fullName} <br/>
                                    {format(new Date(batch.receivedAt), 'yyyy/MM/dd')}
                                </div>
                            )}

                            {batch.waybillFolderId && (
                                <a 
                                    href={`https://drive.google.com/drive/folders/${batch.waybillFolderId}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-sm font-bold hover:bg-slate-200 transition-colors flex items-center justify-center gap-2"
                                >
                                    <FileText size={16} /> صورة البوليصة
                                </a>
                            )}
                        </div>
                    </div>
                ))}

                {batches?.length === 0 && (
                    <div className="text-center p-12 bg-white rounded-3xl border border-slate-200 text-slate-500">
                        لا يوجد بواليص شحن حتى الآن.
                    </div>
                )}
            </div>
        </div>
    );
};

export default BatchesListPage;
