import axios from 'axios';
import type { 
    OnboardingRequest, 
    User,
    Branch
} from '../types';

const API_BASE_URL = '/api';

const api = axios.create({
    baseURL: API_BASE_URL,
});

// Request Interceptor: Attach JWT Token
api.interceptors.request.use((config) => {
    const userData = localStorage.getItem('onboarding_user');
    if (userData) {
        const { token } = JSON.parse(userData);
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
    }
    return config;
}, (error) => Promise.reject(error));

// Response Interceptor: Handle 401
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('onboarding_user');
            // Only redirect if not already on login
            if (!window.location.pathname.includes('/login')) {
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    }
);

export const apiService = {
    // --- AUTH ---
    login: async (credentials: { username: string; password: string }) => {
        const response = await api.post('/auth/login', credentials);
        return response.data; // { token, user, mfaRequired, tempToken }
    },
    verifyMfa: async (tempToken: string, code: string) => {
        const response = await api.post('/auth/verify-mfa', { tempToken, code });
        return response.data;
    },
    getMe: async () => {
        const response = await api.get('/auth/me');
        return response.data;
    },
    mfaSetup: async () => {
        const response = await api.post('/auth/mfa/setup');
        return response.data;
    },
    mfaVerifySetup: async (secret: string, code: string) => {
        const response = await api.post('/auth/mfa/verify-setup', { secret, code });
        return response.data;
    },
    mfaDisable: async (password: string) => {
        const response = await api.post('/auth/mfa/disable', { password });
        return response.data;
    },

    // --- REQUESTS ---
    getRequests: async (): Promise<OnboardingRequest[]> => {
        const response = await api.get('/requests');
        return response.data;
    },

    getRequestDetails: async (id: string): Promise<OnboardingRequest> => {
        const response = await api.get(`/requests/${id}`);
        return response.data;
    },

    createRequest: async (data: Partial<OnboardingRequest>): Promise<OnboardingRequest> => {
        const response = await api.post('/requests', data);
        return response.data;
    },

    updateRequest: async (id: string, data: Partial<OnboardingRequest> & { historyEntry?: any }): Promise<OnboardingRequest> => {
        const response = await api.patch(`/requests/${id}`, data);
        return response.data;
    },

    requestAction: async (id: string, action: string, payload: any = {}): Promise<OnboardingRequest> => {
        const response = await api.patch(`/requests/${id}/action`, { action, payload });
        return response.data;
    },

    // --- BATCHES ---
    getBatches: async () => {
        const response = await api.get('/batches');
        return response.data;
    },
    
    getBatchDetails: async (id: string) => {
        const response = await api.get(`/batches/${id}`);
        return response.data;
    },

    createBatch: async (formData: FormData) => {
        const response = await api.post('/batches', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        return response.data;
    },

    receiveBatch: async (id: string) => {
        const response = await api.patch(`/batches/${id}/receive`);
        return response.data;
    },

    // --- NOTIFICATIONS ---
    getNotifications: async () => {
        const response = await api.get('/notifications');
        return response.data;
    },

    getUnreadNotificationCount: async () => {
        const response = await api.get('/notifications/unread-count');
        return response.data;
    },

    markNotificationRead: async (id: string) => {
        const response = await api.patch(`/notifications/${id}/read`);
        return response.data;
    },

    markAllNotificationsRead: async () => {
        const response = await api.patch('/notifications/read-all');
        return response.data;
    },

    // --- ADMIN ---
    getBranches: async (): Promise<Branch[]> => {
        const response = await api.get('/admin/branches');
        return response.data;
    },
    createBranch: async (data: Partial<Branch>): Promise<Branch> => {
        const response = await api.post('/admin/branches', data);
        return response.data;
    },
    updateBranch: async (id: string, data: Partial<Branch>): Promise<Branch> => {
        const response = await api.patch(`/admin/branches/${id}`, data);
        return response.data;
    },
    getUsers: async (): Promise<User[]> => {
        const response = await api.get('/admin/users');
        return response.data;
    },
    createUser: async (data: any): Promise<User> => {
        const response = await api.post('/admin/users', data);
        return response.data;
    },
    updateUser: async (id: string, data: any): Promise<User> => {
        const response = await api.patch(`/admin/users/${id}`, data);
        return response.data;
    },
    getAdminAuditLog: async () => {
        const response = await api.get('/admin/audit-log');
        return response.data;
    },

    // --- UTILS ---
    getStats: async () => {
        const response = await api.get('/dashboard/stats');
        return response.data;
    },

    getActivity: async () => {
        const response = await api.get('/activity');
        return response.data;
    },

    getPendingCounts: async () => {
        const response = await api.get('/pending-counts');
        return response.data;
    },

    uploadDocs: async (formData: FormData) => {
        const response = await api.post('/upload', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        return response.data;
    },

    uploadSalesForm: async (formData: FormData) => {
        const response = await api.post('/upload-sales-form', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        return response.data;
    },

    getFiles: async (branchName: string, requestId: string) => {
        const response = await api.get(`/files/${branchName}/${requestId}`);
        return response.data;
    }
};
