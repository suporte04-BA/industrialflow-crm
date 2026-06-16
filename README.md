# IndustrialFlow CRM

CRM completo para gestao de locacao de equipamentos industriais, construido com React + Supabase + Cloudflare.

## Stack

- **Frontend:** React + Vite + Tailwind CSS
- **Backend:** Supabase (PostgreSQL + Auth + Storage)
- **Deploy:** Cloudflare Pages
- **Estado:** React Query (TanStack)
- **Graficos:** Recharts
- **UI:** Lucide Icons + Sonner

## Funcionalidades

- **Dashboard** - Metricas, graficos de receita, alertas de contratos
- **Ordens de Servico** - CRUD completo com filtros e busca
- **Equipamentos** - Cards com status (locado/disponivel/manutencao)
- **Contratos** - Gestao com alertas de vencimento
- **Comprovantes de Entrega** - Formulario completo com itens locados
- **Assinatura Digital** - Canvas para assinatura + upload
- **Bloco de Notas** - Editor simples de anotacoes

## Como rodar

```bash
# Instalar dependencias
npm install

# Configurar variaveis de ambiente
cp .env.example .env
# Editar .env com suas credenciais do Supabase

# Rodar em desenvolvimento
npm run dev
```

## Configuracao do Supabase

1. Criar um projeto no [Supabase](https://supabase.com)
2. Copiar a URL e a anon key para o `.env`
3. Rodar o SQL em `supabase/schema.sql` no SQL Editor do Supabase
4. (Opcional) Configurar autenticacao em Authentication > Providers

## Deploy no Cloudflare Pages

```bash
# Build
npm run build

# Deploy via Wrangler
npx wrangler pages deploy dist
```

Ou configurar deploy automatico via GitHub Actions.

## Estrutura

```
src/
├── components/
│   ├── auth/        # Login e rotas protegidas
│   ├── layout/      # Sidebar, Header, Layout
│   ├── os/          # Modal de detalhes da OS
│   └── ui/          # Componentes reutilizaveis
├── data/            # Dados mock iniciais
├── lib/             # Cliente Supabase
├── pages/           # Paginas do aplicativo
├── App.jsx          # Roteamento principal
└── index.css        # Estilos globais
```

## Licensa

MIT
