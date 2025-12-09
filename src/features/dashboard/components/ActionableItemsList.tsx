import React, { useState, useEffect } from 'react';
import { useActionableItems, ActionableItem } from '../../../hooks/useActionableItems';
import { User, Request, Asset, Page, PreviewData } from '../../../types';
import { WrenchIcon } from '../../../components/icons/WrenchIcon';
import { RequestIcon } from '../../../components/icons/RequestIcon';
import { RegisterIcon } from '../../../components/icons/RegisterIcon';
import { InboxIcon } from '../../../components/icons/InboxIcon';
import { FireIcon } from '../../../components/icons/FireIcon';
import { MegaphoneIcon } from '../../../components/icons/MegaphoneIcon';
import { ChevronDownIcon } from '../../../components/icons/ChevronDownIcon';

interface ActionableItemsListProps {
  currentUser: User;
  setActivePage: (page: Page, filters?: any) => void;
  onShowPreview: (data: PreviewData) => void;
}

const formatRelativeTime = (isoDate: string) => {
    const date = new Date(isoDate);
    const now = new Date();
    const diffSeconds = Math.round((now.getTime() - date.getTime()) / 1000);
    if (diffSeconds < 60) return `${diffSeconds}d lalu`;
    const diffMinutes = Math.round(diffSeconds / 60);
    if (diffMinutes < 60) return `${diffMinutes}m lalu`;
    const diffHours = Math.round(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}j lalu`;
    return `${Math.round(diffHours / 24)}h lalu`;
};


const ActionItemCard: React.FC<{ item: ActionableItem, onClick: () => void }> = ({ item, onClick }) => {
    const getIconData = () => {
        switch(item.type) {
            case 'request': return { icon: RequestIcon, bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-100' };
            case 'asset_registration': return { icon: RegisterIcon, bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-100' };
            case 'asset_damage': return { icon: WrenchIcon, bg: 'bg-red-50', text: 'text-red-600', border: 'border-red-100' };
            default: return { icon: InboxIcon, bg: 'bg-gray-50', text: 'text-gray-600', border: 'border-gray-100' };
        }
    };

    const style = getIconData();
    const Icon = style.icon;

    return (
        <div 
            onClick={onClick}
            className="p-4 bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md hover:border-tm-primary/30 transition-all duration-200 cursor-pointer group relative overflow-hidden"
        >
            <div className="flex items-start gap-4 relative z-10">
                <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center border ${style.bg} ${style.text} ${style.border}`}>
                    <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                        {item.priorityLabel ? (
                            <div className={`flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide rounded-md
                                ${item.priority === 'high' ? 'bg-purple-100 text-purple-700' :
                                  item.priority === 'urgent' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'}`
                            }>
                                {item.priority === 'high' ? <MegaphoneIcon className="w-3 h-3" /> : item.priority === 'urgent' ? <FireIcon className="w-3 h-3" /> : null}
                                {item.priorityLabel}
                            </div>
                        ) : <div />}
                        <time className="flex-shrink-0 ml-4 text-xs font-medium text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full">{formatRelativeTime(item.timestamp)}</time>
                    </div>
                    
                    <p className="text-sm font-bold text-gray-800 truncate group-hover:text-tm-primary transition-colors" title={item.title}>{item.title}</p>
                    
                    <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                        <span>Oleh:</span> 
                        <span className="font-medium text-gray-700 bg-gray-100 px-1.5 py-0.5 rounded">{item.requester}</span> 
                        {item.division && <span>({item.division})</span>}
                    </p>
                </div>
            </div>
        </div>
    );
}

const INITIAL_ITEM_LIMIT = 5;

