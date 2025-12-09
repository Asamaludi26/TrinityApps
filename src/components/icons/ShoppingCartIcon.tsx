import React from 'react';
import { BsCartCheck } from 'react-icons/bs';

export const ShoppingCartIcon: React.FC<{ className?: string }> = ({ className }) => (
  <BsCartCheck className={className} />
);
