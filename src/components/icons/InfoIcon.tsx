import React from 'react';
import { BsInfoCircle } from 'react-icons/bs';

export const InfoIcon: React.FC<{ className?: string }> = ({ className }) => (
  <BsInfoCircle className={className} />
);
