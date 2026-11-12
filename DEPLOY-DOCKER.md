# Deploy com Docker Compose

Este guia mostra o deploy do projeto com **Docker Compose**. Ele assume que o projeto já está pronto, conforme o [README](README.md).

O projeto inclui um deploy completo com **Docker Compose**: banco PostgreSQL, aplicação de migrations e a API.

## 1. Arquivos envolvidos

| Arquivo | Função |
| --- | --- |
| `Dockerfile` | Build da imagem em 3 etapas: `build`, `migrator` e `runtime` |
| `.dockerignore` | Impede que `node_modules`, `dist` e arquivos `.env` entrem na imagem |
| `compose.yaml` | Define os serviços `db`, `migrate`, `app` e `seed` |
| `docker.env.example` | Modelo do arquivo de variáveis |

## 2. Serviços

```text
db (saudável) ──> migrate (terminou com sucesso) ──> app
```

- **db**: imagem oficial `postgres:18-alpine`. Os dados ficam no volume `db_data`. A porta do banco **não** é exposta para fora, só os outros serviços acessam pela rede interna do Compose.
- **migrate**: executa `prisma migrate deploy` uma vez e termina. Se falhar, a aplicação **não sobe**.
- **app**: a API NestJS, exposta na porta `APP_PORT` (padrão `3000`). Os logs são gravados no volume `app_logs` (`/app/logs/app.log`).
- **seed** (opcional): popula o banco com os 10 produtos de exemplo.

## 3. Criar o arquivo `docker.env`

Na raiz do projeto, crie o arquivo `docker.env` a partir do modelo.

macOS / Linux:

```bash
cp docker.env.example docker.env
```

Windows (`cmd`):

```cmd
copy docker.env.example docker.env
```

O `docker.env` é **externo** à aplicação e à imagem:

- está no `.gitignore`, então as senhas não vão para o Git;
- está no `.dockerignore`, então não é copiado para dentro da imagem Docker;
- é lido apenas pelo Docker Compose, através do parâmetro `--env-file`.

Edite o `docker.env` e troque a senha. Use **apenas letras e números** na senha, pois ela faz parte da URL de conexão.

```env
POSTGRES_USER=nest
POSTGRES_PASSWORD=troqueEstaSenha123
POSTGRES_DB=nest_prisma
APP_PORT=3000
```

A `DATABASE_URL` **não** é escrita à mão: o `compose.yaml` monta essa URL a partir dessas variáveis, sempre apontando para o serviço `db`. Assim o banco e a aplicação nunca ficam com credenciais diferentes.

## 4. Subir o sistema

Todos os comandos são executados **na raiz do projeto** (mesmos comandos no Windows, macOS e Linux):

```bash
docker compose --env-file docker.env up -d --build
```

> Se o `--env-file docker.env` for esquecido, o Compose para com a mensagem `defina POSTGRES_USER no docker.env (use --env-file docker.env)` e nada é criado. Isso vale para **todos** os comandos `docker compose` deste projeto, inclusive `ps`, `stop` e `logs`.

### Build sem cache

O `--build` reaproveita o cache do Docker, o que deixa o build rápido. Para refazer a imagem **do zero** (por exemplo, se algo parecer desatualizado ou o build se comportar de forma estranha):

```bash
docker compose --env-file docker.env build --no-cache --pull
docker compose --env-file docker.env up -d
```

- `--no-cache`: ignora o cache e executa todas as etapas do `Dockerfile` novamente.
- `--pull`: baixa a versão mais recente das imagens base (`node:24-alpine`).

O build sem cache **não afeta os dados**: o banco fica no volume `db_data`, que não faz parte da imagem.

Verificar os serviços:

```bash
docker compose --env-file docker.env ps -a
```

O resultado esperado é `db` e `app` como `healthy` e `migrate` como `Exited (0)`.

Testar a API:

```bash
curl http://localhost:3000/products
```

