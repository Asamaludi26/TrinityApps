import React from 'react';
import { BsXCircleFill } from 'react-icons/bs';

export const ErrorIcon: React.FC<{ className?: string }> = ({ className }) => (
  <BsXCircleFill className={className} />
);
