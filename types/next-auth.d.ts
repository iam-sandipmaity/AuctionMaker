import 'next-auth';

declare module 'next-auth' {
    interface User {
        id: string;
        username: string;
        preferredCurrency: string;
    }

    interface Session {
        user: {
            id: string;
            email: string;
            name: string;
            username: string;
            preferredCurrency: string;
        };
    }
}

declare module 'next-auth/jwt' {
    interface JWT {
        id: string;
        username: string;
        preferredCurrency: string;
    }
}
