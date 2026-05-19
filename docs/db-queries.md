/*
================================================================================
EVENT ORCHESTRATOR - DATABASE SCHEMA QUERIES
================================================================================
This file contains all the Data Definition Language (DDL) queries required to 
initialize the Event Orchestrator database.

The schema is designed for multi-tenancy, reliability (Transactional Outbox),
and high-performance event processing.
*/

-- =============================================================================
-- 1. TENANT MANAGEMENT
-- =============================================================================
-- The core entity for multi-tenant isolation and authentication.

CREATE TABLE IF NOT EXISTS tenant (
    id          UUID PRIMARY KEY DEFAULT uuidv7(),
    name        VARCHAR(100) UNIQUE,
    enabled     BOOLEAN DEFAULT true,
    created_at  TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    deleted_at  TIMESTAMPTZ DEFAULT NULL
);

-- =============================================================================
-- 2. RULES & TRANSFORMATION
-- =============================================================================
-- Metadata and versioning for payload transformation logic.

CREATE TABLE IF NOT EXISTS rules (
    id          SERIAL PRIMARY KEY,
    tenant_id   UUID NOT NULL,
    name        VARCHAR(100),
    description VARCHAR(300),
    enabled     BOOLEAN DEFAULT true,
    created_at  TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    deleted_at  TIMESTAMPTZ DEFAULT NULL,
    
    CONSTRAINT fk_rule_tenant
        FOREIGN KEY (tenant_id)
        REFERENCES tenant(id)
        ON DELETE CASCADE
);

CREATE INDEX idx_rule_tenant_enabled
    ON rules (tenant_id, enabled)
    WHERE deleted_at IS NULL;

-- Versioned storage for transformation templates and validation schemas.
CREATE TABLE IF NOT EXISTS rule_version (
    id                  SERIAL PRIMARY KEY,
    rule_id             INT NOT NULL,
    version_number      INT DEFAULT 1,
    schema              JSONB NOT NULL,
    transform_template  JSONB, -- DSL-based mapping rules
    changes_summary     TEXT,
    created_at          TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT uq_rule_version 
        UNIQUE(rule_id, version_number),
    CONSTRAINT fk_version_rule
        FOREIGN KEY (rule_id)
        REFERENCES rules(id)
        ON DELETE CASCADE
);

CREATE INDEX idx_rule_id_version
    ON rule_version (rule_id, version_number DESC);

-- =============================================================================
-- 3. SUBSCRIPTIONS (WEBHOOKS)
-- =============================================================================
-- Defines outgoing webhook targets and their delivery configurations.

CREATE TYPE AUTH_TYPE_ENUM AS ENUM ('hmac', 'bearer');

CREATE TABLE IF NOT EXISTS subscription (
    id                  UUID PRIMARY KEY DEFAULT uuidv7(),
    tenant_id           UUID NOT NULL,
    rule_id             INT,
    name                VARCHAR(100) NOT NULL,
    endpoint_url        TEXT NOT NULL,
    auth_type           AUTH_TYPE_ENUM NOT NULL,
    auth_secret_ref     TEXT NOT NULL,
    max_retries_allowed INT DEFAULT 3,
    concurrency_limit   INT DEFAULT 1,
    rate_limit_rps      INT DEFAULT 0, -- 0 indicates no rate limiting
    enabled             BOOLEAN DEFAULT true,
    created_at          TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    deleted_at          TIMESTAMPTZ DEFAULT NULL,
    
    CONSTRAINT fk_subscription_tenant
        FOREIGN KEY (tenant_id)
        REFERENCES tenant(id)
        ON DELETE CASCADE,
    CONSTRAINT uq_tenant_id_name
        UNIQUE(tenant_id, name),
    CONSTRAINT fk_subscription_rule
        FOREIGN KEY (rule_id)
        REFERENCES rules(id)
        ON DELETE SET NULL
);

CREATE INDEX idx_subscription_tenant_enabled
    ON subscription (tenant_id, enabled)
    WHERE deleted_at IS NULL;

-- =============================================================================
-- 4. EVENT INGESTION
-- =============================================================================
-- Core storage for incoming event data and idempotency validation.

CREATE TYPE EVENT_STATUS_ENUM AS ENUM (
    'NOT_STARTED',
    'QUEUED',
    'IN_PROGRESS',
    'DELIVERED',
    'FAILED',
    'DLQ'
);

