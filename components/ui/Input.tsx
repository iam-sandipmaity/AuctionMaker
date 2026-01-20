import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
    helpText?: string;
}

export default function Input({ label, error, helpText, className = '', ...props }: InputProps) {
    return (
        <div className="flex flex-col gap-2">
            {label && (
                <label className="font-mono text-sm uppercase tracking-wider">
                    {label}
                </label>
            )}
            <input
                className={`w-full ${error ? 'border-red-500' : ''} ${className}`}
                {...props}
            />
            {helpText && !error && (
                <span className="text-muted text-xs font-mono">{helpText}</span>
            )}
            {error && (
                <span className="text-red-500 text-sm font-mono">{error}</span>
            )}
        </div>
    );
}
