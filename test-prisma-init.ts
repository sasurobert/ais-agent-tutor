import { PrismaClient } from '@prisma/client';
try {
    const prisma = new PrismaClient();
    console.log('PrismaClient initialized successfully!');
    process.exit(0);
} catch (e) {
    console.error('PrismaClient initialization failed:', e);
    process.exit(1);
}
