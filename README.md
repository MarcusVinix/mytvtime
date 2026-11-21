# MyTVTime

Aplicativo Web/PWA de acompanhamento de séries, doramas, filmes e datas de lançamento, construído com **Next.js (App Router)**, **Tailwind CSS**, **Supabase** e **TMDB API**.

> **Documentação Técnica & Fluxogramas completos:** veja [docs/ARQUITETURA_E_FLUXOS.md](docs/ARQUITETURA_E_FLUXOS.md) para diagramas de todos os fluxos, arquitetura, mapa de arquivos, rotas de API e modelagem do banco de dados.

## Funcionalidades
- **Séries:** *Assistir a seguir (Up Next)* com botão de 1 clique, *Em breve*, marcação por episódio, temporada inteira ou *"Até aqui"*, *Modo Reassistir (Rewatch)*, *Favoritos*, *Avaliações (1–5 estrelas)*, *Reações* e *Notas pessoais*.
- **Filmes:** *Quero assistir (Watchlist)*, *Em breve*, *Assistidos*, *Favoritos*, *Rewatch*, *Avaliações*, *Reações* e *Notas*.
- **Calendário Visual:** Visão **Mensal** e **Semanal** unificando episódios das suas séries e estreias dos seus filmes.
- **Listas Personalizadas:** Crie e gerencie coleções próprias (*"Para maratonar"*, *"Favoritas"*, etc.).
- **Explorar:** Busca em português, filtros por **Streaming no Brasil** (*Netflix, Prime Video, Max, Disney+, Apple TV+, Globoplay, Paramount+*), **Gênero** e **Doramas** (*K-Dramas, J-Dramas, C-Dramas*).
- **Detalhes completos:** Provedores de streaming no Brasil, **Trailers (YouTube)**, **Elenco Principal** clicável com **Perfil/Filmografia do Ator** e **Títulos Parecidos**.
- **Perfil & Dados:** Tempo total assistido, gráfico mensal (6 meses), *Gêneros Mais Assistidos*, *Meus Favoritos*, *Histórico Recente*, **Exportar/Importar Backup (JSON)** e **Trocar Senha**.
- **Autenticação & PWA:** Login com **Senha**, **Link Mágico por e-mail** e **Recuperação de senha**; instalável no celular (Android/iOS) com suporte a **Notificações Push em segundo plano** via Cron diário na Vercel.

---

## Deploy do Zero (Recuperação Completa)

Se você perder acesso às contas antigas (TMDB, Supabase, GitHub ou Vercel) ou quiser recriar o projeto do zero em outro ambiente, siga os 6 passos abaixo:

