/*
  Warnings:

  - You are about to drop the `subscription_settings` table. If the table is not empty, all the data it contains will be lost.

*/
-- AlterTable
ALTER TABLE "client" ADD COLUMN     "subscriptionTemplateId" TEXT;

-- DropTable
DROP TABLE "subscription_settings";

-- CreateTable
CREATE TABLE "subscription_template" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "profileTitle" TEXT,
    "updateInterval" INTEGER NOT NULL DEFAULT 24,
    "updateAlways" BOOLEAN NOT NULL DEFAULT false,
    "announce" TEXT,
    "announceUrl" TEXT,
    "routing" TEXT,
    "trafficTotal" BIGINT NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscription_template_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "subscription_template_name_key" ON "subscription_template"("name");

-- CreateIndex
CREATE INDEX "client_subscriptionTemplateId_idx" ON "client"("subscriptionTemplateId");

-- AddForeignKey
ALTER TABLE "client" ADD CONSTRAINT "client_subscriptionTemplateId_fkey" FOREIGN KEY ("subscriptionTemplateId") REFERENCES "subscription_template"("id") ON DELETE SET NULL ON UPDATE CASCADE;
