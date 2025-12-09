import React from 'react';
import { BsExclamationTriangle } from 'react-icons/bs';

export const ExclamationTriangleIcon: React.FC<{ className?: string, title?: string }> = ({ className, title }) => (
  <BsExclamationTriangle className={className} title={title} />
);