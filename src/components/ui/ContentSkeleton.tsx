
import React from 'react';
import { Skeleton } from './Skeleton';

export const ContentSkeleton: React.FC = () => {
  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-8 animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between gap-4">
        <div className="space-y-2">
          <Skeleton variant="text" width={250} height={40} className="bg-gray-200" />
          <Skeleton variant="text" width={180} height={20} className="bg-gray-200" />
        </div>
        <div className="flex gap-2">
          <Skeleton variant="rectangular" width={120} height={40} className="rounded-lg bg-gray-200" />
          <Skeleton variant="rectangular" width={120} height={40} className="rounded-lg bg-gray-200" />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} variant="rectangular" height={100} className="rounded-xl shadow-sm bg-gray-200" />
        ))}
      </div>

      <div className="bg-white border border-gray-100 rounded-2xl p-6 space-y-4 shadow-sm">
        <Skeleton variant="text" width={150} height={24} className="bg-gray-100" />
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} variant="rectangular" height={50} className="rounded-lg w-full bg-gray-50" />
          ))}
        </div>
      </div>
    </div>
  );
};
