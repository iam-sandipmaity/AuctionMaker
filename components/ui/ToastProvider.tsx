'use client';

import { createContext, useContext, useState, ReactNode } from 'react';
import Card from './Card';
import Button from './Button';

interface ToastContextType {
    showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
    showConfirm: (message: string, onConfirm: () => void) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export function useToast() {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within ToastProvider');
    }
    return context;
}

interface Toast {
    id: number;
    message: string;
    type: 'success' | 'error' | 'info';
}

interface ConfirmDialog {
    message: string;
    onConfirm: () => void;
}

export function ToastProvider({ children }: { children: ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([]);
    const [confirmDialog, setConfirmDialog] = useState<ConfirmDialog | null>(null);

    const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, message, type }]);
        
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, 4000);
    };

    const showConfirm = (message: string, onConfirm: () => void) => {
        setConfirmDialog({ message, onConfirm });
    };

    const handleConfirm = () => {
        if (confirmDialog) {
            confirmDialog.onConfirm();
            setConfirmDialog(null);
        }
    };

    const handleCancel = () => {
        setConfirmDialog(null);
    };

    return (
        <ToastContext.Provider value={{ showToast, showConfirm }}>
            {children}
            
            {/* Toast Notifications */}
            <div className="fixed top-4 right-4 z-[100] space-y-3 pointer-events-none">
                {toasts.map(toast => (
                    <div
                        key={toast.id}
                        className="pointer-events-auto animate-slideDown"
                    >
                        <Card 
                            className={`p-4 min-w-[300px] max-w-md ${
                                toast.type === 'success' ? 'border-accent bg-accent/10' :
                                toast.type === 'error' ? 'border-red-500 bg-red-500/10' :
                                'border-border bg-background'
                            }`}
                        >
                            <p className={`font-mono text-sm ${
                                toast.type === 'success' ? 'text-accent' :
                                toast.type === 'error' ? 'text-red-500' :
                                'text-foreground'
                            }`}>
                                {toast.message}
                            </p>
                        </Card>
                    </div>
                ))}
            </div>

            {/* Confirm Dialog */}
            {confirmDialog && (
                <div className="fixed inset-0 bg-background/90 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <Card className="p-6 max-w-md w-full animate-fadeIn">
                        <h3 className="text-xl mb-4 font-bold">CONFIRM ACTION</h3>
                        <p className="font-mono text-sm text-muted mb-6">
                            {confirmDialog.message}
                        </p>
                        <div className="flex gap-3">
                            <Button
                                variant="secondary"
                                onClick={handleCancel}
                                className="flex-1"
                            >
                                CANCEL
                            </Button>
                            <Button
                                variant="primary"
                                onClick={handleConfirm}
                                className="flex-1"
                            >
                                CONFIRM
                            </Button>
                        </div>
                    </Card>
                </div>
            )}
        </ToastContext.Provider>
    );
}
