import NextAuth from "next-auth";
import Discord from "next-auth/providers/discord";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export const { handlers, auth, signIn, signOut } = NextAuth({
  debug: process.env.NODE_ENV !== "production",
  trustHost: true,
  secret: process.env.AUTH_SECRET,
  providers: [
    Discord({
      clientId: process.env.AUTH_DISCORD_ID!,
      clientSecret: process.env.AUTH_DISCORD_SECRET!,
    }),
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Senha", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const email = (credentials.email as string).toLowerCase().trim();
        const password = credentials.password as string;

        // Busca usuário por email
        const user = await prisma.user.findUnique({
          where: { email },
        });

        if (!user || !user.passwordHash) {
          return null;
        }

        // Verifica senha
        const isValid = await bcrypt.compare(password, user.passwordHash);
        if (!isValid) {
          return null;
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.avatarUrl,
        };
      },
    }),
  ],
  callbacks: {
    async signIn({ account, profile }) {
      // Pula a criação manual de usuário para login com Credentials
      // (o usuário já foi criado via cadastro)
      if (account?.provider === "credentials") return true;

      if (account?.provider !== "discord" || !profile?.id) return true;

      try {
        const discordId = profile.id as string;
        const name =
          (profile.global_name as string) ??
          (profile.username as string) ??
          "Unknown";
        const email = (profile.email as string) ?? null;
        const avatar = profile.avatar as string | null;
        const discriminator = profile.discriminator as string;

        const avatarUrl = avatar
          ? `https://cdn.discordapp.com/avatars/${discordId}/${avatar}.${avatar.startsWith("a_") ? "gif" : "png"}`
          : `https://cdn.discordapp.com/embed/avatars/${Number(discriminator) % 5}.png`;

        // Cria ou atualiza o usuário no banco
        const dbUser = await prisma.user.upsert({
          where: { discordId },
          update: { name, avatarUrl, email },
          create: {
            discordId,
            name,
            email,
            emailVerified: null,
            avatarUrl,
          },
        });

        // Cria ou atualiza a conta OAuth
        await prisma.account.upsert({
          where: {
            provider_providerAccountId: {
              provider: "discord",
              providerAccountId: discordId,
            },
          },
          update: {
            access_token: account.access_token,
            refresh_token: account.refresh_token,
            expires_at: account.expires_at,
            token_type: account.token_type,
            scope: account.scope,
            id_token: account.id_token,
          },
          create: {
            userId: dbUser.id,
            type: "oauth",
            provider: "discord",
            providerAccountId: discordId,
            access_token: account.access_token,
            refresh_token: account.refresh_token,
            expires_at: account.expires_at,
            token_type: account.token_type,
            scope: account.scope,
            id_token: account.id_token,
          },
        });
      } catch (err) {
        console.error("[auth] Erro ao salvar usuário no banco:", err);
      }

      return true;
    },
    async jwt({ token, account, profile, trigger }) {
      // ─── Primeira autenticação ──────────────────────────────
      if (account && profile?.id) {
        token.discordId = profile.id as string;

        try {
          const dbUser = await prisma.user.findUnique({
            where: { discordId: profile.id as string },
          });
          if (dbUser) {
            token.id = dbUser.id;
            token.name = dbUser.name;
            token.picture = dbUser.avatarUrl;
          }
        } catch (err) {
          console.error("[auth] JWT: findUnique falhou:", err);
        }
      }

      // ─── Update do perfil (via updateSession()) ─────────────
      if (trigger === "update" && token.id) {
        try {
          const dbUser = await prisma.user.findUnique({
            where: { id: token.id as string },
            select: { name: true, avatarUrl: true },
          });
          if (dbUser) {
            token.name = dbUser.name;
            token.picture = dbUser.avatarUrl;
          }
        } catch (err) {
          console.error("[auth] JWT: update refresh falhou:", err);
        }
      }

      // ─── Recuperação de token.id perdido ───────────────────
      if (!token.id && token.discordId) {
        try {
          const dbUser = await prisma.user.findUnique({
            where: { discordId: token.discordId as string },
            select: { id: true, name: true, avatarUrl: true },
          });
          if (dbUser) {
            token.id = dbUser.id;
            token.name = dbUser.name;
            token.picture = dbUser.avatarUrl;
          }
        } catch (err) {
          console.error("[auth] JWT: findUnique subsequente falhou:", err);
        }
      }

      // Para credentials, o id já vem do authorize
      if (account?.provider === "credentials" && token.sub) {
        token.id = token.sub;
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id as string;
        session.user.name = token.name as string;
        session.user.image = token.picture as string | null;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
});
