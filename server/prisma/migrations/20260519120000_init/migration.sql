-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "PreferredRole" AS ENUM ('BUYER', 'SELLER');

-- CreateEnum
CREATE TYPE "AssetType" AS ENUM ('COMPUTE', 'API_QUOTA', 'MODEL_ACCESS');

-- CreateEnum
CREATE TYPE "VerificationMethod" AS ENUM ('ZK_PROOF', 'TEE_ATTEST', 'SIGNATURE', 'QUOTA_CHK');

-- CreateEnum
CREATE TYPE "AssetStatus" AS ENUM ('DRAFT', 'VERIFYING', 'LIVE', 'PAUSED', 'DELISTED');

-- CreateEnum
CREATE TYPE "OrderSide" AS ENUM ('BUY', 'SELL');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('MATCHING', 'VERIFYING', 'DELIVERING', 'SETTLED', 'DISPUTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "EscrowStatus" AS ENUM ('PENDING', 'FUNDED', 'RELEASED', 'DISPUTED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "VerifyStepType" AS ENUM ('ZK_PROOF', 'TEE_ATTEST', 'SIGNATURE', 'QUOTA_CHK', 'ATTEST_Q', 'HEALTH_CHECK', 'LATENCY_SAMPLE');

-- CreateEnum
CREATE TYPE "VerifyResult" AS ENUM ('PASS', 'FAIL', 'PENDING');

-- CreateEnum
CREATE TYPE "VerificationJobStatus" AS ENUM ('QUEUED', 'RUNNING', 'PASSED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "OrderBookSide" AS ENUM ('BID', 'ASK');

-- CreateEnum
CREATE TYPE "ChatSenderType" AS ENUM ('SYSTEM', 'BUYER', 'SELLER', 'MODERATOR');

-- CreateEnum
CREATE TYPE "LedgerEntryType" AS ENUM ('SETTLE', 'ESCROW', 'RELEASE', 'STAKE', 'DISPUTE_HOLD', 'DEPOSIT', 'WITHDRAW', 'SLASH');

-- CreateEnum
CREATE TYPE "ListingProviderKind" AS ENUM ('OPENAI_COMPATIBLE', 'ANTHROPIC', 'GOOGLE_AI', 'CUSTOM_REST');

-- CreateEnum
CREATE TYPE "BuyMode" AS ENUM ('BUYOUT', 'PARTIAL');

-- CreateTable
CREATE TABLE "wallets" (
    "id" TEXT NOT NULL,
    "address" VARCHAR(66) NOT NULL,
    "chain_id" INTEGER NOT NULL DEFAULT 421614,
    "display_name" TEXT,
    "preferred_role" "PreferredRole" NOT NULL DEFAULT 'SELLER',
    "first_connected_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wallets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "terminal_preferences" (
    "id" TEXT NOT NULL,
    "wallet_id" TEXT NOT NULL,
    "tour_completed" BOOLEAN NOT NULL DEFAULT false,
    "tour_version" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "terminal_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wallet_balances" (
    "id" TEXT NOT NULL,
    "wallet_id" TEXT NOT NULL,
    "available_usdc" DECIMAL(24,8) NOT NULL DEFAULT 0,
    "escrowed_usdc" DECIMAL(24,8) NOT NULL DEFAULT 0,
    "staked_usdc" DECIMAL(24,8) NOT NULL DEFAULT 0,
    "reputation_bond_usdc" DECIMAL(24,8) NOT NULL DEFAULT 0,
    "seller_collateral_usdc" DECIMAL(24,8) NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wallet_balances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wallet_ledger_entries" (
    "id" TEXT NOT NULL,
    "wallet_id" TEXT NOT NULL,
    "order_id" TEXT,
    "entry_type" "LedgerEntryType" NOT NULL,
    "amount_usdc" DECIMAL(24,8) NOT NULL,
    "currency" VARCHAR(16) NOT NULL DEFAULT 'USDC',
    "tx_hash" VARCHAR(128),
    "note" TEXT,
    "occurred_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wallet_ledger_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "api_providers" (
    "id" TEXT NOT NULL,
    "slug" VARCHAR(64) NOT NULL,
    "name" VARCHAR(128) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "api_providers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assets" (
    "id" TEXT NOT NULL,
    "public_id" VARCHAR(16) NOT NULL,
    "ticker" VARCHAR(32) NOT NULL,
    "asset_type" "AssetType" NOT NULL,
    "provider_id" TEXT NOT NULL,
    "listing_id" TEXT,
    "supply_amount" DECIMAL(24,4) NOT NULL,
    "supply_unit" VARCHAR(32) NOT NULL,
    "price_usdc" DECIMAL(24,8) NOT NULL,
    "change_24h_pct" DECIMAL(8,4),
    "volume_24h_usdc" DECIMAL(24,2),
    "verification_method" "VerificationMethod" NOT NULL,
    "uptime_pct" DECIMAL(6,3) NOT NULL,
    "status" "AssetStatus" NOT NULL DEFAULT 'LIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asset_price_ticks" (
    "id" TEXT NOT NULL,
    "asset_id" TEXT NOT NULL,
    "price_usdc" DECIMAL(24,8) NOT NULL,
    "recorded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "asset_price_ticks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_book_levels" (
    "id" TEXT NOT NULL,
    "asset_id" TEXT NOT NULL,
    "side" "OrderBookSide" NOT NULL,
    "price_usdc" DECIMAL(24,8) NOT NULL,
    "size_amount" DECIMAL(24,4) NOT NULL,
    "total_usdc" DECIMAL(24,4) NOT NULL,
    "level_rank" INTEGER NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "order_book_levels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "api_listings" (
    "id" TEXT NOT NULL,
    "public_id" VARCHAR(24),
    "seller_wallet_id" TEXT NOT NULL,
    "provider_id" TEXT,
    "provider_kind" "ListingProviderKind" NOT NULL,
    "quota_to_sell" DECIMAL(24,4) NOT NULL,
    "quota_unit" VARCHAR(32) NOT NULL DEFAULT 'tokens',
    "ask_price_usdc" DECIMAL(24,8) NOT NULL,
    "verify_consent_at" TIMESTAMP(3),
    "verify_quota_pct" DECIMAL(5,2) NOT NULL DEFAULT 3,
    "auto_list_after_verify" BOOLEAN NOT NULL DEFAULT true,
    "status" "AssetStatus" NOT NULL DEFAULT 'VERIFYING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "api_listings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "api_listing_credentials" (
    "id" TEXT NOT NULL,
    "listing_id" TEXT NOT NULL,
    "ciphertext_ref" VARCHAR(512) NOT NULL,
    "kms_key_id" VARCHAR(128),
    "key_fingerprint" VARCHAR(64),
    "rotated_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "api_listing_credentials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification_jobs" (
    "id" TEXT NOT NULL,
    "listing_id" TEXT,
    "status" "VerificationJobStatus" NOT NULL DEFAULT 'QUEUED',
    "steps_total" INTEGER NOT NULL DEFAULT 5,
    "steps_completed" INTEGER NOT NULL DEFAULT 0,
    "quota_consumed" DECIMAL(24,4),
    "key_fingerprint" VARCHAR(64),
    "terminal_outcome" VARCHAR(16),
    "capability_score" DOUBLE PRECISION,
    "trust_score" DOUBLE PRECISION,
    "compliance_score" DOUBLE PRECISION,
    "proof_hash" VARCHAR(128),
    "proof_json" JSONB,
    "cost_liability" VARCHAR(32),
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "failure_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "verification_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification_events" (
    "id" TEXT NOT NULL,
    "job_id" TEXT,
    "order_id" TEXT,
    "asset_id" TEXT,
    "step_type" "VerifyStepType" NOT NULL,
    "result" "VerifyResult" NOT NULL DEFAULT 'PENDING',
    "proof_hash" VARCHAR(128),
    "latency_ms" INTEGER,
    "occurred_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "verification_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" TEXT NOT NULL,
    "public_id" VARCHAR(16) NOT NULL,
    "asset_id" TEXT NOT NULL,
    "buyer_wallet_id" TEXT,
    "seller_wallet_id" TEXT,
    "side" "OrderSide" NOT NULL,
    "buy_mode" "BuyMode",
    "quantity" DECIMAL(24,4) NOT NULL,
    "quantity_unit" VARCHAR(32) NOT NULL,
    "limit_price_usdc" DECIMAL(24,8) NOT NULL,
    "total_value_usdc" DECIMAL(24,8) NOT NULL,
    "escrow_status" "EscrowStatus" NOT NULL DEFAULT 'PENDING',
    "status" "OrderStatus" NOT NULL DEFAULT 'MATCHING',
    "verify_steps_done" INTEGER NOT NULL DEFAULT 0,
    "verify_steps_total" INTEGER NOT NULL DEFAULT 3,
    "delivery_deadline" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "settled_at" TIMESTAMP(3),

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_lifecycle_events" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "label" VARCHAR(128) NOT NULL,
    "detail" TEXT,
    "status_label" VARCHAR(32),
    "occurred_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_lifecycle_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "escrow_events" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "status" "EscrowStatus" NOT NULL,
    "amount_usdc" DECIMAL(24,8) NOT NULL,
    "tx_hash" VARCHAR(128),
    "note" TEXT,
    "occurred_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "escrow_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_disputes" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "reason" TEXT,
    "opened_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved_at" TIMESTAMP(3),
    "resolution" VARCHAR(64),

    CONSTRAINT "order_disputes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_rooms" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_rooms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_messages" (
    "id" TEXT NOT NULL,
    "room_id" TEXT NOT NULL,
    "sender_type" "ChatSenderType" NOT NULL,
    "sender_wallet_id" TEXT,
    "body_plain" TEXT,
    "body_ciphertext_ref" VARCHAR(512),
    "attachment_ref" VARCHAR(512),
    "sent_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reputation_profiles" (
    "id" TEXT NOT NULL,
    "wallet_id" TEXT,
    "actor_slug" VARCHAR(64) NOT NULL,
    "display_name" VARCHAR(128) NOT NULL,
    "score" DECIMAL(6,2) NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reputation_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reputation_events" (
    "id" TEXT NOT NULL,
    "profile_id" TEXT NOT NULL,
    "event_code" VARCHAR(64) NOT NULL,
    "delta" DECIMAL(6,2) NOT NULL,
    "score_after" DECIMAL(6,2) NOT NULL,
    "metadata" JSONB,
    "occurred_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reputation_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_metric_snapshots" (
    "id" TEXT NOT NULL,
    "metric_key" VARCHAR(64) NOT NULL,
    "value" VARCHAR(64) NOT NULL,
    "delta_label" VARCHAR(32),
    "captured_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "platform_metric_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sla_policies" (
    "id" TEXT NOT NULL,
    "provider_id" TEXT,
    "asset_id" TEXT,
    "uptime_commitment_pct" DECIMAL(6,3) NOT NULL,
    "window_days" INTEGER NOT NULL DEFAULT 30,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sla_policies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sla_breaches" (
    "id" TEXT NOT NULL,
    "policy_id" TEXT NOT NULL,
    "actual_pct" DECIMAL(6,3) NOT NULL,
    "credit_owed_usdc" DECIMAL(24,8) NOT NULL,
    "breached_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sla_breaches_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "wallets_address_key" ON "wallets"("address");

-- CreateIndex
CREATE INDEX "wallets_last_seen_at_idx" ON "wallets"("last_seen_at");

-- CreateIndex
CREATE UNIQUE INDEX "terminal_preferences_wallet_id_key" ON "terminal_preferences"("wallet_id");

-- CreateIndex
CREATE UNIQUE INDEX "wallet_balances_wallet_id_key" ON "wallet_balances"("wallet_id");

-- CreateIndex
CREATE INDEX "wallet_ledger_entries_wallet_id_occurred_at_idx" ON "wallet_ledger_entries"("wallet_id", "occurred_at" DESC);

-- CreateIndex
CREATE INDEX "wallet_ledger_entries_order_id_idx" ON "wallet_ledger_entries"("order_id");

-- CreateIndex
CREATE UNIQUE INDEX "api_providers_slug_key" ON "api_providers"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "assets_public_id_key" ON "assets"("public_id");

-- CreateIndex
CREATE UNIQUE INDEX "assets_ticker_key" ON "assets"("ticker");

-- CreateIndex
CREATE UNIQUE INDEX "assets_listing_id_key" ON "assets"("listing_id");

-- CreateIndex
CREATE INDEX "assets_status_ticker_idx" ON "assets"("status", "ticker");

-- CreateIndex
CREATE INDEX "asset_price_ticks_asset_id_recorded_at_idx" ON "asset_price_ticks"("asset_id", "recorded_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "order_book_levels_asset_id_side_level_rank_key" ON "order_book_levels"("asset_id", "side", "level_rank");

-- CreateIndex
CREATE UNIQUE INDEX "api_listings_public_id_key" ON "api_listings"("public_id");

-- CreateIndex
CREATE INDEX "api_listings_seller_wallet_id_status_idx" ON "api_listings"("seller_wallet_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "api_listing_credentials_listing_id_key" ON "api_listing_credentials"("listing_id");

-- CreateIndex
CREATE INDEX "verification_jobs_listing_id_status_idx" ON "verification_jobs"("listing_id", "status");

-- CreateIndex
CREATE INDEX "verification_jobs_key_fingerprint_idx" ON "verification_jobs"("key_fingerprint");

-- CreateIndex
CREATE INDEX "verification_events_occurred_at_idx" ON "verification_events"("occurred_at" DESC);

-- CreateIndex
CREATE INDEX "verification_events_asset_id_idx" ON "verification_events"("asset_id");

-- CreateIndex
CREATE UNIQUE INDEX "orders_public_id_key" ON "orders"("public_id");

-- CreateIndex
CREATE INDEX "orders_buyer_wallet_id_status_idx" ON "orders"("buyer_wallet_id", "status");

-- CreateIndex
CREATE INDEX "orders_seller_wallet_id_status_idx" ON "orders"("seller_wallet_id", "status");

-- CreateIndex
CREATE INDEX "orders_status_created_at_idx" ON "orders"("status", "created_at" DESC);

-- CreateIndex
CREATE INDEX "order_lifecycle_events_order_id_occurred_at_idx" ON "order_lifecycle_events"("order_id", "occurred_at");

-- CreateIndex
CREATE INDEX "escrow_events_order_id_occurred_at_idx" ON "escrow_events"("order_id", "occurred_at");

-- CreateIndex
CREATE UNIQUE INDEX "order_disputes_order_id_key" ON "order_disputes"("order_id");

-- CreateIndex
CREATE UNIQUE INDEX "chat_rooms_order_id_key" ON "chat_rooms"("order_id");

-- CreateIndex
CREATE INDEX "chat_messages_room_id_sent_at_idx" ON "chat_messages"("room_id", "sent_at");

-- CreateIndex
CREATE UNIQUE INDEX "reputation_profiles_wallet_id_key" ON "reputation_profiles"("wallet_id");

-- CreateIndex
CREATE UNIQUE INDEX "reputation_profiles_actor_slug_key" ON "reputation_profiles"("actor_slug");

-- CreateIndex
CREATE INDEX "reputation_events_profile_id_occurred_at_idx" ON "reputation_events"("profile_id", "occurred_at" DESC);

-- CreateIndex
CREATE INDEX "platform_metric_snapshots_metric_key_captured_at_idx" ON "platform_metric_snapshots"("metric_key", "captured_at" DESC);

-- CreateIndex
CREATE INDEX "sla_breaches_policy_id_breached_at_idx" ON "sla_breaches"("policy_id", "breached_at" DESC);

-- AddForeignKey
ALTER TABLE "terminal_preferences" ADD CONSTRAINT "terminal_preferences_wallet_id_fkey" FOREIGN KEY ("wallet_id") REFERENCES "wallets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallet_balances" ADD CONSTRAINT "wallet_balances_wallet_id_fkey" FOREIGN KEY ("wallet_id") REFERENCES "wallets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallet_ledger_entries" ADD CONSTRAINT "wallet_ledger_entries_wallet_id_fkey" FOREIGN KEY ("wallet_id") REFERENCES "wallets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallet_ledger_entries" ADD CONSTRAINT "wallet_ledger_entries_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assets" ADD CONSTRAINT "assets_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "api_providers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assets" ADD CONSTRAINT "assets_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "api_listings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_price_ticks" ADD CONSTRAINT "asset_price_ticks_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_book_levels" ADD CONSTRAINT "order_book_levels_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "api_listings" ADD CONSTRAINT "api_listings_seller_wallet_id_fkey" FOREIGN KEY ("seller_wallet_id") REFERENCES "wallets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "api_listings" ADD CONSTRAINT "api_listings_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "api_providers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "api_listing_credentials" ADD CONSTRAINT "api_listing_credentials_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "api_listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "verification_jobs" ADD CONSTRAINT "verification_jobs_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "api_listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "verification_events" ADD CONSTRAINT "verification_events_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "verification_jobs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "verification_events" ADD CONSTRAINT "verification_events_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "verification_events" ADD CONSTRAINT "verification_events_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_buyer_wallet_id_fkey" FOREIGN KEY ("buyer_wallet_id") REFERENCES "wallets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_seller_wallet_id_fkey" FOREIGN KEY ("seller_wallet_id") REFERENCES "wallets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_lifecycle_events" ADD CONSTRAINT "order_lifecycle_events_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "escrow_events" ADD CONSTRAINT "escrow_events_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_disputes" ADD CONSTRAINT "order_disputes_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_rooms" ADD CONSTRAINT "chat_rooms_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "chat_rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_sender_wallet_id_fkey" FOREIGN KEY ("sender_wallet_id") REFERENCES "wallets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reputation_profiles" ADD CONSTRAINT "reputation_profiles_wallet_id_fkey" FOREIGN KEY ("wallet_id") REFERENCES "wallets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reputation_events" ADD CONSTRAINT "reputation_events_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "reputation_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sla_policies" ADD CONSTRAINT "sla_policies_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "api_providers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sla_breaches" ADD CONSTRAINT "sla_breaches_policy_id_fkey" FOREIGN KEY ("policy_id") REFERENCES "sla_policies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
