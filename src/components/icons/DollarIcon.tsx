import React from 'react';
import { BsCurrencyDollar } from 'react-icons/bs';

export const DollarIcon: React.FC<{ className?: string }> = ({ className }) => (
  <BsCurrencyDollar className={className} />
);
