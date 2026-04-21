import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Starting seed...');

    // Clear existing data (Optional, handle with care)
    // await prisma.stageHistory.deleteMany({});
    // await prisma.onboardingRequest.deleteMany({});
    // await prisma.user.deleteMany({});
    // await prisma.branch.deleteMany({});

    // 1. Create Default Admin
    const adminPassword = 'Admin@2026';
    const adminHash = await bcrypt.hash(adminPassword, 12);

    const admin = await prisma.user.upsert({
        where: { username: 'admin' },
        update: {},
        create: {
            username: 'admin',
            fullName: 'مدير النظام الرئيسي',
            passwordHash: adminHash,
            role: 'ADMIN',
            isActive: true
        }
    });

    console.log(`✅ Default Admin created: admin / ${adminPassword}`);

    // 2. Create Example Branch (Optional, since Admin can add them)
    /*
    const mainBranch = await prisma.branch.upsert({
        where: { code: 'BR-001' },
        update: {},
        create: {
            name: 'الفرع الرئيسي',
            code: 'BR-001',
            governorate: 'القاهرة',
            address: 'شارع التسعين، التجمع الخامس',
            phone: '19000'
        }
    });
    console.log(`✅ Example Branch created: ${mainBranch.name}`);
    */

    console.log('✨ Seed completed successfully.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
