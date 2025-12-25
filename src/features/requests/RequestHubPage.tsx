
import React from 'react';
import { Page, User, Request, LoanRequest, ParsedScanResult } from '../../types';

import NewRequestPage from './new/NewRequestPage';
import LoanRequestPage from './loan/LoanRequestPage';

interface RequestHubPageProps {
    activePage: Page;
    currentUser: User;
    onInitiateRegistration: (request: Request, itemToRegister: any) => void;
    onInitiateHandoverFromRequest: (request: Request) => void;
    onInitiateHandoverFromLoan: (loanRequest: LoanRequest) => void;
    initialFilters?: any;
    onClearInitialFilters: () => void;
    onShowPreview: (data: any) => void;
    setActivePage: (page: Page, initialState?: any) => void;
    setIsGlobalScannerOpen: (isOpen: boolean) => void;
    setScanContext: (context: 'global' | 'form') => void;
    setFormScanCallback: (callback: ((data: ParsedScanResult) => void) | null) => void;
}

const RequestHubPage: React.FC<RequestHubPageProps> = (props) => {
    const { activePage } = props;

    switch (activePage) {
        case 'request':
            return (
                <NewRequestPage
                    currentUser={props.currentUser}
                    onInitiateRegistration={props.onInitiateRegistration}
                    onInitiateHandoverFromRequest={props.onInitiateHandoverFromRequest}
                    initialFilters={props.initialFilters}
                    onClearInitialFilters={props.onClearInitialFilters}
                    onShowPreview={props.onShowPreview}
                    setActivePage={props.setActivePage}
                />
            );
        case 'request-pinjam':
            return (
                <LoanRequestPage
                    currentUser={props.currentUser}
                    setActivePage={props.setActivePage}
                    onShowPreview={props.onShowPreview}
                    onInitiateHandoverFromLoan={props.onInitiateHandoverFromLoan}
                    initialFilters={props.initialFilters}
                    setIsGlobalScannerOpen={props.setIsGlobalScannerOpen}
                    setScanContext={props.setScanContext}
                    setFormScanCallback={props.setFormScanCallback}
                    assetCategories={[]} // Store handles this now
                />
            );
        default:
            return (
                <NewRequestPage
                    currentUser={props.currentUser}
                    onInitiateRegistration={props.onInitiateRegistration}
                    onInitiateHandoverFromRequest={props.onInitiateHandoverFromRequest}
                    initialFilters={props.initialFilters}
                    onClearInitialFilters={props.onClearInitialFilters}
                    onShowPreview={props.onShowPreview}
                    setActivePage={props.setActivePage}
                />
            );
    }
};

export default RequestHubPage;
