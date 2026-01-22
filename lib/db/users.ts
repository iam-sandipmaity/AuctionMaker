import prisma from './prisma';
import bcrypt from 'bcryptjs';

export async function createUser(data: {
    email: string;
    password: string;
    name: string;
    username: string;
    preferredCurrency?: string;
}) {
    const hashedPassword = await bcrypt.hash(data.password, 10);

    return prisma.user.create({
        data: {
            email: data.email,
            password: hashedPassword,
            name: data.name,
            username: data.username,
            preferredCurrency: data.preferredCurrency || 'USD',
        },
    });
}

export async function getUserByEmail(email: string) {
    return prisma.user.findUnique({
        where: { email },
    });
}

export async function getUserById(id: string) {
    return prisma.user.findUnique({
        where: { id },
        select: {
            id: true,
            email: true,
            name: true,
            username: true,
            preferredCurrency: true,
            createdAt: true,
            updatedAt: true,
        },
    });
}

export async function getUserBids(userId: string) {
    return prisma.bid.findMany({
        where: { userId },
        include: {
            auction: true,
        },
        orderBy: {
            timestamp: 'desc',
        },
    });
}

export async function verifyPassword(password: string, hashedPassword: string) {
    return bcrypt.compare(password, hashedPassword);
}
