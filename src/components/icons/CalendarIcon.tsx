import React from 'react';
import { BsCalendar } from 'react-icons/bs';

export const CalendarIcon: React.FC<{ className?: string }> = ({ className }) => (
  <BsCalendar className={className} />
);
