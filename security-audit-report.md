# ADAS PRO — Relatório de Auditoria de Segurança

**Data:** 2026-08-15 · **Escopo:** `landing-page` (HTML/CSS/JS estático + Supabase RLS + 3 Edge Functions + Vercel)
**Tipo:** Auditoria estática de código (somente leitura — nenhuma alteração aplicada)
**Foco:** XSS, injeção (SQL/HTML/CRLF/Prototype pollution), autorização (RLS, SECURITY DEFINER, Edge Functions, MFA), autenticação, segredos, CSP/headers, CORS/CSRF, dados sensíveis.

Bugs já marcados como corrigidos em `bug.md` (`[x]`) foram verificados e **não** são repetidos aqui, exceto quando um achado novo os afeta.

---

## Resumo executivo (ranqueado)

| # | Achado | Severidade | Arquivo:linha | Explorável hoje? |
|---|---|---|---|---|
| 1 | XSS stored — `esc()` em contexto de string JS de `onclick` | MÉDIA | `admin.html:1102` (título de conteúdo) | Sim, com conta admin/gestor |
| 2 | `demoEnabled: true` commitado + default `true` no build → modo demo admin exposto em produção se `DEMO_ENABLED` não for `false` | MÉDIA (config/operacional) | `js/supabase-config.js:9`, `scripts/build-config.js:23`, `js/login.js:158` | Sim, se flag ativa em prod |
| 3 | Funções `SECURITY DEFINER` sem `SET search_path` | MÉDIA (hardening) | `sql/rls_policies.sql` (todas) | Não diretamente (refs `public.`-qualificadas) |
| 4 | CSP sem defesa em profundidade: `script-src 'self' 'unsafe-inline'` (sem hashes) | MÉDIA (ausência de mitigação) | `vercel.json:82` | N/A — agrava os achados 1 |
| 5 | Reset de senha sem rate limit server-side próprio (mensagem genérica ok, mas sem throttling local) | BAIXA | `js/auth.js:1429`, `js/login.js:70` | Não (Supabase Auth limita) |
| 6 | Duplo-escape em mensagens de chat de membro → entidades HTML exibidas literalmente | BAIXA (bug de exibição) | `membros.html:1626` + render `membros.html:1604` | Não — é cosmetológico |
| 7 | Rate limit de login 100% client-side (localStorage) | BAIXA (informativo) | `js/auth.js:501` | Não — Supabase Auth limita server-side |

---

## Achado 1 — XSS stored via `esc()` em contexto de atributo HTML / string JS de `onclick`

**SEVERIDADE:** MÉDIA

**Descrição:** A função `esc()` (definida em `admin.html:723-731`, idêntica em `superadmin.html:2427`, `membros.html:1015`, `email-config.html:819`) converte `"` → `&quot;` e `'` → `&#x27;`. Isso é **seguro em contexto de texto HTML** e **seguro em valor de atributo HTML** (o tokenizer decodifica entidades *depois* de determinar a fronteira do valor — `&quot;` jamais termina um atributo). **Não é seguro em string JS dentro de `onclick`**: o parser HTML decodifica a entidade de volta para `'` antes de compilar o handler, permitindo quebra da string JS.

**Vetor passo a passo (confirmado — `admin.html:1102`):**
1. Admin/gestor edita o título de um material com payload: `x','alert(1)//`
2. `onclick="confirmAction('Excluir material?','${esc(c.title)} será removido.',...)"` → `esc()` produz `x&#x27;,&#x27;alert(1)//`.
3. O decode do atributo devolve `'`, quebrando a string JS: `confirmAction('Excluir material?','x','alert(1)// será removido.',...)` → `alert(1)` executa no browser de **qualquer** admin/superadmin que abra a página **Conteúdo**.

