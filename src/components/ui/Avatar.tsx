import React from 'react';

interface AvatarProps {
  name: string;
  className?: string;
}

const colors = [
  'bg-red-500', 'bg-orange-500', 'bg-amber-500', 'bg-yellow-500', 
  'bg-lime-500', 'bg-green-500', 'bg-emerald-500', 'bg-teal-500', 
  'bg-cyan-500', 'bg-sky-500', 'bg-blue-500', 'bg-indigo-500', 
  'bg-violet-500', 'bg-purple-500', 'bg-fuchsia-500', 'bg-pink-500', 
  'bg-rose-500'
];

// Simple hash function to get a consistent color for a name
const getBgColor = (name: string) => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash % colors.length);
  return colors[index];
};


export const Avatar: React.FC<AvatarProps> = ({ name, className = 'w-10 h-10' }) => {
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const bgColor = getBgColor(name);

  return (
    <div
      className={`flex items-center justify-center rounded-full text-white font-semibold text-sm ${bgColor} ${className}`}
    >
      {initials}
    </div>
  );
};
