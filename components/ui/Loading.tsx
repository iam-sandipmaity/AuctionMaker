interface LoadingProps {
    size?: 'sm' | 'md' | 'lg';
    text?: string;
}

export default function Loading({ size = 'md', text }: LoadingProps) {
    const sizeClasses = {
        sm: 'w-6 h-6 border-2',
        md: 'w-10 h-10 border-3',
        lg: 'w-16 h-16 border-3',
    };

    return (
        <div className="flex flex-col items-center justify-center gap-4 py-8">
            <div 
                className={`${sizeClasses[size]} border-border border-t-accent rounded-full animate-spin`}
                style={{ borderStyle: 'solid' }}
            ></div>
            {text && (
                <p className="font-mono text-sm text-muted animate-pulse">
                    {text}
                </p>
            )}
        </div>
    );
}
