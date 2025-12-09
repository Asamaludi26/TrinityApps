import React from 'react';
import { BsBell } from 'react-icons/bs';

export const BellIcon: React.FC<{ className?: string }> = ({ className }) => (
  <BsBell className={className} />
);
