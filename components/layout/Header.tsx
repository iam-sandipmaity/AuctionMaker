'use client';

import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import { useState } from 'react';
import Button from '@/components/ui/Button';

export default function Header() {
    const { data: session } = useSession();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    return (
        <header className="border-b-3 border-border bg-background sticky top-0 z-50">
            <div className="container">
                <div className="flex items-center justify-between py-3 md:py-4">
                    {/* Logo */}
                    <Link href="/" className="font-grotesk text-xl md:text-2xl font-bold hover:text-accent transition-colors flex-shrink-0">
                        AUCTION<span className="text-accent">MAKER</span>
                    </Link>

                    {/* Mobile Menu Button */}
                    <button
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                        className="md:hidden border-3 border-border p-2 hover:border-accent transition-colors"
                        aria-label="Toggle menu"
                    >
                        <div className="w-6 h-5 flex flex-col justify-between">
                            <span className={`block h-0.5 w-full bg-foreground transition-transform ${mobileMenuOpen ? 'rotate-45 translate-y-2' : ''}`}></span>
                            <span className={`block h-0.5 w-full bg-foreground transition-opacity ${mobileMenuOpen ? 'opacity-0' : ''}`}></span>
                            <span className={`block h-0.5 w-full bg-foreground transition-transform ${mobileMenuOpen ? '-rotate-45 -translate-y-2' : ''}`}></span>
                        </div>
                    </button>

                    {/* Desktop Navigation */}
                    <nav className="hidden md:flex items-center gap-4 lg:gap-6">
                        <Link href="/auction" className="font-grotesk text-sm lg:text-base font-bold hover:text-accent transition-colors whitespace-nowrap">
                            AUCTIONS
                        </Link>

                        {session ? (
                            <>
                                <Link href="/profile" className="font-grotesk text-sm lg:text-base font-bold hover:text-accent transition-colors whitespace-nowrap">
                                    PROFILE
                                </Link>
                                <Link href="/admin" className="font-grotesk text-sm lg:text-base font-bold hover:text-accent transition-colors whitespace-nowrap">
                                    CREATE AUCTION
                                </Link>
                                <div className="flex items-center gap-3 lg:gap-4 pl-3 lg:pl-4 border-l-3 border-border">
                                    <div className="text-right">
                                        <div className="font-mono text-xs text-muted">@{session.user.username}</div>
                                        <div className="font-mono text-sm lg:text-lg font-bold text-accent">
                                            ${parseFloat(session.user.wallet).toFixed(2)}
                                        </div>
                                    </div>
                                    <Button variant="ghost" onClick={() => signOut()} className="text-sm lg:text-base px-3 lg:px-4 py-2">
                                        LOGOUT
                                    </Button>
                                </div>
                            </>
                        ) : (
                            <div className="flex gap-2">
                                <Link href="/login">
                                    <Button variant="secondary" className="text-sm lg:text-base px-3 lg:px-4 py-2">LOGIN</Button>
                                </Link>
                                <Link href="/register">
                                    <Button variant="primary" className="text-sm lg:text-base px-3 lg:px-4 py-2">REGISTER</Button>
                                </Link>
                            </div>
                        )}
                    </nav>
                </div>

                {/* Mobile Navigation */}
                {mobileMenuOpen && (
                    <nav className="md:hidden border-t-3 border-border py-4 space-y-4">
                        <Link 
                            href="/auction" 
                            className="block font-grotesk font-bold hover:text-accent transition-colors py-2"
                            onClick={() => setMobileMenuOpen(false)}
                        >
                            AUCTIONS
                        </Link>

                        {session ? (
                            <>
                                <Link 
                                    href="/auction" 
                                    className="block font-grotesk font-bold hover:text-accent transition-colors py-2"
                                    onClick={() => setMobileMenuOpen(false)}
                                >
                                    AUCTIONS
                                </Link>
                                <Link 
                                    href="/profile" 
                                    className="block font-grotesk font-bold hover:text-accent transition-colors py-2"
                                    onClick={() => setMobileMenuOpen(false)}
                                >
                                    PROFILE
                                </Link>
                                <Link 
                                    href="/admin" 
                                    className="block font-grotesk font-bold hover:text-accent transition-colors py-2"
                                    onClick={() => setMobileMenuOpen(false)}
                                >
                                    CREATE AUCTION
                                </Link>
                                <div className="border-t-3 border-border pt-4 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <span className="font-mono text-sm text-muted">@{session.user.username}</span>
                                        <span className="font-mono text-lg font-bold text-accent">
                                            ${parseFloat(session.user.wallet).toFixed(2)}
                                        </span>
                                    </div>
                                    <Button 
                                        variant="ghost" 
                                        onClick={() => {
                                            signOut();
                                            setMobileMenuOpen(false);
                                        }}
                                        className="w-full"
                                    >
                                        LOGOUT
                                    </Button>
                                </div>
                            </>
                        ) : (
                            <div className="flex flex-col gap-2">
                                <Link href="/login" onClick={() => setMobileMenuOpen(false)}>
                                    <Button variant="secondary" className="w-full">LOGIN</Button>
                                </Link>
                                <Link href="/register" onClick={() => setMobileMenuOpen(false)}>
                                    <Button variant="primary" className="w-full">REGISTER</Button>
                                </Link>
                            </div>
                        )}
                    </nav>
                )}
            </div>
        </header>
    );
}
