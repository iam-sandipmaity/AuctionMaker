import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkDenominations() {
    console.log('Checking budget denominations...\n');

    // Get all auctions
    const auctions = await prisma.auction.findMany({
        select: {
            id: true,
            title: true,
            currency: true,
            budgetDenomination: true,
            auctionType: true,
        },
    });

    console.log(`Found ${auctions.length} auctions:\n`);

    auctions.forEach(auction => {
        console.log(`ID: ${auction.id}`);
        console.log(`Title: ${auction.title}`);
        console.log(`Type: ${auction.auctionType}`);
        console.log(`Currency: ${auction.currency}`);
        console.log(`Denomination: ${auction.budgetDenomination || 'NULL/MISSING'}`);
        console.log('---');
    });

    // Count auctions with missing denominations
    const missingCount = auctions.filter(a => !a.budgetDenomination).length;
    console.log(`\nAuctions missing denomination: ${missingCount}`);

    // Update auctions with missing denomination based on currency
    if (missingCount > 0) {
        console.log('\nUpdating auctions with default denominations based on currency...');
        
        for (const auction of auctions) {
            if (!auction.budgetDenomination && auction.auctionType === 'TEAM') {
                let defaultDenom = 'Million';
                
                // Set sensible defaults based on currency
                if (auction.currency === 'INR') {
                    defaultDenom = 'Crores';
                } else if (auction.currency === 'USD' || auction.currency === 'EUR' || auction.currency === 'GBP') {
                    defaultDenom = 'Million';
                }
                
                await prisma.auction.update({
                    where: { id: auction.id },
                    data: { budgetDenomination: defaultDenom },
                });
                
                console.log(`Updated "${auction.title}" with denomination: ${defaultDenom}`);
            }
        }
        
        console.log('\nDone!');
    }
}

checkDenominations()
    .catch((error) => {
        console.error('Error:', error);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
