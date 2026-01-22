import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createAuction, getAuctions } from '@/lib/db/auctions';
import { prisma } from '@/lib/db/prisma';
import { z } from 'zod';

const createAuctionSchema = z.object({
    title: z.string().min(3),
    description: z.string().min(10),
    auctionType: z.enum(['PRODUCT', 'TEAM']).default('PRODUCT'),
    startingPrice: z.number().positive(),
    minIncrement: z.number().positive(),
    duration: z.number().positive(), // in minutes
    maxParticipants: z.number().positive().optional(),
    currency: z.string().default('USD'),
    budgetDenomination: z.string().min(1).optional().or(z.literal('')).transform(val => val === '' ? undefined : val),
    imageUrl: z.string().url().optional(),
    // Team auction specific
    teamBudget: z.number().positive().optional(),
    minSquadSize: z.number().positive().optional(),
    maxSquadSize: z.number().positive().optional(),
});

export async function GET() {
    try {
        const auctions = await getAuctions();
        return NextResponse.json({ success: true, data: auctions });
    } catch {
        return NextResponse.json(
            { success: false, error: 'Failed to fetch auctions' },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
            );
        }

        // Verify user exists in database
        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
        });

        if (!user) {
            return NextResponse.json(
                { success: false, error: 'User not found. Please log out and log in again.' },
                { status: 401 }
            );
        }

        const body = await request.json();
        const validatedData = createAuctionSchema.parse(body);

        const now = new Date();
        const endTime = new Date(now.getTime() + validatedData.duration * 60 * 1000);

        const auctionData: any = {
            title: validatedData.title,
            description: validatedData.description,
            auctionType: validatedData.auctionType,
            startingPrice: validatedData.startingPrice,
            minIncrement: validatedData.minIncrement,
            startTime: now,
            endTime: endTime,
            maxParticipants: validatedData.maxParticipants,
            currency: validatedData.currency,
            budgetDenomination: validatedData.budgetDenomination || null,
            imageUrl: validatedData.imageUrl,
            createdById: session.user.id,
        };

        // Add team auction specific fields
        if (validatedData.auctionType === 'TEAM') {
            auctionData.teamBudget = validatedData.teamBudget;
            auctionData.minSquadSize = validatedData.minSquadSize;
            auctionData.maxSquadSize = validatedData.maxSquadSize;
            auctionData.status = 'UPCOMING'; // Team auctions start in UPCOMING status
            
            // Ensure team auctions have a budget denomination
            if (!auctionData.budgetDenomination) {
                // Set default based on currency
                if (validatedData.currency === 'INR') {
                    auctionData.budgetDenomination = 'Crores';
                } else {
                    auctionData.budgetDenomination = 'Million';
                }
            }
        }

        const auction = await createAuction(auctionData);

        return NextResponse.json(
            { success: true, data: auction },
            { status: 201 }
        );
    } catch (error: any) {
        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { success: false, error: error.errors[0].message },
                { status: 400 }
            );
        }

        console.error('Auction creation error:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to create auction' },
            { status: 500 }
        );
    }
}
