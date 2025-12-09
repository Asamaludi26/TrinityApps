

import React from 'react';
import { BsLock } from 'react-icons/bs';

export const LockIcon: React.FC<{ className?: string; title?: string }> = ({ className, title }) => (
  <BsLock className={className} title={title} />
);
