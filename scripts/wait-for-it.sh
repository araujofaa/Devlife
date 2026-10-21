#!/bin/bash

wait-for-it.sh - espera um serviço TCP ficar disponível
Uso: ./wait-for-it.sh host:port -- comando
Exemplo: ./wait-for-it.sh postgres:5432 -- pnpm run dev
