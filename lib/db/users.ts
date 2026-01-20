import prisma from './prisma';
import bcrypt from 'bcryptjs';
import { Decimal } from '@prisma/client/runtime/library';

export async function createUser(data: {
    email: string;
    password: string;
    name: string;
    username: string;
    initialBudget?: number;
}) {
    const hashedPassword = await bcrypt.hash(data.password, 10);
    const budget = data.initialBudget || 10000;

    return prisma.user.create({
        data: {
            email: data.email,
            password: hashedPassword,
            name: data.name,
            username: data.username,
            wallet: new Decimal(budget),
            totalBudget: new Decimal(budget),
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
            wallet: true,
            totalBudget: true,
            createdAt: true,
            updatedAt: true,
        },
    });
}

export async function updateUserWallet(userId: string, amount: Decimal) {
    return prisma.user.update({
        where: { id: userId },
        data: { wallet: amount },
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
