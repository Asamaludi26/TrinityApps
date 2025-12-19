
import React, { useState, useEffect, useMemo } from "react";
import { User, Page, PreviewData, Asset, Request, LoanRequest, AssetReturn } from "./types";

// Providers
import { NotificationProvider, useNotification } from "./providers/NotificationProvider";

// Layout
import { MainLayout } from "./components/layout/MainLayout";
import { PageSkeleton } from "./components/ui/PageSkeleton";
import { FullPageLoader } from "./components/ui/FullPageLoader";

// Feature Components
import LoginPage from "./features/auth/LoginPage";
import DashboardPage from "./features/dashboard/DashboardPage";
import ItemRegistration from "./features/assetRegistration/RegistrationPage";
import ItemHandoverPage from "./features/handover/HandoverPage";
import RepairManagementPage from "./features/repair/RepairManagementPage";
import CustomerManagementPage from "./features/customers/CustomerManagementPage";
import { AccountsPage } from "./features/users/AccountsPage";
import CategoryManagementPage from "./features/categories/CategoryManagementPage";
import ManageAccountPage from "./features/users/ManageAccountPage";
import UserFormPage from "./features/users/UserFormPage";
import DivisionFormPage from "./features/users/DivisionFormPage";
import UserDetailPage from "./features/users/UserDetailPage";
import DivisionDetailPage from "./features/users/DivisionDetailPage";
import StockOverviewPage from "./features/stock/StockOverviewPage";
import PermissionDeniedPage from "./features/auth/PermissionDeniedPage";
import RequestHubPage from "./features/requests/RequestHubPage";
import ReturnAssetFormPage from "./features/requests/loan/ReturnAssetFormPage";

// Stores
import { useAuthStore } from "./stores/useAuthStore";
import { useUIStore } from "./stores/useUIStore";
import { useAssetStore } from "./stores/useAssetStore";
import { useRequestStore } from "./stores/useRequestStore";
import { useTransactionStore } from "./stores/useTransactionStore";
import { useMasterDataStore } from "./stores/useMasterDataStore";
import { useNotificationStore } from "./stores/useNotificationStore";

