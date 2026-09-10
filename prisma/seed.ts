import { PrismaClient } from '../src/generated/prisma/client.js';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({ adapter });

async function main() {
  const products = [
    {
      sku: '550e8400-e29b-41d4-a716-446655440001',
      name: 'Notebook',
      price: 3500.00,
    },
    {
      sku: '550e8400-e29b-41d4-a716-446655440002',
      name: 'Mouse',
      price: 89.90,
    },
    {
      sku: '550e8400-e29b-41d4-a716-446655440003',
      name: 'Teclado',
      price: 149.90,
    },
    {
      sku: '550e8400-e29b-41d4-a716-446655440004',
      name: 'Monitor',
      price: 1299.90,
    },
    {
      sku: '550e8400-e29b-41d4-a716-446655440005',
      name: 'Headset',
      price: 249.90,
    },
    {
      sku: '550e8400-e29b-41d4-a716-446655440006',
      name: 'Webcam',
      price: 299.90,
    },
    {
      sku: '550e8400-e29b-41d4-a716-446655440007',
      name: 'SSD 1TB',
      price: 599.90,
    },
    {
      sku: '550e8400-e29b-41d4-a716-446655440008',
      name: 'Memória RAM 16GB',
      price: 399.90,
    },
    {
      sku: '550e8400-e29b-41d4-a716-446655440009',
      name: 'Mouse Pad',
      price: 59.90,
    },
    {
      sku: '550e8400-e29b-41d4-a716-446655440010',
      name: 'Caixa de Som',
      price: 199.90,
    },
  ];

  for (const product of products) {
    await prisma.product.upsert({
      where: {
        sku: product.sku,
      },
      update: {
        name: product.name,
        price: product.price,
      },
      create: product,
    });
  }

  console.log('Seed executada com sucesso!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
