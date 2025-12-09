import React from 'react';
import { BsX } from 'react-icons/bs';

export const CloseIcon: React.FC<{ className?: string }> = ({ className }) => (
  <BsX className={className} />
);
