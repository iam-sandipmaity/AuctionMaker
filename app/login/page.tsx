'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';

export default function LoginPage() {
    const router = useRouter();
    const [formData, setFormData] = useState({
        email: '',
        password: '',
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const result = await signIn('credentials', {
                email: formData.email,
                password: formData.password,
                redirect: false,
            });

            if (result?.error) {
                setError(result.error);
            } else {
                router.push('/auction');
                router.refresh();
            }
        } catch (err) {
            setError('An error occurred. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container min-h-[80vh] flex items-center justify-center">
            <Card className="w-full max-w-md">
                <h2 className="mb-8 text-center">LOGIN</h2>

                {error && (
                    <div className="mb-6 p-4 border-3 border-red-500 bg-red-500/10">
                        <p className="font-mono text-red-500">{error}</p>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    <Input
                        label="Email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        required
                        placeholder="your@email.com"
                    />

                    <Input
                        label="Password"
                        type="password"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        required
                        placeholder="••••••••"
                    />

                    <Button
                        type="submit"
                        variant="primary"
                        className="w-full"
                        disabled={loading}
                    >
                        {loading ? 'LOGGING IN...' : 'LOGIN'}
                    </Button>
                </form>

                <div className="mt-6 text-center">
                    <p className="font-mono text-muted">
                        Don't have an account?{' '}
                        <Link href="/register" className="text-accent hover:underline">
                            Register here
                        </Link>
                    </p>
                </div>
            </Card>
        </div>
    );
}
