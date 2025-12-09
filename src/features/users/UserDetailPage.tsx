
import React, { useState } from 'react';
import { User, Page } from '../../types';
import { DetailPageLayout } from '../../components/layout/DetailPageLayout';
import { ClickableLink } from '../../components/ui/ClickableLink';
import { PencilIcon } from '../../components/icons/PencilIcon';
import { AssetIcon } from '../../components/icons/AssetIcon';
import { RequestIcon } from '../../components/icons/RequestIcon';
import { KeyIcon } from '../../components/icons/KeyIcon';
import { ExclamationTriangleIcon } from '../../components/icons/ExclamationTriangleIcon';
import Modal from '../../components/ui/Modal';
import { SpinnerIcon } from '../../components/icons/SpinnerIcon';
import { useNotification } from '../../providers/NotificationProvider';
import { hasPermission } from '../../utils/permissions';
import { ALL_PERMISSIONS } from '../../utils/permissions';
import { CheckIcon } from '../../components/icons/CheckIcon';
import { LockIcon } from '../../components/icons/LockIcon';

// Store
import { useMasterDataStore } from '../../stores/useMasterDataStore';
import { useAssetStore } from '../../stores/useAssetStore';
import { useRequestStore } from '../../stores/useRequestStore';

interface UserDetailPageProps {
    user?: User; // Made optional as we fetch by ID usually
    currentUser: User;
    // Removed asset/request props
    onBack: () => void;
    onEdit: () => void;
    onShowAssetPreview: (assetId: string) => void;
    pageInitialState?: { userId?: number };
}

const getRoleClass = (role: User['role']) => {
    switch(role) {
        case 'Super Admin': return 'bg-purple-100 text-purple-800';
        case 'Admin Logistik': return 'bg-info-light text-info-text';
        case 'Admin Purchase': return 'bg-teal-100 text-teal-800';
        case 'Leader': return 'bg-sky-100 text-sky-800';
        default: return 'bg-gray-100 text-gray-800';
    }
}

const StatCard: React.FC<{ title: string; value: number; icon: React.FC<{className?: string}>; }> = ({ title, value, icon: Icon }) => (
    <div className="p-4 bg-gray-50/70 border border-gray-200 rounded-lg flex items-center gap-4">
        <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center bg-blue-100 rounded-full text-tm-primary">
            <Icon className="w-5 h-5" />
        </div>
        <div>
            <p className="text-2xl font-bold text-tm-dark">{value}</p>
            <p className="text-sm font-medium text-gray-500">{title}</p>
        </div>
    </div>
);

