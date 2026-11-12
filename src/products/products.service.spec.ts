import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { ProductsService } from './products.service.js';

const notFoundError = () =>
  new Prisma.PrismaClientKnownRequestError('No record was found', {
    code: 'P2025',
    clientVersion: 'test',
  });

describe('ProductsService', () => {
  let service: ProductsService;
  const product = {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  };

  beforeEach(async () => {
    vi.resetAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        { provide: PrismaService, useValue: { product } },
      ],
    }).compile();

    service = module.get<ProductsService>(ProductsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('findOne returns the product when it exists', async () => {
    product.findUnique.mockResolvedValue({ id: 1, name: 'Mouse' });
    await expect(service.findOne(1)).resolves.toEqual({ id: 1, name: 'Mouse' });
  });

  it('findOne throws NotFoundException when the product does not exist', async () => {
    product.findUnique.mockResolvedValue(null);
    await expect(service.findOne(99)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('update throws NotFoundException when the product does not exist', async () => {
    product.update.mockRejectedValue(notFoundError());
    await expect(service.update(99, { price: 1 })).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('remove throws NotFoundException when the product does not exist', async () => {
    product.delete.mockRejectedValue(notFoundError());
    await expect(service.remove(99)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rethrows other database errors unchanged', async () => {
    const error = new Error('connection lost');
    product.delete.mockRejectedValue(error);
    await expect(service.remove(1)).rejects.toBe(error);
  });
});
