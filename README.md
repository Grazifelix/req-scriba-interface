# ReqScriba Interface

Frontend do ReqScriba. Conecta-se por HTTP à API do projeto `req-scriba`, que transcreve áudios, lê documentos, gera User Stories e as avalia pelos 13 critérios QUS. Todos os dados vêm da API.

## Como rodar

**Pré-requisitos:** Node.js e a API do `req-scriba` rodando.

### 1. Inicie a API

Em um terminal, na pasta do `req-scriba`, com o Ollama rodando:

```bash
make run
```

No Windows sem `make`:

```powershell
.venv\Scripts\python.exe -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Para confirmar que a API subiu, abra `http://localhost:8000/api/v1/health`. A instalação da API está no README do `req-scriba`.

### 2. Inicie o frontend

Em outro terminal, na pasta do `req-scriba-interface`:

```bash
npm install
npm run dev
```

Depois, abra `http://localhost:3000`.

### Problemas comuns

- **API em outro endereço:** copie `.env.example` para `.env.local` e ajuste `VITE_API_URL`. Informe só a origem, sem `/api/v1`, e reinicie o `npm run dev`.
- **Erro de CORS:** a origem do frontend precisa estar em `REQSCRIBA_CORS_ORIGINS` na API. O padrão já libera `http://localhost:3000`.

## O que depende da API

Dois recursos já estão na interface, mas a API ainda não os oferece. Até lá, a tela mostra a mensagem de erro:

- **Planilhas (`.xlsx`):** o envio é recusado pela API, e o motivo aparece na fila de arquivos.
- **Descartar pergunta:** a tela avisa que a função ainda não está disponível.

## Tipos da API

`src/api/schema.d.ts` é gerado a partir do contrato da API. Para atualizar, com a API rodando:

```bash
npm run api:types
```
