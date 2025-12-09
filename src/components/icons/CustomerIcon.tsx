import React from 'react';
import { BsBuilding } from 'react-icons/bs';

export const CustomerIcon: React.FC<{ className?: string }> = ({ className }) => (
  <BsBuilding className={className} />
);