**Vetor descartado (`admin.html:1096`):** `title="${esc(c.filePath)}"` — **falso positivo.** O parser HTML5 (espec. tokenizer, "attribute value double-quoted state") decodifica `&quot;` → `"` *dentro* do valor do atributo, mas o fechamento do atributo é determinado pelos caracteres literais de entrada, não pelo valor decodificado. Um `filePath` com `x&quot; onmouseover=&quot;alert(1)` produz um único atributo `title` com esse valor — **não** injeta atributo novo. Não há XSS em atributo com `esc()` aplicado.

**Impacto:** Execução de JavaScript arbitrário no browser de outro usuário privilegiado (admin/gestor/superadmin) que visualize a listagem de conteúdo. Permite roubo de sessão/CSRF disfarçado, mas o payload precisa ser plantado por uma conta que já acessa `admin.html`. Escalada entre roles do painel.

**Explorável hoje?** Sim (requer conta com permissão de editar conteúdo; o gatilho é a renderização da listagem).

**Recomendação (concreta):**
- Em atributos/`onclick`, usar `jsStr()` (já existe em `admin.html:732` e é o padrão correto em `superadmin.html:2436`) — escapa para *string literal JS*, não para entidade HTML.
- Melhor ainda: evitar interpolação em `innerHTML` para qualquer valor com origem em usuário — montar nós via DOM (`.textContent`, `.dataset`, `.addEventListener`).
- Revisar **todos** os usos de `esc()` dentro de atributos. O `jsStr()` já é usado corretamente para `u.name`/`u.email` em `superadmin.html:2713,2717,2721` — estender esse padrão aos demais painéis.
- Como regra: `esc()` só para texto; `jsStr()`/DOM API para atributo e handler.

**Ocorrências verificadas (padrão frágil — `esc()` em contexto de handler JS):**
- `admin.html:1102` título dentro de `onclick` (controlado pelo usuário — **explorável**)
- `admin.html:832` `esc(n.id)` em `onclick` (id gerado pela app — baixo risco, mas padrão errado)
- `admin.html:1269`, `admin.html:1361` `esc(u.id)`/`esc(p.id)` em `onclick`/`option` (ids gerados/constantes — baixo risco)
- `superadmin.html:2711-2721` `esc(u.id)` em `onclick` (UUID — baixo risco; `jsStr` já usado para nome/email)
- `superadmin.html:3397-3399` `esc(item.id)` em `onclick` (id gerado — baixo risco)
- `membros.html:1555` `esc(t.id)` em `onclick` (id gerado — baixo risco)
- `membros.html:1191,1218,1296,1442` `esc(item.cat)`/`esc(cat.label)` em `onclick` (constantes CATEGORIES — baixo risco)
- `membros.html:1091` `cat.label` em `innerHTML` de texto (seguro no contexto atual; `cat.label` é constante)
- `admin.html:1096` `title="${esc(c.filePath)}"` — **refutado**: atributo HTML não quebra com entidades (ver acima).

**Nota (defense-in-depth):** `onclick` interpolando `${c.id}`/`${u.id}`/`${t.id}` **sem escape** (`admin.html:905-906,962-965,1005,1038,1101-1102,1236,1698,1722`; `superadmin.html:3079-3081`) não é explorável hoje — ids são gerados pela app (`cnt_`+timestamp em `js/auth.js:1021`, UUIDs do Supabase, `user_`+timestamp). Nenhum deriva de texto de usuário.

---

## Achado 2 — Modo demo habilitado por padrão (config commitada + default de build)

**SEVERIDADE:** MÉDIA (configuração/operacional)

**Descrição:** `js/supabase-config.js` commitado tem `demoEnabled: true` (linha 9), e `scripts/build-config.js:23` usa `DEMO_ENABLED !== 'false'` como default — ou seja, sem a variável, demo fica **ativo**. `js/login.js:158` exibe o bloco "Entrar como Admin — DEMO" quando `demoEnabled === true`. O modo demo dá acesso aos painéis com sessão local (`AUTH.enterDemoMode()`, `js/auth.js:794`).

