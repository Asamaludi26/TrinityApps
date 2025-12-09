import React from 'react';
import { BsArrowDownUp } from 'react-icons/bs';

export const SortIcon: React.FC<{ className?: string }> = ({ className }) => (
  <BsArrowDownUp className={className} />
);
