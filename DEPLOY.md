# Configuração do Projeto Garagem40 para Vercel

Este projeto está configurado para deploy no Vercel.

## 🚀 Deploy Rápido

### Opção 1: Via Dashboard Vercel
1. Acesse [vercel.com](https://vercel.com)
2. Faça login com sua conta GitHub
3. Clique em "Add New Project"
4. Importe este repositório
5. Configure as variáveis de ambiente (veja abaixo)
6. Clique em "Deploy"

### Opção 2: Via CLI
```bash
# Instalar Vercel CLI
npm i -g vercel

# Deploy
vercel
```

## 🔐 Variáveis de Ambiente Necessárias

Configure estas variáveis no dashboard do Vercel (Settings → Environment Variables):

```env
VITE_DATA_SOURCE=supabase
VITE_APP_TITLE=Garagem40
VITE_SUPABASE_URL=https://jzprxydtigwitltaagnd.supabase.co
VITE_SUPABASE_ANON_KEY=seu_anon_key_aqui
```

⚠️ **IMPORTANTE**: Nunca commite o arquivo `.env.local` com suas credenciais reais!

## 📦 Build Local

Para testar o build localmente antes do deploy:

```bash
npm run build
npm run preview
```

## 🔧 Estrutura do Projeto

- `dist/` - Pasta de saída do build (gerada automaticamente)
- `vercel.json` - Configuração do Vercel
- `.env.local` - Variáveis de ambiente locais (não versionado)

## 📝 Scripts Disponíveis

- `npm run dev` - Servidor de desenvolvimento
- `npm run build` - Build de produção
- `npm run preview` - Preview do build local

## 🌐 URL de Produção

Após o deploy, seu projeto estará disponível em:
`https://garagem40.vercel.app` (ou URL customizada configurada)
