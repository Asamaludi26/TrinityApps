import React from 'react';
import { BsKey } from 'react-icons/bs';

export const KeyIcon: React.FC<{ className?: string }> = ({ className }) => (
  <BsKey className={className} />
);