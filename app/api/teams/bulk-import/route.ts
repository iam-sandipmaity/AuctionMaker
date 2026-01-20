import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db/prisma';

interface TeamImportData {
    name: string;
    shortName: string;
    color: string;
    logo?: string;
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

        const formData = await request.formData();
        const file = formData.get('file') as File;
        const auctionId = formData.get('auctionId') as string;

        if (!file) {
            return NextResponse.json(
                { success: false, error: 'No file provided' },
                { status: 400 }
            );
        }

        if (!auctionId) {
            return NextResponse.json(
                { success: false, error: 'Auction ID is required' },
                { status: 400 }
            );
        }

        // Verify user is the auction creator
        const auction = await prisma.auction.findUnique({
            where: { id: auctionId },
            select: { createdById: true, auctionType: true, teamBudget: true },
        });

        if (!auction) {
            return NextResponse.json(
                { success: false, error: 'Auction not found' },
                { status: 404 }
            );
        }

        if (auction.createdById !== session.user.id) {
            return NextResponse.json(
                { success: false, error: 'Only auction creator can import teams' },
                { status: 403 }
            );
        }

        if (auction.auctionType !== 'TEAM') {
            return NextResponse.json(
                { success: false, error: 'Can only import teams for team auctions' },
                { status: 400 }
            );
        }

        // Read file content
        const fileContent = await file.text();
        const fileName = file.name.toLowerCase();

        let teams: TeamImportData[] = [];

        // Parse based on file type
        if (fileName.endsWith('.json')) {
            try {
                const parsed = JSON.parse(fileContent);
                teams = Array.isArray(parsed) ? parsed : [parsed];
            } catch (jsonError: any) {
                return NextResponse.json(
                    { 
                        success: false, 
                        error: 'Invalid JSON format', 
                        details: [jsonError.message || 'Failed to parse JSON file. Please check your file syntax.']
                    },
                    { status: 400 }
                );
            }
        } else if (fileName.endsWith('.csv')) {
            try {
                teams = parseCSV(fileContent);
            } catch (csvError: any) {
                return NextResponse.json(
                    { 
                        success: false, 
                        error: 'Invalid CSV format', 
                        details: [csvError.message || 'Failed to parse CSV file. Please check your file format.']
                    },
                    { status: 400 }
                );
            }
        } else {
            return NextResponse.json(
                { success: false, error: 'Only JSON and CSV files are supported' },
                { status: 400 }
            );
        }

        // Validate teams data
        const validationErrors: string[] = [];
        teams.forEach((team, index) => {
            if (!team.name || team.name.trim() === '') {
                validationErrors.push(`Row ${index + 1}: Team name is required`);
            }
            if (!team.shortName || team.shortName.trim() === '') {
                validationErrors.push(`Row ${index + 1}: Short name is required`);
            }
            if (!team.color || team.color.trim() === '') {
                validationErrors.push(`Row ${index + 1}: Color code is required`);
            }
            // Validate hex color format
            if (team.color && !/^#[0-9A-Fa-f]{6}$/.test(team.color.trim())) {
                validationErrors.push(`Row ${index + 1}: Color must be a valid hex code (e.g., #FF0000)`);
            }
        });

        if (validationErrors.length > 0) {
            return NextResponse.json(
                { success: false, error: 'Validation errors', details: validationErrors },
                { status: 400 }
            );
        }

        const teamBudget = auction.teamBudget || 100;

        // Create teams in bulk
        const createdTeams = await Promise.all(
            teams.map(async (team) => {
                return prisma.team.create({
                    data: {
                        name: team.name.trim(),
                        shortName: team.shortName.trim(),
                        color: team.color.trim(),
                        logo: team.logo?.trim() || null,
                        budget: teamBudget,
                        totalBudget: teamBudget,
                        squadSize: 0,
                        auctionId,
                    },
                });
            })
        );

        return NextResponse.json({
            success: true,
            message: `Successfully imported ${createdTeams.length} teams`,
            data: {
                count: createdTeams.length,
                teams: createdTeams,
            },
        });
    } catch (error: any) {
        console.error('Bulk import error:', error);
        return NextResponse.json(
            { success: false, error: error.message || 'Failed to import teams' },
            { status: 500 }
        );
    }
}

function parseCSV(content: string): TeamImportData[] {
    const lines = content.trim().split('\n');
    if (lines.length < 2) {
        throw new Error('CSV file must contain headers and at least one data row');
    }

    // Parse headers
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    
    // Map headers to expected fields
    const headerMap: Record<string, string> = {
        'name': 'name',
        'team name': 'name',
        'teamname': 'name',
        'short name': 'shortName',
        'shortname': 'shortName',
        'short': 'shortName',
        'code': 'shortName',
        'color': 'color',
        'colour': 'color',
        'color code': 'color',
        'hex': 'color',
        'hex code': 'color',
        'logo': 'logo',
        'logo url': 'logo',
        'logourl': 'logo',
        'image': 'logo',
    };

    const teams: TeamImportData[] = [];

    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const values = line.split(',').map(v => v.trim());
        const team: any = {};

        headers.forEach((header, index) => {
            const field = headerMap[header];
            if (field && values[index]) {
                team[field] = values[index];
            }
        });

        if (team.name && team.shortName && team.color) {
            teams.push(team as TeamImportData);
        }
    }

    return teams;
}
