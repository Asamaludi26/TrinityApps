import React from 'react';
import { Skeleton } from './Skeleton';

export const PageSkeleton: React.FC = () => {
  return (
    <div className="flex min-h-screen bg-tm-light">
      {/* Sidebar Skeleton */}
      <aside className="hidden md:flex flex-col w-64 bg-tm-dark p-4 space-y-6">
        <div className="flex items-center gap-3 mb-8">
          <Skeleton variant="circular" width={40} height={40} className="bg-gray-700" />
          <Skeleton variant="text" width={100} height={24} className="bg-gray-700" />
        </div>
        <div className="space-y-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} variant="rectangular" height={40} className="bg-gray-700/50 rounded-lg w-full" />
          ))}
        </div>
      </aside>

      {/* Main Content Skeleton */}
      <div className="flex-1 flex flex-col">
        {/* Header Skeleton */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6">
          <Skeleton variant="rectangular" width={200} height={32} className="rounded-lg" />
          <div className="flex items-center gap-4">
            <Skeleton variant="circular" width={32} height={32} />
            <Skeleton variant="circular" width={32} height={32} />
            <div className="flex items-center gap-2">
              <div className="text-right hidden sm:block">
                <Skeleton variant="text" width={80} />
                <Skeleton variant="text" width={60} />
              </div>
              <Skeleton variant="circular" width={32} height={32} />
            </div>
          </div>
        </header>

        {/* Content Area Skeleton */}
        <main className="p-4 sm:p-6 md:p-8 space-y-8">
          <div className="flex flex-col md:flex-row justify-between gap-4">
            <div className="space-y-2">
              <Skeleton variant="text" width={250} height={40} />
              <Skeleton variant="text" width={180} />
            </div>
            <div className="flex gap-2">
              <Skeleton variant="rectangular" width={120} height={40} className="rounded-lg" />
              <Skeleton variant="rectangular" width={120} height={40} className="rounded-lg" />
            </div>
          </div>

          {/* Stats Grid Skeleton */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} variant="rectangular" height={100} className="rounded-xl shadow-sm" />
            ))}
          </div>

          {/* Table/List Skeleton */}
          <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-4 shadow-sm">
            <Skeleton variant="text" width={150} height={24} />
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} variant="rectangular" height={60} className="rounded-lg w-full" />
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};