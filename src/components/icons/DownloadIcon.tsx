import React from 'react';
import { BsDownload } from 'react-icons/bs';

export const DownloadIcon: React.FC<{ className?: string }> = ({ className }) => (
  <BsDownload className={className} />
);
