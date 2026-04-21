import axios from 'axios';

const API_BASE_URL = 'http://localhost:3001/api';

export const uploadService = {
    /**
     * Uploads documents to the backend for Drive storage
     */
    async uploadDocuments(params: {
        requestId: string;
        branchName: string;
        merchantName: string;
        files: File[];
    }) {
        const { requestId, branchName, merchantName, files } = params;

        const formData = new FormData();
        formData.append('requestId', requestId);
        formData.append('branchName', branchName);
        formData.append('merchantName', merchantName);

        files.forEach(file => {
            formData.append('docs', file);
        });

        const response = await axios.post(`${API_BASE_URL}/upload`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });

        return response.data;
    },

    /**
     * Lists files from Drive for a given request
     */
    async listFiles(requestId: string, branchName: string) {
        const response = await axios.get(`${API_BASE_URL}/files/${encodeURIComponent(branchName)}/${requestId}`);
        return response.data;
    }
};
