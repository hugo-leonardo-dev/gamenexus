# 🎮 GameNexus

Aplicação web colaborativa para grupos de amigos gerenciarem seus jogos. Adicione jogos da Steam, organize em Kanban (Quero Jogar / Jogando / Finalizados / Dropados) e acompanhe promoções.

---

## ✨ Funcionalidades

- **🔐 Autenticação:** Discord OAuth + fallback Email/Senha
- **👥 Grupos:** Criação de grupos privados com convite via código único (ex: `JOG-A3B2C9`)
- **🎮 Integração Steam:** Adicione jogos colando o link da Steam — o sistema busca capa, preço, tags e data de lançamento automaticamente
- **📋 Kanban:** Arraste e solte jogos entre as colunas *Quero Jogar*, *Jogando Agora* e *Finalizados*
- **🔍 Busca:** Filtre jogos por nome dentro do grupo
- **💰 Promoções:** Indicador visual forte quando um jogo está em desconto (banner, borda, badge pulsante)
- **👤 Membros:** Gerencie membros do grupo (apenas o Dono pode remover)
- **⏰ Preços Automáticos:** Cron job diário atualiza os preços da Steam

---

## 📋 Pré-requisitos

- **Node.js** 20.x ou superior
- **PostgreSQL** 14.x ou superior (ou um banco remoto como [Neon](https://neon.tech), [Supabase](https://supabase.com), [Railway](https://railway.app))
- **Conta no Discord Developer Portal** (para OAuth)
- **npm** ou **yarn**

---

## 🚀 Como rodar localmente

### 1. Clone o repositório

```bash
git clone https://github.com/seu-usuario/gamenexus.git
cd gamenexus
```

### 2. Instale as dependências

```bash
npm install
```

### 3. Configure as variáveis de ambiente

Copie o arquivo de exemplo:

```bash
cp .env.example .env
```

Edite o `.env` com suas configurações (veja seção [Variáveis de Ambiente](#-variáveis-de-ambiente) abaixo).

### 4. Configure o banco de dados

Certifique-se de que o PostgreSQL está rodando e acessível via `DATABASE_URL`.

Execute as migrations para criar as tabelas:

```bash
npx prisma migrate dev
```

Isso aplicará a migration `init` e gerará o Prisma Client.

### 5. Inicie o servidor de desenvolvimento

```bash
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000) 🎉

---

## 🔧 Variáveis de Ambiente

| Variável | Obrigatória | Descrição |
|----------|-------------|-----------|
| `DATABASE_URL` | ✅ | URL de conexão do PostgreSQL. Ex: `postgresql://user:password@localhost:5432/gamenexus` |
| `AUTH_SECRET` | ✅ | Chave secreta para encriptar tokens JWT e cookies. Gere com: `openssl rand -base64 32` |
| `AUTH_DISCORD_ID` | ✅ | Client ID do seu app Discord |
| `AUTH_DISCORD_SECRET` | ✅ | Client Secret do seu app Discord |
| `CRON_SECRET` | ⚠️ (produção) | Secret para proteger o endpoint do cron job de preços |

### Gerando `AUTH_SECRET`

```bash
openssl rand -base64 32
```

---

## 🔵 Configurando Discord OAuth

### 1. Crie uma aplicação no Discord

Acesse o [Discord Developer Portal](https://discord.com/developers/applications) e clique em **New Application**.

### 2. Configure o OAuth2

No menu lateral, vá em **OAuth2 → General**:

- **Client ID**: Copie e cole no `.env` como `AUTH_DISCORD_ID`
- **Client Secret**: Clique em **Reset Secret**, copie e cole no `.env` como `AUTH_DISCORD_SECRET`

### 3. Adicione as Redirect URLs

Ainda em **OAuth2**, role até **Redirects** e adicione:

```
http://localhost:3000/api/auth/callback/discord
```

> Em produção, substitua `http://localhost:3000` pela URL do seu domínio.

### 4. Habilite os intents necessários (opcional)

Em **Bot → Privileged Gateway Intents**, você pode habilitar **Server Members Intent** se quiser informações adicionais no futuro. Para o funcionamento básico do login, não é necessário.

---

## ⏰ Configurando o Cron Job de Preços

O projeto inclui um endpoint `GET /api/cron/update-prices` que atualiza os preços de todos os jogos cadastrados consultando a Steam API.

### Localmente (teste manual)

```bash
curl -H "Authorization: Bearer SEU_CRON_SECRET" http://localhost:3000/api/cron/update-prices
```

### Em produção (Vercel Cron)

O arquivo `vercel.json` já inclui o agendamento:

```json
{
  "crons": [
    {
      "path": "/api/cron/update-prices",
      "schedule": "0 8 * * *"
    }
  ]
}
```

Isso executa o cron job **todos os dias às 05:00 BRT** (08:00 UTC).

> ⚠️ Certifique-se de configurar a variável `CRON_SECRET` no seu ambiente de produção com o mesmo valor usado para proteger o endpoint.

### Outros providers (Railway, Render, etc.)

Configure um cron job externo para chamar:
```
GET https://seudominio.com/api/cron/update-prices
Authorization: Bearer SEU_CRON_SECRET
```

---

## 🗄️ Estrutura do Projeto

```
src/
├── app/
│   ├── api/
│   │   ├── auth/
│   │   │   ├── [...nextauth]/     # Handler NextAuth
│   │   │   └── register/           # Cadastro email/senha
│   │   ├── cron/update-prices/    # Cron job de preços
│   │   ├── games/                  # CRUD de jogos + mover
│   │   └── groups/                 # CRUD de grupos + membros
│   ├── dashboard/                  # Página inicial do usuário logado
│   ├── group/[groupId]/            # Página do grupo + Kanban + Membros
│   ├── login/                      # Login (Discord + Email)
│   ├── signup/                     # Cadastro
│   ├── layout.tsx                  # Layout raiz
│   └── page.tsx                    # Landing page
├── components/
│   ├── game/                       # GameCard, SortableGameCard, KanbanBoard
│   ├── group/                      # AddGameForm, MemberList
│   ├── layout/                     # Navbar, AuthButton
│   └── ui/                         # ToastProvider, SessionProvider
└── lib/
    ├── auth.ts                     # Configuração NextAuth
    ├── prisma.ts                   # Singleton Prisma Client
    ├── groups.ts                   # Lógica de grupos
    ├── steam.ts                    # Integração Steam API
    ├── steam-prices.ts             # Atualização em lote de preços
    ├── rate-limit.ts               # Rate limiter (Steam API)
    ├── cache.ts                    # Cache em memória (Steam API)
    ├── api-utils.ts                # Helpers de API (erros, auth)
    ├── types.ts                    # Tipos compartilhados
    └── use-game-refresh.ts         # Hook de auto-refresh
```

---

## 🛠️ Comandos Úteis

| Comando | Descrição |
|---------|-----------|
| `npm run dev` | Inicia servidor de desenvolvimento |
| `npm run build` | Compila para produção |
| `npm start` | Inicia servidor de produção |
| `npm run lint` | Verifica código com ESLint |
| `npx prisma studio` | Abre interface gráfica do banco de dados |
| `npx prisma migrate dev` | Cria/executa migrations |
| `npx prisma generate` | Gera Prisma Client |
| `npx tsc --noEmit` | Verifica tipos sem compilar |

---

## 📚 Stack Tecnológica

| Tecnologia | Versão | Para quê |
|-----------|--------|----------|
| [Next.js](https://nextjs.org) | 16.2.10 | Framework React (App Router) |
| [TypeScript](https://typescriptlang.org) | 5.x | Tipagem estática |
| [Tailwind CSS](https://tailwindcss.com) | 4.x | Estilização utilitária |
| [Prisma](https://prisma.io) | 7.8.0 | ORM + Migrations |
| [PostgreSQL](https://postgresql.org) | - | Banco de dados relacional |
| [NextAuth.js](https://authjs.dev) | 5.0.0-beta.31 | Autenticação (Discord + Credentials) |
| [@dnd-kit](https://dndkit.com) | 6.3.1 | Drag and drop no Kanban |
| [bcryptjs](https://github.com/dcodeIO/bcrypt.js) | 3.x | Hash de senhas |

---

## 📖 Documentação Técnica

Toda a documentação técnica, auditorias e planos estão organizados na pasta `docs/`:

```
docs/
├── README.md                        ← Índice central
├── 01-security-audit.md             ← Auditoria de segurança
├── 02-authentication-audit.md       ← Auditoria NextAuth/Auth.js
├── 03-redis-audit.md                ← Auditoria de uso do Redis
├── 04-prisma-audit.md               ← Auditoria de configuração Prisma
├── 05-env-variables.md              ← Auditoria de variáveis de ambiente
├── 06-deploy-oracle.md              ← Plano de deploy Oracle Cloud
└── 07-testing-checklist.md          ← Checklist de testes manuais
```

As auditorias cobrem análise de segurança, authentication flow, configuração de infraestrutura (Redis, Prisma), variáveis de ambiente, deploy em nuvem e QA manual.

---

## 🌐 Deploy

### Vercel (Cloud)

O projeto está configurado para deploy na **Vercel** (arquivo `vercel.json` incluso).

1. Conecte seu repositório GitHub à [Vercel](https://vercel.com)
2. Configure as variáveis de ambiente no painel da Vercel
3. Configure o banco PostgreSQL (recomendado: [Neon](https://neon.tech) ou [Supabase](https://supabase.com))
4. Configure o Discord OAuth com a URL de produção como redirect
5. Deploy automático a cada push na branch `main`

### Docker / Oracle Cloud (Self-hosted)

O projeto inclui infraestrutura Docker completa para deploy em VM própria:

```bash
docker compose build
docker compose up -d
```

Veja o guia completo em [`docs/06-deploy-oracle.md`](docs/06-deploy-oracle.md).

---

## 📝 Licença

MIT
