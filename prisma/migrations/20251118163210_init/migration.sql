-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "walletAddress" TEXT,
    "avatar" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "party_id" TEXT,
    "display_name" TEXT,
    "email" TEXT,
    "total_bets" INTEGER NOT NULL DEFAULT 0,
    "total_winnings" DECIMAL(20,10) NOT NULL DEFAULT 0,
    "total_staked" DECIMAL(20,10) NOT NULL DEFAULT 0,
    "win_count" INTEGER NOT NULL DEFAULT 0,
    "loss_count" INTEGER NOT NULL DEFAULT 0,
    "last_seen" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "messages" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "isEdited" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reactions" (
    "id" TEXT NOT NULL,
    "emoji" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "users_walletAddress_key" ON "users"("walletAddress");

-- CreateIndex
CREATE UNIQUE INDEX "users_party_id_key" ON "users"("party_id");

-- CreateIndex
CREATE INDEX "users_last_seen_idx" ON "users"("last_seen" DESC);

-- CreateIndex
CREATE INDEX "messages_createdAt_idx" ON "messages"("createdAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "reactions_messageId_userId_emoji_key" ON "reactions"("messageId", "userId", "emoji");

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reactions" ADD CONSTRAINT "reactions_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reactions" ADD CONSTRAINT "reactions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "markets" (
    "id" SERIAL NOT NULL,
    "contract_id" TEXT NOT NULL,
    "market_id" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "outcomes" JSONB NOT NULL,
    "total_pool" DECIMAL(20,10) NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL,
    "winning_outcome" INTEGER,
    "end_time" TIMESTAMP(3) NOT NULL,
    "resolution_time" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "token_standard" TEXT NOT NULL,
    "minimum_bet" DECIMAL(20,10),
    "maximum_bet" DECIMAL(20,10),
    "fee_rate" DECIMAL(5,4),
    "time_weighting_enabled" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "markets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bets" (
    "id" SERIAL NOT NULL,
    "market_id" TEXT NOT NULL,
    "bettor" TEXT NOT NULL,
    "amount" DECIMAL(20,10) NOT NULL,
    "outcome_index" INTEGER NOT NULL,
    "bet_timestamp" TIMESTAMP(3) NOT NULL,
    "transaction_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "claims" (
    "id" SERIAL NOT NULL,
    "claim_id" TEXT NOT NULL,
    "market_id" TEXT NOT NULL,
    "claimer" TEXT NOT NULL,
    "amount" DECIMAL(20,10) NOT NULL,
    "status" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL,
    "claimed_at" TIMESTAMP(3),

    CONSTRAINT "claims_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "indexer_checkpoints" (
    "id" SERIAL NOT NULL,
    "service_name" TEXT NOT NULL,
    "last_offset" TEXT NOT NULL,
    "last_event_id" TEXT,
    "last_updated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "indexer_checkpoints_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "markets_contract_id_key" ON "markets"("contract_id");

-- CreateIndex
CREATE UNIQUE INDEX "markets_market_id_key" ON "markets"("market_id");

-- CreateIndex
CREATE INDEX "markets_status_idx" ON "markets"("status");

-- CreateIndex
CREATE INDEX "markets_category_idx" ON "markets"("category");

-- CreateIndex
CREATE INDEX "markets_created_at_idx" ON "markets"("created_at" DESC);

-- CreateIndex
CREATE INDEX "markets_end_time_idx" ON "markets"("end_time");

-- CreateIndex
CREATE INDEX "bets_market_id_idx" ON "bets"("market_id");

-- CreateIndex
CREATE INDEX "bets_bettor_idx" ON "bets"("bettor");

-- CreateIndex
CREATE INDEX "bets_created_at_idx" ON "bets"("created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "claims_claim_id_key" ON "claims"("claim_id");

-- CreateIndex
CREATE INDEX "claims_claimer_idx" ON "claims"("claimer");

-- CreateIndex
CREATE INDEX "claims_status_idx" ON "claims"("status");

-- CreateIndex
CREATE INDEX "claims_market_id_idx" ON "claims"("market_id");

-- CreateIndex
CREATE UNIQUE INDEX "indexer_checkpoints_service_name_key" ON "indexer_checkpoints"("service_name");

-- AddForeignKey
ALTER TABLE "bets" ADD CONSTRAINT "bets_market_id_fkey" FOREIGN KEY ("market_id") REFERENCES "markets"("market_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "claims" ADD CONSTRAINT "claims_market_id_fkey" FOREIGN KEY ("market_id") REFERENCES "markets"("market_id") ON DELETE RESTRICT ON UPDATE CASCADE;
