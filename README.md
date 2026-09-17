# Como recriar este projeto de exemplo passo a passo

Este guia apresenta, passo a passo, a criação de uma API utilizando:

- **NestJS**
- **Prisma 7**
- **PostgreSQL**
- **Prisma Adapter PostgreSQL**
- **CRUD de produtos**
- **Seed com `upsert`**
- **Configuração para build e deploy**

---

# 1. Criar o projeto NestJS

Abra uma nova janela do **VS Code**, sem nenhum projeto aberto.

## 1.1. Acessar a pasta `Documents`

No terminal (`cmd`):

```cmd
cd Documents
```

## 1.2. Instalar a CLI do NestJS

```cmd
npm i -g @nestjs/cli
```

## 1.3. Criar o projeto

```cmd
npx nest new nest-prisma
```

Durante a criação do projeto, selecione:

```text
npm
N
ESLint
```

## 1.4. Entrar na pasta do projeto

```cmd
cd nest-prisma
```

## 1.5. Abrir o projeto no VS Code

```cmd
code .
```

---

# 2. Instalar e configurar o Prisma 7

No terminal do VS Code:

## 2.1. Instalar o Prisma Client e o PostgreSQL Adapter

```cmd
npm install @prisma/client@7 @prisma/adapter-pg pg
```

## 2.2. Instalar o Prisma CLI e o `tsx`

```cmd
npm install -D prisma@7 tsx
```

## 2.3. Inicializar o Prisma

```cmd
npx prisma init
```

---

# 3. Configurar o `schema.prisma`

Abra o arquivo:

```text
prisma/schema.prisma
```

Acrescente o modelo `Product`:

```prisma
model Product {
  id        Int      @id @default(autoincrement())
  sku       String   @unique @default(uuid())
  name      String
  price     Float
  createdAt DateTime @default(now())
}
```

---

# 4. Gerar o Prisma Client

Execute:

```cmd
npx prisma generate
```

---

# 5. Configurar a conexão com o banco

Edite o arquivo:

```text
.env
```

Ajuste a variável `DATABASE_URL` de acordo com o seu banco PostgreSQL.

Exemplo:

```dotenv
DATABASE_URL="postgresql://usuario:senha@localhost:5432/nest_prisma"
```

---

# 6. Criar a migration

Execute:

```cmd
npx prisma migrate dev --name init
```

Caso seja necessário apagar o banco de desenvolvimento e recriar as migrations:

```cmd
npx prisma migrate reset
```

> **Atenção:** o comando `migrate reset` apaga os dados existentes no banco de desenvolvimento.

---

# 7. Criar o módulo Prisma

Gere o módulo:

```cmd
npx nest g module prisma
```

Gere o serviço:

```cmd
npx nest g service prisma
```

---

## 7.1. Arquivo `src/prisma/prisma.module.ts`

```typescript
import { Module } from '@nestjs/common';

import { PrismaService } from './prisma.service.js';

@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
```

O `PrismaService` é exportado para que outros módulos possam utilizá-lo.

---

## 7.2. Arquivo `src/prisma/prisma.service.ts`

```typescript
import {
  Injectable,
  OnModuleInit,
} from '@nestjs/common';

import { PrismaClient } from '../generated/prisma/client.js';

import { PrismaPg } from '@prisma/adapter-pg';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit
{
  constructor() {
    const connectionString =
      process.env.DATABASE_URL;

    if (!connectionString) {
      throw new Error(
        'DATABASE_URL não definida',
      );
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
```

---

# 8. Criar o módulo de produtos

Execute:

```cmd
npx nest g module products
```

---

## 8.1. Arquivo `src/products/products.module.ts`

```typescript
import { Module } from '@nestjs/common';

import { ProductsController } from './products.controller.js';

import { ProductsService } from './products.service.js';

import { PrismaModule } from '../prisma/prisma.module.js';

@Module({
  imports: [PrismaModule],
  controllers: [ProductsController],
  providers: [ProductsService],
})
export class ProductsModule {}
```

O `PrismaModule` é importado para disponibilizar o `PrismaService` no módulo de produtos.

---

# 9. Instalar e configurar o `ConfigModule`

Instale o pacote:

```cmd
npm install @nestjs/config
```

---

## 9.1. Arquivo `src/app.module.ts`

```typescript
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
```

A opção:

```typescript
isGlobal: true
```

permite utilizar o `ConfigModule` nos demais módulos da aplicação sem precisar importá-lo novamente.

---

# 10. Criar o serviço de produtos

Execute:

```cmd
npx nest g service products
```

---

## 10.1. Arquivo `src/products/products.service.ts`

```typescript
import { Injectable } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class ProductsService {
  constructor(
    private prisma: PrismaService,
  ) {}

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
```

---

# 11. Criar o controller de produtos

Execute:

```cmd
npx nest g controller products
```

---

## 11.1. Arquivo `src/products/products.controller.ts`

```typescript
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
    return this.productsService.findOne(
      Number(id),
    );
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
    return this.productsService.remove(
      Number(id),
    );
  }
}
```

---

# 12. Endpoints da API

O controller disponibiliza os seguintes endpoints:

| Método | Endpoint | Descrição |
|---|---|---|
| `GET` | `/products` | Lista todos os produtos |
| `GET` | `/products/:id` | Busca um produto pelo ID |
| `POST` | `/products` | Cria um produto |
| `PUT` | `/products/:id` | Atualiza um produto |
| `DELETE` | `/products/:id` | Remove um produto |

---

# 13. Criar o Seed

Crie o arquivo:

```text
prisma/seed.ts
```

O seed será utilizado para inserir inicialmente 10 produtos no banco de dados.

---

## 13.1. Arquivo `prisma/seed.ts`

