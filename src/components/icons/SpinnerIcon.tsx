import React from 'react';
import { BsArrowRepeat } from 'react-icons/bs';

export const SpinnerIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5 animate-spin' }) => (
  <BsArrowRepeat className={className} />
);
