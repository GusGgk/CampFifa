# CampFifa ⚽

Dashboard do campeonato de FIFA entre Gk, Edu, Gritten e Dosan: histórico de partidas, % de vitórias, gols feitos/sofridos, confronto direto, duplas, locais e curiosidades geradas a cada partida registrada.

**Stack:** Next.js 15 + Postgres (Neon) — tudo no plano gratuito da Vercel.

## Rodar localmente

```bash
npm install
npm run dev
```

Abra http://localhost:3000. Sem `DATABASE_URL`, as partidas ficam em `data/matches.json` (só para teste local).

## Colocar no ar (grátis)

1. **Suba o código para o GitHub** (repositório pode ser privado).
2. Em [vercel.com/new](https://vercel.com/new), importe o repositório e clique em **Deploy**.
3. No projeto da Vercel: **Storage → Create Database → Neon (Serverless Postgres)** → plano Free → **Connect** ao projeto.
   Isso cria a variável `DATABASE_URL` automaticamente. A tabela é criada sozinha no primeiro acesso.
4. Em **Settings → Environment Variables**, adicione `APP_PIN` com o PIN do grupo (ex.: `2026`).
   Sem ele, ninguém consegue registrar partidas em produção.
5. **Deployments → Redeploy** para aplicar as variáveis.

Pronto: mande o link `https://<seu-projeto>.vercel.app` no grupo. Qualquer um vê; só quem sabe o PIN registra ou apaga partidas (o PIN fica salvo no aparelho depois da primeira vez).

## Como funciona

- **Registrar partida:** botão *Nova partida* → data, local, jogadores de cada time (1x1 ou 2x2) e placar. O vencedor sai do placar.
- **Filtro 1x1 / 2x2:** todas as estatísticas da página respeitam o filtro.
- **Gols em 2x2:** cada jogador da dupla recebe os gols feitos e sofridos pelo time.
- **Curiosidades:** `lib/facts.ts` — para adicionar novos tipos de dado, crie mais entradas em `matchFacts` (após registrar) ou `generalFacts` (painel da dashboard).
- **Trocar jogadores:** edite `PLAYERS` em `lib/types.ts`.
