
import React from 'react';
import { ExclamationTriangleIcon } from '../../components/icons/ExclamationTriangleIcon';

const PermissionDeniedPage: React.FC = () => {
    return (
        <div className="flex items-center justify-center h-[calc(100vh-4rem)] p-8 text-center bg-gray-50">
            <div>
                <ExclamationTriangleIcon className="w-16 h-16 mx-auto text-amber-400" />
                <h1 className="mt-4 text-2xl font-bold text-gray-800">Akses Ditolak</h1>
                <p className="mt-2 text-gray-600">
                    Anda tidak memiliki izin untuk mengakses halaman ini.
                    <br />
                    Silakan hubungi Super Admin jika Anda merasa ini adalah sebuah kesalahan.
                </p>
            </div>
        </div>
    );
};

export default PermissionDeniedPage;