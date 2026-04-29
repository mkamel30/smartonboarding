import React, { useState, useEffect } from 'react';
import { 
    Settings, 
    Building2, 
    Users, 
    History, 
    Plus, 
    Search, 
    ToggleLeft, 
    ToggleRight, 
    Edit2, 
    Loader2,
    Save,
    X
} from 'lucide-react';
import { apiService } from '../services/api';
import type { Branch, User } from '../types';
import { format } from 'date-fns';

type Tab = 'branches' | 'users' | 'audit';

const AdminPage: React.FC = () => {
    const [activeTab, setActiveTab] = useState<Tab>('branches');
    const [isLoading, setIsLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    
    // Data states
    const [branches, setBranches] = useState<Branch[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [auditLogs, setAuditLogs] = useState<any[]>([]);

    // Modal states
    const [showBranchModal, setShowBranchModal] = useState(false);
    const [showUserModal, setShowUserModal] = useState(false);
    const [editingBranch, setEditingBranch] = useState<Partial<Branch> | null>(null);
    const [editingUser, setEditingUser] = useState<any | null>(null);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            if (activeTab === 'branches') {
                const data = await apiService.getBranches();
                setBranches(data);
            } else if (activeTab === 'users') {
                const [userData, branchData] = await Promise.all([
                    apiService.getUsers(),
                    apiService.getBranches()
                ]);
                setUsers(userData);
                setBranches(branchData); // Needed for user branch dropdown
            } else if (activeTab === 'audit') {
                const data = await apiService.getAdminAuditLog();
                setAuditLogs(data);
            }
        } catch (err) {
            console.error('Failed to fetch admin data:', err);
        }
        setIsLoading(false);
    };

    useEffect(() => {
        fetchData();
    }, [activeTab]);

    // --- BRANCH HANDLERS ---
    const handleSaveBranch = async (e: React.FormEvent) => {
        e.preventDefault();
        const formData = new FormData(e.target as HTMLFormElement);
        const data = Object.fromEntries(formData.entries());
        
        try {
            if (editingBranch?.id) {
                await apiService.updateBranch(editingBranch.id, data);
            } else {
                await apiService.createBranch(data);
            }
            setShowBranchModal(false);
            setEditingBranch(null);
            fetchData();
        } catch (err) {
            alert('فشل حفظ بيانات الفرع');
        }
    };

    const toggleBranchStatus = async (branch: Branch) => {
        try {
            await apiService.updateBranch(branch.id, { isActive: !branch.isActive });
            fetchData();
        } catch (err) {
            alert('فشل تغيير حالة الفرع');
        }
    };

    // --- USER HANDLERS ---
    const handleSaveUser = async (e: React.FormEvent) => {
        e.preventDefault();
        const formData = new FormData(e.target as HTMLFormElement);
        const data = Object.fromEntries(formData.entries());
        
        try {
            if (editingUser?.id) {
                await apiService.updateUser(editingUser.id, data);
            } else {
                await apiService.createUser(data);
            }
            setShowUserModal(false);
            setEditingUser(null);
            fetchData();
        } catch (err) {
            alert('فشل حفظ بيانات المستخدم');
        }
    };

    const toggleUserStatus = async (user: User) => {
        try {
            await apiService.updateUser(user.id, { isActive: !user.isActive });
            fetchData();
        } catch (err) {
            alert('فشل تغيير حالة المستخدم');
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-slate-900 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-slate-200">
                        <Settings size={24} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">إدارة النظام</h1>
                        <p className="text-slate-500 text-sm">التحكم في الفروع، المستخدمين، وسجلات النظام</p>
                    </div>
                </div>

                <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-2xl">
                    <button 
                        onClick={() => setActiveTab('branches')}
                        className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'branches' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        <Building2 size={18} />
                        <span>الفروع</span>
                    </button>
                    <button 
                        onClick={() => setActiveTab('users')}
                        className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'users' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        <Users size={18} />
                        <span>المستخدمين</span>
                    </button>
                    <button 
                        onClick={() => setActiveTab('audit')}
                        className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'audit' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        <History size={18} />
                        <span>سجل العمليات</span>
                    </button>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                {/* Toolbar */}
                <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input 
                            type="text" 
                            placeholder="بحث سريع..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pr-11 pl-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                        />
                    </div>
                    
                    {activeTab === 'branches' && (
                        <button 
                            onClick={() => { setEditingBranch(null); setShowBranchModal(true); }}
                            className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold transition-all shadow-md shadow-blue-100"
                        >
                            <Plus size={18} />
                            <span>إضافة فرع جديد</span>
                        </button>
                    )}

                    {activeTab === 'users' && (
                        <button 
                            onClick={() => { setEditingUser(null); setShowUserModal(true); }}
                            className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold transition-all shadow-md shadow-emerald-100"
                        >
                            <Plus size={18} />
                            <span>إنشاء مستخدم جديد</span>
                        </button>
                    )}
                </div>

                {/* Table / Content */}
                <div className="overflow-x-auto">
                    {isLoading ? (
                        <div className="p-20 flex flex-col items-center justify-center text-slate-400 gap-4">
                            <Loader2 className="animate-spin text-blue-600" size={40} />
                            <p>جاري تحميل البيانات...</p>
                        </div>
                    ) : (
                        <table className="w-full text-right">
                            <thead className="bg-slate-50 text-slate-500 text-sm font-bold border-b border-slate-100">
                                {activeTab === 'branches' && (
                                    <tr>
                                        <th className="px-6 py-4">اسم الفرع</th>
                                        <th className="px-6 py-4">الكود</th>
                                        <th className="px-6 py-4">المحافظة</th>
                                        <th className="px-6 py-4 text-center">الحالة</th>
                                        <th className="px-6 py-4 text-center">إجراءات</th>
                                    </tr>
                                )}
                                {activeTab === 'users' && (
                                    <tr>
                                        <th className="px-6 py-4">الاسم الكامل</th>
                                        <th className="px-6 py-4">اسم المستخدم</th>
                                        <th className="px-6 py-4">الدور</th>
                                        <th className="px-6 py-4">الفرع</th>
                                        <th className="px-6 py-4 text-center">الحالة</th>
                                        <th className="px-6 py-4 text-center">إجراءات</th>
                                    </tr>
                                )}
                                {activeTab === 'audit' && (
                                    <tr>
                                        <th className="px-6 py-4">المستخدم</th>
                                        <th className="px-6 py-4">العملية</th>
                                        <th className="px-6 py-4">التفاصيل</th>
                                        <th className="px-6 py-4">التاريخ</th>
                                    </tr>
                                )}
                            </thead>
                            <tbody className="divide-y divide-slate-50 text-sm">
                                {activeTab === 'branches' && branches.map(branch => (
                                    <tr key={branch.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-6 py-4 font-bold text-slate-900">{branch.name}</td>
                                        <td className="px-6 py-4 font-mono text-slate-500">{branch.code}</td>
                                        <td className="px-6 py-4 text-slate-600">{branch.governorate}</td>
                                        <td className="px-6 py-4">
                                            <div className="flex justify-center">
                                                <button 
                                                    onClick={() => toggleBranchStatus(branch)}
                                                    className={`p-1 rounded-full transition-colors ${branch.isActive ? 'text-emerald-500 bg-emerald-50' : 'text-slate-300 bg-slate-50'}`}
                                                >
                                                    {branch.isActive ? <ToggleRight size={32} /> : <ToggleLeft size={32} />}
                                                </button>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex justify-center gap-2">
                                                <button 
                                                    onClick={() => { setEditingBranch(branch); setShowBranchModal(true); }}
                                                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                >
                                                    <Edit2 size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {activeTab === 'users' && users.map(user => (
                                    <tr key={user.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-6 py-4 font-bold text-slate-900">{user.fullName}</td>
                                        <td className="px-6 py-4 text-slate-500">{user.username}</td>
                                        <td className="px-6 py-4">
                                            <span className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold">{user.role}</span>
                                        </td>
                                        <td className="px-6 py-4 text-slate-600">{user.branch?.name || 'إدارة عامة'}</td>
                                        <td className="px-6 py-4">
                                            <div className="flex justify-center">
                                                <button 
                                                    onClick={() => toggleUserStatus(user)}
                                                    className={`p-1 rounded-full transition-colors ${user.isActive ? 'text-emerald-500 bg-emerald-50' : 'text-slate-300 bg-slate-50'}`}
                                                >
                                                    {user.isActive ? <ToggleRight size={32} /> : <ToggleLeft size={32} />}
                                                </button>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex justify-center gap-2">
                                                <button 
                                                    onClick={() => { setEditingUser(user); setShowUserModal(true); }}
                                                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                    title="تعديل المستخدم"
                                                >
                                                    <Edit2 size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {activeTab === 'audit' && auditLogs.map(log => (
                                    <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-bold text-xs text-slate-600">
                                                    {log.changedByUser?.fullName?.charAt(0)}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-slate-900">{log.changedByUser?.fullName}</p>
                                                    <p className="text-[10px] text-slate-400">{log.changedByUser?.role}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-0.5 rounded text-xs font-bold ${log.status === 'Activated' ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'}`}>
                                                {log.toStage}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-slate-500 truncate max-w-xs">{log.comment || '-'}</td>
                                        <td className="px-6 py-4 text-xs font-mono text-slate-400">
                                            {format(new Date(log.createdAt), 'dd/MM/yyyy HH:mm')}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {/* BRANCH MODAL */}
            {showBranchModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-6 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                            <h3 className="text-xl font-bold text-slate-900">{editingBranch ? 'تعديل بيانات الفرع' : 'إضافة فرع جديد'}</h3>
                            <button onClick={() => setShowBranchModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                                <X size={24} />
                            </button>
                        </div>
                        <form onSubmit={handleSaveBranch} className="p-8 space-y-5">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-2">
                                    <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">اسم الفرع</label>
                                    <input name="name" required defaultValue={editingBranch?.name} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">كود الفرع</label>
                                    <input name="code" required defaultValue={editingBranch?.code} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">المحافظة</label>
                                    <input name="governorate" required defaultValue={editingBranch?.governorate} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" />
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">العنوان</label>
                                    <input name="address" defaultValue={editingBranch?.address || ''} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" />
                                </div>
                            </div>
                            <div className="pt-4 flex gap-3">
                                <button type="submit" className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-100">
                                    <Save size={18} />
                                    <span>{editingBranch ? 'حفظ التعديلات' : 'إضافة الفرع'}</span>
                                </button>
                                <button type="button" onClick={() => setShowBranchModal(false)} className="px-6 py-3.5 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-all">إلغاء</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* USER MODAL */}
            {showUserModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-6 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                            <h3 className="text-xl font-bold text-slate-900">{editingUser ? 'تعديل بيانات المستخدم' : 'إنشاء مستخدم جديد'}</h3>
                            <button onClick={() => setShowUserModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                                <X size={24} />
                            </button>
                        </div>
                        <form onSubmit={handleSaveUser} className="p-8 space-y-5">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">الاسم الكامل</label>
                                <input name="fullName" required defaultValue={editingUser?.fullName} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">اسم المستخدم</label>
                                    <input name="username" required defaultValue={editingUser?.username} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-mono" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">{editingUser ? 'كلمة سر جديدة (اختياري)' : 'كلمة المرور'}</label>
                                    <input type="password" name="password" required={!editingUser} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">الدور الوظيفي</label>
                                    <select name="role" required defaultValue={editingUser?.role || 'BRANCH_SALES'} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500">
                                        <option value="ADMIN">مدير نظام (Admin)</option>
                                        <option value="BRANCH_SALES">مسؤول مبيعات (Sales)</option>
                                        <option value="BRANCH_SUPERVISOR">مشرف الفرع (Supervisor)</option>
                                        <option value="BRANCH_MANAGER">مدير الفرع (Branch Manager)</option>
                                        <option value="BRANCH_MGMT">إدارة الفروع (Branches Management)</option>
                                        <option value="SALES_MGMT">إدارة المبيعات (Sales Management)</option>
                                        <option value="OPERATIONS">إدارة العمليات (OPS Management)</option>
                                        <option value="MANAGEMENT">الإدارة العليا (Management)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">الفرع</label>
                                    <select name="branchId" defaultValue={editingUser?.branchId || ''} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500">
                                        <option value="">إدارة عامة / لا يوجد</option>
                                        {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div className="pt-4 flex gap-3">
                                <button type="submit" className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100">
                                    <Save size={18} />
                                    <span>{editingUser ? 'حفظ التعديلات' : 'إنشاء المستخدم'}</span>
                                </button>
                                <button type="button" onClick={() => setShowUserModal(false)} className="px-6 py-3.5 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-all">إلغاء</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminPage;
