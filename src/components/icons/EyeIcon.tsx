import React from 'react';
import { BsEye } from 'react-icons/bs';

export const EyeIcon: React.FC<{ className?: string }> = ({ className }) => (
  <BsEye className={className} />
);
