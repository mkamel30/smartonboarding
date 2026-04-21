import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
    User as UserIcon, 
    ShieldCheck, 
    Smartphone, 
    CheckCircle2, 
    AlertCircle,
    Loader2,
    QrCode,
    ShieldAlert
} from 'lucide-react';
import { apiService } from '../services/api';

const ProfilePage: React.FC = () => {
    const { user } = useAuth();
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    // MFA States
    const [mfaData, setMfaData] = useState<{ qrCodeUrl: string, secret: string } | null>(null);
    const [mfaCode, setMfaCode] = useState('');
    const [showMfaSetup, setShowMfaSetup] = useState(false);
    const [showDisableMfa, setShowDisableMfa] = useState(false);
    const [passwordForDisable, setPasswordForDisable] = useState('');

    const handleStartMfaSetup = async () => {
        setIsLoading(true);
        try {
            const data = await apiService.mfaSetup();
            setMfaData(data);
            setShowMfaSetup(true);
        } catch (err) {
            setMessage({ type: 'error', text: 'فشل بدء إعداد المصادقة الثنائية' });
        }
        setIsLoading(false);
    };

    const handleVerifyMfaSetup = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!mfaData) return;
        setIsLoading(true);
        try {
            await apiService.mfaVerifySetup(mfaData.secret, mfaCode);
            setMessage({ type: 'success', text: 'تم تفعيل المصادقة الثنائية بنجاح' });
            setShowMfaSetup(false);
            setMfaData(null);
            setMfaCode('');
            // Reload user data or just update local state if user ref is updatable
            window.location.reload(); 
        } catch (err) {
            setMessage({ type: 'error', text: 'كود التحقق غير صحيح' });
        }
        setIsLoading(false);
    };

    const handleDisableMfa = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            await apiService.mfaDisable(passwordForDisable);
            setMessage({ type: 'success', text: 'تم تعطيل المصادقة الثنائية' });
            setShowDisableMfa(false);
            setPasswordForDisable('');
            window.location.reload();
        } catch (err) {
            setMessage({ type: 'error', text: 'كلمة المرور غير صحيحة' });
        }
        setIsLoading(false);
    };

    if (!user) return null;

    return (
        <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-6">
                    <div className="w-20 h-20 bg-blue-600 text-white rounded-3xl flex items-center justify-center text-4xl font-black shadow-xl shadow-blue-100">
                        {user.fullName.charAt(0)}
                    </div>
                    <div>
                        <h1 className="text-3xl font-extrabold text-slate-900 mb-1">{user.fullName}</h1>
                        <div className="flex items-center gap-2 text-slate-500 font-medium">
                            <span className="px-3 py-1 bg-slate-100 rounded-full text-xs">{user.role}</span>
                            <span>•</span>
                            <span className="text-sm">{user.username}</span>
                        </div>
                    </div>
                </div>
            </div>

            {message && (
                <div className={`p-4 rounded-2xl flex items-center gap-3 animate-in slide-in-from-top-2 duration-300 ${message.type === 'success' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-red-50 text-red-600 border border-red-100'}`}>
                    {message.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
                    <span className="text-sm font-bold">{message.text}</span>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Account Details Card */}
                <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 space-y-6">
                    <div className="flex items-center gap-3 text-slate-900 font-bold border-b border-slate-50 pb-4">
                        <UserIcon className="text-blue-600" size={20} />
                        <h2>بيانات الحساب</h2>
                    </div>
                    
                    <div className="space-y-4">
                        <div className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl">
                            <span className="text-slate-500 text-sm">الفرع التابع له</span>
                            <span className="font-bold text-slate-900">{user.branch?.name || 'إدارة عامة'}</span>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl">
                            <span className="text-slate-500 text-sm">كود الفرع</span>
                            <span className="font-mono text-slate-900">{user.branch?.code || 'N/A'}</span>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl">
                            <span className="text-slate-500 text-sm">حالة الحساب</span>
                            <span className="flex items-center gap-1.5 text-emerald-600 font-bold">
                                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                                نشط
                            </span>
                        </div>
                    </div>
                </div>

                {/* MFA Card */}
                <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 space-y-6">
                    <div className="flex items-center justify-between border-b border-slate-50 pb-4">
                        <div className="flex items-center gap-3 text-slate-900 font-bold">
                            <Smartphone className="text-blue-600" size={20} />
                            <h2>المصادقة الثنائية (MFA)</h2>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${user.mfaEnabled ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}>
                            {user.mfaEnabled ? 'مفعّل' : 'معطّل'}
                        </span>
                    </div>

                    <p className="text-slate-400 text-sm leading-relaxed">
                        تضيف المصادقة الثنائية طبقة حماية إضافية لحسابك من خلال طلب كود من تطبيق Google Authenticator عند تسجيل الدخول.
                    </p>

                    {user.mfaEnabled ? (
                        <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 flex items-center justify-between">
                            <div className="flex items-center gap-3 text-emerald-700">
                                <ShieldCheck size={24} />
                                <span className="font-bold">حسابك محمي</span>
                            </div>
                            <button 
                                onClick={() => setShowDisableMfa(true)}
                                className="text-xs text-red-500 hover:underline font-bold"
                            >
                                تعطيل الحماية
                            </button>
                        </div>
                    ) : (
                        <button 
                            onClick={handleStartMfaSetup}
                            disabled={isLoading}
                            className="w-full py-4 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-bold transition-all flex items-center justify-center gap-3 shadow-lg shadow-slate-200"
                        >
                            {isLoading ? <Loader2 className="animate-spin" /> : (
                                <>
                                    <QrCode size={20} />
                                    <span>بدء إعداد الحماية</span>
                                </>
                            )}
                        </button>
                    )}
                </div>
            </div>

            {/* MFA SETUP MODAL */}
            {showMfaSetup && mfaData && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                        <div className="p-8 text-center space-y-6">
                            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl mb-2">
                                <QrCode size={32} />
                            </div>
                            <h3 className="text-2xl font-black text-slate-900">إعداد المصادقة الثنائية</h3>
                            <p className="text-slate-500 text-sm px-4">
                                قم بمسح رمز الـ QR التالي باستخدام تطبيق **Google Authenticator** أو **Authy**
                            </p>

                            <div className="bg-slate-50 p-6 rounded-3xl inline-block border border-slate-100 shadow-inner">
                                <img src={mfaData.qrCodeUrl} alt="QR Code" className="w-48 h-48 mix-blend-multiply" />
                            </div>

                            <div className="bg-amber-50 p-4 rounded-2xl text-amber-700 text-xs text-right space-y-1">
                                <p className="font-bold">كود النسخ الاحتياطي (في حال فشل القراءة):</p>
                                <p className="font-mono bg-white/50 p-2 rounded border border-amber-100 select-all">{mfaData.secret}</p>
                            </div>

                            <form onSubmit={handleVerifyMfaSetup} className="space-y-4">
                                <input 
                                    type="text" 
                                    placeholder="أدخل الكود المكون من 6 أرقام" 
                                    maxLength={6}
                                    required
                                    value={mfaCode}
                                    onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ''))}
                                    className="w-full text-center py-4 bg-slate-50 border border-slate-200 rounded-2xl text-2xl font-mono tracking-[0.5em] outline-none focus:ring-4 focus:ring-blue-100 transition-all"
                                />
                                <div className="flex gap-3">
                                    <button type="submit" disabled={isLoading || mfaCode.length < 6} className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 disabled:opacity-50">
                                        {isLoading ? <Loader2 className="animate-spin m-auto" /> : 'تفعيل الآن'}
                                    </button>
                                    <button type="button" onClick={() => setShowMfaSetup(false)} className="px-8 py-4 bg-slate-100 text-slate-600 rounded-2xl font-bold hover:bg-slate-200 transition-all">إلغاء</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* DISABLE MFA MODAL */}
            {showDisableMfa && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                        <div className="p-8 text-center space-y-6">
                            <div className="inline-flex items-center justify-center w-16 h-16 bg-red-50 text-red-600 rounded-2xl mb-2">
                                <ShieldAlert size={32} />
                            </div>
                            <h3 className="text-2xl font-black text-slate-900">تعطيل المصادقة الثنائية</h3>
                            <p className="text-slate-500 text-sm">
                                هذا الإجراء سيقلل من أمان حسابك. يرجى إدخال كلمة المرور للتأكيد.
                            </p>

                            <form onSubmit={handleDisableMfa} className="space-y-4">
                                <input 
                                    type="password" 
                                    placeholder="كلمة المرور الحالية" 
                                    required
                                    value={passwordForDisable}
                                    onChange={(e) => setPasswordForDisable(e.target.value)}
                                    className="w-full px-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-red-100 transition-all"
                                />
                                <div className="flex gap-3">
                                    <button type="submit" disabled={isLoading} className="flex-1 py-4 bg-red-500 text-white rounded-2xl font-bold hover:bg-red-600 transition-all shadow-lg shadow-red-100">
                                        تأكيد التعطيل
                                    </button>
                                    <button type="button" onClick={() => setShowDisableMfa(false)} className="px-8 py-4 bg-slate-100 text-slate-600 rounded-2xl font-bold hover:bg-slate-200 transition-all">إلغاء</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProfilePage;
