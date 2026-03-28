'use client';

import { useEffect, useState } from 'react';

type TeamLogoMarkProps = {
    team: {
        shortName: string;
        name?: string | null;
        color?: string | null;
        logo?: string | null;
    };
    size?: 'sm' | 'md' | 'lg';
    className?: string;
};

const SIZE_CLASSES: Record<NonNullable<TeamLogoMarkProps['size']>, string> = {
    sm: 'h-8 w-8 text-[10px]',
    md: 'h-10 w-10 text-xs',
    lg: 'h-12 w-12 text-sm',
};

export default function TeamLogoMark({ team, size = 'md', className = '' }: TeamLogoMarkProps) {
    const [imageFailed, setImageFailed] = useState(false);

    useEffect(() => {
        setImageFailed(false);
    }, [team.logo]);

    const fallbackText = (team.shortName || '?').slice(0, 4).toUpperCase();
    const borderColor = team.color || 'var(--border)';

    return (
        <div
            className={`flex shrink-0 items-center justify-center overflow-hidden border-2 bg-background font-mono font-bold uppercase ${SIZE_CLASSES[size]} ${className}`.trim()}
            style={{ borderColor, color: borderColor }}
            title={team.name || team.shortName}
        >
            {team.logo && !imageFailed ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                    src={team.logo}
                    alt={`${team.name || team.shortName} logo`}
                    className="h-full w-full object-contain p-1"
                    loading="lazy"
                    decoding="async"
                    onError={() => setImageFailed(true)}
                />
            ) : (
                <span className="leading-none">{fallbackText}</span>
            )}
        </div>
    );
}
