'use client';

import React, { Component, ReactNode } from 'react';
import Card from './Card';
import Button from './Button';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error?: Error;
}

export default class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error('ErrorBoundary caught an error:', error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <div className="container section min-h-[60vh] flex items-center justify-center">
                    <Card className="p-8 max-w-2xl text-center">
                        <h2 className="mb-4 text-red-500">ERROR</h2>
                        <p className="font-mono text-lg text-muted mb-6">
                            Something went wrong. Please try again.
                        </p>
                        {this.state.error && (
                            <p className="font-mono text-xs text-muted mb-6 p-4 border-3 border-border bg-muted/10">
                                {this.state.error.message}
                            </p>
                        )}
                        <Button
                            variant="primary"
                            onClick={() => {
                                this.setState({ hasError: false, error: undefined });
                                window.location.reload();
                            }}
                        >
                            RELOAD PAGE
                        </Button>
                    </Card>
                </div>
            );
        }

        return this.props.children;
    }
}
