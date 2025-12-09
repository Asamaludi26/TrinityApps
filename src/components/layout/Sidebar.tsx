
import React, { useState, useEffect, useMemo } from 'react';
import { Page, User, Permission } from '../../types';
import { hasPermission } from '../../utils/permissions';
import { DashboardIcon } from '../icons/DashboardIcon';
import { RequestIcon } from '../icons/RequestIcon';
import { RegisterIcon } from '../icons/RegisterIcon';
import { HandoverIcon } from '../icons/HandoverIcon';
import { DismantleIcon } from '../icons/DismantleIcon';
import { CloseIcon } from '../icons/CloseIcon';
import { AssetIcon } from '../icons/AssetIcon';
import { ChevronDownIcon } from '../icons/ChevronDownIcon';
import { UsersIcon } from '../icons/UsersIcon';
import { TrinitiLogoIcon } from '../icons/TrinitiLogoIcon';
import { CustomerIcon } from '../icons/CustomerIcon';
import { BoxIcon } from '../icons/BoxIcon';
import { SettingsIcon } from '../icons/SettingsIcon';
import { CategoryIcon } from '../icons/CategoryIcon';
import { WrenchIcon } from '../icons/WrenchIcon';
import { FileSignatureIcon } from '../icons/FileSignatureIcon';
import { FileTextIcon } from '../icons/FileTextIcon';
import { JournalCheckIcon } from '../icons/JournalCheckIcon';
import { UserCogIcon } from '../icons/UserCogIcon';

// Zustand Imports
import { useUIStore } from '../../stores/useUIStore';
import { useAuthStore } from '../../stores/useAuthStore';

interface SidebarProps {
  currentUser: User;
  activePage: Page;
  setActivePage: (page: Page, filters?: any) => void;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

type MenuItem = {
  id: string;
  label: string;
  icon: React.FC<{ className?: string }>;
  permission?: Permission;
  children?: MenuItem[];
  page?: Page;
  filter?: Record<string, any>;
  isExternal?: boolean;
  path?: string;
};

const allMenuItems: MenuItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: DashboardIcon, permission: 'dashboard:view' },
  {
    id: 'assetManagement',
    label: 'Pusat Aset',
    icon: AssetIcon,
    permission: 'assets:view', 
    children: [
      { id: 'registration', label: 'Catat Aset', icon: RegisterIcon, permission: 'assets:create' },
      { id: 'stock', label: 'Stok Aset', icon: BoxIcon, permission: 'assets:view' },
      {
        id: 'request-parent',
        label: 'Request Aset',
        icon: RequestIcon,
        children: [
          { id: 'request-new', page: 'request', label: 'Request Baru', icon: RequestIcon, permission: 'requests:view:own' },
          { id: 'request-loan', page: 'request-pinjam', label: 'Request Pinjam', icon: JournalCheckIcon, permission: 'loan-requests:view:own' },
        ],
      },
      { id: 'handover', label: 'Handover Aset', icon: HandoverIcon, permission: 'assets:handover' },
      { id: 'repair', label: 'Perbaikan Aset', icon: WrenchIcon, permission: 'assets:repair:manage' },
    ],
  },
  {
    id: 'customerManagement',
    label: 'Manajemen Pelanggan',
    icon: CustomerIcon,
    permission: 'customers:view',
    children: [
      { id: 'customers', label: 'Daftar Pelanggan', icon: UsersIcon, permission: 'customers:view' },
      { id: 'customer-installation-form', page: 'customer-installation-form', label: 'Manajemen Instalasi', icon: FileSignatureIcon, permission: 'assets:install' },
      { id: 'customer-maintenance-form', page: 'customer-maintenance-form', label: 'Manajemen Maintenance', icon: WrenchIcon, permission: 'assets:repair:manage' },
      { id: 'customer-dismantle', page: 'customer-dismantle', label: 'Data Dismantle', icon: DismantleIcon, permission: 'assets:dismantle' },
    ],
  },
  {
    id: 'settings',
    label: 'Pengaturan',
    icon: SettingsIcon,
    children: [
        { id: 'settings-akun', page: 'pengaturan-akun', label: 'Kelola Akun', icon: UserCogIcon, permission: 'account:manage' },
        { id: 'settings-pengguna', page: 'pengaturan-pengguna', label: 'Akun & Divisi', icon: UsersIcon, permission: 'users:view' },
        { id: 'settings-kategori', page: 'kategori', label: 'Kategori & Model', icon: CategoryIcon, permission: 'categories:manage' },
    ]
  },
];


