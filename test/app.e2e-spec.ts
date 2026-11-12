import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from './../src/app.module.js';
import { PrismaService } from './../src/prisma/prisma.service.js';

const products = [
  { id: 1, sku: 'abc', name: 'Teclado', price: 99.9, createdAt: new Date(0).toISOString() },
];

describe('ProductsController (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    // PrismaService é substituído por um mock: o teste não precisa de banco.
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue({ product: { findMany: async () => products } })
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/products (GET)', () => {
    return request(app.getHttpServer())
      .get('/products')
      .expect(200)
      .expect(products);
  });

  afterEach(async () => {
    await app.close();
  });
});
