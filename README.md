# Bagromêtro

O medidor oficial de quem é o bagre do campeonato de FIFA entre Gk, Edu, Gritten e Dosan: ranking, histórico de partidas, perfil de cada jogador, comparação, confronto direto, duplas, locais e curiosidades geradas a cada partida registrada.

**Stack:** Next.js 15 + Postgres (Neon), tudo no plano gratuito da Vercel.

## Rodar localmente

```bash
npm install
npm run dev
```

Abra http://localhost:3000. Sem `DATABASE_URL`, as partidas ficam em `data/matches.json` e as fotos em `data/photos/` (só para teste local).

## Colocar no ar (grátis)

1. **Suba o código para o GitHub** (repositório pode ser privado).
2. Em [vercel.com/new](https://vercel.com/new), importe o repositório e clique em **Deploy**.
3. No projeto da Vercel: **Storage → Create Database → Neon (Serverless Postgres)** → plano Free → **Connect** ao projeto.
   Isso cria a variável `DATABASE_URL` automaticamente. As tabelas são criadas sozinhas no primeiro acesso.
4. Em **Settings → Environment Variables**, adicione `APP_PIN` com o PIN do grupo (ex.: `2026`).
   Sem ele, ninguém consegue registrar partidas nem trocar fotos em produção.
5. **Deployments → Redeploy** para aplicar as variáveis.

Pronto: mande o link `https://<seu-projeto>.vercel.app` no grupo. Qualquer um vê; só quem sabe o PIN registra ou apaga partidas e troca fotos (o PIN fica salvo no aparelho depois da primeira vez).

### Renomear repositório e projeto (opcional)

O código já se chama Bagromêtro. Para alinhar o resto:

- **GitHub:** Settings → General → Repository name → `bagrometro`. Depois, localmente: `git remote set-url origin <nova-url>`.
- **Vercel:** Project → Settings → General → Project Name → `bagrometro` (o link vira `bagrometro.vercel.app`, se estiver livre).
- **Pasta local:** pode renomear `CampFifa` à vontade; nada no código depende do nome dela.

## Telas

| Rota | O que mostra |
|---|---|
| `/` | Visão geral: temporada, líder e bagre da vez, classificação, curiosidades, evolução e últimos jogos |
| `/ranking` | Classificação completa com tiers (Ouro, Prata, Bronze, Bagre), confronto direto, gols, duplas e locais |
| `/partidas` | Histórico agrupado por dia, com filtros de jogador e local |
| `/partidas/<id>` | Placar da partida, o que ela mudou no campeonato e botão de apagar |
| `/jogadores/<nome>` | Perfil: números, conquistas, evolução, retrospecto contra cada rival, duplas e foto |
| `/comparar?a=&b=` | Dois jogadores lado a lado e os últimos encontros |

O seletor **Todas / 1x1 / 2x2** no topo vale para todas as telas e fica no link (`?modo=1x1`). O botão de sol e lua alterna entre tema escuro (padrão) e claro, e a escolha fica salva no aparelho.

## Como funciona

- **Registrar partida:** botão *Nova partida* → data, local, jogadores de cada time (1x1 ou 2x2) e placar. O vencedor sai do placar.
- **Ranking:** ordem por % de vitórias, depois saldo, depois jogos. Os pontos (3/1/0) aparecem só como referência. As setas mostram quantas posições cada um subiu ou caiu desde o dia de jogo anterior.
- **Gols em 2x2:** cada jogador da dupla recebe os gols feitos e sofridos pelo time.
- **Fotos de perfil:** no perfil do jogador, *Adicionar foto* abre o editor de recorte: arraste para posicionar, use zoom (barra, roda do mouse ou pinça no celular) e gire se precisar, vendo ao vivo como fica no perfil, no ranking e nas listas. A foto sai em 512×512, fica no próprio Postgres e é protegida pelo PIN. Sem foto, aparecem as iniciais na cor do jogador.
- **Menu:** o trilho de ícones à esquerda navega direto. A alça na borda (») expande o menu completo, e a escolha fica salva no aparelho.
- **Curiosidades:** `lib/facts.ts`. Para adicionar novos tipos de dado, crie entradas em `matchFacts` (depois de registrar) ou `generalFacts` (visão geral). O ícone é uma chave de `FactIcon`, mapeada para o Lucide em `components/ui.tsx`.
- **Trocar jogadores:** edite `PLAYERS` em `lib/types.ts`.
- **Cache e velocidade:** as páginas são HTML estático servido pela CDN da Vercel (ISR). Registrar ou apagar partida e trocar foto chamam `revalidateTag` e as páginas se atualizam na hora. Como garantia extra, elas também se renovam a cada 60 s. Os filtros (modo, jogador, local, comparação) mudam só no navegador, sem ir ao servidor. Se a aba ficar mais de 1 minuto em segundo plano, os dados são atualizados quando você volta.
  Quem for mexer no código: não use `dynamicParams = false` nas rotas `[nome]`/`[id]`. No Next 15, essa opção faz a página virar 404 depois de um `revalidateTag`.

## Marca

A arte original do logo está em `design/logo-source.png`. As versões usadas no site (sem fundo e com o brasão na cor do tema) são geradas por um script:

```bash
python scripts/brand-logo.py design/logo-source.png public/brand competitivo=#FF4D1F
```

Precisa de Python com Pillow (`pip install pillow`). Para trocar a cor do brasão, mude o hex e copie `public/brand/mark-competitivo.png`, reduzido, para `app/icon.png` (favicon).

As cores, fontes e espaçamentos ficam como tokens no topo de `app/globals.css`.
