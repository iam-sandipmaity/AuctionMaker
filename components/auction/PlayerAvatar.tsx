'use client';

import { useEffect, useMemo, useState } from 'react';

type PlayerAvatarProps = {
    player: {
        name: string;
        imageUrl?: string | null;
        avatarUrl?: string | null;
    };
    size?: 'sm' | 'md' | 'lg' | 'xl';
    className?: string;
};

const SIZE_CLASSES: Record<NonNullable<PlayerAvatarProps['size']>, string> = {
    sm: 'h-8 w-8 text-[10px]',
    md: 'h-10 w-10 text-xs',
    lg: 'h-14 w-14 text-sm',
    xl: 'h-20 w-20 text-lg',
};

function getInitials(name: string) {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return 'P';
    return parts.slice(0, 2).map((part) => part[0]?.toUpperCase() || '').join('');
}

export default function PlayerAvatar({ player, size = 'md', className = '' }: PlayerAvatarProps) {
    const [imageFailed, setImageFailed] = useState(false);
    const imageSrc = player.avatarUrl || player.imageUrl || '';
    const initials = useMemo(() => getInitials(player.name), [player.name]);

    useEffect(() => {
        setImageFailed(false);
    }, [imageSrc]);

    return (
        <div
            className={`flex shrink-0 items-center justify-center overflow-hidden rounded-sm border-2 border-border bg-accent/10 font-mono font-bold text-accent ${SIZE_CLASSES[size]} ${className}`.trim()}
            title={player.name}
        >
            {imageSrc && !imageFailed ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                    src={imageSrc}
                    alt={`${player.name} avatar`}
                    className="h-full w-full object-cover"
                    loading="lazy"
                    decoding="async"
                    onError={() => setImageFailed(true)}
                />
            ) : (
                <span className="leading-none">{initials}</span>
            )}
        </div>
    );
}
