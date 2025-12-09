import React from 'react';
import { BsEnvelope } from 'react-icons/bs';

export const EnvelopeIcon: React.FC<{ className?: string }> = ({ className }) => (
  <BsEnvelope className={className} />
);