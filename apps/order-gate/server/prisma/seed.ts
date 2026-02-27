import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const password = await bcrypt.hash('Admin123!', 10);
  const userPassword = await bcrypt.hash('User123!', 10);

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

  // Price Catalog
  await prisma.priceCatalog.createMany({
    data: [
      { groupName: 'FG', prefix: '1801.', minPrice: 6.50, fullPrice: 9.43 },
      { groupName: 'CA', prefix: '1801ca.', minPrice: 18.40, fullPrice: 23.00 },
      { groupName: 'PM', prefix: '1801PM.', minPrice: 12.50 }, // fullPrice variable
      { sku: '1810.7021', minPrice: 8.00, fullPrice: 10.00 },
      { groupName: 'Discoflex', prefix: '1802.', minPrice: 27.20, fullPrice: 34.00 },
      { sku: '1804.7026', minPrice: 30.40, fullPrice: 38.00 },
      { sku: '1804.7019', minPrice: 112.00, fullPrice: 140.00 },
      { sku: '3803.6010', minPrice: 12.00, fullPrice: 15.00 },
      { sku: '3803.6013', minPrice: 12.00, fullPrice: 15.00 },
      { sku: '3803.6016', minPrice: 12.00, fullPrice: 15.00 },
    ]
  });

  console.log('Seeded rules and prices.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