const UserDetailPage: React.FC<UserDetailPageProps> = ({ user: propUser, currentUser, onBack, onEdit, onShowAssetPreview, pageInitialState }) => {
    // Store Hooks
    const users = useMasterDataStore((state) => state.users);
    const divisions = useMasterDataStore((state) => state.divisions);
    const assets = useAssetStore((state) => state.assets);
    const requests = useRequestStore((state) => state.requests);
    
    // Determine User
    const userId = pageInitialState?.userId || propUser?.id;
    const user = users.find(u => u.id === userId) || propUser;
    const division = divisions.find(d => d.id === user?.divisionId);

    if (!user) return <div>Pengguna tidak ditemukan.</div>;

    const userAssets = assets.filter(asset => asset.currentUser === user.name);
    const userRequests = requests.filter(req => req.requester === user.name);
    
    const [isResetModalOpen, setIsResetModalOpen] = useState(false);
    const [isPasswordShown, setIsPasswordShown] = useState(false);
    const [newPassword, setNewPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    
    const openResetModal = () => {
        setIsResetModalOpen(true);
    };
    
    const handleConfirmReset = () => {
        setIsLoading(true);
        const tempPassword = `pass${Math.random().toString(36).substring(2, 8)}`;
        
        setTimeout(() => {
            setNewPassword(tempPassword);
            setIsLoading(false);
            setIsResetModalOpen(false);
            setIsPasswordShown(true);
        }, 1000);
    };
    
    const closePasswordModal = () => {
        setIsPasswordShown(false);
        setNewPassword('');
    };

    return (
        <>
            <DetailPageLayout
                title={`Detail Akun: ${user.name}`}
                onBack={onBack}
                headerActions={
                    hasPermission(currentUser, 'users:edit') && (
                        <button onClick={onEdit} className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-tm-primary rounded-lg shadow-sm hover:bg-tm-primary-hover">
                            <PencilIcon className="w-4 h-4" />
                            Edit Akun
                        </button>
                    )
                }
            >
                <div className="space-y-6">
                    {/* User Info Section */}
                    <div className="p-6 bg-white border border-gray-200/80 rounded-xl shadow-sm">
                        <div className="flex flex-col sm:flex-row items-start gap-6">
                            <div className="flex-1">
                                <h2 className="text-2xl font-bold text-gray-800">{user.name}</h2>
                                <p className="text-gray-500">{user.email}</p>
                                <div className="mt-3 flex flex-wrap gap-2">
                                    <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${getRoleClass(user.role)}`}>{user.role}</span>
                                    <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">{division?.name || 'Tidak ada divisi'}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Statistics Section */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        <StatCard title="Aset Dipegang" value={userAssets.length} icon={AssetIcon} />
                        <StatCard title="Total Request" value={userRequests.length} icon={RequestIcon} />
                    </div>

                    {/* Permissions Section */}
                    {hasPermission(currentUser, 'users:manage-permissions') && (
                        <div className="p-6 bg-white border border-gray-200/80 rounded-xl shadow-sm">
                            <div className="flex items-center gap-3 mb-4 border-b pb-3">
                                <LockIcon className="w-5 h-5 text-tm-primary"/>
                                <h3 className="text-lg font-semibold text-gray-800">Hak Akses Pengguna</h3>
                            </div>
                            <div className="overflow-x-auto border rounded-lg">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Grup Fitur</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hak Akses yang Diberikan</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {ALL_PERMISSIONS.map(group => {
                                            const grantedPermissions = group.permissions.filter(p => user.permissions.includes(p.key));
                                            if (grantedPermissions.length === 0) {
                                                return null;
                                            }
                                            return (
                                                <tr key={group.group}>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-800 align-top">{group.group}</td>
                                                    <td className="px-6 py-4 whitespace-normal">
                                                        <ul className="space-y-2">
                                                            {grantedPermissions.map(p => (
                                                                <li key={p.key} className="flex items-center gap-2 text-sm text-gray-700">
                                                                    <CheckIcon className="w-4 h-4 text-success flex-shrink-0 mt-0.5" />
                                                                    <span>{p.label}</span>
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Security Section (Super Admin only) */}
                    {hasPermission(currentUser, 'users:reset-password') && user.id !== currentUser.id && (
                        <div className="p-6 bg-white border border-gray-200/80 rounded-xl shadow-sm">
                            <h3 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-3">Keamanan</h3>
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="font-medium text-gray-700">Reset Kata Sandi</p>
                                    <p className="text-sm text-gray-500">Buat kata sandi sementara jika pengguna lupa.</p>
                                </div>
                                <button onClick={openResetModal} className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-danger rounded-lg shadow-sm hover:bg-red-700">
                                    <KeyIcon className="w-4 h-4" /> Reset
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Assigned Assets Section */}
                    <div className="p-6 bg-white border border-gray-200/80 rounded-xl shadow-sm">
                        <h3 className="text-lg font-semibold text-gray-800 mb-2">Aset yang Digunakan ({userAssets.length})</h3>
                        <div className="overflow-x-auto border rounded-lg">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nama Aset</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID Aset</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Serial Number</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">MAC Address</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kondisi</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {userAssets.length > 0 ? userAssets.map(asset => (
                                        <tr key={asset.id} className="hover:bg-gray-50">
                                            <td className="px-4 py-3 whitespace-nowrap text-sm font-medium">
                                                <ClickableLink onClick={() => onShowAssetPreview(asset.id)}>{asset.name}</ClickableLink>
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap font-mono text-xs text-gray-600">{asset.id}</td>
                                            <td className="px-4 py-3 whitespace-nowrap font-mono text-xs text-gray-600">{asset.serialNumber || '-'}</td>
                                            <td className="px-4 py-3 whitespace-nowrap font-mono text-xs text-gray-600">{asset.macAddress || '-'}</td>
                                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">{asset.condition}</td>
                                        </tr>
                                    )) : (
                                        <tr>
                                            <td colSpan={5} className="px-4 py-6 text-center text-sm text-gray-500">Tidak ada aset yang sedang digunakan.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </DetailPageLayout>
            {/* Modals */}
            <Modal isOpen={isResetModalOpen} onClose={() => setIsResetModalOpen(false)} title="Reset Kata Sandi?" size="md" hideDefaultCloseButton>
                <div className="text-center">
                    <ExclamationTriangleIcon className="w-12 h-12 mx-auto text-red-500" />
                    <h3 className="mt-4 text-lg font-semibold text-gray-800">Anda yakin?</h3>
                    <p className="mt-2 text-sm text-gray-600">Anda akan membuat kata sandi baru untuk <strong>{user.name}</strong>. Pengguna harus segera mengganti kata sandi ini setelah login.</p>
                </div>
                <div className="flex justify-end gap-2 mt-6 pt-4 border-t">
                    <button onClick={() => setIsResetModalOpen(false)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50">Batal</button>
                    <button onClick={handleConfirmReset} disabled={isLoading} className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-danger rounded-lg shadow-sm hover:bg-red-700">
                        {isLoading && <SpinnerIcon className="w-4 h-4 mr-2"/>} Ya, Reset
                    </button>
                </div>
            </Modal>
             <Modal isOpen={isPasswordShown} onClose={closePasswordModal} title="Kata Sandi Baru" size="md">
                <p className="text-sm text-gray-600">Bagikan kata sandi sementara berikut kepada <strong>{user.name}</strong>. Kata sandi ini hanya ditampilkan sekali.</p>
                <div className="my-4 p-4 text-center font-mono text-xl tracking-widest text-tm-dark bg-gray-100 border-2 border-dashed rounded-lg">
                    {newPassword}
                </div>
                <div className="text-center text-xs text-amber-700 p-2 bg-amber-50 rounded-md">
                    <p><strong>Penting:</strong> Sarankan pengguna untuk segera mengganti kata sandi ini melalui menu "Kelola Akun" setelah berhasil login demi keamanan.</p>
                </div>
            </Modal>
        </>
    );
};

export default UserDetailPage;
