import React from 'react';
import { BsJournalCheck } from 'react-icons/bs';

export const JournalCheckIcon: React.FC<{ className?: string }> = ({ className }) => (
  <BsJournalCheck className={className} />
);