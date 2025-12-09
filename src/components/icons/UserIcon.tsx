import React from 'react';
import { BsPerson } from 'react-icons/bs';

export const UserIcon: React.FC<{ className?: string }> = ({ className }) => (
  <BsPerson className={className} />
);