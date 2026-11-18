import React from 'react';
import { Card, Skeleton } from '@astryxdesign/core';

// Squelettes de chargement : composant Skeleton d'Astryx.
export const SkeletonBox = ({ className = 'h-4 w-full' }) => (
    <div className={className}><Skeleton width="100%" height="100%" /></div>
);

export const SkeletonCards = ({ count = 4 }) => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: count }).map((_, i) => (
            <Card key={i} variant="default">
                <div className="space-y-3">
                    <Skeleton width="45%" height={12} />
                    <Skeleton width={72} height={28} />
                    <Skeleton width="60%" height={12} />
                </div>
            </Card>
        ))}
    </div>
);

export const SkeletonTable = ({ rows = 5, cols = 6 }) => (
    <Card variant="default" padding={0}>
        <div className="p-4 flex gap-4 border-b border-stroke">
            {Array.from({ length: cols }).map((_, i) => (
                <div key={i} className="flex-1"><Skeleton width="100%" height={14} /></div>
            ))}
        </div>
        <div className="divide-y divide-stroke">
            {Array.from({ length: rows }).map((_, r) => (
                <div key={r} className="p-4 flex gap-4 items-center">
                    {Array.from({ length: cols }).map((_, c) => (
                        <div key={c} className="flex-1"><Skeleton width={c === 0 ? '70%' : '100%'} height={14} /></div>
                    ))}
                </div>
            ))}
        </div>
    </Card>
);
