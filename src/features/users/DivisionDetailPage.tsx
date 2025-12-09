

import React from 'react';
import { User, Division, Page } from '../../types';
import { DetailPageLayout } from '../../components/layout/DetailPageLayout';
import { Avatar } from '../../components/ui/Avatar';
import { PencilIcon } from '../../components/icons/PencilIcon';
import { UsersIcon } from '../../components/icons/UsersIcon';
import { AssetIcon } from '../../components/icons/AssetIcon';

// Stores
import { useMasterDataStore } from '../../stores/useMasterDataStore';
import { useAssetStore } from '../../stores/useAssetStore';

interface DivisionDetailPageProps {
    pageInitialState?: { divisionId?: number };
    onBack: () => void;
    onEdit: () => void;
    onViewMember: (userId: number) => void;
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

const DivisionDetailPage: React.FC<DivisionDetailPageProps> = ({ pageInitialState, onBack, onEdit, onViewMember }) => {
    // Store Hooks
    const storeDivisions = useMasterDataStore((state) => state.divisions);
    const storeUsers = useMasterDataStore((state) => state.users);
    const storeAssets = useAssetStore((state) => state.assets);

    const divisionId = pageInitialState?.divisionId;
    const division = storeDivisions.find(d => d.id === divisionId);

    if (!division) return <div>Divisi tidak ditemukan.</div>;

    const members = storeUsers.filter(u => u.divisionId === division.id);
    const totalAssetsInDivision = storeAssets.filter(asset => members.some(member => member.name === asset.currentUser)).length;
    const leaderCount = members.filter(member => member.role === 'Leader').length;
    
    return (
        <DetailPageLayout
            title={`Detail Divisi: ${division.name}`}
            onBack={onBack}
            headerActions={
                <button onClick={onEdit} className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-tm-primary rounded-lg shadow-sm hover:bg-tm-primary-hover">
                    <PencilIcon className="w-4 h-4" />
                    Edit Divisi
                </button>
            }
        >
            <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                    <StatCard title="Jumlah Anggota" value={members.length} icon={UsersIcon} />
                    <StatCard title="Total Aset Dikelola" value={totalAssetsInDivision} icon={AssetIcon} />
                    <StatCard title="Jumlah Leader" value={leaderCount} icon={UsersIcon} />
                </div>
                 <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200/80">
                     <div>
                        <h3 className="text-lg font-semibold text-gray-800 mb-2">Daftar Anggota</h3>
                         <div className="overflow-x-auto border rounded-lg">
                            <table className="min-w-full divide-y divide-gray-200">
                                 <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nama</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                   {members.length > 0 ? members.map(member => (
                                        <tr key={member.id} onClick={() => onViewMember(member.id)} className="hover:bg-gray-50 cursor-pointer">
                                            <td className="px-4 py-3 flex items-center gap-3">
                                                <Avatar name={member.name} className="w-8 h-8 text-xs"/>
                                                <span className="text-sm font-medium text-gray-800">{member.name}</span>
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-600">{member.email}</td>
                                            <td className="px-4 py-3">
                                                <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${getRoleClass(member.role)}`}>{member.role}</span>
                                            </td>
                                        </tr>
                                   )) : (
                                       <tr>
                                            <td colSpan={3} className="px-4 py-6 text-center text-sm text-gray-500">Divisi ini tidak memiliki anggota.</td>
                                       </tr>
                                   )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </DetailPageLayout>
    );
};

export default DivisionDetailPage;