import React from 'react';

export default function BlogLoading() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8 animate-pulse" dir="rtl">
      <div className="space-y-2">
        <div className="h-8 w-48 bg-white/10 rounded-xl" />
        <div className="h-4 w-72 bg-white/5 rounded-lg" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="bg-white/[0.03] border border-white/5 rounded-3xl overflow-hidden space-y-4 p-4">
            <div className="h-44 bg-white/5 rounded-2xl" />
            <div className="h-5 w-3/4 bg-white/10 rounded-lg" />
            <div className="h-3 w-full bg-white/5 rounded" />
            <div className="h-3 w-2/3 bg-white/5 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
