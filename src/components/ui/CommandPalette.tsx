
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { SearchIcon } from '../icons/SearchIcon';
import { AssetIcon } from '../icons/AssetIcon';
import { UsersIcon } from '../icons/UsersIcon';
import { CustomerIcon } from '../icons/CustomerIcon';
import { ArrowRightIcon } from '../icons/ArrowRightIcon';
import { ChevronRightIcon } from '../icons/ChevronRightIcon';
import { InboxIcon } from '../icons/InboxIcon';
import { Asset, User, Customer, Page, PreviewData } from '../../types';

// Stores
import { useAssetStore } from '../../stores/useAssetStore';
import { useMasterDataStore } from '../../stores/useMasterDataStore';

interface CommandPaletteProps {
    isOpen: boolean;
    onClose: () => void;
    // Props kept for compatibility with App.tsx during migration
    assets?: Asset[];
    users?: User[];
    customers?: Customer[];
    onNavigate: (page: Page, params?: any) => void;
    onShowPreview: (data: PreviewData) => void;
}

type SearchResult = {
    id: string;
    type: 'asset' | 'user' | 'customer' | 'page';
    title: string;
    subtitle: string;
    icon: React.FC<{ className?: string }>;
    action: () => void;
};

export const CommandPalette: React.FC<CommandPaletteProps> = ({ 
    isOpen, onClose, assets: propAssets, users: propUsers, customers: propCustomers, onNavigate, onShowPreview 
}) => {
    const [query, setQuery] = useState('');
    const [selectedIndex, setSelectedIndex] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<HTMLUListElement>(null);

    // Store Hooks
    const storeAssets = useAssetStore((state) => state.assets);
    const storeUsers = useMasterDataStore((state) => state.users);
    const storeCustomers = useMasterDataStore((state) => state.customers);
    const fetchAssets = useAssetStore((state) => state.fetchAssets);
    const fetchMasterData = useMasterDataStore((state) => state.fetchMasterData);

    // Hybrid Data Source: Use Store if available, fallback to Props
    const assets = storeAssets.length > 0 ? storeAssets : (propAssets || []);
    const users = storeUsers.length > 0 ? storeUsers : (propUsers || []);
    const customers = storeCustomers.length > 0 ? storeCustomers : (propCustomers || []);

    // Initial fetch if stores are empty when opened
    useEffect(() => {
        if (isOpen) {
            if (storeAssets.length === 0) fetchAssets();
            if (storeUsers.length === 0) fetchMasterData();
            
            setQuery('');
            setSelectedIndex(0);
            setTimeout(() => inputRef.current?.focus(), 50);
        }
    }, [isOpen]);

    const filteredResults = useMemo<SearchResult[]>(() => {
        if (!query.trim()) return [];
        
        const lowerQuery = query.toLowerCase();
        const results: SearchResult[] = [];
        const LIMIT_PER_CATEGORY = 3;

        // 1. Pages (Navigation)
        const pages: { label: string; page: Page; keywords: string[] }[] = [
            { label: 'Dashboard', page: 'dashboard', keywords: ['home', 'utama'] },
            { label: 'Buat Request Baru', page: 'request', keywords: ['minta', 'order'] },
            { label: 'Stok Aset', page: 'stock', keywords: ['gudang', 'inventory'] },
            { label: 'Daftar Pelanggan', page: 'customers', keywords: ['client'] },
            { label: 'Pencatatan Aset', page: 'registration', keywords: ['baru', 'tambah'] },
        ];

        pages.forEach(p => {
            if (p.label.toLowerCase().includes(lowerQuery) || p.keywords.some(k => k.includes(lowerQuery))) {
                results.push({
                    id: `page-${p.page}`,
                    type: 'page',
                    title: p.label,
                    subtitle: 'Navigasi Halaman',
                    icon: ArrowRightIcon || ChevronRightIcon, 
                    action: () => onNavigate(p.page)
                });
            }
        });

        // 2. Assets
        let assetCount = 0;
        for (const asset of assets) {
            if (assetCount >= LIMIT_PER_CATEGORY) break;
            if (asset.name.toLowerCase().includes(lowerQuery) || asset.id.toLowerCase().includes(lowerQuery) || (asset.serialNumber && asset.serialNumber.toLowerCase().includes(lowerQuery))) {
                results.push({
                    id: `asset-${asset.id}`,
                    type: 'asset',
                    title: asset.name,
                    subtitle: `Aset • ${asset.id} • ${asset.status}`,
                    icon: AssetIcon,
                    action: () => onShowPreview({ type: 'asset', id: asset.id })
                });
                assetCount++;
            }
        }

        // 3. Customers
        let customerCount = 0;
        for (const customer of customers) {
             if (customerCount >= LIMIT_PER_CATEGORY) break;
             if (customer.name.toLowerCase().includes(lowerQuery) || customer.id.toLowerCase().includes(lowerQuery)) {
                 results.push({
                     id: `cust-${customer.id}`,
                     type: 'customer',
                     title: customer.name,
                     subtitle: `Pelanggan • ${customer.id}`,
                     icon: CustomerIcon,
                     action: () => onShowPreview({ type: 'customer', id: customer.id })
                 });
                 customerCount++;
             }
        }
        
        // 4. Users
        let userCount = 0;
        for (const user of users) {
            if (userCount >= LIMIT_PER_CATEGORY) break;
            if (user.name.toLowerCase().includes(lowerQuery) || user.email.toLowerCase().includes(lowerQuery)) {
                results.push({
                    id: `user-${user.id}`,
                    type: 'user',
                    title: user.name,
                    subtitle: `Pengguna • ${user.role}`,
                    icon: UsersIcon,
                    action: () => onShowPreview({ type: 'user', id: user.id })
                });
                userCount++;
            }
        }

        return results;
    }, [query, assets, users, customers, onNavigate, onShowPreview]);

    useEffect(() => {
        setSelectedIndex(0);
    }, [filteredResults]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedIndex(prev => (prev + 1) % filteredResults.length);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedIndex(prev => (prev - 1 + filteredResults.length) % filteredResults.length);
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (filteredResults[selectedIndex]) {
                filteredResults[selectedIndex].action();
                onClose();
            }
        } else if (e.key === 'Escape') {
            onClose();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] overflow-y-auto p-4 sm:p-6 md:p-20">
            {/* Backdrop with Blur */}
            <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm transition-opacity" onClick={onClose} />

            <div className="mx-auto max-w-2xl transform divide-y divide-gray-100 overflow-hidden rounded-xl bg-white shadow-2xl ring-1 ring-black ring-opacity-5 transition-all">
                <div className="relative">
                    <SearchIcon className="pointer-events-none absolute top-3.5 left-4 h-5 w-5 text-gray-400" />
                    <input
                        ref={inputRef}
                        type="text"
                        className="h-12 w-full border-0 bg-transparent pl-11 pr-4 text-gray-900 placeholder:text-gray-500 focus:ring-0 sm:text-sm"
                        placeholder="Cari aset, pelanggan, pengguna, atau menu... (Ctrl+K)"
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        onKeyDown={handleKeyDown}
                    />
                </div>

                {(query === '' || filteredResults.length > 0) && (
                    <ul ref={listRef} className="max-h-96 scroll-py-3 overflow-y-auto p-3 custom-scrollbar">
                        {filteredResults.map((result, index) => (
                            <li
                                key={result.id}
                                onClick={() => {
                                    result.action();
                                    onClose();
                                }}
                                onMouseEnter={() => setSelectedIndex(index)}
                                className={`group flex cursor-default select-none rounded-xl p-3 ${
                                    index === selectedIndex ? 'bg-gray-100' : ''
                                }`}
                            >
                                <div className={`flex h-10 w-10 flex-none items-center justify-center rounded-lg ${
                                    index === selectedIndex ? 'bg-white shadow-sm ring-1 ring-gray-900/5' : 'bg-gray-50'
                                }`}>
                                    <result.icon className={`h-6 w-6 ${
                                        index === selectedIndex ? 'text-tm-primary' : 'text-gray-400'
                                    }`} />
                                </div>
                                <div className="ml-4 flex-auto">
                                    <p className={`text-sm font-medium ${
                                        index === selectedIndex ? 'text-gray-900' : 'text-gray-700'
                                    }`}>
                                        {result.title}
                                    </p>
                                    <p className={`text-sm ${
                                        index === selectedIndex ? 'text-gray-700' : 'text-gray-500'
                                    }`}>
                                        {result.subtitle}
                                    </p>
                                </div>
                                {index === selectedIndex && (
                                    <div className="flex-none self-center">
                                        <ArrowRightIcon className="h-5 w-5 text-gray-400" />
                                    </div>
                                )}
                            </li>
                        ))}
                    </ul>
                )}

                {query !== '' && filteredResults.length === 0 && (
                    <div className="py-14 px-6 text-center text-sm sm:px-14">
                        <InboxIcon className="mx-auto h-6 w-6 text-gray-400" />
                        <p className="mt-4 font-semibold text-gray-900">Tidak ditemukan hasil</p>
                        <p className="mt-2 text-gray-500">Kami tidak dapat menemukan apa pun dengan istilah itu. Coba cari yang lain.</p>
                    </div>
                )}
                
                <div className="flex flex-wrap items-center bg-gray-50 py-2.5 px-4 text-xs text-gray-500">
                    <kbd className="mx-1 flex h-5 w-5 items-center justify-center rounded border bg-white font-semibold text-gray-900 sm:mx-2 border-gray-200">
                        ↑
                    </kbd>
                    <kbd className="mx-1 flex h-5 w-5 items-center justify-center rounded border bg-white font-semibold text-gray-900 sm:mx-2 border-gray-200">
                        ↓
                    </kbd>
                    untuk navigasi
                    <kbd className="mx-1 flex h-5 w-5 items-center justify-center rounded border bg-white font-semibold text-gray-900 sm:mx-2 border-gray-200">
                        ↵
                    </kbd>
                    untuk memilih
                    <kbd className="mx-1 flex h-5 w-5 items-center justify-center rounded border bg-white font-semibold text-gray-900 sm:mx-2 border-gray-200">
                        esc
                    </kbd>
                    untuk menutup
                </div>
            </div>
        </div>
    );
};
