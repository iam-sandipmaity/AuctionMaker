import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { fetchPlayerCareerProfile } from '@/lib/auction/playerCareer';

const playerCareerSchema = z.object({
    playerName: z.string().min(2),
});

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { playerName } = playerCareerSchema.parse(body);
        const profile = await fetchPlayerCareerProfile(playerName);

        return NextResponse.json({
            success: true,
            data: profile,
        });
    } catch (error: any) {
        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { success: false, error: error.errors[0]?.message || 'Invalid request' },
                { status: 400 }
            );
        }

        return NextResponse.json(
            { success: false, error: error.message || 'Failed to load player career data' },
            { status: 500 }
        );
    }
}
