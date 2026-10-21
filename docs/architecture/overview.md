# Arquitetura

O DevLife é um monorepositório gerenciado com Turborepo e pnpm.

apps/: aplicações (web, mobile, api)

packages/: código compartilhado

database/: migrações e seeds

Comunicação: frontends consomem a API REST via api-client.
