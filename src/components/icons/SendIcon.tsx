import React from 'react';
import { BsSend } from 'react-icons/bs';

export const SendIcon: React.FC<{ className?: string }> = ({ className }) => (
  <BsSend className={className} />
);