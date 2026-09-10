Como recriar este projeto de exemplo passo a passo
---------------------------------------------------

Abra uma nova janela VS Code (sem projeto aberto)

No terminal (cmd):

> cd Documents


> npm i -g @nestjs/cli

> npx nest new nest-prisma
 npm ENTER
 N ENTER
 EMS ENTER

> cd nest-prisma
> code .

Na nova janela do VS Code

No terminal (cmd):

> npm install @prisma/client@7 @prisma/adapter-pg pg
> npm install -D prisma@7 tsx --save-dev

> npx prisma init

Editar o schema.prisma e acrescentar:

model Product {
  id        Int      @id @default(autoincrement())
  sku       String   @unique @default(uuid())
  name      String
  price     Float
  createdAt DateTime @default(now())
}


> npx prisma generate

Editar o .env e ajustar a variável DATABASE_URL


> npx prisma migrate dev --name init

Se necessário: npx prisma migrate reset

> npx nest g module prisma
> npx nest g service prisma

Arquivo prisma.module.ts:

import { Module } from '@nestjs/common';
import { PrismaService } from './prisma.service.js';

@Module({
  providers: [PrismaService],
  exports: [PrismaService], // NOVO
})
export class PrismaModule {}

Arquivo prisma.service.ts:

import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '../generated/prisma/client.js';
import { PrismaPg } from '@prisma/adapter-pg';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit
{
  constructor() {
    const connectionString = process.env.DATABASE_URL;

    if (!connectionString) {
      throw new Error('DATABASE_URL não definida');
    }

    const adapter = new PrismaPg({
      connectionString,
    });

    super({ adapter });
  }

  async onModuleInit() {
    await this.$connect();
  }
}



> npx nest g module products

Arquivo products.module.ts:

import { Module } from '@nestjs/common';
import { ProductsController } from './products.controller.js';
import { ProductsService } from './products.service.js';
import { PrismaModule } from '../prisma/prisma.module.js';

@Module({
  imports: [PrismaModule],
  controllers: [ProductsController],
  providers: [ProductsService]
})
export class ProductsModule {}



> npm install @nestjs/config

Arquivo app.module.ts:

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { ProductsModule } from './products/products.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ProductsModule,
  ],
})
export class AppModule {}

> npx nest g service products

Arquivo products.services.ts:

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.product.findMany();
  }

  findOne(id: number) {
    return this.prisma.product.findUnique({
      where: { id },
    });
  }

  create(data: {
    name: string;
    price: number;
  }) {
    return this.prisma.product.create({
      data,
    });
  }

  update(
    id: number,
    data: {
      name?: string;
      price?: number;
    },
  ) {
    return this.prisma.product.update({
      where: { id },
      data,
    });
  }

  remove(id: number) {
    return this.prisma.product.delete({
      where: { id },
    });
  }
}


> npx nest g controller products

Arquivo products.controller.ts:

import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
} from '@nestjs/common';

import { ProductsService } from './products.service.js';

@Controller('products')
export class ProductsController {
  constructor(
    private productsService: ProductsService,
  ) {}

  @Get()
  findAll() {
    return this.productsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.productsService.findOne(Number(id));
  }

  @Post()
  create(
    @Body()
    data: {
      name: string;
      price: number;
    },
  ) {
    return this.productsService.create(data);
  }

  @Put(':id')
  update(
    @Param('id') id: string,
    @Body()
    data: {
      name?: string;
      price?: number;
    },
  ) {
    return this.productsService.update(
      Number(id),
      data,
    );
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.productsService.remove(Number(id));
  }
}


Arquivo prisma/seed.ts

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


Arquivo prisma7.config.ts:

import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: 'tsx prisma/seed.ts', // NOVO
  },
  datasource: {
    url: process.env["DATABASE_URL"],
  },
});


> npx prisma db seed