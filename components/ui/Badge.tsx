import React from 'react';
import { UserStatus } from '@/types';

interface BadgeProps {
    status: UserStatus | 'live' | 'upcoming' | 'ended';
    children: React.ReactNode;
}

export default function Badge({ status, children }: BadgeProps) {
    const statusClasses = {
        winning: 'badge-winning',
        outbid: 'badge-outbid',
        active: 'badge-active',
        live: 'badge-winning',
        upcoming: 'badge-active',
        ended: 'bg-muted text-foreground border-muted',
    };

    return (
        <span className={`badge ${statusClasses[status]}`}>
            {children}
        </span>
    );
}
