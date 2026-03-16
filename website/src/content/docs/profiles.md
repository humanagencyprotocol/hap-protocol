---
title: "HAP Authority Profiles"
version: "Version 0.3"
date: "March 2026"
---

Authorization templates for the [Human Agency Protocol](https://humanagencyprotocol.org). Each profile defines what an AI agent is allowed to do within a specific domain — the bounds a human sets, and the Gatekeeper enforces.

> **Version 0.3** — March 2026

---

## What Profiles Define

A profile is a complete authorization schema. It specifies:

- **Frame schema** — the bounds a human commits to (e.g., max amount, allowed currencies)
- **Execution context** — what the Gatekeeper checks at runtime, including cumulative limits
- **Execution paths** — governance tiers with required domain owners and TTLs
- **Gates** — the structured questions a human must answer before authorization
- **Tool gating** — how MCP tool arguments map to execution context fields

Profiles are referenced by ID (e.g., `spend@0.3`) and are immutable once published.

---

## Profiles

### spend — Financial Authority

Governs committing company money: charges, refunds, subscriptions.

| Bound | Type | Purpose |
|-------|------|---------|
| `amount_max` | per-transaction | Maximum monetary amount |
| `currency` | enum | Permitted currencies |
| `action_type` | enum | charge, refund, subscribe |
| `amount_daily_max` | cumulative | Daily spend cap |
| `amount_monthly_max` | cumulative | Monthly spend cap |
| `transaction_count_daily_max` | cumulative | Daily transaction limit |

| Path | Required Domains | Default TTL |
|------|-----------------|-------------|
| `spend-routine` | finance | 24h |
| `spend-reviewed` | finance, compliance | 4h |

Tool gating maps Stripe MCP tools — `create_payment_link`, `create_invoice_item`, `create_refund` — to the execution context. Read-only tools (`list_customers`, `retrieve_balance`) are ungated.

---

### ship — Deployment Authority

Governs what runs in production: merges, deployments, rollbacks.

| Bound | Type | Purpose |
|-------|------|---------|
| `repository` | enum | Authorized repositories |
| `scope` | enum | external (production) or internal (staging) |
| `action_type` | enum | merge, deploy, rollback |
| `deploy_count_daily_max` | cumulative | Daily deployment limit |

| Path | Required Domains | Default TTL |
|------|-----------------|-------------|
| `ship-internal` | engineering | 8h |
| `ship-external` | engineering, release_management | 2h |

Tool gating maps GitHub MCP tools — `merge_pull_request`, `create_or_update_file` — to the execution context. Read-only tools (`list_issues`, `get_file_contents`) are ungated.

---

### publish — Communication Authority

Governs sending anything externally as the company: emails, notifications, webhooks.

| Bound | Type | Purpose |
|-------|------|---------|
| `channel` | enum | email, webhook, notification |
| `audience` | enum | individual, segment, all |
| `recipient_max` | per-operation | Maximum recipients per send |
| `scope` | enum | external (real customers) or internal (test accounts) |
| `send_count_daily_max` | cumulative | Daily send limit |
| `send_count_monthly_max` | cumulative | Monthly send limit |

| Path | Required Domains | Default TTL |
|------|-----------------|-------------|
| `publish-transactional` | engineering | 24h |
| `publish-marketing` | marketing, product | 2h |
| `publish-all-users` | marketing, product, compliance | 1h |

---

### data — Data Authority

Governs accessing and modifying business data: queries, schema changes, exports.

| Bound | Type | Purpose |
|-------|------|---------|
| `access_level` | enum | read, write, admin |
| `data_scope` | enum | public, internal, pii |
| `scope` | enum | external (production) or internal (sandbox) |
| `row_limit_max` | per-query | Maximum rows returned |
| `query_count_daily_max` | cumulative | Daily query limit |
| `export_row_count_daily_max` | cumulative | Daily exported row limit |

| Path | Required Domains | Default TTL |
|------|-----------------|-------------|
| `data-read` | engineering | 8h |
| `data-write` | engineering, data_owner | 2h |
| `data-export` | data_owner, compliance | 1h |

---

### provision — Infrastructure Authority

Governs creating, modifying, or destroying infrastructure: DNS, compute, storage, secrets.

| Bound | Type | Purpose |
|-------|------|---------|
| `resource_type` | enum | dns, compute, storage, secret |
| `action_type` | enum | create, modify, delete |
| `scope` | enum | external (production) or internal (dev/sandbox) |
| `blast_radius` | enum | single, service, global |
| `change_count_daily_max` | cumulative | Daily change limit |

| Path | Required Domains | Default TTL |
|------|-----------------|-------------|
| `provision-internal` | engineering | 8h |
| `provision-external` | platform, engineering | 2h |
| `provision-destructive` | platform, engineering, security | 1h |

---

## How Profiles Work

A human creates an authorization by selecting a profile and execution path, setting the bounds (frame), and answering the gate questions. Domain owners cryptographically attest to the frame. The Gatekeeper then enforces those bounds on every tool call:

```
Human sets bounds          Agent requests execution        Gatekeeper checks
amount_max: 80 EUR    ->   amount: 5 EUR              ->  5 <= 80, approved
action_type: [charge]      action_type: "charge"          "charge" in [charge], approved
amount_daily_max: 500      amount_daily: 423 (from log)   423 + 5 <= 500, approved
```

If any bound is exceeded, the Gatekeeper blocks execution.

All profiles require the same six gates: frame, problem, objective, tradeoff, commitment, and decision owner.

---

## Community Profiles

Anyone can create and publish profiles through the [HAP Service Provider](https://humanagencyprotocol.com). Published profiles are immutable and versioned. There is no approval process — trust decisions are local.

---

See [humanagencyprotocol.org](https://humanagencyprotocol.org) for the full protocol specification.
