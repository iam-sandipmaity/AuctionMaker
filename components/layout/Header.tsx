'use client';

import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import Button from '@/components/ui/Button';

export default function Header() {
    const { data: session } = useSession();

    return (
        <header className="border-b-3 border-border bg-background sticky top-0 z-50">
            <div className="container">
                <div className="flex items-center justify-between py-4">
                    <Link href="/" className="font-grotesk text-2xl font-bold hover:text-accent transition-colors">
                        AUCTION<span className="text-accent">MAKER</span>
                    </Link>

                    <nav className="flex items-center gap-6">
                        <Link href="/auction" className="font-grotesk font-bold hover:text-accent transition-colors">
                            AUCTIONS
                        </Link>

                        {session ? (
                            <>
                                <Link href="/admin" className="font-grotesk font-bold hover:text-accent transition-colors">
                                    ADMIN
                                </Link>
                                <div className="flex items-center gap-4 pl-4 border-l-3 border-border">
                                    <div className="text-right">
                                        <div className="font-mono text-sm text-muted">@{session.user.username}</div>
                                        <div className="font-mono text-lg font-bold text-accent">
                                            ${parseFloat(session.user.wallet).toFixed(2)}
                                        </div>
                                    </div>
                                    <Button variant="ghost" onClick={() => signOut()}>
                                        LOGOUT
                                    </Button>
                                </div>
                            </>
                        ) : (
                            <div className="flex gap-2">
                                <Link href="/login">
                                    <Button variant="secondary">LOGIN</Button>
                                </Link>
                                <Link href="/register">
                                    <Button variant="primary">REGISTER</Button>
                                </Link>
                            </div>
                        )}
                    </nav>
                </div>
            </div>
        </header>
    );
}
