import React from 'react';
import { BsFileEarmarkText } from 'react-icons/bs';

export const FileSignatureIcon: React.FC<{ className?: string }> = ({ className }) => (
  <BsFileEarmarkText className={className} />
);
