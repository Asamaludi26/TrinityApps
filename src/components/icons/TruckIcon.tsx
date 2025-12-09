import React from 'react';
import { BsTruck } from 'react-icons/bs';

export const TruckIcon: React.FC<{ className?: string }> = ({ className }) => (
  <BsTruck className={className} />
);
