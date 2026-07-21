# 🤖 Agents & System Design (agents.md)

Este documento define a especificação técnica, o escopo de funcionalidades e o fluxo de agentes/serviços automáticos para o sistema de **Backlog de Jogos Cooperativo**.

---

## 1. Escopo do Produto

Aplicação web colaborativa para grupos de amigos gerenciarem backlogs de jogos.

### Funcionalidades principais

- **Autenticação:** Principalmente via **Discord OAuth**. Suporte secundário Email/Senha.
- **Grupos:** Criação de grupos privados + convite via código único.
- **Gestão de Backlog:**
  - Adicionar jogo colando link da Steam.
  - **Categorias/Tags**: Coop, Survival, FPS, RPG, Multiplayer, etc. (múltiplas por jogo).
  - **Status de Lançamento**: Indicação se já foi lançado + data.
  - Kanban com colunas: **Quero Jogar (Backlog)**, **Jogando Agora**, **Finalizados**.
- **Colaboração:** Todo membro (MEMBER ou OWNER) pode adicionar, remover, editar tags, mover jogos entre colunas e atualizar informações.
- **Preços Steam:** Atualização automática diária (manhã) via cron job.
- **Visual:** Cards com capa, preço atual/original/desconto (em destaque), tags de categoria, quem adicionou.

---

## 2. Arquitetura de Dados (PostgreSQL + Prisma)

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

model User {
  id            String         @id @default(cuid())
  discordId     String?        @unique // Principal identificador
  name          String
  email         String?        @unique
  avatarUrl     String?
  passwordHash  String?        // Opcional (fallback)
  memberships   GroupMember[]
  createdAt     DateTime       @default(now())
}

model Group {
  id          String         @id @default(cuid())
  name        String
  inviteCode  String         @unique
  members     GroupMember[]
  games       Game[]
  createdAt   DateTime       @default(now())
}

model GroupMember {
  id        String   @id @default(cuid())
  userId    String
  groupId   String
  role      String   @default("MEMBER") // OWNER, MEMBER
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  group     Group    @relation(fields: [groupId], references: [id], onDelete: Cascade)
  createdAt DateTime @default(now())

  @@unique([userId, groupId])
}

model Game {
  id              String   @id @default(cuid())
  groupId         String
  addedById       String
  steamAppId      String   @unique([groupId, steamAppId]) // Evita duplicados no grupo
  title           String
  imageUrl        String
  releaseDate     DateTime? // Data de lançamento (null = TBA)
  isReleased      Boolean  @default(false)

  // Preços em centavos (BRL)
  originalPrice   Int?
  currentPrice    Int?
  discountPercent Int      @default(0)

  status          String   @default("BACKLOG") // BACKLOG | PLAYING | COMPLETED
  position        Int      @default(0)         // Para ordenação drag-and-drop dentro da coluna

  categories      String[] // Array de tags: ["Coop", "Survival", "FPS", ...]

  group           Group    @relation(fields: [groupId], references: [id], onDelete: Cascade)
  addedBy         User     @relation(fields: [addedById], references: [id])
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}

```

## 3. Agentes e Serviços do Sistema

### 3.1. Agente de Autenticação (Discord OAuth)

Use NextAuth.js (ou Auth.js) com Discord Provider.
No callback: buscar discordId, nome e avatar.
Criar ou vincular usuário existente.

### 3.2. Agente de Scraping / Parser da Steam (POST /api/games)

Entrada: URL da Steam → extrai appId.
Requisição:
TypeScripthttps://store.steampowered.com/api/appdetails?appids={APP_ID}&cc=br&l=portuguese

Dados extraídos:

title, header_image (capa).
release_date.date → releaseDate e isReleased.
genres e categories (mapeie para suas tags amigáveis, ex: "Multi-player" → "Multiplayer").
price_overview: initial, final, discount_percent.
Se is_free: preços = 0.

Validações e tratamento de erros (jogo não encontrado, região, etc.).

### 3.3. Agente de Sincronização de Preços (Cron Job)

Endpoint: GET /api/cron/update-prices
Segurança: Header Authorization: Bearer ${CRON_SECRET}
Agendamento: Vercel Cron (ou Railway, etc.) diariamente às 05:00 AM (horário de Brasília).
Lógica:
SELECT DISTINCT steamAppId FROM Game
Agrupar em lotes de 10-15 IDs (Steam permite vírgula).
Fetch em batch.
Update em lote (prisma.game.updateMany(...)).

Atualiza apenas currentPrice, discountPercent e updatedAt.

## 4. Fluxo de Telas / User Stories

Dashboard

Lista de grupos.
Criar grupo (nome + gerar inviteCode).
Entrar com código.

Painel do Grupo (/group/[id])

Header: Nome, código de convite (botão copiar), membros.
Filtros: Por categoria, por status de lançamento.
Kanban (3 colunas):
Drag & drop entre colunas + reordenação dentro da coluna (atualiza status e position).

Adicionar jogo: Input grande para colar link Steam.
Cada card:
Capa
Título
Tags de categoria (chips clicáveis para filtro)
Preço (com destaque verde se em promoção)
"Adicionado por X"
Botões: Mover, Editar tags, Remover (confirm)

Permissões: Todo MEMBER pode fazer tudo (add/remove/move/edit). OWNER pode gerenciar membros.

## 5. Requisitos Técnicos Adicionais

Rate limiting no scraping (evitar ban da Steam).
Cache de respostas Steam (Redis ou banco, TTL 1h para adição manual).
Notificações (opcional futura): Quando um jogo em backlog entra em promoção forte.
Mobile-friendly (Kanban responsivo).
Logs e monitoramento do cron job.
