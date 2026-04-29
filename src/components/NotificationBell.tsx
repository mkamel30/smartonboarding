import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiService } from '../services/api';
import { useNavigate } from 'react-router-dom';
import { Bell } from 'lucide-react';

const NotificationBell: React.FC = () => {
    const navigate = useNavigate();

    const { data: unreadCount = 0 } = useQuery({
        queryKey: ['unread-notifications'],
        queryFn: async () => {
            const res = await apiService.getUnreadNotificationCount();
            return res.count;
        },
        refetchInterval: 30000 // Poll every 30s
    });

    return (
        <button 
            onClick={() => navigate('/notifications')}
            className="relative p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-all"
        >
            <Bell size={20} />
            {unreadCount > 0 && (
                <span className="absolute top-1 right-1 flex h-4 w-4">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500 text-[10px] text-white items-center justify-center font-bold border-2 border-white animate-breathing">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                </span>
            )}
        </button>
    );
};

export default NotificationBell;
