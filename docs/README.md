# 📚 GameNexus — Documentação Técnica

> **Índice central de análises, auditorias e planos do projeto.**
> Data: Julho 2026 | Stack: Next.js 16 + PostgreSQL + Redis + Docker

---

## 📋 Estrutura dos Documentos

```
docs/
├── README.md                        ← Este índice
├── 01-security-audit.md             ← Auditoria de segurança
├── 02-authentication-audit.md       ← Auditoria NextAuth/Auth.js
├── 03-redis-audit.md                ← Auditoria de uso do Redis
├── 04-prisma-audit.md               ← Auditoria de configuração Prisma
├── 05-env-variables.md              ← Auditoria de variáveis de ambiente
├── 06-deploy-oracle.md              ← Plano de deploy Oracle Cloud
└── 07-testing-checklist.md          ← Checklist de testes manuais
```

---

## 🔍 Resumo das Auditorias

| Doc | Título | Status | Prioridade |
|-----|--------|--------|------------|
| 01 | Segurança | 🟡 Pendências médias | 🔴 Alta |
| 02 | NextAuth/Auth.js | 🟡 Ajustes para produção | 🔴 Alta |
| 03 | Redis | 🔴 Não implementado | 🟡 Média |
| 04 | Prisma | ✅ Configurado para Docker | 🟢 Pronto |
| 05 | Variáveis de Ambiente | ✅ .env.example criado | 🟢 Pronto |
| 06 | Deploy Oracle | ✅ Plano completo | 🟡 Média |
| 07 | Testes | ✅ Checklist completo | 🟢 Pronto |

---

## 🎯 Ações Prioritárias

### 🔴 Antes do Deploy (Crítico)

1. **Gerar novo `AUTH_SECRET`** — Não usar o mesmo do dev em produção
2. **Configurar Discord Redirect URI** — Adicionar URL de produção no Discord Developer Portal
3. **Trocar `NEXTAUTH_URL`** — De `http://localhost:3000` para `https://gamenexus.com`
4. **Desativar `debug: true`** — Tornar condicional (`process.env.NODE_ENV !== "production"`)
5. **Configurar `trustHost`** — Especificar domínios confiáveis em vez de `true`

### 🟡 Pós-Deploy (Recomendado)

6. **Migrar cache para Redis** — Substituir `Map` em memória por Redis
7. **Rate limiting persistente** — Usar Redis em vez de memória
8. **Headers de segurança HTTP** — Adicionar CSP, HSTS, X-Frame-Options

### 🔵 Melhorias Futuras

9. **BullMQ para jobs de preços** — Fila assíncrona em vez de cron síncrono
10. **Notificações de promoção** — Alertar quando jogo do backlog entrar em promoção

---

## 🏗️ Arquitetura

```
🌐 Internet → Cloudflare (DNS) → VM Oracle Cloud
    └── Nginx (:80/443) → Next.js (:3000)
        ├── PostgreSQL (:5432) — Dados
        └── Redis (:6379) — Cache + Rate Limit (futuro)
```

---

## 📌 Referências Rápidas

| Recurso | Localização |
|---------|-------------|
| Schema Prisma | `prisma/schema.prisma` |
| Config NextAuth | `src/lib/auth.ts` |
| Dockerfile | `Dockerfile` |
| Docker Compose | `docker-compose.yml` |
| Env Example | `.env.example` |
| Config Next.js | `next.config.ts` |

---

*Documentos gerados durante auditoria de código-fonte em Julho de 2026.*
