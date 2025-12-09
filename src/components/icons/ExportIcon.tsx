import React from 'react';
import { BsUpload } from 'react-icons/bs';

export const ExportIcon: React.FC<{ className?: string }> = ({ className }) => (
  <BsUpload className={className} />
);
