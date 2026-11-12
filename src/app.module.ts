import { Module, ValidationPipe } from '@nestjs/common';
import { APP_PIPE } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';

import { ProductsModule } from './products/products.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ProductsModule,
  ],
  providers: [
    // Valida o corpo das requisições com os DTOs (class-validator) e
    // responde 400 quando os dados são inválidos.
    {
      provide: APP_PIPE,
      useValue: new ValidationPipe({
        whitelist: true, // remove campos que não estão no DTO
        forbidNonWhitelisted: true, // e responde 400 se eles forem enviados
      }),
    },
  ],
})
export class AppModule {}
