# Admin Scripts

## Bulk Tenant Onboarding

Script:

- [bulk-tenant-onboarding.mjs](/Users/brunofalcao/Desktop/Aplicações/dispara-lead-qstash/scripts/admin/bulk-tenant-onboarding.mjs)

Uso:

```bash
npm run admin:onboard-tenants -- --input scripts/admin/sample-bulk-tenant-onboarding.json --dry-run
```

Ou:

```bash
npm run admin:onboard-tenants -- --input <arquivo.json> --apply
```

## Variaveis de ambiente

Obrigatorias:

- `SUPABASE_SERVICE_ROLE_KEY`

Opcional:

- `SUPABASE_URL`
  - se ausente, o script usa `VITE_SUPABASE_URL` de `.env.local`
- `ADMIN_APP_URL`
  - usado apenas pelo script local para forcar o `redirectTo` dos convites
  - default local configurado: `https://disparalead.bflabs.com.br`

Para envio de email:

- `BREVO_API_KEY`
- o script tambem le `scripts/admin/.env.local`

## Origem da `BREVO_API_KEY`

Registrar como regra operacional:

- a `BREVO_API_KEY` nao fica versionada neste repositorio
- a chave deve ser obtida de um destes locais operacionais:
  - Supabase Secrets
  - Vercel environment variables
- para uso local do script admin, a chave pode ser armazenada em `scripts/admin/.env.local`
  - esse arquivo esta ignorado pelo Git

Se o objetivo for apenas criar tenants e usuarios sem disparar email, rode com:

```bash
npm run admin:onboard-tenants -- --input <arquivo.json> --dry-run --skip-email
```

ou:

```bash
npm run admin:onboard-tenants -- --input <arquivo.json> --apply --skip-email
```