### 1. Criar nova conta no TMDB (Catálogo)
1. Acesse [themoviedb.org/signup](https://www.themoviedb.org/signup) e crie uma conta gratuita.
2. Confirme o e-mail e vá em **Configurações → API → Solicitar chave de API** (*Developer* / uso pessoal).
3. Guarde o **API Read Access Token (v4)**.

### 2. Criar novo projeto no Supabase (Banco + Login)
1. Acesse [supabase.com](https://supabase.com) e clique em **New Project** (região recomendada: `South America (São Paulo)`).
2. No menu lateral, abra **SQL Editor → New Query**, cole e execute **todo** o conteúdo de [supabase/schema.sql](supabase/schema.sql) *(ele já contém todas as tabelas, colunas, listas, Web Push e regras de segurança RLS da versão completa)*.
3. Em **Project Settings → API**, guarde:
   - **Project URL** (`https://xxxx.supabase.co` — **sem** `/rest/v1/` no final)
   - **Publishable / anon key**
   - *(Opcional para Push em segundo plano)* **service_role key**

### 3. Subir o código para um novo repositório no GitHub
1. Crie um repositório vazio (pode ser privado) em [github.com/new](https://github.com/new).
2. Na pasta do projeto, execute:
   ```powershell
   git remote remove origin
   git remote add origin https://github.com/SEU_USUARIO/mytvtime.git
   git push -u origin main
   ```

### 4. Publicar na Vercel (Grátis)
1. Acesse [vercel.com](https://vercel.com), entre com o GitHub e clique em **Add New → Project**.
2. Importe o repositório `mytvtime`.
3. Em **Environment Variables**, cadastre as chaves obrigatórias:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `TMDB_READ_ACCESS_TOKEN`
4. *(Opcional — para Notificações Push com o app fechado)* gere um novo par de chaves VAPID rodando `npx.cmd web-push generate-vapid-keys` e adicione também:
   - `NEXT_PUBLIC_VAPID_PUBLIC_KEY`
   - `VAPID_PRIVATE_KEY`
   - `VAPID_SUBJECT` (ex.: `mailto:seu@email.com`)
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `CRON_SECRET` (qualquer senha aleatória)
5. Clique em **Deploy** e anote a URL gerada (ex.: `https://mytvtime-xxxx.vercel.app`).

### 5. Configurar URLs no Supabase Auth
1. No painel do Supabase, vá em **Authentication → URL Configuration**.
2. Em **Site URL**, coloque `https://SEU-APP.vercel.app`.
3. Em **Redirect URLs**, adicione `https://SEU-APP.vercel.app/auth/callback` e salve.

### 6. Instalar no celular e restaurar seu backup
1. Abra `https://SEU-APP.vercel.app` no celular e crie sua conta.
2. **Instalar como PWA:**
   - **Android (Chrome):** menu **⋮ → Instalar aplicativo**.
   - **iPhone (Safari):** **Compartilhar → Adicionar à Tela de Início**.
3. **Restaurar histórico:** vá em **Perfil → Importar JSON** e selecione seu arquivo `mytvtime-backup-*.json` salvo anteriormente.

---

## Rodar Localmente (Desenvolvimento)

1. Copie `.env.example` para `.env.local` e preencha as chaves.
2. Instale as dependências e inicie o servidor:
   ```powershell
   npm.cmd install
   npm.cmd run dev
   ```
3. Acesse `http://localhost:3000`.

---

## Parametrização de Cache (`.env`)

Todos os tempos de cache podem ser ajustados via variáveis de ambiente (no `.env.local` ou na **Vercel → Environment Variables**). Caso não sejam informadas, o aplicativo usa automaticamente os valores padrão abaixo (em **segundos**, definidos em `src/lib/cache.ts`):

| Variável | Camada | Default | Onde é aplicada |
| :--- | :--- | :--- | :--- |
| `CACHE_TMDB_SEARCH_SECONDS` | Servidor (Next.js) | `300` (5 min) | Busca (`/api/tmdb/search`) |
| `CACHE_TMDB_DETAILS_SECONDS` | Servidor (Next.js) | `1800` (30 min) | Detalhes de série/filme, temporadas, filtros (`/discover`) e Cron |
| `CACHE_TMDB_TRENDING_SECONDS` | Servidor (Next.js) | `3600` (1 hora) | Tendências (`/trending`) e perfil de atores (`/person`) |
| `NEXT_PUBLIC_CACHE_LIBRARY_SECONDS` | Cliente (RAM) | `60` (1 min) | Biblioteca do Supabase e sessão do usuário |
| `NEXT_PUBLIC_CACHE_DETAILS_SECONDS` | Cliente (RAM) | `600` (10 min) | Detalhes de séries e temporadas no cliente (*Up Next* / *Calendário*) |
| `NEXT_PUBLIC_CACHE_TRENDING_SECONDS` | Cliente (RAM) | `900` (15 min) | Tendências no Explorar e sino de alertas |
| `NEXT_PUBLIC_CACHE_PERSON_SECONDS` | Cliente (RAM) | `1800` (30 min) | Perfil do ator / filmografia |

*(Dica: definir `0` em qualquer variável desativa o respectivo cache; ideal para testes pontuais.)*

---

## Produção: Manutenção e Possíveis Problemas

Para uso pessoal (ou pequeno grupo), o **MyTVTime** se mantém **estável e gratuito** usando os planos Free da **Vercel**, **Supabase** e **TMDB**. Abaixo estão os pontos de atenção em produção e como resolver cada possível problema:

| Possível Problema | Causa Provável | Como Resolver / Prevenir |
| :--- | :--- | :--- |
| **App não carrega listas ou falha no login após dias sem uso** | O plano gratuito do **Supabase pausa o projeto após 7 dias de inatividade**. | Acesse o painel do Supabase e clique em **Restore project** (nenhum dado é perdido). **Prevenção:** manter o Cron diário da Vercel ativo (`/api/cron/releases`) ou abrir o app ao menos 1x por semana evita a pausa. |
| **Erro `rate limit exceeded` ao enviar Link Mágico ou trocar senha** | O servidor de e-mail padrão do Supabase limita envios gratuitos (~2 a 4 e-mails/hora). | Aguarde cerca de 1 hora e tente novamente. Se precisar de mais volume, configure um SMTP gratuito (ex.: **Resend** ou **Brevo**) em *Supabase → Project Settings → Auth → SMTP Settings*. |
| **Link Mágico ou Recuperação de Senha redireciona errado / dá erro** | A URL de produção não está autorizada no Supabase Auth. | Em *Supabase → Authentication → URL Configuration*, confira **Site URL** (`https://seu-app.vercel.app`) e adicione `https://seu-app.vercel.app/auth/callback` em **Redirect URLs**. |
| **Alterações novas não aparecem no app instalado no celular** | Cache do navegador ou Service Worker segurando a versão anterior. | Feche completamente o app PWA e abra novamente. Se persistir, limpe o cache do site nas configurações do navegador. |
| **Notificações Push não chegam com o app fechado** | Chaves VAPID não configuradas na Vercel, permissão negada ou iOS sem instalar na Tela de Início. | 1) Confira na Vercel as variáveis `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`, `SUPABASE_SERVICE_ROLE_KEY` e `CRON_SECRET`.<br>2) No iPhone (iOS 16.4+), o Push só funciona no app adicionado à **Tela de Início**.<br>3) No Perfil, desative e ative novamente **Alertas de Lançamento**. |
| **Lentidão ou timeout no Cron / aba *Assistir a seguir*** | Muitas séries marcadas como *Assistindo* geram várias consultas ao TMDB ao mesmo tempo. | Mude séries já finalizadas para o status **Concluída** ou **Pausada** — o *Up Next* e o Cron consultam apenas séries ativas (*Assistindo* / *Quero ver*). |
| **Erro ao buscar catálogo ou capas não carregam** | Instabilidade temporária do TMDB ou token expirado/revogado. | Aguarde alguns minutos e recarregue (o app usa cache de 30–60 min). Se persistir, valide `TMDB_READ_ACCESS_TOKEN` nas variáveis de ambiente da Vercel. |
| **Erro de tabela ou coluna inexistente após nova atualização** | Nova funcionalidade exige uma migração SQL ainda não rodada no banco. | Execute o arquivo `supabase/migration_*.sql` correspondente no **SQL Editor** do Supabase. |
| **Proteção contra perda acidental de dados** | Exclusão acidental ou alteração em conta externa. | Faça backup periódico clicando em **Exportar JSON** no **Perfil**. Você pode restaurar tudo quando quiser usando **Importar JSON**. |
