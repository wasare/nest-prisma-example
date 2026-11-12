import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateProductDto } from './dto/create-product.dto.js';
import { UpdateProductDto } from './dto/update-product.dto.js';

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.product.findMany();
  }

  async findOne(id: number) {
    const product = await this.prisma.product.findUnique({
      where: { id },
    });

    if (!product) {
      throw this.notFound(id);
    }

    return product;
  }

  create(data: CreateProductDto) {
    return this.prisma.product.create({
      data,
    });
  }

  async update(id: number, data: UpdateProductDto) {
    try {
      return await this.prisma.product.update({
        where: { id },
        data,
      });
    } catch (error) {
      throw this.translateError(error, id);
    }
  }

  async remove(id: number) {
    try {
      return await this.prisma.product.delete({
        where: { id },
      });
    } catch (error) {
      throw this.translateError(error, id);
    }
  }

  private notFound(id: number) {
    return new NotFoundException(`Produto ${id} não encontrado`);
  }

  // P2025: o registro que deveria ser alterado/removido não existe.
  private translateError(error: unknown, id: number) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2025'
    ) {
      return this.notFound(id);
    }
    return error;
  }
}
