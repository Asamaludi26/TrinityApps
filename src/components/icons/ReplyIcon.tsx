import React from 'react';
import { BsReply } from 'react-icons/bs';

export const ReplyIcon: React.FC<{ className?: string }> = ({ className }) => (
  <BsReply className={className} />
);