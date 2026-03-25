---
title: "HAP Authority Profiles"
version: "Version 0.3"
date: "March 2026"
---

Authorization templates for the [Human Agency Protocol](https://humanagencyprotocol.org). Each profile defines what an AI agent is allowed to do within a specific domain — the bounds a human sets, and the Gatekeeper enforces.

> **Version 0.4** — March 2026

---

## What Profiles Define

A profile is a complete authorization schema. It specifies:

- **Bounds schema** — the limits a human commits to (e.g., max amount, allowed currencies)
- **Context schema** — local parameters that stay encrypted (e.g., allowed services, environment)
- **Execution context** — what the Gatekeeper checks at runtime, including cumulative limits
- **Execution paths** — governance tiers with required domain owners and TTLs
- **Gates** — the structured questions a human must answer before authorization

Profiles are referenced by ID (e.g., `charge@0.4`) and are immutable once published.

---

## Profiles

### charge — Charge Authority

Governs charging customers: payments, refunds, subscriptions.

| Bound | Type | Purpose |
|-------|------|---------|
| `amount_max` | per-transaction | Maximum monetary amount |
| `amount_daily_max` | cumulative | Daily charge cap |
| `amount_monthly_max` | cumulative | Monthly charge cap |
| `transaction_count_daily_max` | cumulative | Daily transaction limit |

| Context | Type | Purpose |
|---------|------|---------|
| `currency` | enum | Permitted currencies |
| `action_type` | enum | charge, refund, subscribe |

| Path | Default TTL |
|------|-------------|
| `charge-routine` | 24h |
| `charge-reviewed` | 4h |

---

### purchase — Purchase Authority

Governs spending company money: subscriptions, supplies, services, advertising.

| Bound | Type | Purpose |
|-------|------|---------|
| `spend_max` | per-transaction | Maximum spend amount |
| `spend_daily_max` | cumulative | Daily spend cap |
| `spend_monthly_max` | cumulative | Monthly spend cap |
| `transaction_count_daily_max` | cumulative | Daily transaction limit |

| Context | Type | Purpose |
|---------|------|---------|
| `currency` | enum | Permitted currencies |
| `category` | enum | subscription, supply, service, advertising |
| `allowed_vendors` | subset | Approved vendor names |

| Path | Default TTL |
|------|-------------|
| `purchase-routine` | 24h |
| `purchase-reviewed` | 4h |

---

### email — Email Authority

Governs sending, drafting, and reading email via Gmail.

| Bound | Type | Purpose |
|-------|------|---------|
| `recipient_max` | per-email | Maximum recipients |
| `send_daily_max` | cumulative | Daily send/draft limit |
| `read_max_age_days` | per-query | Max email age for search |
| `read_daily_max` | cumulative | Daily read limit |

| Context | Type | Purpose |
|---------|------|---------|
| `allowed_recipients` | subset | Permitted email addresses |
| `allowed_domains` | subset | Permitted recipient domains |

| Path | Default TTL |
|------|-------------|
| `email-draft` | 24h |
| `email-send` | 4h |
| `email-read` | 24h |

---

### customers — Customer Management

Governs CRM operations: contacts, activities, deals, tasks.

| Bound | Type | Purpose |
|-------|------|---------|
| `contact_create_daily_max` | cumulative | Daily new contacts |
| `contact_modify_daily_max` | cumulative | Daily contact updates |
| `activity_create_daily_max` | cumulative | Daily activity logs |
| `deal_create_daily_max` | cumulative | Daily new deals |

| Context | Type | Purpose |
|---------|------|---------|
| `contact_type` | subset | customer, lead, partner, vendor |
| `access_level` | enum | read, write |

| Path | Default TTL |
|------|-------------|
| `customers-read` | 24h |
| `customers-write` | 8h |
| `customers-delete` | 2h |

---

### schedule — Scheduling Authority

Governs calendar access: reading, drafting, and booking events.

| Bound | Type | Purpose |
|-------|------|---------|
| `booking_daily_max` | cumulative | Daily new bookings |
| `booking_duration_max` | per-event | Max event duration (minutes) |
| `lookahead_days_max` | per-event | Max days into the future |

| Context | Type | Purpose |
|---------|------|---------|
| `allowed_calendars` | subset | Permitted calendar names |
| `allowed_attendees` | subset | Permitted attendee emails |
| `allowed_domains` | subset | Permitted attendee domains |

| Path | Default TTL |
|------|-------------|
| `schedule-read` | 24h |
| `schedule-draft` | 24h |
| `schedule-book` | 4h |

---

### publish — Content Publishing

Governs posting public content to social media, blogs, and other platforms.

| Bound | Type | Purpose |
|-------|------|---------|
| `post_daily_max` | cumulative | Daily post limit |
| `post_monthly_max` | cumulative | Monthly post limit |

| Context | Type | Purpose |
|---------|------|---------|
| `allowed_platforms` | subset | twitter, linkedin, instagram, blog, medium |
| `content_type` | enum | text, image, link, thread |
| `audience` | enum | public, followers, connections |

| Path | Default TTL |
|------|-------------|
| `publish-draft` | 24h |
| `publish-post` | 4h |

---

### records — Records Authority

Governs accessing and modifying personal structured data: queries, schema changes, exports. Renamed from `data` — for personal databases and spreadsheet replacements, not shared CRM data.

| Bound | Type | Purpose |
|-------|------|---------|
| `row_limit_max` | per-query | Maximum rows returned |
| `query_count_daily_max` | cumulative | Daily query limit |
| `export_row_count_daily_max` | cumulative | Daily exported row limit |

| Context | Type | Purpose |
|---------|------|---------|
| `access_level` | enum | read, write, admin |
| `data_scope` | enum | public, internal, pii |
| `scope` | enum | external (production), internal (sandbox) |

| Path | Default TTL |
|------|-------------|
| `records-read` | 8h |
| `records-write` | 2h |
| `records-export` | 1h |

---

## How Profiles Work

A human creates an authorization by selecting a profile and execution path, setting the bounds, and answering the gate questions. Domain owners cryptographically attest to the bounds. The Gatekeeper then enforces those bounds on every tool call:

```
Human sets bounds          Agent requests execution        Gatekeeper checks
amount_max: 80 EUR    ->   amount: 5 EUR              ->  5 <= 80, approved
action_type: [charge]      action_type: "charge"          "charge" in [charge], approved
amount_daily_max: 500      amount_daily: 423 (from log)   423 + 5 <= 500, approved
```

If any bound is exceeded, the Gatekeeper blocks execution.

All profiles require the same six gates: bounds, problem, objective, tradeoff, commitment, and decision owner.

---

## Community Profiles

Anyone can create and publish profiles through the [HAP Service Provider](https://humanagencyprotocol.com). Published profiles are immutable and versioned. There is no approval process — trust decisions are local.

---

See [humanagencyprotocol.org](https://humanagencyprotocol.org) for the full protocol specification.
