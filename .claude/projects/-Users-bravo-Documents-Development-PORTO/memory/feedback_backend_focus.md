---
name: Backend setup - don't touch frontend
description: When setting up backend, do not modify or rebuild frontend files. Keep backend isolated.
type: feedback
---

When working on backend setup, do not modify existing frontend files or run frontend build/lint commands.

**Why:** User wants backend work to be isolated and not interfere with the running frontend.

**How to apply:** Keep backend code in `backend/` directory or new server-only files. Don't modify existing providers, layouts, or frontend components during backend setup. Don't run `build:frontend` or `lint:frontend` to validate backend changes.
