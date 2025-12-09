

import React, { useState, useEffect } from 'react';
import { Division, User, UserRole, Permission } from '../../types';
import { useNotification } from '../../providers/NotificationProvider';
import { SpinnerIcon } from '../../components/icons/SpinnerIcon';
import { CustomSelect } from '../../components/ui/CustomSelect';
import FormPageLayout from '../../components/layout/FormPageLayout';
import { hasPermission, ROLE_DEFAULT_PERMISSIONS } from '../../utils/permissions';
import { PermissionManager } from './components/PermissionManager';
import { LockIcon } from '../../components/icons/LockIcon';

// Store Import
import { useMasterDataStore } from '../../stores/useMasterDataStore';

const userRoles: UserRole[] = ['Staff', 'Leader', 'Admin Logistik', 'Admin Purchase', 'Super Admin'];

interface UserFormPageProps {
    currentUser: User;
    onSave: (user: Omit<User, 'id'>, id?: number) => void; // Legacy prop, kept for now
    onCancel: () => void;
    editingUser: User | null;
}

const UserFormPage: React.FC<UserFormPageProps> = ({ currentUser, onSave, onCancel, editingUser }) => {
    // Zustand State
    const divisions = useMasterDataStore((state) => state.divisions);
    const addUser = useMasterDataStore((state) => state.addUser);
    const updateUser = useMasterDataStore((state) => state.updateUser);

    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [selectedRole, setSelectedRole] = useState<UserRole>('Staff');
    const [selectedDivisionId, setSelectedDivisionId] = useState<string>(divisions[0]?.id.toString() || '');
    const [permissions, setPermissions] = useState<Permission[]>([]);
    
    const [isSubmitting, setIsSubmitting] = useState(false);
    const addNotification = useNotification();

    const inventoryDivisionId = divisions.find(d => d.name === 'Logistik')?.id.toString();
    const canManagePermissions = hasPermission(currentUser, 'users:manage-permissions');

    const isSuperAdminAccount = editingUser?.role === 'Super Admin';

    // Initial Load
    useEffect(() => {
        if (editingUser) {
            setName(editingUser.name);
            setEmail(editingUser.email);
            setSelectedRole(editingUser.role);
            setSelectedDivisionId(editingUser.divisionId?.toString() || '');
            setPermissions(editingUser.permissions || []);
        } else {
            setName('');
            setEmail('');
            setSelectedRole('Staff');
            setSelectedDivisionId(divisions[0]?.id.toString() || '');
            // Initialize with default permissions for Staff
            setPermissions(ROLE_DEFAULT_PERMISSIONS['Staff'] || []); 
        }
    }, [editingUser, divisions]);

    // Automatic Permission Update on Role Change
    useEffect(() => {
        let shouldReset = false;
        if (!editingUser) {
            shouldReset = true;
        } else {
            if (selectedRole !== editingUser.role) {
                shouldReset = true;
            }
        }

        if (shouldReset) {
            const defaults = ROLE_DEFAULT_PERMISSIONS[selectedRole] || [];
            setPermissions(defaults);
        }
    }, [selectedRole, editingUser]);

    useEffect(() => {
        if (selectedRole === 'Admin Logistik' && inventoryDivisionId) {
            setSelectedDivisionId(inventoryDivisionId);
        }
    }, [selectedRole, inventoryDivisionId]);

    const handleDivisionChange = (divisionId: string) => {
        if (divisionId !== inventoryDivisionId && selectedRole === 'Admin Logistik') {
            setSelectedRole('Staff');
        }
        setSelectedDivisionId(divisionId);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name || !email) {
            addNotification('Nama dan Email wajib diisi.', 'error');
            return;
        }
        setIsSubmitting(true);
        
        const userData = {
            name,
            email,
            role: selectedRole,
            divisionId: selectedRole === 'Super Admin' ? null : parseInt(selectedDivisionId),
            permissions,
        };

        try {
             if (editingUser) {
                 await updateUser(editingUser.id, userData);
                 addNotification('Akun berhasil diperbarui.', 'success');
             } else {
                 // Mock password removed as it's not part of User type and mock api doesn't use it
                 await addUser(userData);
                 addNotification('Akun baru berhasil ditambahkan.', 'success');
             }
             onCancel(); // Navigate back
        } catch (error) {
             addNotification('Terjadi kesalahan saat menyimpan data.', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <FormPageLayout
            title={editingUser ? 'Edit Akun Pengguna' : 'Tambah Akun Pengguna Baru'}
            actions={
                <>
                    <button type="button" onClick={onCancel} className="px-4 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50">Batal</button>
                    {!isSuperAdminAccount && (
                        <button type="submit" form="user-form" disabled={isSubmitting} className="inline-flex items-center justify-center px-4 py-2 text-sm font-semibold text-white transition-colors duration-200 rounded-lg shadow-sm bg-tm-primary hover:bg-tm-primary-hover disabled:bg-tm-primary/70">
                            {isSubmitting && <SpinnerIcon className="w-5 h-5 mr-2" />}
                            {editingUser ? 'Simpan Perubahan' : 'Simpan Akun'}
                        </button>
                    )}
                </>
            }
        >
            <form id="user-form" onSubmit={handleSubmit} className="mx-auto space-y-8">
                {isSuperAdminAccount && (
                    <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3 text-amber-800">
                        <LockIcon className="w-5 h-5 mt-0.5" />
                        <div className="text-sm">
                            <strong>Akun Terproteksi.</strong> Peran dan hak akses akun Super Admin tidak dapat diubah untuk mencegah penguncian sistem secara tidak sengaja.
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label htmlFor="name" className="block text-sm font-medium text-gray-700">Nama Lengkap</label>
                        <div className="mt-1">
                            <input type="text" id="name" value={name} onChange={e => setName(e.target.value)} disabled={isSuperAdminAccount} required className="block w-full px-3 py-2 mt-1 text-gray-900 placeholder:text-gray-400 bg-gray-50 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-tm-accent focus:border-tm-accent sm:text-sm disabled:bg-gray-200 disabled:text-gray-500" />
                        </div>
                    </div>
                    <div>
                        <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email</label>
                        <div className="mt-1">
                            <input type="email" id="email" value={email} onChange={e => setEmail(e.target.value)} disabled={isSuperAdminAccount} required className="block w-full px-3 py-2 mt-1 text-gray-900 placeholder:text-gray-400 bg-gray-50 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-tm-accent focus:border-tm-accent sm:text-sm disabled:bg-gray-200 disabled:text-gray-500" />
                        </div>
                    </div>
                    <div>
                        <label htmlFor="role" className="block text-sm font-medium text-gray-700">Role</label>
                        <div className="mt-1">
                            <CustomSelect
                                options={userRoles.map(r => ({ value: r, label: r }))}
                                value={selectedRole}
                                onChange={(value) => setSelectedRole(value as UserRole)}
                                disabled={isSuperAdminAccount}
                            />
                        </div>
                        {selectedRole === 'Admin Logistik' && <p className="mt-2 text-xs text-gray-500">Role Admin Logistik hanya berlaku untuk Divisi Logistik.</p>}
                    </div>
                    <div>
                        <label htmlFor="division" className="block text-sm font-medium text-gray-700">Divisi</label>
                        <div className="mt-1">
                            <CustomSelect
                                options={selectedRole === 'Super Admin'
                                    ? [{ value: '', label: 'N/A' }]
                                    : divisions.map(d => ({ value: d.id.toString(), label: d.name }))
                                }
                                value={selectedDivisionId}
                                onChange={handleDivisionChange}
                                disabled={selectedRole === 'Super Admin' || selectedRole === 'Admin Logistik' || isSuperAdminAccount}
                                placeholder="Pilih Divisi"
                            />
                        </div>
                    </div>
                </div>

                {canManagePermissions && (
                    <div className="pt-6 border-t">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <LockIcon className="w-6 h-6 text-tm-primary" />
                                <div>
                                    <h3 className="text-lg font-semibold text-tm-dark">Manajemen Hak Akses (Permissions)</h3>
                                    <p className="text-xs text-gray-500">Hak akses bertanda kunci wajib dimiliki oleh role ini.</p>
                                </div>
                            </div>
                        </div>
                        <PermissionManager
                            currentPermissions={permissions}
                            onChange={setPermissions}
                            selectedRole={selectedRole}
                            disabled={isSuperAdminAccount}
                        />
                    </div>
                )}
            </form>
        </FormPageLayout>
    );
};

export default UserFormPage;