import React from 'react';
import { BsTrash } from 'react-icons/bs';

export const TrashIcon: React.FC<{ className?: string }> = ({ className }) => (
  <BsTrash className={className} />
);
