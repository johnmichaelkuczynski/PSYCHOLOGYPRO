---
name: Provider connections
description: Provider model selection and Replit versus self-hosted credential boundaries
---

Verify provider model identifiers against current official documentation or the account's live model list before changing defaults. Model availability and account access are separate checks.

**Why:** Retired model identifiers caused provider failures; a supported model name alone does not prove that a particular account can use it.

**How to apply:** Keep model overrides configurable and distinguish metadata/connectivity checks from a successful generation test.

Replit's connected xAI account is a convenience for the Replit runtime, not a credential source for Coolify.

**Why:** This project must also run as a self-hosted Docker application.

**How to apply:** Preserve direct provider-key support for self-hosting. Never assume a workspace connection transfers its credentials to an external deployment.
