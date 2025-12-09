import React, { useState, useEffect, useRef } from 'react';
import { User, Page, PreviewData } from '../../types';
import { Sidebar } from './Sidebar';
import { NotificationBell } from '../ui/NotificationBell';
import { MenuIcon } from '../icons/MenuIcon';
import { QrCodeIcon } from '../icons/QrCodeIcon';
import { ChevronDownIcon } from '../icons/ChevronDownIcon';
import { UserCogIcon } from '../icons/UserCogIcon';
import { LogoutIcon } from '../icons/LogoutIcon';
import { CommandPalette } from '../ui/CommandPalette';
import { GlobalScannerModal } from '../ui/GlobalScannerModal';
import PreviewModal from '../../features/preview/PreviewModal';

// Stores
import { useUIStore } from '../../stores/useUIStore';
import { useAuthStore } from '../../stores/useAuthStore';

interface MainLayoutProps {
  children: React.ReactNode;
  currentUser: User;
  onLogout: () => void;
  // Global Actions passed down for Header/Sidebar
  setActivePage: (page: Page, filters?: any) => void;
  onShowPreview: (data: PreviewData) => void;
  // Scanner Actions
  onOpenScanner: () => void;
  // Modal States (passed from App for now, but ideally managed globally)
  isGlobalScannerOpen: boolean;
  setIsGlobalScannerOpen: (open: boolean) => void;
  onScanSuccess: (data: any) => void;
  previewData: PreviewData | null;
  setPreviewData: (data: PreviewData | null) => void;
  // Action callbacks for Preview Modal
  previewActions: {
    onInitiateHandover: (asset: any) => void;
    onInitiateDismantle: (asset: any) => void;
    onInitiateInstallation: (asset: any) => void;
    onReportDamage: () => void;
    onStartRepair: () => void;
    onMarkAsRepaired: () => void;
    onDecommission: () => void;
    onReceiveFromRepair: () => void;
    onAddProgressUpdate: () => void;
    onEditItem: (data: any) => void;
  }
}

const getRoleClass = (role: User["role"]) => {
  switch (role) {
    case "Super Admin": return "bg-purple-100 text-purple-800";
    case "Admin Logistik": return "bg-info-light text-info-text";
    case "Admin Purchase": return "bg-teal-100 text-teal-800";
    case "Leader": return "bg-sky-100 text-sky-800";
    default: return "bg-gray-100 text-gray-800";
  }
};

