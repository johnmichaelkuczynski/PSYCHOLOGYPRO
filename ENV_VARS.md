# Environment variables

The production container listens on `0.0.0.0` and uses port `5000` unless
`PORT` is set. Runtime uploads and analysis data are stored in PostgreSQL.

| Variable | Required to start | Expected value / use |
| --- | --- | --- |
| `DATABASE_URL` | Yes | PostgreSQL connection URL for the Neon database, including credentials and database name. Keep it in Coolify's secret/environment settings. Startup migrations use this database. |
| `PORT` | No | HTTP listen port; defaults to `5000`. Coolify should route HTTPS traffic through Traefik to this container port. |
| `NODE_ENV` | No | Set to `production` in the Docker image. |
| `API_KEY` | No | Optional fallback key for the configured LLM provider. |
| `OPENAI_API_KEY` | No | API key for the `zhi1` (OpenAI) analysis provider. |
| `OPENAI_MODEL` | No | OpenAI model for `zhi1`; defaults to `gpt-6-luna`. |
| `ANTHROPIC_API_KEY` | No | API key for the `zhi2` (Anthropic) analysis provider. |
| `ANTHROPIC_MODEL` | No | Anthropic model for `zhi2`; defaults to `claude-opus-5-5`. |
| `DEEPSEEK_API_KEY` | No | API key for the `zhi3` (DeepSeek) analysis provider. |
| `PERPLEXITY_API_KEY` | No | API key for the `zhi4` (Perplexity) analysis provider. |
| `XAI_API_KEY` | No | API key for the `zhi5` (xAI) analysis provider. |

The application currently has no login/session middleware or OAuth callback, so
`SESSION_SECRET` and `PUBLIC_BASE_URL` are not read or required. Stripe SDK
packages are not initialized by the server, and no Stripe key is required to
start.

LLM keys are optional at startup. A key is required only when a request uses its
corresponding provider; `API_KEY` is used as a fallback when a provider-specific
key is absent.