**Vetor:**
1. Se `DEMO_ENABLED` não estiver setado como `false` no dashboard do Vercel, o build de produção gera config com demo ativo.
2. Visitante clica "Entrar como Admin — DEMO" → `enterDemoMode` cria sessão local com role admin/superadmin.
3. `requireAuth` aceita a sessão (ver `js/auth.js:740`: a sessão local é devolvida enquanto `_demo` estiver ativo).

**Impacto:** Superfície de UI/rotas de painel exposta sem credenciais reais. **Importante:** os dados reais permanecem protegidos — `get-download-url` e `approve-user` validam o JWT server-side (rejeitam sessão demo) e a RLS bloqueia consultas reais. Impacto prático é de exposição de painel/confusão, não de vazamento de dados reais.

**Explorável hoje?** Sim, se a flag estiver ativa no ambiente de produção (depende de `DEMO_ENABLED=false` no Vercel).

**Recomendação:**
- Garantir `DEMO_ENABLED=false` no dashboard do Vercel (deploy) — registrar como check de release.
- Trocar o default de `build-config.js:23` para **desabilitado** (opt-in explícito), deixando `DEMO_ENABLED=true` apenas para dev.
- Adicionar trava server-side mínima: bloquear o bloco demo quando `siteUrl` aponta para o domínio de produção (ou quando `NODE_ENV === 'production'`).

---

## Achado 3 — SECURITY DEFINER sem `SET search_path`

**SEVERIDADE:** MÉDIA (hardening)

**Descrição:** Todas as funções `SECURITY DEFINER` em `sql/rls_policies.sql` (`get_my_role()`, `is_admin()`, `is_superadmin()`, `is_admin_staff()`, etc.) **não** declaram `SET search_path`. Mitigação atual: **toda** referência é qualificada com `public.` (verificado por busca — nenhum objeto sem schema), o que elimina o ataque clássico de `search_path`/`pg_temp` sobre objetos definidos no schema do chamador.

**Impacto:** Não explorável hoje justamente pela qualificação completa. É risco futuro: qualquer refatoração que introduza uma referência sem schema (ex.: chamada a função em outro schema) criaria a janela de ataque, sem barreira de migração.

**Explorável hoje?** Não.

**Recomendação (defense-in-depth):**
- Adicionar `SET search_path = ''` (ou `SET search_path = public, pg_temp`) em cada função `SECURITY DEFINER`.
- Comentário de padronização em `rls_policies.sql` (e `settings_table.sql`) para que novas funções sigam o mesmo padrão.

---

## Achado 4 — CSP sem defesa em profundidade

**SEVERIDADE:** MÉDIA (ausência de mitigação — agrava o Achado 1)

