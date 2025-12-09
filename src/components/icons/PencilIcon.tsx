import React from 'react';
import { BsPencil } from 'react-icons/bs';

export const PencilIcon: React.FC<{ className?: string }> = ({ className }) => (
  <BsPencil className={className} />
);
