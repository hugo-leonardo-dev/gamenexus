# 🚀 Plano de Deploy — Oracle Cloud Always Free

> **Documento:** `docs/06-deploy-oracle.md`
> **Projeto:** GameNexus
> **Stack:** Next.js 16 + PostgreSQL + Redis + Nginx
> **Infraestrutura:** VM Ubuntu 24.04 LTS (Oracle Cloud Always Free)

---

## Sumário

1. [Compatibilidade Oracle](#1-compatibilidade-oracle)
2. [✅ O que já está pronto](#-o-que-já-está-pronto)
3. [⚠️ O que precisa ser modificado](#️-o-que-precisa-ser-modificado)
4. [☁️ Cloudflare + SSL](#️-cloudflare--ssl)
5. [❌ Problemas encontrados](#-problemas-encontrados)
6. [📋 Checklist de Deploy](#-checklist-de-deploy)

---

## 1. Compatibilidade Oracle

### Especificações da VM Oracle Cloud Always Free

| Recurso | Oracle Free Tier | Nosso Setup | Status |
|---------|-----------------|-------------|--------|
| **CPU** | 1/8 OCPU AMD OU 4 OCPUs ARM (Ampere A1) | Docker multi-arch (ARM + AMD) | ✅ Compatível |
| **RAM** | 1GB (AMD) / até 24GB (ARM) | PostgreSQL 128MB + Next.js ~250MB + Nginx + Redis ~50MB | ✅ Otimizado |
| **Storage** | 200GB block + 10GB object | Volumes Docker (pgdata, redisdata) | ✅ Compatível |
| **Rede** | 10TB/mês outbound | Tráfego de API + assets | ✅ Folga |
| **IP Público** | **1 gratuito** (precisa reservar) | Nginx nas portas 80/443 | ⚠️ Ação necessária |

### Arquiteturas Suportadas

| Imagem Docker | AMD64 | ARM64 |
|--------------|-------|-------|
| `node:22-alpine` | ✅ | ✅ |
| `postgres:16-alpine` | ✅ | ✅ |
| `redis:7-alpine` | ✅ | ✅ |
| `nginx:alpine` | ✅ | ✅ |

> 💡 **Recomendação:** Use a VM ARM Ampere A1 (4 OCPUs + 24GB RAM). É mais potente que a AMD e sobra RAM para tudo.
> Se escolher AMD (1GB RAM), as configurações já estão otimizadas para esse limite.

### RAM — Estimativa Detalhada (VM AMD 1GB)

| Componente | RAM Estimada | Otimizações Aplicadas |
|-----------|-------------|----------------------|
| Ubuntu 24.04 (headless) | ~150MB | Sem GUI, services mínimos |
| Docker engine | ~50MB | Overhead do runtime |
| PostgreSQL 16 | ~250MB | `shared_buffers=128MB`, `work_mem=4MB`, `max_connections=20` |
| Next.js (Node.js) | ~250MB | `images.unoptimized: true`, standalone output |
| Nginx | ~20MB | Image `nginx:alpine` (~25MB) |
| Redis 7 | ~50MB | `maxmemory 64mb`, sem AOF |
| **Total** | **~770MB** | Margem de ~230MB livre ✅ |

> Com VM ARM (24GB RAM), a margem é folgada e não há preocupação.

---

## ✅ O que já está pronto

### 1. Estrutura do Projeto

- **Next.js App Router** — sem Edge Runtime, sem dependências serverless
- **API Routes** — todas usam `Node.js Runtime`
- **Server Components** — SSR padrão, sem ISR/SSG
- **Prisma ORM** — abstrai o banco, funciona com qualquer PostgreSQL
- **Variáveis de ambiente** — centralizadas via `process.env`

### 2. Dependências

| Dependência | Compatível | Observação |
|-------------|-----------|------------|
| `next` 16 | ✅ | `next start` funciona em qualquer servidor Node |
| `next-auth` | ✅ | JWT strategy — sem dependência de banco externo |
| `@prisma/client` | ✅ | Funciona com PostgreSQL local |
| `@prisma/adapter-pg` | ✅ | Adapter PostgreSQL |
| `pg` | ✅ | Driver PostgreSQL |
| `bcryptjs` | ✅ | Hash em memória, sem dependências nativas |
| `@dnd-kit/*` | ✅ | Client-side only |
| `tailwindcss` | ✅ | Build-time apenas |
| `react` 19 | ✅ | Padrão |

### 3. Banco de Dados

- **Prisma schema** definido e migrations geradas
- **Migrations** na pasta `prisma/migrations/` — portáveis para qualquer PostgreSQL
- **Nenhum lock-in** com provedor específico

### 4. Cache

- Cache atual é **em memória** (`Map` no Node.js) — funciona em single-instance
- Rate limiting também em memória — funciona em single-instance
- Redis já configurado no Docker Compose para migração futura

### 5. Assets

- **Fontes** Google Fonts via `next/font` — self-hosted pelo Next.js
- **Imagens** da Steam/Discord — URLs externas
- **Nenhum upload de arquivo** — sem necessidade de storage persistente

### 6. Build

- `next build` produz output padrão
- `next start` serve a aplicação em produção
- Sem dependência de plataforma específica

---

## ⚠️ O que precisa ser modificado

### 🔴 Prioridade Alta

#### 1. 🔴 Substituir Vercel Cron por cron do Linux

**O cron da Vercel (`vercel.json`) não funciona na Oracle.**

**Solução:** Adicionar entrada no crontab do host:

```bash
sudo tee /etc/cron.d/gamenexus-prices << 'EOF'
0 8 * * * root curl -s -H "Authorization: Bearer $CRON_SECRET" \
  http://localhost:3000/api/cron/update-prices >> /var/log/gamenexus-cron.log 2>&1
EOF
```

#### 2. 🔴 Atualizar NextAuth URLs

- `NEXTAUTH_URL` — Deve apontar para o domínio real
- Discord OAuth redirect URI — Atualizar no Discord Developer Portal

#### 3. 🔴 Reservar IP Público (Oracle)

Por padrão, Oracle atribui IP **efêmero** (muda ao parar/ligar a VM). Para não quebrar o DNS:

1. No Console Oracle: **Networking → Reserved Public IPs**
2. Clique em **Reserve Public IP Address**
3. Dê um nome (ex: `gamenexus-ip`)
4. Associe à VM: **Actions → Edit → Reserved public IP**
5. **Anote o IP** e aponte o DNS do Cloudflare para ele

#### 4. 🔴 Liberar Portas no Security List (Oracle)

Oracle bloqueia **todas as portas de entrada** por padrão.

1. **Networking → Virtual Cloud Networks → Security Lists**
2. Edite a **Default Security List** da VNC
3. Adicione **Ingress Rules**:

| Porta | Protocolo | Origem | Descrição |
|-------|-----------|--------|-----------|
| 22 | TCP | `0.0.0.0/0` | SSH |
| 80 | TCP | `0.0.0.0/0` | HTTP |
| 443 | TCP | `0.0.0.0/0` | HTTPS |

> ⚠️ Se usar Cloudflare Proxy (orange cloud), você pode restringir a origem das portas 80/443
> para apenas os IPs da Cloudflare: https://www.cloudflare.com/ips/

### 🟡 Prioridade Média

#### 5. 🟡 Migrar cache de memória para Redis

Ver `docs/03-redis-audit.md` para detalhes.

#### 6. 🟡 Adicionar script de backup do PostgreSQL

```bash
#!/bin/bash
# scripts/backup-db.sh
docker exec gamenexus-postgres pg_dump -U gamenexus gamenexus \
  > /backups/gamenexus-$(date +%Y%m%d-%H%M%S).sql
find /backups -name "*.sql" -mtime +7 -delete
```

Agendar no cron:
```bash
0 3 * * * /root/scripts/backup-db.sh
```

#### 7. 🟡 Configurar logs com rotação

```yaml
# docker-compose.yml
logging:
  driver: "json-file"
  options:
    max-size: "10m"
    max-file: "3"
```

### 🔵 Prioridade Baixa

#### 8. 🔵 Adicionar script de deploy

```bash
#!/bin/bash
# scripts/deploy.sh
cd /opt/gamenexus
git pull
docker compose build
docker compose up -d
docker system prune -f
```

---

## ☁️ Cloudflare + SSL

### Opção 1: Cloudflare Proxy + HTTP-only (Recomendado para Oracle Free)

Esta é a abordagem **mais simples e com menor consumo de RAM**. Cloudflare faz o SSL entre o cliente e o Cloudflare, e o tráfego entre Cloudflare e a VM Oracle é HTTP puro.

```
🌐 Cliente → HTTPS → ☁️ Cloudflare → HTTP → 🖥️ VM Oracle (porta 80)
```

**Configuração:**
1. No Cloudflare Dashboard: **DNS → Registros**
2. Adicione um registro A apontando para o IP da VM Oracle
3. Ative **Proxy** (ícone de laranja/nuvem)
4. Em **SSL/TLS**: selecione **Flexible**
5. O Nginx só precisa servir HTTP (já configurado em `nginx/nginx.conf`)

**Vantagens:**
- ✅ Zero configuração de SSL no servidor
- ✅ Nginx não precisa de certificados (economiza RAM e setup)
- ✅ Cloudflare cuida de mitigação DDoS
- ✅ Nginx.conf HTTP-only funciona perfeitamente

**Desvantagens:**
- ⚠️ Tráfego entre Cloudflare e Oracle não é criptografado (dentro do backbone Oracle é seguro)

### Opção 2: Cloudflare Full (Strict) + Nginx com Certificado

Se precisar de criptografia total:

1. Use o **Cloudflare Origin Certificate** (gratuito no dashboard)
2. Em **SSL/TLS → Origin Server**: **Create Certificate**
3. Escolha RSA (mais compatível) ou ECDSA
4. Copie o certificado e a chave privada para o servidor
5. Ative `nginx/nginx.ssl.conf` no lugar de `nginx.conf`
6. Em **SSL/TLS**: selecione **Full (Strict)**

### Opção 3: Let's Encrypt (sem Cloudflare)

Se não usar Cloudflare:

```bash
# Instalar Certbot no host (não no container)
sudo apt install certbot

# Gerar certificado
sudo certbot certonly --standalone -d gamenexus.seudominio.com

# Ativar nginx.ssl.conf (trocar config)
docker compose cp ./nginx/nginx.ssl.conf nginx:/etc/nginx/nginx.conf
docker compose exec nginx nginx -s reload
```

---

## ❌ Problemas encontrados

### 1. 🔴 RAM Limitada (1GB) — Já mitigado

**Problema:** VM AMD Free tem apenas **1GB RAM**.

**Mitigações aplicadas no projeto:**
- ✅ PostgreSQL `shared_buffers=128MB` (reduzido de 256MB)
- ✅ PostgreSQL `work_mem=4MB`, `max_connections=20`
- ✅ Redis `maxmemory 64mb`
- ✅ Next.js `images.unoptimized: true`
- ✅ Dockerfile multi-stage (imagem ~200MB, sem ferramentas desnecessárias)

**RAM estimada com tudo rodando:** ~770MB (margem segura de ~230MB)

> 💡 **Dica:** Se sofrer com OOM kills, remova o Redis (`docker compose rm -s redis`) —
> o cache em memória do Node.js funciona perfeitamente para single-instance.

### 2. 🟡 IP Efêmero vs DNS

Oracle atribui IP público **efêmero** por padrão. Se a VM for parada/ligada, o IP muda.

**Solução:** Sempre **reserve um IP público** (gratuito, 1 por conta) e associe à VM.

### 3. 🟡 Discord OAuth — Redirect URI

**Solução:** Adicionar no Discord Developer Portal:
- `https://gamenexus.seudominio.com/api/auth/callback/discord`

### 4. 🔵 Compatibilidade ARM64

Todas as imagens Docker do projeto suportam ARM64. Se escolher VM Ampere A1:
- **Vantagem:** 4 OCPUs + 24GB RAM (sobra recurso)
- **Sem mudanças no Dockerfile ou docker-compose** — as imagens `-alpine` já são multi-arch

---

## 📋 Checklist de Deploy

### Pré-requisitos

- [ ] Conta Oracle Cloud criada e ativa
- [ ] VM Ubuntu 24.04 LTS provisionada (**ARM Ampere A1 recomendado**)
- [ ] Domínio configurado no Cloudflare
- [ ] IP público **reservado** e associado à VM
- [ ] Portas 22, 80, 443 liberadas no Security List
- [ ] Docker e Docker Compose instalados na VM (`curl -fsSL https://get.docker.com | sh`)
- [ ] Git instalado na VM
- [ ] Discord Developer Portal com redirect URI configurado

### Arquivos do Projeto

| Arquivo | Status | Função |
|---------|--------|--------|
| `Dockerfile` | ✅ Criado | Build multi-stage (deps → builder → runner → migrate) |
| `docker-compose.yml` | ✅ Criado | Nginx + app + postgres + redis + migrate |
| `.dockerignore` | ✅ Criado | Build otimizado |
| `nginx/nginx.conf` | ✅ Criado | Proxy HTTP-only (primeiro deploy / Cloudflare Flexible) |
| `nginx/nginx.ssl.conf` | ✅ Criado | Proxy HTTPS completo (após certificado) |
| `nginx/proxy-params.conf` | ✅ Criado | Parâmetros compartilhados de proxy |
| `src/app/api/health/route.ts` | ✅ Criado | Endpoint de healthcheck |
| `scripts/backup-db.sh` | ⏳ Pendente | Backup do PostgreSQL |
| `scripts/deploy.sh` | ⏳ Pendente | Script de deploy automático |

### Passo a Passo

```bash
# 1. Acessar a VM
ssh ubuntu@<ip-reservado-da-vm>

# 2. Instalar Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker ubuntu
# ⚠️ Faça logout e login novamente para aplicar o grupo docker

# 3. Clonar repositório
git clone https://github.com/seu-usuario/gamenexus.git /opt/gamenexus
cd /opt/gamenexus

# 4. Criar .env (substitua os valores)
cat > .env << EOF
DATABASE_URL=postgresql://gamenexus:SUA_SENHA@postgres:5432/gamenexus
POSTGRES_PASSWORD=$(openssl rand -hex 16)
AUTH_SECRET=$(openssl rand -hex 32)
AUTH_DISCORD_ID=seu_discord_client_id
AUTH_DISCORD_SECRET=seu_discord_client_secret
NEXTAUTH_URL=https://gamenexus.seudominio.com
NEXTAUTH_SECRET=$AUTH_SECRET
CRON_SECRET=$(openssl rand -hex 32)
NODE_ENV=production
DOCKER_BUILD=true
EOF

# 5. Build e Start
docker compose build
docker compose up -d

# 6. Verificar if está tudo rodando
docker compose ps
docker compose logs --tail=50

# 7. Testar healthcheck
curl http://localhost:3000/api/health

# 8. Configurar cron job de preços
echo "0 8 * * * root curl -s -H 'Authorization: Bearer $CRON_SECRET' \
  http://localhost:3000/api/cron/update-prices >> /var/log/gamenexus-cron.log 2>&1" | \
  sudo tee /etc/cron.d/gamenexus-prices
```

### Pós-Deploy

- [ ] Acessar `https://gamenexus.seudominio.com`
- [ ] Testar login com Discord
- [ ] Testar criação de grupo
- [ ] Testar adição de jogo (via link Steam)
- [ ] Testar Kanban drag & drop
- [ ] Verificar logs: `docker compose logs -f`
- [ ] Testar healthcheck: `curl http://localhost:3000/api/health`
- [ ] Testar cron job manual: `curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/update-prices`
- [ ] Verificar consumo de RAM: `docker stats --no-stream` (total deve ficar abaixo de 800MB)

### Monitoramento

```bash
docker compose ps              # Status dos containers
docker compose logs -f app     # Logs do app em tempo real
docker stats                   # Uso de CPU/RAM em tempo real
docker compose logs --tail=100 # Últimas 100 linhas de todos os serviços
```

---

## Resumo da Arquitetura Final

```
🌐 Cliente
    │
    ▼ HTTPS (Cloudflare Proxy)
☁️ Cloudflare (DNS + SSL + DDoS Protection)
    │
    ▼ HTTP (Flexible SSL) ou HTTPS (Full Strict)
┌─────────────────────────────────────────────┐
│         VM Oracle Cloud (1GB-24GB RAM)      │
│                                              │
│  ┌──────────┐    ┌──────────────┐           │
│  │  Nginx   │───▶│   Next.js    │           │
│  │  :80/443 │    │   :3000      │           │
│  └──────────┘    └──────┬───────┘           │
│                         │                   │
│              ┌──────────┴──────────┐        │
│              ▼                     ▼        │
│      ┌────────────┐        ┌──────────┐     │
│      │ PostgreSQL │        │  Redis   │     │
│      │  :5432     │        │  :6379   │     │
│      └────────────┘        └──────────┘     │
│                                              │
│  Docker Compose │ gamenexus-net bridge       │
└─────────────────────────────────────────────┘
```

**Custo mensal:** R$ 0,00 (Oracle Cloud Always Free)

---

*Documento gerado em Julho de 2026. Atualizado com configurações específicas Oracle Cloud.*
