<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# ReqScriba Interface

Frontend do ReqScriba. Conecta-se por HTTP à API do projeto `req-scriba`.

**Integração em andamento:** os projetos já vêm da API. Ingestão, fontes, backlog, avaliação e follow-up ainda usam dados de exemplo.

## Como rodar

**Pré-requisitos:** Node.js e a API do `req-scriba` rodando (`http://localhost:8000`).

1. Instale as dependências: `npm install`
2. Opcional: se a API estiver em outro endereço, copie `.env.example` para `.env.local` e ajuste `VITE_API_URL`
3. Rode o app: `npm run dev` (`http://localhost:3000`)

A origem do frontend precisa estar em `REQSCRIBA_CORS_ORIGINS` na API. O padrão já libera `http://localhost:3000`.

## Tipos da API

`src/api/schema.d.ts` é gerado a partir do contrato da API. Para atualizar, com a API rodando:

```bash
npm run api:types
```
