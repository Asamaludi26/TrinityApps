import React from 'react';
import { BsSortDown } from 'react-icons/bs';

export const SortDescIcon: React.FC<{ className?: string }> = ({ className }) => (
  <BsSortDown className={className} />
);
