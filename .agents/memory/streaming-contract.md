---
name: Streaming contract
description: User expectations and non-obvious failure modes for live analysis output
---

Display the model's returned words immediately rather than waiting for a finished analysis. A separate live-output window must remain movable, resizable, and collapsible.

**Why:** The user rejected a multi-minute blank spinner and explicitly requested word-by-word output.

**How to apply:** Do not add artificial batch waits or truncate the live text. Preserve cumulative output for clients that connect late or reconnect. Process every incoming event: storing only the latest event can lose text when completion and text events arrive in one React update.
