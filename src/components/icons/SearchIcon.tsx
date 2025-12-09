import React from 'react';
import { BsSearch } from 'react-icons/bs';

export const SearchIcon: React.FC<{ className?: string }> = ({ className }) => (
  <BsSearch className={className} />
);