CREATE TABLE IF NOT EXISTS events (
    id                  UUID PRIMARY KEY DEFAULT uuidv7(),
    tenant_id           UUID NOT NULL,
    event_type          VARCHAR(100) NOT NULL,
    source              VARCHAR(100) NOT NULL,
    original_payload    JSONB NOT NULL,
    received_at         TIMESTAMPTZ NOT NULL,
    status              EVENT_STATUS_ENUM NOT NULL,
    idempotency_key     VARCHAR(100) NOT NULL,
    created_at          TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    deleted_at          TIMESTAMPTZ DEFAULT NULL,
    
    CONSTRAINT fk_event_tenant
        FOREIGN KEY (tenant_id)
        REFERENCES tenant(id)
        ON DELETE SET NULL,
    CONSTRAINT uq_tenant_idempotency_key 
        UNIQUE(tenant_id, idempotency_key)
);

-- Separate table for fast idempotency lookups
CREATE TABLE IF NOT EXISTS idempotency_key (
    id               SERIAL PRIMARY KEY,
    tenant_id        UUID NOT NULL,
    event_id         UUID NOT NULL,
    idempotency_key  VARCHAR(100) NOT NULL,
    created_at       TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_idempotency_key_tenant
        FOREIGN KEY (tenant_id)
        REFERENCES tenant(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_idempotency_key_event
        FOREIGN KEY (event_id)
        REFERENCES events(id)
        ON DELETE CASCADE,
    CONSTRAINT uq_tenant_idempotency 
        UNIQUE(tenant_id, idempotency_key)
);

-- =============================================================================
-- 5. TRANSACTIONAL OUTBOX
-- =============================================================================
-- Reliable task management for background processing.

CREATE TYPE OUTBOX_TASK_TYPE_ENUM AS ENUM (
    'TRANSFORM',
    'DELIVER',
    'DLQ'
);

CREATE TYPE OUTBOX_STATUS_ENUM AS ENUM (
    'PENDING',
    'QUEUED',
    'PROCESSING',
    'COMPLETED',
    'FAILED'
);

CREATE TABLE IF NOT EXISTS event_outbox (
    id                   UUID PRIMARY KEY DEFAULT uuidv7(),
    event_id             UUID NOT NULL,
    tenant_id            UUID NOT NULL,
    subscription_id      UUID NOT NULL,
    rule_id              INT,
    rule_version_number  INT,
    source_outbox_id     UUID,
    transformed_payload  JSONB,
    task_type            OUTBOX_TASK_TYPE_ENUM NOT NULL,
    status               OUTBOX_STATUS_ENUM NOT NULL DEFAULT 'PENDING',
    scheduled_at         TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    picked_at            TIMESTAMPTZ NULL,
    retry_count          INT DEFAULT 0,
    max_retries          INT DEFAULT 5,
    worker_id            VARCHAR(100) NULL,
    error_message        TEXT,
    created_at           TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at           TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_outbox_event
        FOREIGN KEY (event_id)
        REFERENCES events(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_outbox_subscription
        FOREIGN KEY (subscription_id)
        REFERENCES subscription(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_outbox_tenant
        FOREIGN KEY (tenant_id)
        REFERENCES tenant(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_outbox_self
        FOREIGN KEY (source_outbox_id)
        REFERENCES event_outbox(id)
        ON DELETE SET NULL,
    CONSTRAINT fk_outbox_rule_id
        FOREIGN KEY (rule_id)
        REFERENCES rules(id)
        ON DELETE RESTRICT
);

-- Partial index for the Outbox Publisher poller
CREATE INDEX idx_task_type_scheduled_at
    ON event_outbox (task_type, scheduled_at)
    WHERE status = 'PENDING';

-- =============================================================================
-- 6. AUDIT & DELIVERY LOGS
-- =============================================================================
-- Comprehensive logs for every delivery attempt.

CREATE TABLE IF NOT EXISTS delivery_attempt (
    id                   UUID PRIMARY KEY DEFAULT uuidv7(),
    event_id             UUID NOT NULL,
    subscription_id      UUID NOT NULL,
    rule_id              INT NOT NULL,
    rule_version_number  INT NOT NULL,
    attempt_number       INT DEFAULT 1,
    transformed_payload  JSONB,
    request_headers      JSONB,
    request_body         JSONB,
    response_code        INT DEFAULT NULL,
    response_headers     JSONB,
    response_body        JSONB,
    error_message        VARCHAR(300) DEFAULT NULL,
    worker_id            VARCHAR(100) NOT NULL,
    started_at           TIMESTAMPTZ,
    finished_at          TIMESTAMPTZ,
    created_at           TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_delivery_attempt_event
        FOREIGN KEY (event_id)
        REFERENCES events(id)
        ON DELETE RESTRICT,
    CONSTRAINT fk_delivery_attempt_subscriber
        FOREIGN KEY (subscription_id)
        REFERENCES subscription(id)
        ON DELETE RESTRICT,
    CONSTRAINT fk_delivery_attempt_rule
        FOREIGN KEY (rule_id)
        REFERENCES rules(id)
        ON DELETE RESTRICT
);
