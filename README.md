# MyTVTime

Aplicativo Web/PWA de acompanhamento de séries, doramas, filmes e datas de lançamento, construído com **Next.js (App Router)**, **Tailwind CSS**, **Supabase** e **TMDB API**.

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

## Configuração Inicial

1. **TMDB:** Crie uma conta em [themoviedb.org](https://www.themoviedb.org/signup), vá em **Configurações → API** e copie o **API Read Access Token (v4)** para `TMDB_READ_ACCESS_TOKEN`.
2. **Supabase:** Crie um projeto em [supabase.com](https://supabase.com), execute [supabase/schema.sql](supabase/schema.sql) (e, em atualizações, as migrações em `supabase/migration_*.sql`) no **SQL Editor**. Copie **Project URL** e **Publishable/Anon Key** para `.env.local`.
3. **Rodar localmente:**
   ```powershell
   npm.cmd run dev
   ```
   Acesse `http://localhost:3000`.

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
