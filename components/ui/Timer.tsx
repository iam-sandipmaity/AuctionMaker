'use client';

import React, { useEffect, useState } from 'react';

interface TimerProps {
    endTime: Date;
    onExpire?: () => void;
}

export default function Timer({ endTime, onExpire }: TimerProps) {
    const [timeLeft, setTimeLeft] = useState<string>('');
    const [isUrgent, setIsUrgent] = useState(false);

    useEffect(() => {
        const updateTimer = () => {
            const now = new Date();
            const end = new Date(endTime);
            const diff = end.getTime() - now.getTime();

            if (diff <= 0) {
                setTimeLeft('ENDED');
                if (onExpire) onExpire();
                return;
            }

            // Check if less than 5 minutes
            setIsUrgent(diff < 5 * 60 * 1000);

            const hours = Math.floor(diff / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((diff % (1000 * 60)) / 1000);

            if (hours > 0) {
                setTimeLeft(`${hours}h ${minutes}m ${seconds}s`);
            } else if (minutes > 0) {
                setTimeLeft(`${minutes}m ${seconds}s`);
            } else {
                setTimeLeft(`${seconds}s`);
            }
        };

        updateTimer();
        const interval = setInterval(updateTimer, 1000);

        return () => clearInterval(interval);
    }, [endTime, onExpire]);

    return (
        <div
            className={`font-mono text-2xl font-bold ${isUrgent ? 'text-accent pulse-glow' : 'text-foreground'
                }`}
        >
            {timeLeft}
        </div>
    );
}