**Descrição:** `vercel.json:82` aplica `script-src 'self' 'unsafe-inline'` **sem hashes**. A geração de hashes foi removida em `scripts/generate-csp.js` (e documentada em `bug.md` #66/#76) porque, segundo a especificação CSP3, quando há hash/nonce na source-list o `'unsafe-inline'` é ignorado — o que quebrava os handlers inline. Isso significa que o CSP **não bloqueia** XSS via `onclick`/`<script>` inline: qualquer injeção (como as do Achado 1) executa sem barreira CSP.

**Impacto:** Única camada anti-XSS efetiva hoje é o `esc()` correto + `DOMPurify` no editor (presente em `superadmin.html:3487`). Ausência de hashes = sem defesa em profundidade.

**Explorável hoje?** N/A (é a ausência de uma mitigação; o vetor XSS do Achado 1 é que é explorável).

**Recomendação (programa, não urgente):**
- Migrar handlers inline para `addEventListener` (Já foi feito em `login.js`/`mfa-verify.js`/`reset-password.js`; estender aos painéis).
- Após migração, reativar hashes no `generate-csp.js` (o código que extrai os scripts inline ainda existe — `scripts/generate-csp.js:1-53`).
- Enquanto `unsafe-inline` estiver presente, manter a disciplina de `esc()`/`jsStr()`/DOM API como camada primária.

---

## Achado 5 — Reset de senha sem rate limit próprio (informativo)

**SEVERIDADE:** BAIXA

**Descrição:** `AUTH.resetPassword()` (`js/auth.js:1429-1437`) não aplica o rate limit local (ao contrário do login) e devolve `{ok:false, msg:'Erro ao enviar email de recuperação.'}` em caso de erro. A mensagem de sucesso é **genérica** ("Se este e-mail estiver cadastrado...") — bom. A superfície de enumeração de e-mail cadastrado é limitada porque a mensagem de erro não diferencia "e-mail inexistente" de "falha de rede/formato".

**Impacto:** Baixo. O Supabase Auth aplica throttling server-side em `/recover`. Sem achado real de enumeração; apenas reforço de consistência.

**Recomendação:** Aplicar o mesmo `_checkRateLimit` usado no login (`js/auth.js:501`) à chamada de reset, para uniformizar.

---

## Achado 6 — Duplo-escape em mensagens de chat do membro

**SEVERIDADE:** BAIXA (bug de exibição, não de segurança)

**Descrição:** `membros.html:1626` aplica `esc(raw)` **antes de salvar** a mensagem; na renderização (`membros.html:1604`) aplica `esc(m.message)` novamente. Resultado: `<script>` é salvo como `&lt;script&gt;` e exibido como `&amp;lt;script&amp;gt;` → o usuário vê o texto literal `&lt;script&gt;`.

**Impacto:** Nenhum de segurança (o texto fica inerte). Confusão de UX e inconsistência com o fluxo do admin, que não pré-escapava.

**Recomendação:** Salvar a mensagem **crua** e escapar apenas na renderização (padrão único), ou remover o `esc()` da linha 1626.

---

## Achado 7 — Rate limit de login client-side (informativo)

**SEVERIDADE:** BAIXA

**Descrição:** O throttling de login (`js/auth.js:501`, `_checkRateLimit` — 5 tentativas/10min) é armazenado em `localStorage` e pode ser zerado pelo atacante. Não é uma falha explorável: com Supabase ativo, a autenticação real passa por `signInWithPassword`, que tem rate limit do próprio Supabase Auth. O local é apenas UX.

**Recomendação:** Documentar como mitigação adicional e não como fronteira de segurança.

---

## Mitigações já presentes (verificadas — não são achados)

- **RLS completa e coerente:** `users`, `tickets`, `notifications`, `settings`, storage (`materiais`) com políticas por role. `users_update` mantém semântica de hierarquia (USING = role atual; WITH CHECK = role nova). ✔
- **Funções `SECURITY DEFINER` com referências 100% `public.`-qualificadas** (compensa parcialmente o Achado 3). ✔
- **`get-download-url`** (Edge Function): JWT via `auth.getUser()`, exige role staff + status active + **MFA aal2** (`get-download-url:63`), valida `moduleAccess`/`accessLevel`/`downloadLevel` server-side contra `CONTENT_MAP`, retorna **signed URL de 1h** e grava em `audit_logs` com fail-safe. ✔
- **`approve-user`** (Edge Function): valida JWT + role + status, bloqueia promoção a role >= a própria, **só superadmin cria admin/superadmin**, `passwordHash` nunca aceito do client, audit em toda ação, rollback em `action:'create'` (`approve-user:52-98`). ✔
- **`notify`** (Edge Function): `to` validado contra usuário ativo na tabela `users` (para `user_approved`/`ticket_reply`), rate limit server-side via `audit_logs` (100/dia em janela 86.4k), email via Resend API (JSON — sem injeção CRLF), templates com `esc()`. ✔
- **`_sbConfigured` guard:** sessão forjada em `localStorage` é rejeitada quando Supabase está configurado; login com erro nunca faz fallback local (impede bypass de credenciais). ✔
- **Rate limit de notificações/tickets no client** + `_sanitizeStr` na importação de dados. ✔
- **`DOMPurify.sanitize`** no editor WYSIWYG do superadmin (render e preview). ✔
- **`esc()` correto** em todos os contextos de texto (títulos, descrições, nomes, mensagens, e-mails) — exceções de atributo documentadas no Achado 1. ✔
- **Headers de segurança globais** (`vercel.json:67-111`): CSP, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, HSTS, `Permissions-Policy`. ✔
- **CORS** hardcoded para o domínio de produção nas Edge Functions (`approve-user`, `get-download-url`); `notify` lê de `SITE_URL`. ✔
- **Anon key exposta por design** (segurança via RLS obrigatória) — correta. ✔
- **Auditoria completa** (`audit_logs`) com triggers e `logAudit()` client. ✔
- **MFA obrigatória** para roles privilegiadas (fluxo aal1 → `mfa-verify.html`, revalidação server-side nas Edge Functions). ✔
- **Senhas de seed offline** sempre diferentes das de produção (documentado). ✔

---

## Notas operacionais (fora do escopo de código)

- **`RESEND_API_KEY` não configurada** no ambiente — teste ao vivo do `notify` retornou 500 "env não configurado" (registrado em `bug.md:820`). Qualquer fluxo de email (new_user, user_approved, ticket_reply, reset) **não funciona** em produção até configurar.
- **`approve-user` e `notify` já deployados** (2026-08-15, commit `656880e`) — não pendente.
- **Sincronização manual** obrigatória entre `CONTENT_MAP` (get-download-url) e `DEFAULT_CONTENT` (`js/auth.js`) ao adicionar PDF — quebra de produção com 404 se divergirem.

---

## Verificação independente (após auditoria — 2026-08-15)

Validação manual + grafos do MCP (codebase-memory) + requisições ao ambiente de produção:

- **Achado 1 (XSS `admin.html:1102`):** CONFIRMADO como único vetor real. A sub-reclamação de `admin.html:1096` (quebra de atributo) foi **refutada** conforme tokenizer HTML5. `jsStr()` (`admin.html:732`) já é o padrão correto para handlers e é usado em `superadmin.html:2713`.
- **Achado 2 (demo):** CONFIRMADO em produção — `curl https://adaspro.com.br/js/supabase-config.js` retorna `demoEnabled: true`; `.env.local` local tem `DEMO_ENABLED=true`; default de build é `!== 'false'`. Bloco "Entrar como Admin — DEMO" está ativo no login de produção.
- **Achado 3 (SECURITY DEFINER):** confirmado; sem impacto hoje (refs `public.`-qualificadas).
- **Achado 6 (duplo-escape):** CONFIRMADO — `membros.html:1626` `const msg = esc(raw)` pré-escape + render `:1604` `esc(m.message)` → entidades visíveis literalmente ao membro.
- **IDs não-escapeados em `onclick`:** não exploráveis (gerados pela app) — defense-in-depth apenas.
- **Deploy:** `approve-user` + `notify` (commit `656880e`) ativos no Supabase (`npx deno check` limpo; testes ao vivo 403/400/404 conforme esperado).

---

## Próximos passos recomendados (por prioridade)

1. Corrigir Achado 1: trocar `esc()` por `jsStr()` em `admin.html:1102` (único vetor explorável).
2. Desligar demo em produção: `DEMO_ENABLED=false` no dashboard do Vercel (manual) e/ou inverter default em `scripts/build-config.js:23`.
3. Adicionar `SET search_path` às funções `SECURITY DEFINER` (`sql/rls_policies.sql`).
4. (Cosmético) corrigir duplo-escape no chat do membro (`membros.html:1626`).
5. (Programa) migrar inline handlers para `addEventListener` e reativar hashes CSP.
6. (Informativo) rate limit local no reset de senha (`js/auth.js:1429`).