const AppContent: React.FC = () => {
  // --- UI State from Store ---
  const activePage = useUIStore((state) => state.activePage);
  const setStoreActivePage = useUIStore((state) => state.setActivePage);
  const setPageLoading = useUIStore((state) => state.setPageLoading);
  const pageInitialState = useUIStore((state) => state.pageInitialState);
  const clearPageInitialState = useUIStore((state) => state.clearPageInitialState);

  // --- Auth State ---
  const currentUser = useAuthStore((state) => state.currentUser)!;
  const logout = useAuthStore((state) => state.logout);

  // --- Data Stores Initialization ---
  const [isDataLoading, setIsDataLoading] = useState(true);

  useEffect(() => {
    const loadAllData = async () => {
      await Promise.all([
        useAssetStore.getState().fetchAssets(),
        useRequestStore.getState().fetchRequests(),
        useTransactionStore.getState().fetchTransactions(),
        useMasterDataStore.getState().fetchMasterData(),
        useNotificationStore.getState().fetchNotifications(),
        new Promise(resolve => setTimeout(resolve, 800)) 
      ]);
      setIsDataLoading(false);
    };

    loadAllData();
  }, []);

  // --- Transition Wrapper ---
  const setActivePage = (page: Page, initialState?: any) => {
    setPageLoading(true);
    // Simulasi delay request server saat berpindah halaman
    setTimeout(() => {
        setStoreActivePage(page, initialState);
        setPageLoading(false);
    }, 600); 
  };

  // --- Global Modal States ---
  const [isGlobalScannerOpen, setIsGlobalScannerOpen] = useState(false);
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  
  const [scanContext, setScanContext] = useState<'global' | 'form'>('global');
  const [formScanCallback, setFormScanCallback] = useState<((data: any) => void) | null>(null);

  const addNotification = useNotification();

  const handleShowPreview = (data: PreviewData) => {
    if (data.type === "customer") {
      setActivePage("customer-detail", { customerId: data.id });
      setPreviewData(null);
    } else {
      setPreviewData(data);
    }
  };

  const handleScanSuccess = (parsedData: any) => {
    if (scanContext === 'form' && formScanCallback) {
        formScanCallback(parsedData);
        setIsGlobalScannerOpen(false);
        return;
    }
      
    if (parsedData.id) {
        handleShowPreview({ type: 'asset', id: parsedData.id });
    } else {
        addNotification("Kode aset tidak dikenali.", "error");
    }
    setIsGlobalScannerOpen(false);
  };

  const navigationActions = {
      onInitiateHandover: (asset: Asset) => { setActivePage('handover', { prefillData: asset }); setPreviewData(null); },
      onInitiateDismantle: (asset: Asset) => { setActivePage('customer-dismantle', { prefillData: asset }); setPreviewData(null); },
      onInitiateInstallation: (asset: Asset) => { setActivePage('customer-installation-form', { prefillAsset: asset.id }); setPreviewData(null); },
      onInitiateRegistrationFromRequest: (request: Request, itemToRegister: any) => { setActivePage('registration', { prefillData: { request, itemToRegister } }); },
      onInitiateHandoverFromRequest: (request: Request) => { setActivePage('handover', { prefillData: request }); },
      onInitiateHandoverFromLoan: (loanRequest: LoanRequest) => { setActivePage('handover', { prefillData: loanRequest }); },
      onReportDamage: () => { setActivePage('stock'); },
      onStartRepair: () => setActivePage('repair'),
      onMarkAsRepaired: () => setActivePage('repair'),
      onDecommission: () => setActivePage('repair'),
      onReceiveFromRepair: () => setActivePage('repair'),
      onAddProgressUpdate: () => setActivePage('repair'),
      onEditItem: (data: PreviewData) => {
          setPreviewData(null);
          if (data.type === 'asset') {
             setActivePage('registration', { itemToEdit: { type: 'asset', id: data.id } }); 
          }
          if (data.type === 'customer') setActivePage('customer-edit', { customerId: data.id });
      }
  };

  if (isDataLoading) {
    return (
        <>
            <FullPageLoader message="Sinkronisasi Database..." />
            <PageSkeleton />
        </>
    );
  }

  const staffRestrictedPages: Page[] = [
    "registration", "repair", "customers", "customer-new", "customer-edit",
    "pengaturan-pengguna", "user-form", "division-form", "kategori",
  ];

  const renderPage = () => {
    if (currentUser.role === "Staff" && staffRestrictedPages.includes(activePage)) {
      return <PermissionDeniedPage />;
    }

    switch (activePage) {
      case "dashboard":
        return <DashboardPage currentUser={currentUser} setActivePage={setActivePage} onShowPreview={handleShowPreview} />;
      
      case "request":
      case "request-pinjam":
        return (
          <RequestHubPage
            activePage={activePage}
            currentUser={currentUser}
            setActivePage={setActivePage}
            onShowPreview={handleShowPreview}
            onInitiateRegistration={navigationActions.onInitiateRegistrationFromRequest}
            onInitiateHandoverFromRequest={navigationActions.onInitiateHandoverFromRequest}
            onInitiateHandoverFromLoan={navigationActions.onInitiateHandoverFromLoan}
            initialFilters={pageInitialState}
            onClearInitialFilters={clearPageInitialState}
            setIsGlobalScannerOpen={setIsGlobalScannerOpen}
            setScanContext={setScanContext}
            setFormScanCallback={setFormScanCallback}
          />
        );

      case "registration":
        return (
          <ItemRegistration
            currentUser={currentUser}
            setActivePage={setActivePage}
            onShowPreview={handleShowPreview}
            initialFilters={pageInitialState}
            onClearInitialFilters={clearPageInitialState}
            prefillData={pageInitialState?.prefillData}
            onClearPrefill={clearPageInitialState}
            onInitiateHandover={navigationActions.onInitiateHandover}
            onInitiateDismantle={navigationActions.onInitiateDismantle}
            onInitiateInstallation={navigationActions.onInitiateInstallation}
            assetToViewId={null}
            itemToEdit={pageInitialState?.itemToEdit || null}
            onClearItemToEdit={clearPageInitialState}
            setIsGlobalScannerOpen={setIsGlobalScannerOpen}
            setScanContext={setScanContext}
            setFormScanCallback={setFormScanCallback}
          />
        );

      case "handover":
        return (
          <ItemHandoverPage
            currentUser={currentUser}
            onShowPreview={handleShowPreview}
            initialFilters={pageInitialState}
            onClearInitialFilters={clearPageInitialState}
            prefillData={pageInitialState?.prefillData}
            onClearPrefill={clearPageInitialState}
          />
        );

      case "stock":
        return (
          <StockOverviewPage
            currentUser={currentUser}
            setActivePage={setActivePage}
            onShowPreview={handleShowPreview}
            initialFilters={pageInitialState}
            onClearInitialFilters={clearPageInitialState}
            onReportDamage={() => {}}
          />
        );

      case "repair":
        return (
          <RepairManagementPage
            currentUser={currentUser}
            onShowPreview={handleShowPreview}
            onStartRepair={() => {}} onAddProgressUpdate={() => {}} onReceiveFromRepair={() => {}} onCompleteRepair={() => {}} onDecommission={() => {}}
          />
        );
      
      case "return-form": {
        const loanRequestForReturn = useRequestStore.getState().loanRequests.find(lr => lr.id === pageInitialState?.loanId);
        const assetToReturn = useAssetStore.getState().assets.find(a => a.id === pageInitialState?.assetId);
        return (
             <ReturnAssetFormPage 
                currentUser={currentUser}
                onCancel={() => setActivePage('stock')}
                loanRequest={loanRequestForReturn}
                assetToReturn={assetToReturn}
             />
        );
      }
        
      case "return-detail": {
          const returnDocument = useRequestStore.getState().returns.find(r => r.id === pageInitialState?.returnId);
          const loanRequestForDetail = returnDocument ? useRequestStore.getState().loanRequests.find(lr => lr.id === returnDocument.loanRequestId) : undefined;
          const assetForDetail = returnDocument ? useAssetStore.getState().assets.find(a => a.id === returnDocument.assetId) : undefined;
          
          return (
              <ReturnAssetFormPage
                currentUser={currentUser}
                onCancel={() => setActivePage('request-pinjam')}
                isReadOnly={true}
                returnDocument={returnDocument}
                loanRequest={loanRequestForDetail}
                assetToReturn={assetForDetail}
              />
          );
      }

      case "customers":
      case "customer-new":
      case "customer-edit":
      case "customer-installation-form":
      case "customer-maintenance-form":
      case "customer-dismantle":
      case "customer-detail":
        return (
          <CustomerManagementPage
            subPage={
              activePage === 'customers' ? 'list' :
              activePage === 'customer-new' ? 'new' :
              activePage === 'customer-edit' ? 'edit' :
              activePage === 'customer-installation-form' ? 'installation' :
              activePage === 'customer-maintenance-form' ? 'maintenance' :
              activePage === 'customer-dismantle' ? 'dismantle' : 'detail'
            }
            currentUser={currentUser}
            setActivePage={setActivePage}
            onShowPreview={handleShowPreview}
            pageInitialState={pageInitialState}
            prefillData={pageInitialState?.prefillData}
            onClearPrefill={clearPageInitialState}
            onInitiateDismantle={navigationActions.onInitiateDismantle}
          />
        );

      case "pengaturan-pengguna":
        return (
          <AccountsPage
            currentUser={currentUser}
            setActivePage={setActivePage}
            onShowPreview={handleShowPreview}
          />
        );

      case "user-form":
        return (
          <UserFormPage
            currentUser={currentUser}
            onCancel={() => setActivePage("pengaturan-pengguna")}
            editingUser={pageInitialState?.editingUser || null}
            onSave={() => {}}
          />
        );

      case "division-form":
        return (
          <DivisionFormPage
            onCancel={() => setActivePage("pengaturan-pengguna")}
            editingDivision={pageInitialState?.editingDivision || null}
            onSave={() => {}}
          />
        );
      
      case "user-detail":
        return (
           <UserDetailPage
             currentUser={currentUser}
             pageInitialState={pageInitialState}
             onBack={() => setActivePage("pengaturan-pengguna")}
             onEdit={() => setActivePage("user-form", { editingUser: useMasterDataStore.getState().users.find(u => u.id === pageInitialState?.userId) })}
             onShowAssetPreview={(id) => handleShowPreview({ type: 'asset', id })}
           />
        );
      
      case "division-detail":
         return (
            <DivisionDetailPage 
                pageInitialState={pageInitialState}
                onBack={() => setActivePage("pengaturan-pengguna")}
                onEdit={() => setActivePage("division-form", { editingDivisionId: pageInitialState?.divisionId })}
                onViewMember={(uid) => setActivePage('user-detail', { userId: uid })}
            />
         );

      case "pengaturan-akun":
        return (
          <ManageAccountPage
            currentUser={currentUser}
            onBack={() => setActivePage("dashboard")}
            onSave={async () => true}
          />
        );

      case "kategori":
        return (
          <CategoryManagementPage
            currentUser={currentUser}
          />
        );

      default:
        return <DashboardPage currentUser={currentUser} setActivePage={setActivePage} onShowPreview={handleShowPreview} />;
    }
  };

  return (
    <MainLayout
        currentUser={currentUser}
        onLogout={logout}
        setActivePage={setActivePage}
        onShowPreview={handleShowPreview}
        onOpenScanner={() => { setScanContext('global'); setIsGlobalScannerOpen(true); }}
        isGlobalScannerOpen={isGlobalScannerOpen}
        setIsGlobalScannerOpen={setIsGlobalScannerOpen}
        onScanSuccess={handleScanSuccess}
        previewData={previewData}
        setPreviewData={setPreviewData}
        previewActions={navigationActions}
    >
        {renderPage()}
    </MainLayout>
  );
};

const App: React.FC = () => {
  const currentUser = useAuthStore((state) => state.currentUser);
  const checkSession = useAuthStore((state) => state.checkSession);
  const [isHydrated, setIsHydrated] = useState(false);
  
  useEffect(() => {
      const checkHydration = setInterval(() => {
        if (useAuthStore.persist.hasHydrated() && useUIStore.persist.hasHydrated()) {
          setIsHydrated(true);
          clearInterval(checkHydration);
        }
      }, 50);

      checkSession();
      return () => clearInterval(checkHydration);
  }, [checkSession]);

  if (!isHydrated) {
    return <FullPageLoader message="Memulai Sistem..." />;
  }

  if (!currentUser) {
    return <LoginPage onLogin={async () => ({} as any)} />;
  }

  return <AppContent />;
};

const RootApp: React.FC = () => (
  <NotificationProvider>
    <App />
  </NotificationProvider>
);

export default RootApp;