const NavLink: React.FC<{
  item: MenuItem;
  activePage: Page;
  onClick: () => void;
  isSubmenu?: boolean;
}> = ({ item, activePage, onClick, isSubmenu = false }) => {
  const pageId = item.page || (item.id as Page);
  const isActive = activePage === pageId;
  const baseClasses = 'relative flex items-center px-4 py-2.5 my-1 rounded-md text-sm font-medium transition-colors duration-200 group';
  const activeClasses = 'bg-gray-700/60 text-white';
  const inactiveClasses = 'text-gray-400 hover:bg-gray-700/40 hover:text-white';

  const linkContent = (
    <>
        {isActive && !item.isExternal && <span className="absolute inset-y-0 left-0 w-1 bg-tm-accent rounded-r-full"></span>}
        <item.icon className={`flex-shrink-0 w-5 h-5 mr-4 transition-colors group-hover:text-white ${isActive ? 'text-white' : 'text-gray-500'}`} />
        <span>{item.label}</span>
        {item.isExternal && (
            <svg className="w-4 h-4 ml-auto text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg>
        )}
    </>
  );

  if (item.isExternal) {
      return (
          <a
            href={item.path}
            target="_blank"
            rel="noopener noreferrer"
            className={`${baseClasses} ${inactiveClasses}`}
          >
            {linkContent}
          </a>
      );
  }

  return (
    <a
      href="#"
      onClick={(e) => {
        e.preventDefault();
        onClick();
      }}
      className={`${baseClasses} ${isActive ? activeClasses : inactiveClasses}`}
    >
        {linkContent}
    </a>
  );
};


