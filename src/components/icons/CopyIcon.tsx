import React from 'react';
import { BsClipboard } from 'react-icons/bs';

export const CopyIcon: React.FC<{ className?: string }> = ({ className }) => (
  <BsClipboard className={className} />
);
