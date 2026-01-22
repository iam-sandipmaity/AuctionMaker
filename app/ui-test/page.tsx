'use client';

import { useState } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Badge from '@/components/ui/Badge';
import Link from 'next/link';

export default function UITestPage() {
    const [value, setValue] = useState('');

    return (
        <div className="container section">
            <div className="mb-12 px-4">
                <Link href="/" className="font-mono text-sm text-accent hover:text-foreground transition-colors mb-4 inline-block">
                    ← Back to Home
                </Link>
                <h1 className="mb-4">UI/UX TEST PAGE</h1>
                <p className="text-xl font-mono text-muted">
                    Test enhanced hover effects, focus states, and animations
                </p>
            </div>

            <div className="space-y-12 px-4">
                {/* Card Hover Effects */}
                <section>
                    <h2 className="mb-6">ENHANCED CARD HOVER EFFECTS</h2>
                    <div className="grid md:grid-cols-3 gap-6">
                        <Card className="p-6 hover-lift cursor-pointer">
                            <h3 className="mb-3 text-accent">HOVER LIFT</h3>
                            <p className="font-mono text-sm text-muted">
                                Hover to see smooth lift animation with shadow
                            </p>
                        </Card>
                        <Card className="p-6 hover-glow cursor-pointer">
                            <h3 className="mb-3 text-accent">HOVER GLOW</h3>
                            <p className="font-mono text-sm text-muted">
                                Hover to see pulsing glow effect
                            </p>
                        </Card>
                        <Card className="p-6 hover-tilt cursor-pointer">
                            <h3 className="mb-3 text-accent">HOVER TILT</h3>
                            <p className="font-mono text-sm text-muted">
                                Hover to see subtle 3D tilt effect
                            </p>
                        </Card>
                    </div>
                </section>

                {/* Button States */}
                <section>
                    <h2 className="mb-6">BUTTON INTERACTIVE STATES</h2>
                    <div className="flex flex-wrap gap-4">
                        <Button variant="primary" className="hover-scale">
                            PRIMARY BUTTON
                        </Button>
                        <Button variant="secondary" className="hover-scale">
                            SECONDARY BUTTON
                        </Button>
                        <Button variant="ghost" className="hover-scale">
                            GHOST BUTTON
                        </Button>
                        <Button variant="primary" disabled>
                            DISABLED BUTTON
                        </Button>
                    </div>
                    <p className="font-mono text-xs text-muted mt-4">
                        Try hovering, focusing (Tab key), and clicking these buttons
                    </p>
                </section>

                {/* Focus States */}
                <section>
                    <h2 className="mb-6">FOCUS STATES (Press Tab to Navigate)</h2>
                    <div className="space-y-4 max-w-md">
                        <Input
                            label="Focus Test Input"
                            type="text"
                            value={value}
                            onChange={(e) => setValue(e.target.value)}
                            placeholder="Tab here to see focus ring"
                        />
                        <div className="flex gap-2">
                            <button className="btn btn-primary focus-ring">
                                FOCUS ME
                            </button>
                            <button className="btn focus-ring">
                                THEN ME
                            </button>
                            <button className="btn focus-ring">
                                AND ME
                            </button>
                        </div>
                    </div>
                </section>

                {/* Badge Animations */}
                <section>
                    <h2 className="mb-6">ANIMATED BADGES</h2>
                    <div className="flex flex-wrap gap-3">
                        <Badge status="live" className="badge-pulse">LIVE</Badge>
                        <Badge status="upcoming" className="badge-bounce">UPCOMING</Badge>
                        <Badge status="ended" className="badge-fade">ENDED</Badge>
                    </div>
                </section>

                {/* Micro Interactions */}
                <section>
                    <h2 className="mb-6">MICRO-INTERACTIONS</h2>
                    <div className="grid md:grid-cols-2 gap-6">
                        <Card className="p-6">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-12 h-12 bg-accent border-3 border-border icon-bounce"></div>
                                <div>
                                    <h3 className="text-lg">Bouncing Icon</h3>
                                    <p className="font-mono text-xs text-muted">Subtle bounce on hover</p>
                                </div>
                            </div>
                        </Card>
                        <Card className="p-6">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-12 h-12 bg-accent border-3 border-border icon-rotate"></div>
                                <div>
                                    <h3 className="text-lg">Rotating Icon</h3>
                                    <p className="font-mono text-xs text-muted">Rotate on hover</p>
                                </div>
                            </div>
                        </Card>
                    </div>
                </section>

                {/* Page Transitions */}
                <section className="mb-16">
                    <h2 className="mb-6">PAGE TRANSITION DEMO</h2>
                    <Card className="p-6 fade-in-up">
                        <h3 className="mb-3">Fade In Up Animation</h3>
                        <p className="font-mono text-sm text-muted mb-4">
                            This card animates in with a fade and slide up effect
                        </p>
                        <div className="flex gap-2">
                            <Link href="/">
                                <Button variant="primary">Test Navigation →</Button>
                            </Link>
                        </div>
                    </Card>
                </section>
            </div>

            {/* CSS for Test Page */}
            <style jsx>{`
                .hover-lift {
                    transition: transform 0.3s ease, box-shadow 0.3s ease;
                }
                .hover-lift:hover {
                    transform: translateY(-8px);
                    box-shadow: 0 12px 0 var(--accent);
                }
                
                .hover-glow {
                    transition: box-shadow 0.3s ease;
                }
                .hover-glow:hover {
                    box-shadow: 0 0 20px 5px var(--accent);
                }
                
                .hover-tilt {
                    transition: transform 0.3s ease;
                }
                .hover-tilt:hover {
                    transform: perspective(1000px) rotateX(5deg) rotateY(-5deg);
                }
                
                .hover-scale {
                    transition: transform 0.2s ease;
                }
                .hover-scale:hover {
                    transform: scale(1.05);
                }
                
                .focus-ring:focus {
                    outline: 3px solid var(--accent);
                    outline-offset: 3px;
                }
                
                .badge-pulse {
                    animation: badge-pulse 2s infinite;
                }
                @keyframes badge-pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.7; }
                }
                
                .badge-bounce {
                    animation: badge-bounce 2s infinite;
                }
                @keyframes badge-bounce {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-3px); }
                }
                
                .badge-fade {
                    animation: badge-fade 3s infinite;
                }
                @keyframes badge-fade {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.5; }
                }
                
                .icon-bounce {
                    cursor: pointer;
                    transition: transform 0.3s ease;
                }
                .icon-bounce:hover {
                    animation: icon-bounce 0.6s ease;
                }
                @keyframes icon-bounce {
                    0%, 100% { transform: translateY(0); }
                    25% { transform: translateY(-10px); }
                    50% { transform: translateY(0); }
                    75% { transform: translateY(-5px); }
                }
                
                .icon-rotate {
                    cursor: pointer;
                    transition: transform 0.5s ease;
                }
                .icon-rotate:hover {
                    transform: rotate(360deg);
                }
                
                .fade-in-up {
                    animation: fade-in-up 0.6s ease-out;
                }
                @keyframes fade-in-up {
                    from {
                        opacity: 0;
                        transform: translateY(30px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
            `}</style>
        </div>
    );
}
