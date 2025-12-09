import React from 'react';
import { BsArchive } from 'react-icons/bs';

export const BoxIcon: React.FC<{ className?: string }> = ({ className }) => (
  <BsArchive className={className} />
);
