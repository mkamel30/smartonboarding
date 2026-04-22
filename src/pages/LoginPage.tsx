import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
    ShieldCheck,
    User as UserIcon,
    Lock,
    ArrowRight,
    Loader2,
    KeySquare
} from 'lucide-react';

const LoginPage: React.FC = () => {
    const { login, verifyMfa, isLoading, error } = useAuth();
    const navigate = useNavigate();

    // Form states
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [mfaCode, setMfaCode] = useState('');
    
    // UI states
    const [mfaRequired, setMfaRequired] = useState(false);
    const [tempToken, setTempToken] = useState<string | null>(null);
    const [localError, setLocalError] = useState<string | null>(null);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLocalError(null);
        
        try {
            const result = await login({ username, password });
            if (result.mfaRequired) {
                setMfaRequired(true);
                setTempToken(result.tempToken || null);
            } else {
                navigate('/');
            }
        } catch (err: any) {
            // Error is handled by AuthContext but we can catch to prevent crash
        }
    };

    const handleMfaVerify = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!tempToken) return;
        setLocalError(null);

        try {
            await verifyMfa(tempToken, mfaCode);
            navigate('/');
        } catch (err: any) {
            // Error handled by AuthContext
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6" dir="rtl">
            <div className="max-w-md w-full">
                {/* Logo & Header */}
                <div className="text-center mb-8">
                    <div className="mb-8">
                        <img 
                            src="/Smart-Logo-Horizontal.png" 
                            alt="Smart Logo" 
                            className="h-24 mx-auto object-contain"
                        />
                    </div>
                    <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-2">
                        {mfaRequired ? 'التحقق الثنائي' : 'تسجيل الدخول'}
                    </h1>
                    <p className="text-slate-500">
                        {mfaRequired 
                            ? 'يرجى إدخال كود التحقق من تطبيق المصادقة الخاص بك' 
                            : 'أهلاً بك في نظام تهيئة التجار الموحد'}
                    </p>
                </div>

                <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
                    {/* Error Alerts */}
                    {(error || localError) && (
                        <div className="mb-6 p-4 bg-red-50 border border-red-100 text-red-600 text-sm rounded-2xl flex items-center gap-3">
                            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                            {error || localError}
                        </div>
                    )}

                    {!mfaRequired ? (
                        /* Login Form */
                        <form onSubmit={handleLogin} className="space-y-5">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2 mr-1">اسم المستخدم</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-slate-400">
                                        <UserIcon size={20} />
                                    </div>
                                    <input
                                        type="text"
                                        required
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                        className="block w-full pr-11 pl-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none"
                                        placeholder="user.name"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2 mr-1">كلمة المرور</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-slate-400">
                                        <Lock size={20} />
                                    </div>
                                    <input
                                        type="password"
                                        required
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="block w-full pr-11 pl-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none"
                                        placeholder="••••••••"
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full flex items-center justify-center gap-3 py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl transition-all shadow-lg shadow-blue-200 disabled:opacity-50 disabled:shadow-none"
                            >
                                {isLoading ? (
                                    <Loader2 className="animate-spin" />
                                ) : (
                                    <>
                                        <span>دخول للنظام</span>
                                        <ArrowRight size={20} />
                                    </>
                                )}
                            </button>
                        </form>
                    ) : (
                        /* MFA Form */
                        <form onSubmit={handleMfaVerify} className="space-y-6">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2 mr-1 text-center">كود التحقق (Authenticator Code)</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-slate-400">
                                        <KeySquare size={20} />
                                    </div>
                                    <input
                                        type="text"
                                        required
                                        autoFocus
                                        maxLength={6}
                                        value={mfaCode}
                                        onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ''))}
                                        className="block w-full pr-11 pl-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 text-center text-2xl tracking-[0.5em] font-mono focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all outline-none"
                                        placeholder="000000"
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={isLoading || mfaCode.length < 6}
                                className="w-full flex items-center justify-center gap-3 py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl transition-all shadow-lg shadow-emerald-200 disabled:opacity-50 disabled:shadow-none"
                            >
                                {isLoading ? (
                                    <Loader2 className="animate-spin" />
                                ) : (
                                    <>
                                        <span>تأكيد الدخول</span>
                                        <ShieldCheck size={20} />
                                    </>
                                )}
                            </button>

                            <button
                                type="button"
                                onClick={() => setMfaRequired(false)}
                                className="w-full py-2 text-slate-400 text-sm hover:text-slate-600 transition-colors"
                            >
                                العودة لخلف
                            </button>
                        </form>
                    )}
                </div>

                <p className="mt-2 text-center text-slate-300 text-[10px]">
                    v{new Date().getFullYear()}.4.21.PRO
                </p>
            </div>
        </div>
    );
};

export default LoginPage;
