import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { getUserByEmail, verifyPassword } from '@/lib/db/users';

export const authOptions: NextAuthOptions = {
    providers: [
        CredentialsProvider({
            name: 'Credentials',
            credentials: {
                email: { label: 'Email', type: 'email' },
                password: { label: 'Password', type: 'password' },
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) {
                    throw new Error('Invalid credentials');
                }

                const user = await getUserByEmail(credentials.email);

                if (!user) {
                    throw new Error('No user found with this email');
                }

                const isValid = await verifyPassword(credentials.password, user.password);

                if (!isValid) {
                    throw new Error('Invalid password');
                }

                return {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    username: user.username,
                    wallet: user.wallet.toString(),
                };
            },
        }),
    ],
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.id = user.id;
                token.username = user.username;
                token.wallet = user.wallet;
            }
            return token;
        },
        async session({ session, token }) {
            if (session.user) {
                session.user.id = token.id as string;
                session.user.username = token.username as string;
                session.user.wallet = token.wallet as string;
            }
            return session;
        },
    },
    pages: {
        signIn: '/login',
    },
    session: {
        strategy: 'jwt',
    },
    secret: process.env.NEXTAUTH_SECRET,
};
