import React from 'react';

interface CardProps {
    children: React.ReactNode;
    className?: string;
    onClick?: (e: React.MouseEvent<HTMLDivElement>) => void;
    style?: React.CSSProperties;
}

export default function Card({ children, className = '', onClick, style }: CardProps) {
    return (
        <div
            className={`card p-6 ${onClick ? 'cursor-pointer' : ''} ${className}`}
            onClick={onClick}
            style={style}
        >
            {children}
        </div>
    );
}
