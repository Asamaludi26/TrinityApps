import { useMemo } from 'react';
import { User, ItemStatus, AssetStatus } from '../types';
import { useAssetStore } from '../stores/useAssetStore';
import { useRequestStore } from '../stores/useRequestStore';

export type ActionableItemType = 'request' | 'asset_damage' | 'asset_registration';

export interface ActionableItem {
  id: string;
  type: ActionableItemType;
  title: string;
  requester?: string;
  division?: string;
  timestamp: string;
  priority: 'high' | 'urgent' | 'normal';
  priorityLabel?: string;
  rawItem: any;
}

const getPriority = (item: any): ActionableItem['priority'] => {
    if ('isPrioritizedByCEO' in item && item.isPrioritizedByCEO) return 'high';
    if ('order' in item && item.order?.type === 'Urgent') return 'urgent';
    return 'normal';
};

const getPriorityLabel = (item: any): string | undefined => {
    if ('isPrioritizedByCEO' in item && item.isPrioritizedByCEO) return 'CEO Disposition';
    if ('order' in item && item.order?.type === 'Urgent') return 'Urgent';
    return undefined;
}

// Hook no longer needs data arguments, it fetches from store
export const useActionableItems = (currentUser: User) => {
  const assets = useAssetStore((state) => state.assets);
  const requests = useRequestStore((state) => state.requests);

  const actionableItems = useMemo<ActionableItem[]>(() => {
    const items: ActionableItem[] = [];
    const role = currentUser.role;

    // --- Admin & Super Admin Logic ---
    if (role === 'Admin Logistik' || role === 'Admin Purchase' || role === 'Super Admin') {
      // 1. Requests needing approval
      requests.forEach(req => {
        let needsAction = false;
        if ((role === 'Admin Logistik' || role === 'Super Admin') && req.status === ItemStatus.PENDING) {
          needsAction = true;
        }
        if (role === 'Admin Purchase' && req.status === ItemStatus.LOGISTIC_APPROVED) {
          needsAction = true;
        }
        if (role === 'Super Admin' && req.status === ItemStatus.AWAITING_CEO_APPROVAL) {
          needsAction = true;
        }

        if (needsAction) {
          items.push({
            id: req.id,
            type: 'request',
            title: req.items.map(i => `${i.quantity}x ${i.itemName}`).join(', '),
            requester: req.requester,
            division: req.division,
            timestamp: req.requestDate,
            priority: getPriority(req),
            priorityLabel: getPriorityLabel(req),
            rawItem: req,
          });
        }
      });
      
      // 2. Requests arrived and need registration (Admin Logistik & Super Admin only)
      if (role === 'Admin Logistik' || role === 'Super Admin') {
        requests.filter(req => req.status === ItemStatus.ARRIVED && !req.isRegistered).forEach(req => {
            items.push({
                id: req.id,
                type: 'asset_registration',
                title: `Barang dari request #${req.id} telah tiba`,
                requester: req.requester,
                division: req.division,
                timestamp: req.arrivalDate || req.requestDate,
                priority: getPriority(req),
                priorityLabel: getPriorityLabel(req),
                rawItem: req,
            });
        });

        // 3. Damaged assets
        assets.filter(asset => asset.status === AssetStatus.DAMAGED).forEach(asset => {
            const reportLog = [...(asset.activityLog || [])].reverse().find(log => log.action === 'Kerusakan Dilaporkan');
            items.push({
                id: asset.id,
                type: 'asset_damage',
                title: asset.name,
                requester: reportLog?.user || asset.currentUser || 'N/A',
                division: 'N/A', 
                timestamp: reportLog?.timestamp || asset.lastModifiedDate || asset.registrationDate,
                priority: 'urgent',
                priorityLabel: 'Rusak',
                rawItem: asset,
            });
        });
      }
    }
    
    // Sort items by priority and then by date
    return items.sort((a, b) => {
      const priorityOrder = { high: 3, urgent: 2, normal: 1 };
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      }
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });

  }, [currentUser, requests, assets]);

  return actionableItems;
};