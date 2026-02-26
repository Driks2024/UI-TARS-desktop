"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const prisma = new client_1.PrismaClient();
async function main() {
    const password = await bcryptjs_1.default.hash('Admin123!', 10);
    const userPassword = await bcryptjs_1.default.hash('User123!', 10);
    // Users
    const admin = await prisma.user.upsert({
        where: { email: 'admin@empresa.com' },
        update: {},
        create: {
            email: 'admin@empresa.com',
            name: 'Admin User',
            password: password,
            role: 'ADMIN',
        },
    });
    const user = await prisma.user.upsert({
        where: { email: 'user@empresa.com' },
        update: {},
        create: {
            email: 'user@empresa.com',
            name: 'Regular User',
            password: userPassword,
            role: 'USER',
        },
    });
    console.log({ admin, user });
    // Policy Rules
    // 1. Minimum Price (Example)
    await prisma.policyRule.create({
        data: {
            name: 'Minimum Price Check',
            type: 'MIN_PRICE',
            description: 'Checks if item price is above minimum allowed',
            definition: JSON.stringify({
                '1801.*': 6.50,
                '1801ca.*': 18.40,
                '1810.7021': 8.00,
                '1802.*': 27.20,
                '1804.7026': 30.40,
                '1804.7019': 112.00,
                '3803.6010': 12.00,
                '3803.6013': 12.00,
                '3803.6016': 12.00
            }),
            severity: 'BLOCK',
        },
    });
    // 2. Discount Rule
    await prisma.policyRule.create({
        data: {
            name: 'Total Discount Limit',
            type: 'DISCOUNT',
            description: 'Total order discount must not exceed 20%',
            definition: JSON.stringify({ max_percent: 20 }),
            severity: 'BLOCK',
        },
    });
    // 3. Payment Terms
    await prisma.policyRule.create({
        data: {
            name: 'Payment Terms Validation',
            type: 'PAYMENT_TERMS',
            description: 'Validates payment terms based on order total',
            definition: JSON.stringify({
                tiers: [
                    { max: 1000, max_installments: 1, max_days: 30 },
                    { max: 5000, max_installments: 3, max_days: 60 },
                    { max: 15000, max_installments: 4, max_days: 90 },
                    { max: 25000, max_installments: 5, max_days: 120 },
                    { max: 999999999, max_installments: 6, max_days: 120 }
                ]
            }),
            severity: 'BLOCK',
        },
    });
    // 4. Special Rule 4801
    await prisma.policyRule.create({
        data: {
            name: 'Special Rule 4801.*',
            type: 'SPECIAL_4801',
            description: 'Special rules for 4801.* items (allow 20% discount, min qty 10)',
            definition: JSON.stringify({
                prefix: '4801.',
                max_discount: 20,
                min_qty: 10
            }),
            severity: 'BLOCK'
        }
    });
    console.log('Seeded rules.');
}
main()
    .catch((e) => {
    console.error(e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
