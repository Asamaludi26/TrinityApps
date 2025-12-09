
import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import { SpinnerIcon } from '../icons/SpinnerIcon';
import { CheckIcon } from '../icons/CheckIcon';
import { Asset, Customer, CustomerStatus } from '../../types';

interface InstallToCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  asset: Asset | null;
  customers: Customer[];
  onConfirm: (customerId: string) => void;
}

export const InstallToCustomerModal: React.FC<InstallToCustomerModalProps> = ({ isOpen, onClose, asset, customers, onConfirm }) => {
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen && customers.length > 0) {
      setSelectedCustomerId(
        customers.find((c) => c.status === CustomerStatus.ACTIVE)?.id ||
          customers[0].id
      );
    }
  }, [customers, isOpen]);

  const handleConfirm = () => {
    setIsLoading(true);
    setTimeout(() => {
      onConfirm(selectedCustomerId);
      setIsLoading(false);
      onClose();
    }, 1000);
  };

  if (!asset) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Pasang Aset ke Pelanggan"
      size="md"
      hideDefaultCloseButton={true}
      footerContent={
        <>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50"
          >
            Kembali
          </button>
          <button
            onClick={handleConfirm}
            disabled={!selectedCustomerId || isLoading}
            className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white rounded-lg shadow-sm bg-tm-primary hover:bg-tm-primary-hover disabled:bg-tm-primary/70"
          >
            {isLoading && <SpinnerIcon className="w-4 h-4 mr-2" />}
            Konfirmasi Pemasangan
          </button>
        </>
      }
    >
      <div className="space-y-4 text-sm">
        <p className="text-gray-600">Anda akan memasang aset berikut:</p>
        <div className="p-3 bg-gray-50 rounded-lg">
          <p className="font-semibold text-tm-dark">{asset.name}</p>
          <p className="text-xs text-gray-500">
            {asset.id} &bull; SN: {asset.serialNumber}
          </p>
        </div>
        <div>
          <label
            id="customer-listbox-label"
            className="block text-sm font-medium text-gray-700"
          >
            Pilih Pelanggan
          </label>
          <div
            role="listbox"
            aria-labelledby="customer-listbox-label"
            tabIndex={0}
            className="w-full h-48 mt-1 overflow-y-auto bg-white border border-gray-300 rounded-md shadow-sm custom-scrollbar focus:outline-none focus:ring-2 focus:ring-tm-accent"
          >
            {customers
              .filter((c) => c.status === CustomerStatus.ACTIVE)
              .map((c) => (
                <div
                  key={c.id}
                  role="option"
                  aria-selected={c.id === selectedCustomerId}
                  onClick={() => setSelectedCustomerId(c.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ")
                      setSelectedCustomerId(c.id);
                  }}
                  className={`flex items-center justify-between px-3 py-2 text-sm cursor-pointer transition-colors ${
                    c.id === selectedCustomerId
                      ? "bg-tm-primary text-white"
                      : "text-gray-900 hover:bg-tm-light"
                  }`}
                >
                  <span>
                    {c.name} ({c.id})
                  </span>
                  {c.id === selectedCustomerId && (
                    <CheckIcon className="w-5 h-5 text-white" />
                  )}
                </div>
              ))}
          </div>
        </div>
      </div>
    </Modal>
  );
};
