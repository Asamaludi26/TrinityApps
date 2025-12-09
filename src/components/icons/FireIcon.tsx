import React from 'react';
import { BsFire } from 'react-icons/bs';

export const FireIcon: React.FC<{ className?: string }> = ({ className }) => (
  <BsFire className={className} />
);