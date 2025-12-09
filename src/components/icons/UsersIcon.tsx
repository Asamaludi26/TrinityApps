import React from 'react';
import { BsPeople } from 'react-icons/bs';

export const UsersIcon: React.FC<{ className?: string }> = ({ className }) => (
  <BsPeople className={className} />
);
