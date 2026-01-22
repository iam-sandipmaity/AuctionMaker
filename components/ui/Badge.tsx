import React from 'react';
import { UserStatus } from '@/types';

interface BadgeProps {
    status: UserStatus | 'live' | 'upcoming' | 'ended';
    children: React.ReactNode;
    className?: string;
}

export default function Badge({ status, children, className }: BadgeProps) {
    const statusClasses = {
        winning: 'badge-winning',
        outbid: 'badge-outbid',
        active: 'badge-active',
        live: 'badge-winning',
        upcoming: 'badge-active',
        ended: 'bg-muted text-foreground border-muted',
    };

    return (
        <span className={`badge ${statusClasses[status]} ${className || ''}`}>
            {children}
        </span>
    );
}