## 5. Popular o banco (opcional)

```bash
docker compose --env-file docker.env run --rm seed
```

O seed usa `upsert` pelo `sku`, então pode ser executado várias vezes sem duplicar produtos.

## 6. Como os dados são preservados

- Os dados do PostgreSQL ficam no **volume nomeado** `db_data`. Rebuild da imagem, `docker compose down` e novas versões da aplicação **não apagam** esse volume.
- O serviço `migrate` usa somente `prisma migrate deploy`, que:
  - aplica apenas as migrations **pendentes** da pasta `prisma/migrations`;
  - registra cada migration aplicada na tabela `_prisma_migrations`, então nada é aplicado duas vezes;
  - usa um *lock* no banco, impedindo duas migrações ao mesmo tempo;
  - **nunca** reseta o banco, **nunca** apaga dados e **nunca** cria migrations novas.
- Comandos de desenvolvimento como `prisma migrate dev`, `prisma migrate reset` e `prisma db push` **não** são usados no deploy.
- A aplicação só inicia depois que as migrations terminam com sucesso. Se uma migration falhar, a versão nova não sobe e o banco fica como estava antes dela.

## 7. Atualizar o sistema com uma migration nova

1. No ambiente de desenvolvimento, altere o `schema.prisma` e crie a migration:

   ```bash
   npx prisma migrate dev --name descricao-da-mudanca
   ```

2. Versione a pasta `prisma/migrations` no Git junto com o código.
3. No servidor, rode o mesmo comando de deploy:

   ```bash
   docker compose --env-file docker.env up -d --build
   ```

   O `migrate` aplica só a migration nova e a `app` é recriada em seguida.

> Nunca edite ou apague uma migration que já foi aplicada em produção. Para corrigir algo, crie uma migration nova.

## 8. Gerenciar os containers

Todos os comandos são executados na raiz do projeto.

### Ver o estado

```bash
# Lista os serviços e o estado de cada um (-a inclui o migrate, que já terminou)
docker compose --env-file docker.env ps -a
```

### Parar e iniciar

```bash
# Para os containers, sem removê-los
docker compose --env-file docker.env stop

# Inicia novamente os containers parados
docker compose --env-file docker.env start

# Reinicia só a aplicação
docker compose --env-file docker.env restart app
```

- O `start` respeita a ordem `db` → `migrate` → `app`. O `migrate` roda de novo, mas como não há migrations pendentes ele apenas mostra `No pending migrations to apply.`
- O `restart app` reinicia só a API, sem passar pelo `migrate`.
- Também é possível parar ou iniciar um serviço específico, por exemplo `stop app` ou `start app`.

### Remover os containers

```bash
# Para e REMOVE os containers e a rede (os volumes e os dados são mantidos)
docker compose --env-file docker.env down
```

Depois de um `down`, use `up -d` para criar os containers novamente.

| Comando | Containers | Dados (volumes) |
| --- | --- | --- |
| `stop` | parados, continuam existindo | mantidos |
| `down` | removidos | mantidos |
| `down -v` | removidos | **apagados** |

> **Atenção:** `docker compose down -v` apaga os volumes e, com eles, **todos os dados do banco**. Use apenas se quiser começar do zero.

### Logs

```bash
# Acompanhar os logs da aplicação em tempo real (Ctrl+C para sair)
docker compose --env-file docker.env logs -f app

# Ver os logs das migrations
docker compose --env-file docker.env logs migrate

# Ver o arquivo de log gravado no volume app_logs
docker compose --env-file docker.env exec app cat /app/logs/app.log
```

### Migrations

```bash
# Ver quais migrations já foram aplicadas no banco
docker compose --env-file docker.env run --rm migrate npx prisma migrate status
```

### Acessar o banco

```bash
# Abre o psql dentro do container do banco (\q para sair)
docker compose --env-file docker.env exec db sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"'
```
