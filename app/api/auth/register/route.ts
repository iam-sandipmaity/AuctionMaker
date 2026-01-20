import { NextRequest, NextResponse } from 'next/server';
import { createUser } from '@/lib/db/users';
import { z } from 'zod';

const registerSchema = z.object({
    email: z.string().email(),
    password: z.string().min(6),
    name: z.string().min(1),
    username: z.string().min(3),
    initialBudget: z.number().min(100).optional(),
});

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const validatedData = registerSchema.parse(body);

        const user = await createUser(validatedData);

        return NextResponse.json(
            {
                success: true,
                data: {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    username: user.username,
                },
            },
            { status: 201 }
        );
    } catch (error: any) {
        if (error.code === 'P2002') {
            return NextResponse.json(
                { success: false, error: 'Email or username already exists' },
                { status: 400 }
            );
        }

        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { success: false, error: error.errors[0].message },
                { status: 400 }
            );
        }

        return NextResponse.json(
            { success: false, error: 'Registration failed' },
            { status: 500 }
        );
    }
}