export const MainLayout: React.FC<MainLayoutProps> = ({ 
  children, 
  currentUser, 
  onLogout, 
  setActivePage, 
  onShowPreview,
  onOpenScanner,
  isGlobalScannerOpen,
  setIsGlobalScannerOpen,
  onScanSuccess,
  previewData,
  setPreviewData,
  previewActions
}) => {
  // UI Store
  const activePage = useUIStore((state) => state.activePage);
  const sidebarOpen = useUIStore((state) => state.sidebarOpen);
  const setSidebarOpen = useUIStore((state) => state.toggleSidebar);

  // Local UI State
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const profileDropdownRef = useRef<HTMLDivElement>(null);

  // Close profile dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target as Node)) {
        setIsProfileDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Command Palette Shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div className="min-h-screen bg-tm-light flex">
      {/* Sidebar */}
      <Sidebar
        currentUser={currentUser}
        activePage={activePage}
        setActivePage={setActivePage}
        isOpen={sidebarOpen}
        setIsOpen={setSidebarOpen}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 md:ml-64 transition-all duration-300">
        
        {/* Header */}
        <header className="sticky top-0 z-20 flex items-center justify-between w-full h-16 px-4 bg-white border-b border-gray-200 no-print shadow-sm">
          <div className="flex items-center gap-4">
            <button onClick={() => setSidebarOpen(true)} className="text-gray-500 md:hidden p-2 hover:bg-gray-100 rounded-lg">
              <MenuIcon className="w-6 h-6" />
            </button>
            {/* Bisa tambah Breadcrumb disini nanti */}
          </div>

          <div className="flex items-center space-x-3 sm:space-x-4">
             {/* Search Trigger for Command Palette (Visual hint) */}
            <button 
                onClick={() => setIsCommandPaletteOpen(true)}
                className="hidden md:flex items-center gap-2 px-3 py-1.5 text-sm text-gray-400 bg-gray-100 rounded-lg hover:text-gray-600 hover:bg-gray-200 transition-colors"
            >
                <span>Cari...</span>
                <kbd className="px-1.5 py-0.5 text-xs font-semibold text-gray-500 bg-white border border-gray-300 rounded-md shadow-sm">⌘K</kbd>
            </button>

            <NotificationBell
              currentUser={currentUser}
              setActivePage={setActivePage}
              onShowPreview={onShowPreview}
            />
            
            <button
              onClick={onOpenScanner}
              className="p-2 text-gray-500 rounded-full hover:bg-gray-100 hover:text-tm-primary transition-colors"
              title="Pindai QR Aset"
            >
              <QrCodeIcon className="w-6 h-6" />
            </button>

            {/* Profile Dropdown */}
            <div className="relative" ref={profileDropdownRef}>
              <button
                onClick={() => setIsProfileDropdownOpen((prev) => !prev)}
                className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-200"
              >
                <div className="text-right hidden sm:block">
                  <span className="block text-sm font-medium text-gray-700">{currentUser.name}</span>
                  <span className="block text-xs text-gray-500">{currentUser.role}</span>
                </div>
                 <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold ${getRoleClass(currentUser.role).split(' ')[0].replace('text-', 'bg-').replace('100', '500')}`}>
                    {currentUser.name.charAt(0)}
                </div>
                <ChevronDownIcon className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isProfileDropdownOpen ? "rotate-180" : ""}`} />
              </button>
              
              {isProfileDropdownOpen && (
                <div className="absolute right-0 z-30 w-56 mt-2 origin-top-right bg-white border border-gray-200 rounded-xl shadow-lg animate-zoom-in ring-1 ring-black ring-opacity-5 focus:outline-none">
                  <div className="p-1">
                    <div className="px-3 py-2 mb-1 border-b border-gray-100 sm:hidden">
                      <p className="text-sm font-semibold text-gray-800">{currentUser.name}</p>
                      <p className="text-xs text-gray-500">{currentUser.role}</p>
                    </div>
                    <button onClick={() => { setActivePage("pengaturan-akun"); setIsProfileDropdownOpen(false); }} className="flex items-center w-full gap-3 px-3 py-2 text-sm text-left text-gray-700 rounded-lg hover:bg-gray-50 hover:text-tm-primary transition-colors">
                      <UserCogIcon className="w-4 h-4" /> <span>Kelola Akun</span>
                    </button>
                    <div className="my-1 border-t border-gray-100"></div>
                    <button onClick={onLogout} className="flex items-center w-full gap-3 px-3 py-2 text-sm text-left text-red-600 rounded-lg hover:bg-red-50 transition-colors">
                      <LogoutIcon className="w-4 h-4" /> <span>Keluar</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Main Content Scroll Area */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-tm-light relative">
            {children}
        </main>
      </div>

      {/* --- Global Modals (Registered at Layout Level) --- */}
      
      <GlobalScannerModal
        isOpen={isGlobalScannerOpen}
        onClose={() => setIsGlobalScannerOpen(false)}
        onScanSuccess={onScanSuccess}
      />

      <PreviewModal
        currentUser={currentUser}
        previewData={previewData}
        onClose={() => setPreviewData(null)}
        onShowPreview={onShowPreview}
        onEditItem={previewActions.onEditItem}
        // Pass through all action handlers
        onInitiateHandover={previewActions.onInitiateHandover}
        onInitiateDismantle={previewActions.onInitiateDismantle}
        onInitiateInstallation={previewActions.onInitiateInstallation}
        onReportDamage={previewActions.onReportDamage}
        onStartRepair={previewActions.onStartRepair}
        onMarkAsRepaired={previewActions.onMarkAsRepaired}
        onDecommission={previewActions.onDecommission}
        onReceiveFromRepair={previewActions.onReceiveFromRepair}
        onAddProgressUpdate={previewActions.onAddProgressUpdate}
      />

      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onNavigate={setActivePage}
        onShowPreview={onShowPreview}
      />
    </div>
  );
};