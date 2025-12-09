import React from 'react';
import { BsPrinter } from 'react-icons/bs';

export const PrintIcon: React.FC<{ className?: string }> = ({ className }) => (
  <BsPrinter className={className} />
);
