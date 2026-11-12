import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from './../src/app.module.js';
import { Prisma } from './../src/generated/prisma/client.js';
import { PrismaService } from './../src/prisma/prisma.service.js';

const mouse = {
  id: 1,
  sku: 'abc',
  name: 'Mouse',
  price: 89.9,
  createdAt: new Date(0).toISOString(),
};

const notFoundError = () =>
  new Prisma.PrismaClientKnownRequestError('No record was found', {
    code: 'P2025',
    clientVersion: 'test',
  });

describe('ProductsController (e2e)', () => {
  let app: INestApplication<App>;

  // PrismaService é substituído por um mock: o teste não precisa de banco.
  // Só o produto de id 1 "existe".
  const product = {
    findMany: async () => [mouse],
    findUnique: async ({ where }: { where: { id: number } }) =>
      where.id === 1 ? mouse : null,
    create: async ({ data }: { data: object }) => ({ ...mouse, id: 2, ...data }),
    update: async ({ where, data }: { where: { id: number }; data: object }) => {
      if (where.id !== 1) throw notFoundError();
      return { ...mouse, ...data };
    },
    delete: async ({ where }: { where: { id: number } }) => {
      if (where.id !== 1) throw notFoundError();
      return mouse;
    },
  };

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue({ product })
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('success', () => {
    it('GET /products', () =>
      request(app.getHttpServer()).get('/products').expect(200).expect([mouse]));

    it('GET /products/1', () =>
      request(app.getHttpServer()).get('/products/1').expect(200).expect(mouse));

    it('POST /products', () =>
      request(app.getHttpServer())
        .post('/products')
        .send({ name: 'Teclado', price: 149.9 })
        .expect(201)
        .expect((res) => expect(res.body).toMatchObject({ name: 'Teclado', price: 149.9 })));

    it('PUT /products/1', () =>
      request(app.getHttpServer())
        .put('/products/1')
        .send({ price: 79.9 })
        .expect(200)
        .expect((res) => expect(res.body.price).toBe(79.9)));

    it('DELETE /products/1', () =>
      request(app.getHttpServer()).delete('/products/1').expect(200));
  });

  describe('404 when the product does not exist', () => {
    it('GET /products/999', () =>
      request(app.getHttpServer()).get('/products/999').expect(404));

    it('PUT /products/999', () =>
      request(app.getHttpServer()).put('/products/999').send({ price: 1 }).expect(404));

    it('DELETE /products/999', () =>
      request(app.getHttpServer()).delete('/products/999').expect(404));
  });

  describe('400 for invalid input', () => {
    it.each(['get', 'put', 'delete'] as const)('%s /products/abc', async (method) => {
      await request(app.getHttpServer())[method]('/products/abc').expect(400);
    });

    it.each([
      ['missing price', { name: 'Sem preço' }],
      ['missing name', { price: 10 }],
      ['empty name', { name: '', price: 10 }],
      ['price as text', { name: 'X', price: 'caro' }],
      ['negative price', { name: 'X', price: -1 }],
      ['unknown field', { name: 'X', price: 10, sku: 'hack' }],
    ])('POST /products with %s', async (_case, body) => {
      await request(app.getHttpServer()).post('/products').send(body).expect(400);
    });

    it('PUT /products/1 with price as text', () =>
      request(app.getHttpServer()).put('/products/1').send({ price: 'caro' }).expect(400));
  });
});
