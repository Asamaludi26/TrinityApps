
import React from 'react';
import { Page, User, Asset, PreviewData } from '../../types';
import CustomerListPage from './list/CustomerListPage';
import InstallationFormPage from './installation/InstallationFormPage';
import MaintenanceFormPage from './maintenance/MaintenanceFormPage';
import DismantleFormPage from './dismantle/DismantleFormPage';
import CustomerDetailPage from './detail/CustomerDetailPage';
import CustomerFormPage from './form/CustomerFormPage';

interface CustomerManagementHubProps {
    subPage: 'list' | 'installation' | 'maintenance' | 'dismantle' | 'detail' | 'new' | 'edit';
    currentUser: User;
    
    // Routing & Actions
    onInitiateDismantle: (asset: Asset) => void;
    onShowPreview: (data: PreviewData) => void;
    setActivePage: (page: Page, filters?: any) => void;
    
    // State Init
    prefillData?: any;
    onClearPrefill?: () => void;
    pageInitialState?: any;
}

const CustomerManagementPage: React.FC<CustomerManagementHubProps> = (props) => {
    const { subPage, currentUser, onInitiateDismantle, onShowPreview, setActivePage, prefillData, onClearPrefill, pageInitialState } = props;

    switch (subPage) {
        case 'list':
            return <CustomerListPage 
                        currentUser={currentUser}
                        onInitiateDismantle={onInitiateDismantle}
                        onShowPreview={onShowPreview}
                        setActivePage={setActivePage}
                        initialFilters={pageInitialState}
                    />;
        case 'new':
        case 'edit':
             return <CustomerFormPage
                        currentUser={currentUser}
                        setActivePage={setActivePage}
                        pageInitialState={pageInitialState}
                    />;
        case 'installation':
            return <InstallationFormPage 
                        currentUser={currentUser}
                        setActivePage={setActivePage}
                        pageInitialState={pageInitialState}
                        onShowPreview={onShowPreview}
                    />;
        case 'maintenance':
            return <MaintenanceFormPage 
                        currentUser={currentUser}
                        setActivePage={setActivePage}
                        pageInitialState={pageInitialState}
                        onShowPreview={onShowPreview}
                    />;
        case 'detail':
            return <CustomerDetailPage 
                        initialState={pageInitialState}
                        setActivePage={setActivePage}
                        onShowPreview={onShowPreview}
                        onInitiateDismantle={onInitiateDismantle}
                    />;
        case 'dismantle':
            return <DismantleFormPage
                        currentUser={currentUser}
                        prefillData={prefillData}
                        onClearPrefill={onClearPrefill!}
                        onShowPreview={onShowPreview}
                        setActivePage={setActivePage}
                        pageInitialState={pageInitialState}
                    />;
        default:
             return <CustomerListPage 
                        currentUser={currentUser}
                        onInitiateDismantle={onInitiateDismantle}
                        onShowPreview={onShowPreview}
                        setActivePage={setActivePage}
                        initialFilters={pageInitialState}
                    />;
    }
};

export default CustomerManagementPage;