```typescript
import 'dotenv/config';

import { PrismaClient } from '../src/generated/prisma/client.js';

import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({
  adapter,
});

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

  console.log(
    'Seed executada com sucesso!',
  );
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```

---

# 14. Como funciona o `upsert`

O `upsert` permite executar o seed várias vezes sem criar registros duplicados.

A lógica é:

```typescript
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
```

Se o `sku` já existir:

```text
UPDATE
```

Se o `sku` ainda não existir:

```text
CREATE
```

Dessa forma, o seed pode ser executado novamente sem duplicar os produtos.

---

# 15. Configurar o Prisma 7

Crie ou edite o arquivo:

```text
prisma7.config.ts
```

---

## 15.1. Arquivo `prisma7.config.ts`

```typescript
import 'dotenv/config';

import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',

  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },

  datasource: {
    url: process.env.DATABASE_URL,
  },
});
```

---

# 16. Executar o Seed

Depois de configurar o `prisma7.config.ts`, execute:

```cmd
npx prisma db seed
```

Se tudo estiver correto, será exibida uma mensagem semelhante a:

```text
Seed executada com sucesso!
```

---

# 17. Configurar o Build para Deploy

Para que o deploy ocorra corretamente, é necessário configurar o processo de build da aplicação.

A ideia é:

1. Executar o `prisma generate`.
2. Executar o build do NestJS.
3. Copiar os arquivos necessários do diretório `prisma` para o `dist`.

---

# 18. Configurar o `nest-cli.json`

Edite o arquivo:

```text
nest-cli.json
```

Utilize:

```json
{
  "$schema": "https://json.schemastore.org/nest-cli",
  "collection": "@nestjs/schematics",
  "sourceRoot": "src",
  "compilerOptions": {
    "deleteOutDir": true,
    "assets": [
      {
        "include": "../prisma/**/*",
        "outDir": "dist/prisma"
      }
    ]
  }
}
```

A configuração:

```json
"assets": [
  {
    "include": "../prisma/**/*",
    "outDir": "dist/prisma"
  }
]
```

faz com que os arquivos do diretório `prisma` sejam copiados para:

```text
dist/prisma
```

durante o processo de build.

---

# 19. Configurar o `package.json`

Edite o arquivo:

```text
package.json
```

Inclua ou ajuste os scripts:

```json
{
  "scripts": {
    "prisma:generate": "prisma generate",
    "build": "npm run prisma:generate && nest build"
  }
}
```

Mantenha os demais scripts existentes no `package.json`.

---

# 20. Executar o Build

Execute:

```cmd
npm run build
```

O processo será:

```text
npm run prisma:generate
        ↓
prisma generate
        ↓
nest build
        ↓
dist/
```

O Prisma Client será gerado antes da compilação da aplicação NestJS.

---

# 21. Executar a aplicação

Para executar a aplicação em modo de desenvolvimento:

```cmd
npm run start:dev
```

Por padrão, a aplicação estará disponível em:

```text
http://localhost:3000
```

---

# 22. Testar a API

## Listar produtos

```http
GET http://localhost:3000/products
```

## Buscar um produto

```http
GET http://localhost:3000/products/1
```

## Criar um produto

```http
POST http://localhost:3000/products
Content-Type: application/json

{
  "name": "Celular",
  "price": 1999.90
}
```

## Atualizar um produto

```http
PUT http://localhost:3000/products/1
Content-Type: application/json

{
  "name": "Notebook atualizado",
  "price": 3999.90
}
```

## Remover um produto

```http
DELETE http://localhost:3000/products/1
```

---

# 23. Estrutura final do projeto

Ao final, a estrutura do projeto será semelhante a:

```text
nest-prisma/
│
├── prisma/
│   ├── migrations/
│   │   └── ...
│   │
│   ├── schema.prisma
│   └── seed.ts
│
├── src/
│   │
│   ├── prisma/
│   │   ├── prisma.module.ts
│   │   └── prisma.service.ts
│   │
│   ├── products/
│   │   ├── products.controller.ts
│   │   ├── products.module.ts
│   │   └── products.service.ts
│   │
│   ├── app.module.ts
│   └── main.ts
│
├── generated/
│   └── prisma/
│       └── ...
│
├── .env
├── nest-cli.json
├── package.json
├── prisma7.config.ts
├── tsconfig.json
└── ...
```

---

# 24. Resumo dos principais comandos

## Criar o projeto

```cmd
cd Documents
npm i -g @nestjs/cli
npx nest new nest-prisma
cd nest-prisma
code .
```

## Instalar Prisma

```cmd
npm install @prisma/client@7 @prisma/adapter-pg pg
npm install -D prisma@7 tsx
```

## Inicializar Prisma

```cmd
npx prisma init
npx prisma generate
```

## Criar migration

```cmd
npx prisma migrate dev --name init
```

## Criar módulos, serviços e controller

```cmd
npx nest g module prisma
npx nest g service prisma

npx nest g module products
npx nest g service products
npx nest g controller products
```

## Instalar configuração

```cmd
npm install @nestjs/config
```

## Executar seed

```cmd
npx prisma db seed
```

## Executar aplicação

```cmd
npm run start:dev
```

## Gerar o build

```cmd
npm run build
```

---


# Projeto concluído

Ao finalizar todas as etapas, teremos uma API REST desenvolvida com **NestJS + Prisma 7 + PostgreSQL**, contendo:

- CRUD de produtos;
- integração com PostgreSQL;
- Prisma Client;
- `PrismaPg`;
- configuração de variáveis de ambiente;
- migrations;
- seed com 10 produtos;
- `upsert` para evitar duplicação;
- configuração do build;
- preparação para deploy.