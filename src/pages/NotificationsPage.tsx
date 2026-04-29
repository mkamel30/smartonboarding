import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiService } from '../services/api';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCircle2, Package, ArrowRight } from 'lucide-react';
import { format } from 'date-fns';

const NotificationsPage: React.FC = () => {
    const queryClient = useQueryClient();
    const navigate = useNavigate();

    const { data: notifications, isLoading } = useQuery({
        queryKey: ['notifications'],
        queryFn: apiService.getNotifications,
        refetchInterval: 30000 // Refetch every 30 seconds
    });

    const markReadMutation = useMutation({
        mutationFn: apiService.markNotificationRead,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
            queryClient.invalidateQueries({ queryKey: ['unread-notifications'] });
        }
    });

    const markAllReadMutation = useMutation({
        mutationFn: apiService.markAllNotificationsRead,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
            queryClient.invalidateQueries({ queryKey: ['unread-notifications'] });
        }
    });

    if (isLoading) return <div className="p-12 text-center">جاري التحميل...</div>;

    const handleNotificationClick = (notif: any) => {
        if (!notif.isRead) {
            markReadMutation.mutate(notif.id);
        }

        if (notif.requestId) {
            navigate(`/details/${notif.requestId}`);
        } else if (notif.type.includes('BATCH')) {
            navigate('/batches');
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6 pb-20" dir="rtl">
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center">
                        <Bell size={32} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">الإشعارات</h1>
                        <p className="text-slate-500">تحديثات دورة العمل الخاصة بك</p>
                    </div>
                </div>

                <button 
                    onClick={() => markAllReadMutation.mutate()}
                    disabled={markAllReadMutation.isPending || !notifications?.some((n: any) => !n.isRead)}
                    className="px-4 py-2 text-sm font-bold text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors disabled:opacity-50"
                >
                    تحديد الكل كمقروء
                </button>
            </div>

            <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
                {notifications && notifications.length > 0 ? (
                    <div className="divide-y divide-slate-100">
                        {notifications.map((notif: any) => {
                            let Icon = Bell;
                            let bgColor = 'bg-slate-100 text-slate-500';

                            if (notif.type.includes('SUBMITTED') || notif.type.includes('APPROVED')) {
                                Icon = CheckCircle2;
                                bgColor = 'bg-green-100 text-green-600';
                            } else if (notif.type.includes('RETURNED') || notif.type.includes('REJECTED')) {
                                Icon = ArrowRight;
                                bgColor = 'bg-red-100 text-red-600';
                            } else if (notif.type.includes('BATCH')) {
                                Icon = Package;
                                bgColor = 'bg-purple-100 text-purple-600';
                            }

                            return (
                                <div 
                                    key={notif.id}
                                    onClick={() => handleNotificationClick(notif)}
                                    className={`p-5 flex gap-4 cursor-pointer transition-colors ${notif.isRead ? 'bg-white hover:bg-slate-50' : 'bg-blue-50/30 hover:bg-blue-50/50'}`}
                                >
                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${bgColor}`}>
                                        <Icon size={24} className={notif.type.includes('RETURNED') ? 'rtl-flip' : ''} />
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex justify-between items-start mb-1">
                                            <h3 className={`text-base ${notif.isRead ? 'font-medium text-slate-700' : 'font-bold text-slate-900'}`}>
                                                {notif.title}
                                            </h3>
                                            <span className="text-xs text-slate-400 whitespace-nowrap mr-4">
                                                {format(new Date(notif.createdAt), 'yyyy/MM/dd HH:mm')}
                                            </span>
                                        </div>
                                        <p className="text-sm text-slate-500 line-clamp-2">
                                            {notif.message}
                                        </p>
                                        {notif.requestId && (
                                            <span className="inline-block mt-2 text-xs font-mono font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                                                {notif.requestId}
                                            </span>
                                        )}
                                    </div>
                                    {!notif.isRead && (
                                        <div className="w-2 h-2 rounded-full bg-blue-500 mt-2 shrink-0"></div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="p-12 text-center text-slate-500">
                        <Bell size={48} className="mx-auto mb-4 opacity-20" />
                        لا توجد إشعارات حالياً.
                    </div>
                )}
            </div>
        </div>
    );
};

export default NotificationsPage;
