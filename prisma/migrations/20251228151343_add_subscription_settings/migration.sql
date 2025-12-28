-- CreateTable
CREATE TABLE "subscription_settings" (
    "id" TEXT NOT NULL,
    "profileTitle" TEXT,
    "updateInterval" INTEGER NOT NULL DEFAULT 24,
    "updateAlways" BOOLEAN NOT NULL DEFAULT false,
    "announce" TEXT,
    "announceUrl" TEXT,
    "routing" TEXT,
    "defaultTrafficTotal" BIGINT NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscription_settings_pkey" PRIMARY KEY ("id")
);
