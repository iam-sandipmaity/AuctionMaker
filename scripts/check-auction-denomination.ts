import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkDenominations() {
    try {
        const auctions = await prisma.auction.findMany({
            select: {
                id: true,
                title: true,
                auctionType: true,
                currency: true,
                budgetDenomination: true,
                createdAt: true,
            },
            orderBy: { createdAt: 'desc' },
        });

        console.log('\n📊 All auctions:');
        console.log('===================\n');
        
        auctions.forEach((auction, index) => {
            console.log(`${index + 1}. ${auction.title}`);
            console.log(`   Type: ${auction.auctionType}`);
            console.log(`   Currency: ${auction.currency}`);
            console.log(`   Denomination: ${auction.budgetDenomination || 'NULL/EMPTY'}`);
            console.log('');
        });

        const nullDenominations = auctions.filter(a => a.auctionType === 'TEAM' && !a.budgetDenomination);
        if (nullDenominations.length > 0) {
            console.log(`⚠️  Found ${nullDenominations.length} TEAM auction(s) with NULL denomination\n`);
            console.log('🔧 Fixing...\n');
            
            for (const auction of nullDenominations) {
                const defaultDenomination = auction.currency === 'INR' ? 'Crores' : 'Million';
                await prisma.auction.update({
                    where: { id: auction.id },
                    data: { budgetDenomination: defaultDenomination },
                });
                console.log(`   ✅ Updated "${auction.title}" (${auction.currency}) → ${defaultDenomination}`);
            }
            console.log(`\n✅ Fixed ${nullDenominations.length} auction(s)`);
        } else {
            console.log('✅ All TEAM auctions have denominations set');
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

checkDenominations();
