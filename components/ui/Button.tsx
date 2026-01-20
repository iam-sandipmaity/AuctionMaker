import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'ghost';
    children: React.ReactNode;
}

export default function Button({
    variant = 'secondary',
    children,
    className = '',
    ...props
}: ButtonProps) {
    const baseClasses = 'btn';
    const variantClasses = {
        primary: 'btn-primary',
        secondary: '',
        ghost: 'border-0 hover:bg-transparent hover:text-accent',
    };

    return (
        <button
            className={`${baseClasses} ${variantClasses[variant]} ${className}`}
            {...props}
        >
            {children}
        </button>
    );
}