export const Sidebar: React.FC<SidebarProps> = ({ 
  currentUser: propUser, 
  activePage: propActivePage, 
  setActivePage: propSetActivePage, 
  isOpen: propIsOpen, 
  setIsOpen: propSetIsOpen 
}) => {
    // Zustand Integration
    const storeActivePage = useUIStore((state) => state.activePage);
    const storeSetActivePage = useUIStore((state) => state.setActivePage);
    const storeSidebarOpen = useUIStore((state) => state.sidebarOpen);
    const storeToggleSidebar = useUIStore((state) => state.toggleSidebar);
    const storeUser = useAuthStore((state) => state.currentUser);

    // Prioritize store state if available (hybrid mode)
    // In a full migration, we would remove props completely.
    const activePage = storeActivePage;
    const currentUser = storeUser || propUser;
    const isOpen = storeSidebarOpen; // Using store for open state sync

    // Wrapper to handle both store and prop updates (for App.tsx compatibility)
    const handleSetActivePage = (page: Page, filters?: any) => {
        storeSetActivePage(page, filters);
        propSetActivePage(page, filters); // Keep App.tsx in sync for now
    };

    const handleSetIsOpen = (val: boolean) => {
        storeToggleSidebar(val);
        propSetIsOpen(val); // Keep App.tsx in sync
    };

    const [openMenus, setOpenMenus] = useState<Record<string, boolean>>(() => {
        const initialState: Record<string, boolean> = {};
        allMenuItems.forEach(item => {
            if (item.children) {
                const childPages = item.children.map(c => c.page || c.id);
                if (childPages.includes(activePage)) {
                    initialState[item.id] = true;
                }
            }
        });
        return initialState;
    });

    const menuItems = useMemo(() => {
        const filterVisibleItems = (items: MenuItem[]): MenuItem[] => {
            return items.reduce((acc: MenuItem[], item) => {
                if (item.permission && !hasPermission(currentUser, item.permission)) {
                    return acc;
                }

                if (item.children && item.children.length > 0) {
                    const visibleChildren = filterVisibleItems(item.children);
                    if (visibleChildren.length === 0) {
                        if (!item.page && !item.path) {
                            return acc;
                        }
                        return [...acc, { ...item, children: undefined }];
                    }
                    return [...acc, { ...item, children: visibleChildren }];
                }

                return [...acc, item];
            }, []);
        };

        return filterVisibleItems(allMenuItems);
    }, [currentUser]);


    useEffect(() => {
        allMenuItems.forEach(item => {
            if (item.children) {
                const childPages = item.children.flatMap(c => c.children ? c.children.map(gc => gc.page || gc.id) : [c.page || c.id]);
                if (childPages.includes(activePage)) {
                    setOpenMenus(prev => ({...prev, [item.id]: true}));
                    const parentOfActive = item.children.find(c => c.children?.some(gc => (gc.page || gc.id) === activePage));
                    if(parentOfActive) {
                         setOpenMenus(prev => ({...prev, [parentOfActive.id]: true}));
                    }
                }
            }
        });
    }, [activePage]);

    const handleNavClick = (page: Page, filters?: Record<string, any>) => {
        handleSetActivePage(page, filters);
        if(window.innerWidth < 768) { // close on mobile
            handleSetIsOpen(false);
        }
    };
    
    const SidebarContent = () => (
        <div className="flex flex-col h-full">
            <div className="flex items-center justify-between h-20 px-4 border-b border-gray-700/80">
                <div className="flex items-center gap-3">
                    <TrinitiLogoIcon className="w-10 h-10 text-tm-accent" />
                    <span className="text-xl font-bold tracking-wider text-white">
                        Triniti<span className="font-normal opacity-75">Asset</span>
                    </span>
                </div>
                <button onClick={() => handleSetIsOpen(false)} className="text-gray-400 md:hidden hover:text-white">
                    <CloseIcon />
                </button>
            </div>
            <nav className="flex-1 p-3 overflow-y-auto dark-scrollbar">
                {menuItems.map((item) => {
                    if (!item.children || item.children.length === 0) {
                        return (
                            <NavLink 
                                key={item.id} 
                                item={item}
                                activePage={activePage} 
                                onClick={() => handleNavClick((item.page || item.id) as Page)}
                            />
                        );
                    }

                    const isParentActive = item.children?.some(child => 
                        (child.page || child.id) === activePage || 
                        child.children?.some(gc => (gc.page || gc.id) === activePage)
                    );

                    return (
                        <div key={item.id}>
                            <button
                                onClick={() => setOpenMenus(prev => ({...prev, [item.id]: !prev[item.id]}))}
                                className={`flex items-center justify-between w-full px-4 py-2.5 my-1 rounded-md text-sm font-medium transition-colors duration-200 group focus:outline-none ${isParentActive ? 'text-white' : 'text-gray-400'} hover:bg-gray-700/40 hover:text-white`}
                            >
                                <div className="flex items-center">
                                    <item.icon className={`flex-shrink-0 w-5 h-5 mr-4 transition-colors group-hover:text-white ${isParentActive ? 'text-white' : 'text-gray-500'}`} />
                                    <span className="flex-1 text-left">{item.label}</span>
                                </div>
                                <ChevronDownIcon className={`w-5 h-5 transform transition-transform duration-200 ${openMenus[item.id] ? 'rotate-180' : 'rotate-0'}`} />
                            </button>
                            <div className={`overflow-hidden transition-all duration-300 ease-in-out ${openMenus[item.id] ? 'max-h-96' : 'max-h-0'}`}>
                                <div className="pt-1 pb-1 pl-6">
                                    {item.children.map((child) => {
                                        if (!child.children || child.children.length === 0) {
                                            return (
                                                <NavLink
                                                    key={child.id}
                                                    item={child}
                                                    activePage={activePage}
                                                    onClick={() => handleNavClick((child.page || child.id) as Page, child.filter)}
                                                    isSubmenu={true}
                                                />
                                            );
                                        }

                                        const isChildParentActive = child.children?.some(gc => (gc.page || gc.id) === activePage);
                                        
                                        return (
                                            <div key={child.id}>
                                                <button
                                                    onClick={() => setOpenMenus(prev => ({...prev, [child.id]: !prev[child.id]}))}
                                                    className={`flex items-center justify-between w-full px-4 py-2.5 my-1 rounded-md text-sm font-medium transition-colors duration-200 group focus:outline-none ${isChildParentActive ? 'text-white' : 'text-gray-400'} hover:bg-gray-700/40 hover:text-white`}
                                                >
                                                    <div className="flex items-center">
                                                        <child.icon className={`flex-shrink-0 w-5 h-5 mr-4 transition-colors group-hover:text-white ${isChildParentActive ? 'text-white' : 'text-gray-500'}`} />
                                                        <span className="flex-1 text-left">{child.label}</span>
                                                    </div>
                                                    <ChevronDownIcon className={`w-5 h-5 transform transition-transform duration-200 ${openMenus[child.id] ? 'rotate-180' : 'rotate-0'}`} />
                                                </button>
                                                <div className={`overflow-hidden transition-all duration-300 ease-in-out ${openMenus[child.id] ? 'max-h-96' : 'max-h-0'}`}>
                                                    <div className="pt-1 pb-1 pl-6">
                                                        {child.children.map((grandchild) => (
                                                             <NavLink
                                                                key={grandchild.id}
                                                                item={grandchild}
                                                                activePage={activePage}
                                                                onClick={() => handleNavClick((grandchild.page || grandchild.id) as Page, grandchild.filter)}
                                                                isSubmenu={true}
                                                            />
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </nav>
            <div className="p-4 border-t border-gray-700/80">
                <p className="text-xs text-center text-gray-500">© 2025 Triniti Media Indonesia</p>
            </div>
        </div>
    );

    return (
        <>
            {/* Mobile overlay */}
            <div 
                className={`fixed inset-0 z-20 bg-black bg-opacity-50 transition-opacity md:hidden no-print ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                onClick={() => handleSetIsOpen(false)}
            />
            
            {/* Sidebar */}
            <aside className={`fixed top-0 left-0 z-30 h-full w-64 bg-tm-dark text-white transform transition-transform duration-300 ease-in-out md:translate-x-0 no-print ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                <SidebarContent />
            </aside>
        </>
    );
};
