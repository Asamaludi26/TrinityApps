
import { Asset, Request, User, LoginResponse } from '../types';

// Ganti URL ini dengan URL VPS/Server Anda nanti
const API_URL = (import.meta as any).env.VITE_API_URL || 'http://localhost:3001/api';

const getAuthHeader = () => {
    const token = localStorage.getItem('token');
    return token ? { 'Authorization': `Bearer ${token}` } : {};
};

const handleResponse = async (response: Response) => {
    if (!response.ok) {
        if (response.status === 401) {
            localStorage.removeItem('token');
            window.location.href = '/'; // Force logout
            throw new Error('Sesi berakhir, silakan login kembali.');
        }
        const errorData = await response.json();
        throw new Error(errorData.message || 'Terjadi kesalahan pada server.');
    }
    return response.json();
};

export const api = {
    // --- AUTH ---
    login: async (email: string, password: string): Promise<User> => {
        const res = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
        });
        const data = await handleResponse(res);
        localStorage.setItem('token', data.access_token);
        return data.user;
    },

    // --- ASSETS ---
    getAssets: async (): Promise<Asset[]> => {
        const res = await fetch(`${API_URL}/assets`, { headers: getAuthHeader() });
        return handleResponse(res);
    },

    createAsset: async (assetData: Partial<Asset>): Promise<Asset> => {
        const res = await fetch(`${API_URL}/assets`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
            body: JSON.stringify(assetData),
        });
        return handleResponse(res);
    },

    // --- REQUESTS ---
    getRequests: async (): Promise<Request[]> => {
        const res = await fetch(`${API_URL}/requests`, { headers: getAuthHeader() });
        return handleResponse(res);
    },

    // ... tambahkan metode lain (update, delete) sesuai kebutuhan
};
