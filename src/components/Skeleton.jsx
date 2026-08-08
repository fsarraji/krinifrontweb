import React from 'react';

export const SkeletonBox = ({ className = 'h-4 w-full' }) => (
    <div className={`bg-slate-200/70 animate-pulse rounded-lg ${className}`} />
);

export const SkeletonCards = ({ count = 4 }) => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {Array.from({ length: count }).map((_, i) => (
            <div key={i} className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm space-y-3">
                <div className="flex justify-between items-center">
                    <SkeletonBox className="h-3 w-24" />
                    <SkeletonBox className="h-8 w-8 rounded-xl" />
                </div>
                <SkeletonBox className="h-8 w-20" />
                <SkeletonBox className="h-3 w-32" />
            </div>
        ))}
    </div>
);

export const SkeletonTable = ({ rows = 5, cols = 6 }) => (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-4 bg-slate-50/80 border-b border-slate-100 flex gap-4">
            {Array.from({ length: cols }).map((_, i) => (
                <SkeletonBox key={i} className="h-4 flex-1" />
            ))}
        </div>
        <div className="divide-y divide-slate-100">
            {Array.from({ length: rows }).map((_, r) => (
                <div key={r} className="p-4 flex gap-4 items-center">
                    {Array.from({ length: cols }).map((_, c) => (
                        <SkeletonBox key={c} className={`h-4 ${c === 0 ? 'w-1/3' : 'flex-1'}`} />
                    ))}
                </div>
            ))}
        </div>
    </div>
);

export default { SkeletonBox, SkeletonCards, SkeletonTable };
