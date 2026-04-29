import React from 'react';
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
    Send
} from 'lucide-react';
import NotificationBell from './NotificationBell';

interface LayoutProps {
    children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const { t } = useTranslation();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const navItems = [
        { name: t('dashboard'), path: '/', icon: LayoutDashboard, roles: ['ADMIN', 'MANAGEMENT', 'OPERATIONS', 'BRANCH_MANAGER', 'BRANCH_SUPERVISOR', 'BRANCH_SALES', 'BRANCH_MGMT', 'SALES_MGMT'] },
        { name: t('requests_tracker'), path: '/requests', icon: FileText, roles: ['ADMIN', 'MANAGEMENT', 'OPERATIONS', 'BRANCH_MANAGER', 'BRANCH_SUPERVISOR', 'BRANCH_SALES', 'BRANCH_MGMT', 'SALES_MGMT'] },
        { name: t('new_request'), path: '/submit', icon: PlusCircle, roles: ['ADMIN', 'BRANCH_SALES'] },
        { name: 'بواليص الشحن', path: '/batches', icon: Package, roles: ['ADMIN', 'MANAGEMENT', 'OPERATIONS', 'BRANCH_MANAGER', 'BRANCH_SUPERVISOR', 'BRANCH_SALES', 'BRANCH_MGMT'] },
        { name: 'إرسال مستندات', path: '/shipment', icon: Send, roles: ['ADMIN', 'BRANCH_SALES', 'BRANCH_SUPERVISOR', 'BRANCH_MANAGER'] },
        { name: 'إدارة النظام', path: '/admin', icon: Settings, roles: ['ADMIN'] },
        { name: 'الملف الشخصي', path: '/profile', icon: UserCircle, roles: ['ADMIN', 'MANAGEMENT', 'OPERATIONS', 'BRANCH_MANAGER', 'BRANCH_SUPERVISOR', 'BRANCH_SALES', 'BRANCH_MGMT', 'SALES_MGMT'] },
    ];

    const filteredNav = navItems.filter(item => item.roles.includes(user?.role || ''));

    return (
        <div className="flex h-screen bg-gray-50 overflow-hidden dir-rtl" dir="rtl">
            {/* Sidebar - Right side for Arabic */}
            <aside className="w-64 bg-slate-900 text-white flex flex-col shadow-xl">
                <div className="p-6 bg-white border-b border-slate-200">
                    <img 
                        src="/Smart-Logo-Horizontal.png" 
                        alt="Logo" 
                        className="h-10 w-auto mx-auto" 
                    />
                </div>

                <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
                    {filteredNav.map((item) => {
                        const Icon = item.icon;
                        const isActive = location.pathname === item.path;
                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${isActive
                                    ? 'bg-blue-600 text-white shadow-md shadow-blue-900/20'
                                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                                    }`}
                            >
                                <Icon size={20} className="rtl-flip" />
                                <span className="font-medium text-sm">{item.name}</span>
                            </Link>
                        );
                    })}
                </nav>

                <div className="p-4 border-t border-slate-800">
                    <div className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-xl mb-4">
                        <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold">
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
            <main className="flex-1 flex flex-col overflow-hidden">
                <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-8 shrink-0">
                    <div className="flex items-center gap-4 text-slate-500 text-sm">
                        <span>نظام تهيئة تجار التجزئة الموحد</span>
                        {user?.branch?.name && (
                            <>
                                <span className="text-gray-300">|</span>
                                <span className="flex items-center gap-1.5"><Activity size={14} /> {user.branch.name}</span>
                            </>
                        )}
                    </div>
                    <div className="flex items-center gap-4">
                        <NotificationBell />
                        
                        <div className="text-left ml-2 hidden sm:block border-r border-slate-200 pr-4">
                            <p className="text-sm font-medium text-slate-900 leading-tight">{user?.fullName}</p>
                            <p className="text-xs text-slate-500">{user?.role}</p>
                        </div>
                        <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-600">
                            <UserIcon size={18} />
                        </div>
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto p-8 relative">
                    {children}
                </div>
            </main>
        </div>
    );
};

export default Layout;
