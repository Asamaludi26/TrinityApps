import React from 'react';
import { BsClipboardData } from 'react-icons/bs';

export const ProjectIcon: React.FC<{ className?: string }> = ({ className }) => (
  <BsClipboardData className={className} />
);
