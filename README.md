# MyTVTime

Aplicativo Web/PWA de acompanhamento de séries, filmes e datas de lançamento, construído com **Next.js**, **Tailwind CSS**, **Supabase** e **TMDB API**.

## Funcionalidades
- **Séries:** *Assistir a seguir* (Up Next) com botão de 1 clique, *Em breve* (calendário de lançamentos) e *Todas as minhas séries*.
- **Filmes:** *Quero assistir* (Watchlist), *Em breve* e *Assistidos*.
- **Explorar:** Busca unificada em português, destaques da semana, páginas de detalhes com provedores de streaming no Brasil e marcação individual ou por temporada inteira.
- **Perfil:** Tempo total assistido (séries e filmes), contadores e exportação de backup em JSON.
- **PWA:** Instalável no celular e no computador.

## Configuração Inicial (Passo a Passo)

1. **Criar conta no TMDB:**
   - Acesse https://www.themoviedb.org/signup e crie sua conta gratuita.
   - Vá em **Configurações → API** e solicite uma chave (*Developer* / uso pessoal).
   - Copie o **API Read Access Token (v4)** para `TMDB_READ_ACCESS_TOKEN` no arquivo `.env.local`.

2. **Criar projeto no Supabase:**
   - Acesse https://supabase.com e crie um projeto gratuito.
   - No **SQL Editor**, cole e execute todo o conteúdo de `supabase/schema.sql`.
   - Em **Project Settings → API**, copie a **Project URL** e a **anon / public key** para `.env.local`.

3. **Rodar localmente:**
   ```bash
   npm.cmd run dev
   ```
   Abra http://localhost:3000 no navegador.
