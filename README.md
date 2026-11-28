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

## Em desenvolvimento

### Perguntas de Follow-up

A tela de Perguntas de Follow-up ainda está em desenvolvimento e não aparece na interface. Foram retirados todos os caminhos até ela:

- a aba "Perguntas de Follow-up" na navegação do projeto;
- o link "Follow-up" no rodapé;
- o botão "Ver Perguntas de Follow-up" na Visão Geral;
- o botão "Resolver em Perguntas de Follow-up" no alerta de falta de informação da User Story.

O código da tela continua em `src/screens/FollowUpScreen.tsx`, e a rota `follow-up` continua registrada em `src/App.tsx`. A API já gera, lista e responde perguntas (US-10 a US-12). Ainda falta, na API, descartar uma pergunta: a tela avisa que essa função não está disponível.

Para reativar a tela, volte a aba em `src/components/ProjectNav.tsx` e os botões nas telas citadas acima.

### Ações em lote na Visão Geral

O card "Ações da Tarefa", acima do Backlog, tem dois botões:

- **Auditar todas:** já funciona. Inicia o job `auditoria_evidencias` (`POST /projetos/{id}/auditoria-evidencias`), que audita as evidências de todas as User Stories ativas, menos as desaprovadas. O andamento e o resultado aparecem no aviso do topo da tela. 
- **Analisar todas:** inicia o job `avaliacao_qualidade` (`POST /projetos/{id}/historias/avaliar` com a lista vazia), que avalia pelos 13 critérios QUS todas as User Stories ativas, menos as desaprovadas. Se uma história falhar, as demais continuam.

O andamento e o resultado dos dois aparecem no aviso do topo da tela. Enquanto um lote roda, os dois botões ficam bloqueados, para não disputarem o LLM local. A API não impede lotes simultâneos.

Limitação: o carregamento de cada User Story no Backlog só aparece para as que ainda não têm nota. Numa reavaliação, a nota das que já tinham muda só quando a história é avaliada; o progresso geral fica no aviso do topo.

## Tipos da API

`src/api/schema.d.ts` é gerado a partir do contrato da API. Para atualizar, com a API rodando:

```bash
npm run api:types
```
