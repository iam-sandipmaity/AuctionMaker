'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import Loading from './ui/Loading';

export default function PageLoadingProvider({ children }: { children: React.ReactNode }) {
    const [isLoading, setIsLoading] = useState(true);
    const pathname = usePathname();

    useEffect(() => {
        setIsLoading(true);
        const startTime = Date.now();

        const timer = setTimeout(() => {
            const elapsed = Date.now() - startTime;
            const remaining = Math.max(0, 100 - elapsed);
            
            setTimeout(() => {
                setIsLoading(false);
            }, remaining);
        }, 0);

        return () => clearTimeout(timer);
    }, [pathname]);

    if (isLoading) {
        return (
            <div className="fixed inset-0 bg-background z-50 flex items-center justify-center">
                <Loading size="lg" text="Loading..." />
            </div>
        );
    }

    return <>{children}</>;
}
