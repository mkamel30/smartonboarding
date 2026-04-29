import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import {
    LayoutDashboard,
    FileText,
    PlusCircle,
    LogOut,
    User as UserIcon,
    Activity,
    Settings,
    UserCircle,
    Package,
    Send,
    Menu,
    X
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { apiService } from '../services/api';
import NotificationBell from './NotificationBell';

interface LayoutProps {
    children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const { t } = useTranslation();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    // Fetch pending counts
    const { data: pendingCounts } = useQuery({
        queryKey: ['pending-counts'],
        queryFn: apiService.getPendingCounts,
        refetchInterval: 30000, // Refresh every 30 seconds
        enabled: !!user
    });

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const navItems = [
        { name: t('dashboard'), path: '/', icon: LayoutDashboard, roles: ['ADMIN', 'MANAGEMENT', 'OPERATIONS', 'BRANCH_MANAGER', 'BRANCH_SUPERVISOR', 'BRANCH_SALES', 'BRANCH_MGMT', 'SALES_MGMT'] },
        { 
            name: t('requests_tracker'), 
            path: '/requests', 
            icon: FileText, 
            roles: ['ADMIN', 'MANAGEMENT', 'OPERATIONS', 'BRANCH_MANAGER', 'BRANCH_SUPERVISOR', 'BRANCH_SALES', 'BRANCH_MGMT', 'SALES_MGMT'],
            badge: pendingCounts?.total > 0 ? pendingCounts.total : null
        },
        { name: t('new_request'), path: '/submit', icon: PlusCircle, roles: ['ADMIN', 'BRANCH_SALES'] },
        { name: 'بواليص الشحن', path: '/batches', icon: Package, roles: ['ADMIN', 'MANAGEMENT', 'OPERATIONS', 'BRANCH_MANAGER', 'BRANCH_SUPERVISOR', 'BRANCH_SALES', 'BRANCH_MGMT'] },
        { 
            name: 'إرسال مستندات', 
            path: '/shipment', 
            icon: Send, 
            roles: ['ADMIN', 'BRANCH_SALES', 'BRANCH_SUPERVISOR', 'BRANCH_MANAGER'],
            badge: pendingCounts?.shippingCount > 0 ? pendingCounts.shippingCount : null
        },
        { name: 'إدارة النظام', path: '/admin', icon: Settings, roles: ['ADMIN'] },
        { name: 'الملف الشخصي', path: '/profile', icon: UserCircle, roles: ['ADMIN', 'MANAGEMENT', 'OPERATIONS', 'BRANCH_MANAGER', 'BRANCH_SUPERVISOR', 'BRANCH_SALES', 'BRANCH_MGMT', 'SALES_MGMT'] },
    ];

    const filteredNav = navItems.filter(item => item.roles.includes(user?.role || ''));

    return (
        <div className="flex h-screen bg-gray-50 overflow-hidden dir-rtl" dir="rtl">
            {/* Mobile Overlay */}
            {isSidebarOpen && (
                <div 
                    className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 lg:hidden transition-opacity duration-300"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside className={`
                fixed inset-y-0 right-0 z-50 w-64 bg-slate-900 text-white flex flex-col shadow-2xl transition-transform duration-300 transform
                lg:translate-x-0 lg:static lg:inset-auto
                ${isSidebarOpen ? 'translate-x-0' : 'translate-x-full'}
            `}>
                <div className="p-6 bg-white border-b border-slate-200 flex items-center justify-between">
                    <img 
                        src="/Smart-Logo-Horizontal.png" 
                        alt="Logo" 
                        className="h-10 w-auto" 
                    />
                    <button 
                        onClick={() => setIsSidebarOpen(false)}
                        className="lg:hidden text-slate-500 hover:text-slate-800"
                    >
                        <X size={24} />
                    </button>
                </div>

                <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
                    {filteredNav.map((item) => {
                        const Icon = item.icon;
                        const isActive = location.pathname === item.path;
                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                onClick={() => setIsSidebarOpen(false)}
                                className={`flex items-center justify-between px-4 py-3 rounded-lg transition-all duration-200 ${isActive
                                    ? 'bg-blue-600 text-white shadow-md shadow-blue-900/20'
                                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                                    }`}
                            >
                                <div className="flex items-center gap-3">
                                    <Icon size={20} className="rtl-flip" />
                                    <span className="font-medium text-sm">{item.name}</span>
                                </div>
                                
                                {item.badge && (
                                    <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${
                                        isActive ? 'bg-white text-blue-600' : 'bg-red-500 text-white animate-breathing'
                                    }`}>
                                        {item.badge}
                                    </span>
                                )}
                            </Link>
                        );
                    })}
                </nav>

                <div className="p-4 border-t border-slate-800">
                    <div className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-xl mb-4">
                        <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold shrink-0">
                            {user?.fullName.charAt(0)}
                        </div>
                        <div className="flex-1 overflow-hidden">
                            <p className="text-sm font-semibold truncate text-right">{user?.fullName}</p>
                            <p className="text-[10px] text-slate-400 truncate text-right uppercase tracking-wider">{user?.role}</p>
                        </div>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-3 w-full px-4 py-3 text-slate-400 hover:bg-red-500/10 hover:text-red-400 rounded-lg transition-colors"
                    >
                        <LogOut size={20} className="rtl-flip" />
                        <span className="font-medium">{t('logout')}</span>
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col overflow-hidden relative">
                <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 lg:px-8 shrink-0">
                    <div className="flex items-center gap-3 lg:gap-4">
                        <button 
                            onClick={() => setIsSidebarOpen(true)}
                            className="p-2 text-slate-500 hover:bg-slate-50 rounded-lg lg:hidden transition-colors"
                        >
                            <Menu size={24} />
                        </button>
                        <div className="flex items-center gap-4 text-slate-500 text-sm overflow-hidden">
                            <span className="hidden sm:inline font-bold text-slate-800">سمارت</span>
                            <span className="text-gray-300 hidden sm:inline">|</span>
                            <span className="truncate max-w-[150px] sm:max-w-none text-xs sm:text-sm">نظام تهيئة تجار المدفوعات الموحد</span>
                            {user?.branch?.name && (
                                <>
                                    <span className="text-gray-300 hidden md:inline">|</span>
                                    <span className="hidden md:flex items-center gap-1.5 font-medium text-blue-600"><Activity size={14} /> {user.branch.name}</span>
                                </>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center gap-2 lg:gap-4">
                        <NotificationBell />
                        
                        <div className="text-left ml-2 hidden sm:block border-r border-slate-200 pr-4">
                            <p className="text-sm font-bold text-slate-900 leading-tight">{user?.fullName}</p>
                            <p className="text-[10px] text-slate-500 uppercase tracking-tighter">{user?.role}</p>
                        </div>
                        <div className="w-8 h-8 lg:w-9 lg:h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 shadow-inner">
                            <UserIcon size={16} />
                        </div>
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto p-4 lg:p-8 relative">
                    {children}
                </div>
            </main>
        </div>
    );
};

export default Layout;
