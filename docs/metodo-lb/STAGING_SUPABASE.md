# Supabase Staging — Método LB Performance

Atualizado em 2026-09-19.

## Ambiente

- Projeto: `LB-Performance-Staging`
- Project ref: `jhwgegzzdjhnjgdofrlf`
- Região: `sa-east-1`
- Finalidade: desenvolvimento e homologação; não contém dados reais de atletas.

## Estado aplicado

O staging contém as tabelas legadas necessárias para o app atual e o schema privado `lb_core`.

O acesso direto pelo Data API está bloqueado para `anon` e `authenticated`:
- RLS habilitado em todas as tabelas;
- grants removidos;
- política explícita `deny_client_access`;
- advisor de segurança sem findings após a configuração.

O acesso da aplicação deve ocorrer pelo servidor Express/Postgres enquanto a autenticação definitiva é migrada.

## Núcleo Método LB

`lb_core` contém:
- assessment_sessions
- assessment_metrics
- interpretations
- decisions
- prescriptions
- monitoring_entries
- reassessments
- transfer_evidence
- audit_events

Regras testadas no banco:
- NON_COMPARABLE / REPEAT não pode ser comparado automaticamente ao baseline;
- confidence LOW exige main_limitation;
- fluxo sintético atleta → avaliação → métrica → interpretação → decisão persiste corretamente em transação de teste.

## Segurança

Não existe usuário padrão nem senha padrão no staging.
`ALLOW_LEGACY_DOB_LOGIN` deve permanecer `false`.
As feature flags do Método LB permanecem `false` até o deploy de homologação.

## Produção

O projeto de produção `LBHUB` não foi alterado nesta etapa.
