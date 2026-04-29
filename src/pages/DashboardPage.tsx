import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiService } from '../services/api';
import { calculateSLA } from '../utils/slaUtils';
import { useTranslation } from 'react-i18next';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    Legend
} from 'recharts';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';
import {
    Users,
    CheckCircle,
    Clock,
    AlertTriangle,
    ArrowUpLeft,
    TrendingUp,
    BarChart as BarChartIcon,
    History as HistoryIcon,
    XCircle,
    ArrowUpRight,
    RotateCw
} from 'lucide-react';

const DashboardPage: React.FC = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { data: requests } = useQuery({
        queryKey: ['requests', 'dashboard'],
        queryFn: () => apiService.getRequests(),
    });

    const { data: activities } = useQuery({
        queryKey: ['activities'],
        queryFn: () => apiService.getActivity(),
        refetchInterval: 30000 // Refresh every 30 seconds
    });
    
    const translateStatus = (status: string) => {
        const map: any = {
            'Pending': 'قيد الانتظار',
            'Submitted': 'تقديم الطلب',
            'Activated': 'تفعيل التاجر',
            'Returned': 'إرجاع للتعديل',
            'Rejected': 'رفض الطلب',
            'Cancelled': 'إلغاء الطلب'
        };
        return map[status] || status;
    };

    if (!requests) return <div className="p-8">جاري تحميل البيانات...</div>;

    // KPI Calculations
    const total = requests.length;
    const activated = requests.filter(r => r.status === 'Activated').length;
    const pending = requests.filter(r => r.status === 'Pending').length;
    const returned = requests.filter(r => r.status === 'Returned').length;
    const rejected = requests.filter(r => r.status === 'Rejected').length;

    const breachedCount = requests.filter(r => calculateSLA(r.slaStartDate, r.slaTargetDays).isBreached).length;
    const slaCompliance = total > 0 ? Math.round(((total - breachedCount) / total) * 100) : 100;

    // Chart Data: Status Distribution
    const statusData = [
        { name: 'مفعّل', value: activated, color: '#10b981' },
        { name: 'قيد المراجعة', value: pending, color: '#f59e0b' },
        { name: 'مُعاد', value: returned, color: '#f97316' },
        { name: 'مرفوض', value: rejected, color: '#ef4444' },
    ];

    // Chart Data: Requests by Branch
    const branchCounts = requests.reduce((acc: any, curr) => {
        const bName = curr.branch?.name || 'Unknown';
        acc[bName] = (acc[bName] || 0) + 1;
        return acc;
    }, {});
    const branchData = Object.entries(branchCounts).map(([name, count]) => ({ name, count }));

    // Chart Data: SLA Breaches by Owner
    const breachesByOwner = requests.filter(r => calculateSLA(r.slaStartDate, r.slaTargetDays).isBreached)
        .reduce((acc: any, curr) => {
            acc[curr.assignedTo] = (acc[curr.assignedTo] || 0) + 1;
            return acc;
        }, {});
    const breachData = Object.entries(breachesByOwner).map(([name, count]) => ({ name, count }));

    const kpis = [
        { label: t('total_requests'), value: total, icon: Users, color: 'bg-blue-50 text-blue-600' },
        { label: t('activated'), value: activated, icon: CheckCircle, color: 'bg-green-50 text-green-600' },
        { label: t('pending'), value: pending, icon: Clock, color: 'bg-amber-50 text-amber-600' },
        { label: t('sla_compliance'), value: `${slaCompliance}%`, icon: AlertTriangle, color: breachedCount > 0 ? 'bg-red-50 text-red-600' : 'bg-indigo-50 text-indigo-600' },
    ];

    return (
        <div className="space-y-8 pb-12" dir="rtl">
            <div>
                <h1 className="text-2xl font-bold text-slate-900 border-b pb-4">لوحة مؤشرات الأداء (إدارة)</h1>
                <p className="text-slate-500 mt-1">تحليلات مباشرة لعمليات تهيئة التجار والالتزام بالخطة الزمنية.</p>
            </div>

            {/* KPI Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {kpis.map((kpi, idx) => (
                    <div key={idx} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4 group hover:shadow-md transition-shadow">
                        <div className={`p-4 rounded-xl ${kpi.color} transition-transform group-hover:scale-110`}>
                            <kpi.icon size={24} />
                        </div>
                        <div className="text-right">
                            <p className="text-sm font-semibold text-slate-500">{kpi.label}</p>
                            <p className="text-2xl font-extrabold text-slate-900">{kpi.value}</p>
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Status Distribution (Pie) */}
                <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
                    <div className="flex items-center justify-between mb-8">
                        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                            <TrendingUp size={20} className="text-blue-500" />
                            توزيع الحالات
                        </h2>
                        <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded">بيانات حية</span>
                    </div>
                    <div className="w-full h-[250px] min-h-[250px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={statusData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {statusData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip />
                                <Legend verticalAlign="bottom" height={36} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Requests by Branch (Bar) */}
                <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
                    <div className="flex items-center justify-between mb-8">
                        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                            <BarChartIcon size={20} className="text-blue-500" />
                            حجم الطلبات حسب الفرع
                        </h2>
                        <ArrowUpLeft size={18} className="text-slate-300" />
                    </div>
                    <div className="w-full h-[250px] min-h-[250px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={branchData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} orientation="right" />
                                <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                                <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={40} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* SLA Breaches (Bar) */}
                <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 lg:col-span-2">
                    <div className="flex items-center justify-between mb-8">
                        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                            <AlertTriangle size={20} className="text-red-500" />
                            تجاوزات الالتزام حسب الموظف
                        </h2>
                    </div>
                    <div className="w-full h-[250px] min-h-[250px]">
                        {breachData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={breachData} layout="vertical">
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                                    <XAxis type="number" hide />
                                    <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} width={120} orientation="right" />
                                    <Tooltip cursor={{ fill: '#fff1f2' }} />
                                    <Bar dataKey="count" fill="#ef4444" radius={[4, 0, 0, 4]} barSize={20} />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex items-center justify-center text-slate-400 italic font-bold">
                                أداء ممتاز! لا توجد تجاوزات حالياً.
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Global Activity Log */}
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
                <div className="flex items-center justify-between mb-8">
                    <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <HistoryIcon size={20} className="text-blue-500" />
                        سجل العمليات الأخير (Bank-wide)
                    </h2>
                    <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-2 py-1 rounded border border-slate-100">تحليل فوري</span>
                </div>

                <div className="space-y-4">
                    {activities && activities.length > 0 ? (
                        activities.map((log: any) => {
                            const StatusIcon = 
                                log.status === 'Activated' ? CheckCircle :
                                log.status === 'Rejected' ? XCircle :
                                log.status === 'Returned' ? RotateCw :
                                log.status === 'Submitted' ? ArrowUpRight : Clock;
                            
                            const bgColors: any = {
                                'Activated': 'bg-green-50 text-green-600',
                                'Rejected': 'bg-red-50 text-red-600',
                                'Returned': 'bg-amber-50 text-amber-600',
                                'Submitted': 'bg-blue-50 text-blue-600',
                                'Pending': 'bg-slate-50 text-slate-600'
                            };

                            return (
                                <div 
                                    key={log.id} 
                                    onClick={() => navigate(`/details/${log.request.id}`)}
                                    className="flex items-center justify-between p-4 hover:bg-slate-50 border border-transparent hover:border-slate-100 rounded-xl transition-all cursor-pointer group"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={`p-2.5 rounded-lg ${bgColors[log.status] || 'bg-slate-50 text-slate-400 shadow-sm'}`}>
                                            <StatusIcon size={18} className={log.status === 'Returned' ? 'rtl-flip' : ''} />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                                                {log.request.merchantNameAr}
                                            </p>
                                            <p className="text-xs text-slate-500">
                                                <span className="font-bold">{log.changedByUser?.fullName || 'System'}</span> قام بـ {translateStatus(log.status)}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-left">
                                        <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-2 py-1 rounded">
                                            {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true, locale: ar })}
                                        </span>
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <div className="py-12 text-center text-slate-400 italic">لا توجد عمليات مسجلة حالياً.</div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DashboardPage;
