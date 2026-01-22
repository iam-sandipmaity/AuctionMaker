import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function updateBudgetDenomination() {
    console.log('Updating budget denominations for existing auctions...');

    // Update auctions with currency "Crores" to have budgetDenomination "Crores"
    const croresResult = await prisma.auction.updateMany({
        where: {
            currency: 'Crores',
            budgetDenomination: null,
        },
        data: {
            budgetDenomination: 'Crores',
        },
    });

    console.log(`Updated ${croresResult.count} auctions with "Crores" denomination`);

    // Update auctions with currency "INR" to have budgetDenomination based on context
    // For INR auctions, we'll default to "Crores" for team auctions
    const inrResult = await prisma.auction.updateMany({
        where: {
            currency: 'INR',
            budgetDenomination: null,
            auctionType: 'TEAM',
        },
        data: {
            budgetDenomination: 'Crores',
        },
    });

    console.log(`Updated ${inrResult.count} INR team auctions with "Crores" denomination`);

    console.log('Done!');
}

updateBudgetDenomination()
    .catch((error) => {
        console.error('Error updating budget denominations:', error);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
