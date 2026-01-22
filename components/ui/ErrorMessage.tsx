interface ErrorMessageProps {
    message: string;
    onRetry?: () => void;
}

export default function ErrorMessage({ message, onRetry }: ErrorMessageProps) {
    return (
        <div className="p-4 border-3 border-red-500 bg-red-500/10">
            <p className="font-mono text-red-500 mb-2">{message}</p>
            {onRetry && (
                <button
                    onClick={onRetry}
                    className="font-mono text-sm text-red-500 hover:text-accent transition-colors underline"
                >
                    Try Again
                </button>
            )}
        </div>
    );
}
