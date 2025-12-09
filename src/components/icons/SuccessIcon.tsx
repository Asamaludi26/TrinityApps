import React from 'react';
import { BsCheckCircleFill } from 'react-icons/bs';

export const SuccessIcon: React.FC<{ className?: string }> = ({ className }) => (
  <BsCheckCircleFill className={className} />
);
