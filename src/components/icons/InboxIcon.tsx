import React from 'react';
import { BsInbox } from 'react-icons/bs';

export const InboxIcon: React.FC<{ className?: string }> = ({ className }) => (
  <BsInbox className={className} />
);
