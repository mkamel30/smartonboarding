import { PrismaBetterSQLite3 } from '@prisma/adapter-better-sqlite3';
import { PrismaClient } from '@prisma/client';

async function test() {
    try {
        console.log('Testing Prisma Adapter...');
        const factory = new PrismaBetterSQLite3({ url: 'file:./dev.db' });
        console.log('Factory created.');
        
        const adapter = await factory.connect();
        console.log('Adapter connected.');
        
        console.log('Adapter properties:', Object.keys(adapter));
        console.log('Adapter prototype properties:', Object.getOwnPropertyNames(Object.getPrototypeOf(adapter)));
        
        console.log('Methods check:');
        const methods = ['queryRaw', 'executeRaw', 'startTransaction', 'executeScript', 'dispose'];
        methods.forEach(m => {
            console.log(`- ${m}: ${typeof (adapter as any)[m]}`);
        });

        console.log('Attempting PrismaClient initialization...');
        const prisma = new (PrismaClient as any)({ adapter });
        console.log('PrismaClient initialized successfully!');
        
    } catch (e) {
        console.error('Test Failed:', e);
    }
}

test();
