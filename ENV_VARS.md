# ⚠️ IMPORTANTE: Configuração de Variáveis de Ambiente no Vercel

## Passo a Passo para Configurar no Dashboard Vercel:

1. Acesse seu projeto no [Vercel Dashboard](https://vercel.com/dashboard)
2. Vá em **Settings** → **Environment Variables**
3. Adicione cada variável abaixo:

## Variáveis Obrigatórias:

### VITE_DATA_SOURCE
- **Key:** `VITE_DATA_SOURCE`
- **Value:** `supabase`
- **Environments:** Production, Preview, Development

### VITE_APP_TITLE
- **Key:** `VITE_APP_TITLE`
- **Value:** `Garagem40`
- **Environments:** Production, Preview, Development

### VITE_SUPABASE_URL
- **Key:** `VITE_SUPABASE_URL`
- **Value:** `https://jzprxydtigwitltaagnd.supabase.co`
- **Environments:** Production, Preview, Development

### VITE_SUPABASE_ANON_KEY
- **Key:** `VITE_SUPABASE_ANON_KEY`
- **Value:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp6cHJ4eWR0aWd3aXRsdGFhZ25kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg5MjY1MTUsImV4cCI6MjA4NDUwMjUxNX0.aN77TvWcAnukFx17jsIqaQpcblR1Cb87qfGKtESo5mU`
- **Environments:** Production, Preview, Development

## 🔒 Segurança

⚠️ **NUNCA** commite o arquivo `.env.local` no Git!
⚠️ O `.env.local` já está listado no `.gitignore` para sua proteção.

## ✅ Verificação

Após adicionar as variáveis:
1. Faça um novo deploy ou redeploy do projeto
2. Verifique os logs de build para confirmar que as variáveis foram carregadas
3. Teste a aplicação para garantir conexão com Supabase
