import React from 'react';
import { BsFunnel } from 'react-icons/bs';

export const FilterIcon: React.FC<{ className?: string }> = ({ className }) => (
  <BsFunnel className={className} />
);
