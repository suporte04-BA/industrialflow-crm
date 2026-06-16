# ============================================
# IndustrialFlow CRM - Deploy no Cloudflare
# ============================================

## INSTALACAO (uma vez so)

### 1. Instalar Wrangler CLI
```bash
npm install -g wrangler
```

### 2. Login no Cloudflare
```bash
wrangler login
```
Isso vai abrir o navegador para autenticar.

### 3. Verificar login
```bash
wrangler whoami
```

---

## DEPLOY DO FRONTEND (Cloudflare Pages)

### Opcao A: Deploy manual
```bash
cd industrialflow-crm
npm install
npm run build
wrangler pages deploy dist --project-name=industrialflow-crm
```

### Opcao B: Deploy via GitHub (automatico)
1. Ir em https://dash.cloudflare.com/pages
2. Clicar "Create a project"
3. Conectar o repositorio GitHub: `suporte04-BA/industrialflow-crm`
4. Configurar:
   - Build command: `npm run build`
   - Build output: `dist`
   - Environment variables: adicionar `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`
5. Clicar "Save and Deploy"

---

## DEPLOY DO WORKER (Cloudflare Workers)

### Opcao A: Deploy manual
```bash
cd industrialflow-crm
wrangler deploy
```

### Opcao B: Deploy via GitHub (automatico)
O workflow `.github/workflows/deploy.yml` ja esta configurado.
A cada push no master, faz deploy automatico.

---

## SECRETS DO WORKER

### Via CLI (recomendado):
```bash
cd industrialflow-crm

# Service Role Key do Supabase
wrangler secret put SUPABASE_SERVICE_ROLE_KEY
# Cole: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1iY2RiY2xvc29tcXBmYm95ZmZqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTYwNzExOSwiZXhwIjoyMDk3MTgzMTE5fQ.-DECZnh9lzfPqLI81hpFvXI4-n0LBP6Tn1M2znDduvQ

# JWT Secret do Supabase
wrangler secret put SUPABASE_JWT_SECRET
# Cole: 4784f29d-337c-4862-803e-b25755db4849
```

### Via Dashboard:
1. Ir em https://dash.cloudflare.com/workers
2. Selecionar o Worker `industrialflow-crm`
3. Ir em Settings > Variables
4. Adicionar secrets:
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `SUPABASE_JWT_SECRET`

---

## EDGE FUNCTIONS DO SUPABASE

### Instalar Supabase CLI
```bash
npm install -g supabase
```

### Login
```bash
supabase login
```

### Linkar ao projeto
```bash
cd industrialflow-crm
supabase link --project-ref mbcdbclosomqpfboyffj
```

### Deploy das Edge Functions
```bash
supabase functions deploy get-dashboard-stats --use-api
supabase functions deploy process-signature --use-api
supabase functions deploy send-daily-report --use-api
```

### Definir secrets das Edge Functions
```bash
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1iY2RiY2xvc29tcXBmYm95ZmZqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTYwNzExOSwiZXhwIjoyMDk3MTgzMTE5fQ.-DECZnh9lzfPqLI81hpFvXI4-n0LBP6Tn1M2znDduvQ
```

### Testar Edge Function
```bash
curl -X POST https://mbcdbclosomqpfboyffj.supabase.co/functions/v1/get-dashboard-stats \
  -H "Authorization: Bearer SUA_ANON_KEY" \
  -H "Content-Type: application/json"
```

---

## SCHEMA DO BANCO

### Rodar o SQL
1. Ir em https://supabase.com/dashboard/project/mbcdbclosomqpfboyffj/sql
2. Colar o conteudo de `supabase/schema.sql`
3. Clicar em "Run"

---

## VERIFICACAO FINAL

### Testar o Worker
```bash
curl https://transobras.suporte04.workers.dev/api/health
# Deve retornar: {"status":"ok","timestamp":"..."}
```

### Testar o Worker - Dashboard
```bash
curl https://transobras.suporte04.workers.dev/api/dashboard
# Deve retornar metricas do banco
```

### Testar o Frontend
1. Abrir https://industrialflow-crm.pages.dev
2. Fazer login com email/senha criado no Supabase
3. Verificar se os dados aparecem

---

## COMANDOS RAPIDOS

```bash
# Deploy completo (frontend + worker)
npm run build && wrangler pages deploy dist --project-name=industrialflow-crm && wrangler deploy

# Deploy apenas do worker
wrangler deploy

# Deploy apenas do frontend
npm run build && wrangler pages deploy dist --project-name=industrialflow-crm

# Ver logs do worker
wrangler tail

# Ver logs do Supabase
supabase functions logs get-dashboard-stats
```
