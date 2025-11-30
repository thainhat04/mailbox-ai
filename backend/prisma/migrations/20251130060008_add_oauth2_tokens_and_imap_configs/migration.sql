-- CreateEnum
CREATE TYPE "MailProvider" AS ENUM ('GOOGLE', 'MICROSOFT');

-- CreateTable
CREATE TABLE "oauth2_tokens" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" "MailProvider" NOT NULL,
    "email" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT,
    "tokenType" TEXT NOT NULL DEFAULT 'Bearer',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "scope" TEXT,
    "idToken" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "oauth2_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "imap_configs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" "MailProvider" NOT NULL,
    "email" TEXT NOT NULL,
    "imapHost" TEXT NOT NULL,
    "imapPort" INTEGER NOT NULL,
    "imapSecure" BOOLEAN NOT NULL DEFAULT true,
    "smtpHost" TEXT NOT NULL,
    "smtpPort" INTEGER NOT NULL,
    "smtpSecure" BOOLEAN NOT NULL DEFAULT true,
    "lastSyncAt" TIMESTAMP(3),
    "syncEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "imap_configs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "oauth2_tokens_userId_idx" ON "oauth2_tokens"("userId");

-- CreateIndex
CREATE INDEX "oauth2_tokens_email_idx" ON "oauth2_tokens"("email");

-- CreateIndex
CREATE INDEX "oauth2_tokens_expiresAt_idx" ON "oauth2_tokens"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "oauth2_tokens_userId_provider_email_key" ON "oauth2_tokens"("userId", "provider", "email");

-- CreateIndex
CREATE INDEX "imap_configs_userId_idx" ON "imap_configs"("userId");

-- CreateIndex
CREATE INDEX "imap_configs_syncEnabled_idx" ON "imap_configs"("syncEnabled");

-- CreateIndex
CREATE UNIQUE INDEX "imap_configs_userId_provider_email_key" ON "imap_configs"("userId", "provider", "email");

-- AddForeignKey
ALTER TABLE "oauth2_tokens" ADD CONSTRAINT "oauth2_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "imap_configs" ADD CONSTRAINT "imap_configs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
