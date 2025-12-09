
import React, { useState } from 'react';
import { Permission, UserRole } from '../../../types';
import { ALL_PERMISSIONS, MANDATORY_PERMISSIONS, PERMISSION_DEPENDENCIES } from '../../../utils/permissions';
import { Checkbox } from '../../../components/ui/Checkbox';
import { LockIcon } from '../../../components/icons/LockIcon';
import { SearchIcon } from '../../../components/icons/SearchIcon';
import { ChevronDownIcon } from '../../../components/icons/ChevronDownIcon';

interface PermissionManagerProps {
    currentPermissions: Permission[];
    onChange: (newPermissions: Permission[]) => void;
    selectedRole?: UserRole;
    disabled?: boolean;
}

// Helper to get all dependencies (parents) for a given permission
const getDependencies = (permission: Permission): Permission[] => {
    return PERMISSION_DEPENDENCIES[permission] || [];
};

// Helper to get all dependents (children) for a given permission
const getDependents = (parentPermission: Permission): Permission[] => {
    const dependents: Permission[] = [];
    for (const [child, parents] of Object.entries(PERMISSION_DEPENDENCIES)) {
        if (parents && parents.includes(parentPermission)) {
            dependents.push(child as Permission);
        }
    }
    return dependents;
};

export const PermissionManager: React.FC<PermissionManagerProps> = ({ currentPermissions, onChange, selectedRole, disabled = false }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [expandedGroups, setExpandedGroups] = useState<string[]>(ALL_PERMISSIONS.map(g => g.group));
    
    const handlePermissionChange = (permissionKey: Permission, checked: boolean) => {
        let updatedPermissions = [...currentPermissions];

        if (checked) {
            // 1. Add the permission
            if (!updatedPermissions.includes(permissionKey)) {
                updatedPermissions.push(permissionKey);
            }
            
            // 2. Recursively add parents (Dependencies)
            const parentsToAdd = getDependencies(permissionKey);
            parentsToAdd.forEach(parent => {
                if (!updatedPermissions.includes(parent)) {
                    updatedPermissions.push(parent);
                }
            });

        } else {
            // 1. Remove the permission
            updatedPermissions = updatedPermissions.filter(p => p !== permissionKey);

            // 2. Recursively remove children (Dependents)
            const childrenToRemove = getDependents(permissionKey);
            updatedPermissions = updatedPermissions.filter(p => !childrenToRemove.includes(p));
        }

        // Langsung update ke parent
        onChange(updatedPermissions);
    };

    const handleGroupToggle = (groupPermissions: Permission[], isAllChecked: boolean) => {
        const mandatory = selectedRole ? MANDATORY_PERMISSIONS[selectedRole] || [] : [];
        let updatedPermissions = [...currentPermissions];

        if (isAllChecked) {
            // Uncheck All in Group
            groupPermissions.forEach(perm => {
                if (!mandatory.includes(perm)) {
                    updatedPermissions = updatedPermissions.filter(p => p !== perm);
                    const dependents = getDependents(perm);
                    updatedPermissions = updatedPermissions.filter(p => !dependents.includes(p));
                }
            });
        } else {
            // Check All in Group
            groupPermissions.forEach(perm => {
                if (!updatedPermissions.includes(perm)) {
                    updatedPermissions.push(perm);
                    const parents = getDependencies(perm);
                    parents.forEach(parent => {
                        if (!updatedPermissions.includes(parent)) {
                            updatedPermissions.push(parent);
                        }
                    });
                }
            });
        }
        
        // Langsung update ke parent
        onChange([...new Set(updatedPermissions)]);
    };

    const toggleGroup = (groupName: string) => {
        setExpandedGroups(prev => 
            prev.includes(groupName) 
                ? prev.filter(g => g !== groupName) 
                : [...prev, groupName]
        );
    };

    const handleGlobalAction = (action: 'select_all' | 'deselect_all') => {
        if (action === 'deselect_all') {
            const mandatory = selectedRole ? MANDATORY_PERMISSIONS[selectedRole] || [] : [];
            onChange(mandatory);
        } else {
            const allKeys = ALL_PERMISSIONS.flatMap(g => g.permissions.map(p => p.key));
            onChange(allKeys);
        }
    };

    const filteredGroups = ALL_PERMISSIONS.map(group => {
        const filteredPermissions = group.permissions.filter(p => 
            p.label.toLowerCase().includes(searchQuery.toLowerCase()) || 
            p.key.toLowerCase().includes(searchQuery.toLowerCase())
        );
        return { ...group, permissions: filteredPermissions };
    }).filter(group => group.permissions.length > 0);

    return (
        <div className="space-y-4">
            {/* Toolbar */}
            <div className="flex flex-col gap-4 p-4 bg-gray-50 border border-gray-200 rounded-lg sticky top-0 z-10 shadow-sm">
                {/* Grid Layout: 1 column on mobile, 3 columns on medium screens (2:1 ratio) */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                    {/* Search Bar: Takes up 2 columns on md screens */}
                    <div className="relative w-full md:col-span-2">
                        <SearchIcon className="absolute w-4 h-4 text-gray-500 left-3 top-1/2 -translate-y-1/2" />
                        <input 
                            type="text" 
                            placeholder="Cari hak akses..." 
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-3 py-2 text-sm bg-white text-gray-900 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-tm-primary focus:border-tm-primary disabled:bg-gray-100 disabled:text-gray-500"
                            disabled={disabled}
                        />
                    </div>
                    {/* Buttons: Takes up 1 column on md screens */}
                    <div className="flex gap-2 w-full md:col-span-1 justify-end">
                        <button type="button" onClick={() => handleGlobalAction('select_all')} className="flex-1 md:flex-none px-3 py-1.5 text-xs font-medium text-tm-primary bg-blue-50 border border-blue-200 rounded hover:bg-blue-100" disabled={disabled}>Pilih Semua</button>
                        <button type="button" onClick={() => handleGlobalAction('deselect_all')} className="flex-1 md:flex-none px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 border border-red-200 rounded hover:bg-red-100" disabled={disabled}>Hapus Semua</button>
                    </div>
                </div>
            </div>

            <fieldset disabled={disabled} className="space-y-4">
                {filteredGroups.map(group => {
                    const groupPermissionKeys = group.permissions.map(p => p.key);
                    const checkedCount = groupPermissionKeys.filter(p => currentPermissions.includes(p)).length;
                    const isAllChecked = groupPermissionKeys.length > 0 && checkedCount === groupPermissionKeys.length;
                    const isIndeterminate = checkedCount > 0 && !isAllChecked;
                    const isExpanded = expandedGroups.includes(group.group) || searchQuery.length > 0;

                    return (
                        <div key={group.group} className="border rounded-lg bg-white border-gray-200 overflow-hidden transition-all">
                            <div 
                                className="flex items-center justify-between p-4 bg-gray-50/50 cursor-pointer hover:bg-gray-100/50"
                                onClick={() => toggleGroup(group.group)}
                            >
                                <div className="flex items-center gap-3">
                                    <button 
                                        type="button"
                                        className={`p-1 rounded-full hover:bg-gray-200 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                                    >
                                        <ChevronDownIcon className="w-4 h-4 text-gray-500" />
                                    </button>
                                    <h4 className="text-sm font-semibold text-gray-800">{group.group}</h4>
                                    {checkedCount > 0 && (
                                        <span className="px-2 py-0.5 text-[10px] font-bold text-blue-700 bg-blue-100 rounded-full">
                                            {checkedCount} / {groupPermissionKeys.length}
                                        </span>
                                    )}
                                </div>
                                <div onClick={e => e.stopPropagation()}>
                                    <label className="flex items-center space-x-2 text-xs font-medium text-gray-600 cursor-pointer hover:text-tm-primary">
                                        <Checkbox
                                            id={`group-toggle-${group.group}`}
                                            checked={isAllChecked}
                                            onChange={() => handleGroupToggle(groupPermissionKeys, isAllChecked)}
                                            indeterminate={isIndeterminate}
                                            disabled={disabled}
                                        />
                                        <span>Pilih Grup</span>
                                    </label>
                                </div>
                            </div>
                            
                            {isExpanded && (
                                <div className="p-4 border-t border-gray-100 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 animate-fade-in-down">
                                    {group.permissions.map(permission => {
                                        const isMandatory = selectedRole && MANDATORY_PERMISSIONS[selectedRole]?.includes(permission.key);
                                        const isChecked = currentPermissions.includes(permission.key);
                                        
                                        return (
                                            <label 
                                                key={permission.key} 
                                                className={`flex items-start space-x-3 p-2.5 rounded-md border transition-all duration-200 
                                                    ${isChecked 
                                                        ? 'bg-blue-50/30 border-blue-100' 
                                                        : 'bg-white border-transparent hover:border-gray-200 hover:bg-gray-50'}
                                                    ${isMandatory ? 'cursor-not-allowed opacity-80' : 'cursor-pointer'}
                                                `}
                                            >
                                                <Checkbox
                                                    id={permission.key}
                                                    checked={isChecked}
                                                    onChange={(e) => handlePermissionChange(permission.key, e.target.checked)}
                                                    className="mt-0.5"
                                                    disabled={disabled || !!isMandatory}
                                                />
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-0.5">
                                                        <span className={`text-sm font-medium truncate ${isChecked ? 'text-tm-primary' : 'text-gray-700'}`}>
                                                            {permission.label}
                                                        </span>
                                                        {isMandatory && (
                                                            <LockIcon className="w-3 h-3 text-amber-500 flex-shrink-0" title="Wajib untuk peran ini" />
                                                        )}
                                                    </div>
                                                    <p className="text-[10px] text-gray-400 font-mono truncate">{permission.key}</p>
                                                </div>
                                            </label>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    );
                })}
            </fieldset>
        </div>
    );
};
