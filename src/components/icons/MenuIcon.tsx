import React from 'react';
import { BsList } from 'react-icons/bs';

export const MenuIcon: React.FC<{ className?: string }> = ({ className }) => (
  <BsList className={className} />
);