export const ActionableItemsList: React.FC<Omit<ActionableItemsListProps, 'requests' | 'assets'>> = ({ currentUser, setActivePage, onShowPreview }) => {
    const allActionableItems = useActionableItems(currentUser);
    
    const [activeTab, setActiveTab] = useState<'all' | 'request' | 'asset_registration' | 'asset_damage'>('all');
    const [isExpanded, setIsExpanded] = useState(false);

    const filteredItems = allActionableItems.filter(item => activeTab === 'all' || item.type === activeTab);

    // Reset expansion when tab changes
    useEffect(() => {
        setIsExpanded(false);
    }, [activeTab]);

    const itemsToDisplay = isExpanded ? filteredItems : filteredItems.slice(0, INITIAL_ITEM_LIMIT);
    const remainingItemsCount = filteredItems.length - INITIAL_ITEM_LIMIT;

    const handleItemClick = (item: ActionableItem) => {
        switch(item.type) {
            case 'request':
                setActivePage('request', { openDetailForId: item.id });
                break;
            case 'asset_registration':
                setActivePage('request', { openDetailForId: item.id });
                break;
            case 'asset_damage':
                onShowPreview({ type: 'asset', id: item.id });
                break;
        }
    }
    
    const tabs = [
        { id: 'all', label: 'Semua', count: allActionableItems.length },
        { id: 'request', label: 'Persetujuan', count: allActionableItems.filter(i => i.type === 'request').length },
        { id: 'asset_registration', label: 'Registrasi', count: allActionableItems.filter(i => i.type === 'asset_registration').length },
        { id: 'asset_damage', label: 'Perbaikan', count: allActionableItems.filter(i => i.type === 'asset_damage').length },
    ].filter(tab => tab.count > 0);

    return (
        <div className="bg-white border border-gray-100 rounded-2xl shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07)] overflow-hidden flex flex-col h-full">
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-50 bg-white">
                <div>
                    <h2 className="text-lg font-bold text-gray-900">Inbox Tugas</h2>
                    <p className="text-sm text-gray-500 mt-1">Hal-hal yang perlu perhatian Anda</p>
                </div>
                <span className="bg-tm-primary text-white text-xs font-bold px-2.5 py-1 rounded-lg shadow-sm">
                    {allActionableItems.length} Pending
                </span>
            </div>
            
            {tabs.length > 1 && (
                <div className="px-6 border-b border-gray-50 bg-white">
                    <nav className="-mb-px flex space-x-6 custom-scrollbar overflow-x-auto" aria-label="Tabs">
                        {tabs.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition-colors
                                    ${activeTab === tab.id 
                                        ? 'border-tm-primary text-tm-primary' 
                                        : 'border-transparent text-gray-400 hover:text-gray-600 hover:border-gray-200'}`
                                }
                            >
                                {tab.label} 
                                {activeTab !== tab.id && (
                                    <span className="ml-2 bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded text-[10px] font-bold">{tab.count}</span>
                                )}
                            </button>
                        ))}
                    </nav>
                </div>
            )}
            
             <div className="p-6 bg-gray-50/30 flex-1">
                 {filteredItems.length > 0 ? (
                    <>
                        <div className="space-y-3">
                            {itemsToDisplay.map(item => (
                                <ActionItemCard key={`${item.type}-${item.id}`} item={item} onClick={() => handleItemClick(item)} />
                            ))}
                        </div>

                        {filteredItems.length > INITIAL_ITEM_LIMIT && (
                            <div className="mt-6 text-center relative">
                                <div className="absolute inset-0 flex items-center" aria-hidden="true">
                                    <div className="w-full border-t border-gray-200"></div>
                                </div>
                                <div className="relative flex justify-center">
                                    <button
                                        onClick={() => setIsExpanded(!isExpanded)}
                                        className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-gray-500 bg-white border border-gray-200 rounded-full hover:text-tm-primary hover:border-tm-primary/50 transition-all shadow-sm"
                                    >
                                        <span>{isExpanded ? 'Tampilkan lebih sedikit' : `Tampilkan ${remainingItemsCount} lainnya`}</span>
                                        <ChevronDownIcon className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                                    </button>
                                </div>
                            </div>
                        )}
                    </>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full py-12 text-center">
                        <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mb-4">
                            <InboxIcon className="w-8 h-8 text-green-500" />
                        </div>
                        <h3 className="text-lg font-bold text-gray-800">Semua Beres!</h3>
                        <p className="mt-1 text-sm text-gray-500 max-w-[200px]">Tidak ada tugas yang tertunda. Nikmati waktu Anda.</p>
                    </div>
                )}
            </div>
        </div>
    );
};