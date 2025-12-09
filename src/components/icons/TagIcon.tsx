import React from 'react';
import { BsTag } from 'react-icons/bs';

export const TagIcon: React.FC<{ className?: string }> = ({ className }) => (
  <BsTag className={className} />
);
