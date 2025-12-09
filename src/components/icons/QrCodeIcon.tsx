import React from 'react';
import { BsQrCodeScan } from 'react-icons/bs';

export const QrCodeIcon: React.FC<{ className?: string }> = ({ className }) => (
  <BsQrCodeScan className={className} />
);
