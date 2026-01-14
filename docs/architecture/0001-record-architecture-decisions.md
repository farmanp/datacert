---
id: record-architecture-decisions
title: 1. Record Architecture Decisions
sidebar_label: 1. Record Decisions
---

# 1. Record Architecture Decisions

Date: 2026-01-13

## Status

Accepted

## Context

We need a way to record architectural decisions made during the development of the DataLens Profiler. This will help current and future developers understand *why* certain choices were made, providing context and preventing the re-litigation of settled decisions without new information.

## Decision

We will use Architecture Decision Records (ADRs) to track key architectural decisions. We will follow a lightweight format similar to Michael Nygard's structure.

The records will be stored in `docs/architecture` and numbered sequentially (e.g., `0001-record-architecture-decisions.md`).

## Consequences

### Positive
*   Provides a history of decisions and their context.
*   Facilitates onboarding for new team members.
*   Encourages thoughtful decision-making.

### Negative
*   Requires discipline to write and maintain.
*   Can become outdated if not updated when decisions change (though usually, a new ADR supersedes the old one).
