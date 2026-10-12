// ADAS PRO — Edge Function: notify — lógica
// Montagem dos e-mails transacionais (Resend) + portão de autenticação.
// A entrada (serve/createClient/Deno.env/fetch) fica em index.ts; esta lógica
// é testável sem importar módulos remotos nem o runtime Deno.

const ALLOWED_ROLES = ['gestor', 'admin', 'superadmin'];
const MAX_BODY_BYTES = 65536;

function corsHeadersFor(siteUrl: string) {
  return {
    'Access-Control-Allow-Origin':  siteUrl || 'https://adaspro.com.br',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, content-type',
  };
}

export interface NotifyDeps {
  /** Chave da Resend; ausente → 500 (não configurada). */
  resendKey?: string;
  adminEmail: string;
  siteUrl: string;
  /** Injetável para testes determinísticos das janelas de rate limit. */
  now?: number;
  createUserClient(authHeader: string): {
    auth: {
      getUser(): Promise<{
        data: { user: { id: string } | null } | null;
        error: { message: string } | null;
      }>;
      mfa: {
        getAuthenticatorAssuranceLevel(): Promise<{
          data: { nextLevel: string | null; currentLevel: string | null } | null;
          error?: unknown;
        }>;
      };
    };
  };
  createAdminClient(): { from(table: string): any };
  /** Envia o e-mail (fetch à Resend em produção). */
  sendEmail(payload: { from: string; to: string; subject: string; html: string }): Promise<{
    ok: boolean;
    text(): Promise<string>;
  }>;
}

/* ─── Montagem da mensagem por evento (pura) ─── */

export type BuildResult =
  | { ok: true; to: string; subject: string; html: string }
  | { ok: false; status: number; error: string };

/**
 * Valida `data` conforme o evento e monta {to, subject, html}. Não faz I/O —
 * o gate de destinatário (user_approved/ticket_reply) fica no handler.
 */
export function buildMessage(
  event: string,
  data: Record<string, any>,
  ctx: { adminEmail: string; siteUrl: string },
): BuildResult {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (event === 'new_user') {
    if (!data.userName || typeof data.userName !== 'string') return { ok: false, status: 400, error: 'userName obrigatório.' };
    if (data.userName.length > 120) return { ok: false, status: 400, error: 'userName excede 120 caracteres.' };
    return {
      ok: true,
      to: ctx.adminEmail,
      subject: `[ADAS PRO] Novo cadastro pendente — ${esc(data.userName)}`,
      html: templateNewUser(data, ctx.siteUrl),
    };

  } else if (event === 'user_approved') {
    if (!data.userEmail || typeof data.userEmail !== 'string') return { ok: false, status: 400, error: 'userEmail obrigatório.' };
    if (!emailRegex.test(data.userEmail.trim())) return { ok: false, status: 400, error: 'Formato de e-mail inválido.' };
    if (!data.userName || typeof data.userName !== 'string') return { ok: false, status: 400, error: 'userName obrigatório.' };
    return {
      ok: true,
      to: data.userEmail.trim().toLowerCase(),
      subject: `[ADAS PRO] Acesso liberado — bem-vindo à plataforma`,
      html: templateUserApproved(data, ctx.siteUrl),
    };

  } else if (event === 'ticket_reply') {
    if (!data.userEmail || typeof data.userEmail !== 'string') return { ok: false, status: 400, error: 'userEmail obrigatório.' };
    if (!emailRegex.test(data.userEmail.trim())) return { ok: false, status: 400, error: 'Formato de e-mail inválido.' };
    if (!data.ticketTitle || typeof data.ticketTitle !== 'string') return { ok: false, status: 400, error: 'ticketTitle obrigatório.' };
    if (!data.message || typeof data.message !== 'string') return { ok: false, status: 400, error: 'message obrigatório.' };
    return {
      ok: true,
      to: data.userEmail.trim().toLowerCase(),
      subject: `[ADAS PRO] Resposta no suporte — ${esc(data.ticketTitle)}`,
      html: templateTicketReply(data, ctx.siteUrl),
    };

  } else if (event === 'new_lead') {
    // Nota: a Edge Function pública `capture-lead` envia o aviso de novo lead
    // diretamente (não pode chamar esta função — exige JWT de admin). Este
    // evento existe para disparo por fluxos administrativos (reuso do template).
    if (!data.leadName || typeof data.leadName !== 'string') return { ok: false, status: 400, error: 'leadName obrigatório.' };
    if (!data.leadEmail || typeof data.leadEmail !== 'string') return { ok: false, status: 400, error: 'leadEmail obrigatório.' };
    if (!emailRegex.test(data.leadEmail.trim())) return { ok: false, status: 400, error: 'Formato de e-mail inválido.' };
    return {
      ok: true,
      to: ctx.adminEmail,
      subject: `[ADAS PRO] Novo lead — ${esc(data.leadName)}`,
      html: templateNewLead(data, ctx.siteUrl),
    };
  }

  return { ok: false, status: 400, error: 'Evento inválido.' };
}

/* ─── Handler (I/O via deps) ─── */

export async function handler(req: Request, deps: NotifyDeps): Promise<Response> {
  const cors = corsHeadersFor(deps.siteUrl);
  const json = (data: unknown, status = 200) =>
    new Response(JSON.stringify(data), {
      status,
      headers: { ...cors, 'Content-Type': 'application/json; charset=utf-8' },
    });

  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'Method not allowed.' }, 405);

  const cl = parseInt(req.headers.get('content-length') || '0');
  if (cl > MAX_BODY_BYTES) return json({ error: 'Payload muito grande.' }, 413);

  if (!deps.resendKey) return json({ error: 'RESEND_API_KEY não configurada.' }, 500);

  const authHeader = req.headers.get('authorization');
  if (!authHeader) return json({ error: 'Não autorizado.' }, 401);

  let _callerId: string | undefined;
  const now = deps.now ?? Date.now();
  try {
    const supabaseUser = deps.createUserClient(authHeader);
    const { data: userData, error: userError } = await supabaseUser.auth.getUser();
    const user = userData?.user ?? null;
    if (userError || !user) return json({ error: 'Token inválido.' }, 401);
    _callerId = user.id;

    const supabaseAdmin = deps.createAdminClient();
    const { data: callerData } = await supabaseAdmin
      .from('users').select('role, status').eq('id', user.id).single();

    // SECURITY: admin/gestor/superadmin can trigger email notifications
    if (!ALLOWED_ROLES.includes(callerData?.role || '')) {
      return json({ error: 'Permissão insuficiente.' }, 403);
    }
    // Conta suspensa/pendente nunca dispara emails administrativos
    if (callerData?.status !== 'active') {
      return json({ error: 'Conta inativa ou pendente de aprovação.' }, 403);
    }
    // MFA: se a conta possui fator configurado mas a sessão ainda é aal1,
    // a 2ª etapa é obrigatória (usuários sem MFA têm nextLevel aal1 — passam)
    const { data: aalData, error: aalErr } = await supabaseUser.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aalErr) return json({ error: 'Falha ao verificar MFA.' }, 403);
    if (!aalData) return json({ error: 'Não foi possível determinar o nível de autenticação.' }, 403);
    if (aalData.nextLevel === 'aal2' && aalData.currentLevel !== 'aal2') {
      return json({ error: 'Autenticação em duas etapas (MFA) é obrigatória para esta ação.' }, 403);
    }

    // Rate limiting — máximo 20 emails/minuto por usuário
    const { count: recentCount, error: countErr } = await supabaseAdmin
      .from('audit_logs')
      .select('*', { count: 'exact', head: true })
      .eq('actor_id', user.id)
      .eq('action', 'notify')
      .gte('created_at', new Date(now - 60_000).toISOString());

    if (!countErr && recentCount && recentCount >= 20) {
      return json({ error: 'Muitas requisições. Aguarde 1 minuto.' }, 429);
    }

    // Rate limiting — máximo 100 emails/dia por usuário (limita abuso via conta comprometida)
    const { count: dayCount, error: dayErr } = await supabaseAdmin
      .from('audit_logs')
      .select('*', { count: 'exact', head: true })
      .eq('actor_id', user.id)
      .eq('action', 'notify')
      .gte('created_at', new Date(now - 86_400_000).toISOString());

    if (!dayErr && dayCount && dayCount >= 100) {
      return json({ error: 'Limite diário de envios atingido.' }, 429);
    }
  } catch (_) {
    return json({ error: 'Falha na validação de autenticação.' }, 401);
  }

  try {
    const { event, data } = await req.json();
    if (!event || !data || typeof data !== 'object') return json({ error: 'Payload inválido: event e data obrigatórios.' }, 400);

    const built = buildMessage(event, data, { adminEmail: deps.adminEmail, siteUrl: deps.siteUrl });
    if (!built.ok) return json({ error: built.error }, built.status);
    const { to, subject, html } = built;

    // Segurança: em eventos para um membro, o destinatário deve existir e estar ativo.
    // Impede que uma conta admin comprometida use o domínio para envios arbitrários.
    if (event === 'user_approved' || event === 'ticket_reply') {
      const supabaseAdmin = deps.createAdminClient();
      const { data: recipient } = await supabaseAdmin
        .from('users').select('status').eq('email', to.toLowerCase()).maybeSingle();
      if (!recipient || recipient.status !== 'active') {
        return json({ error: 'Destinatário não encontrado ou inativo.' }, 400);
      }
    }

    const res = await deps.sendEmail({ from: 'ADAS PRO <noreply@adaspro.com.br>', to, subject, html });

    if (!res.ok) {
      const err = await res.text();
      console.error('[notify] resend error:', err);
      return json({ error: 'Falha ao enviar email.' }, 500);
    }

    // Auditoria para rate limiting
    if (_callerId) {
      try {
        const sa = deps.createAdminClient();
        await sa.from('audit_logs').insert({
          action: 'notify', actor_id: _callerId, target_id: event,
          details: { event, to }, created_at: new Date().toISOString(),
        });
      } catch (_) { /* falha na auditoria não bloqueia o envio */ }
    }

    return json({ ok: true });
  } catch (e) {
    console.error('[notify] unhandled:', e instanceof Error ? e.message : 'unknown');
    return json({ error: 'Erro interno do servidor.' }, 500);
  }
}

// ─── Segurança ────────────────────────────────────────────────────────────────

function esc(s: string) {
  return String(s || '').replace(/[<>&"']/g, c =>
    ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#x27;' }[c] || c)
  );
}

// ─── Utilidades ───────────────────────────────────────────────────────────────

function formatDate() {
  return new Date().toLocaleString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

// ─── Estrutura base do email ───────────────────────────────────────────────────
// accentColor: cor da barra lateral e do badge de evento
// accentLabel: rótulo do badge (ex: "NOVO CADASTRO")
// previewText: texto de pré-visualização no cliente de email

function baseWrapper(accentColor: string, accentLabel: string, previewText: string, body: string) {
  return `<!DOCTYPE html>
<html lang="pt-BR" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>ADAS PRO</title>
  <!--[if mso]>
  <noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript>
  <![endif]-->
  <style>
    body, table, td, p, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; border-collapse: collapse; }
    img { -ms-interpolation-mode: bicubic; border: 0; outline: none; text-decoration: none; }
    a { color: inherit; }
    @media only screen and (max-width: 600px) {
      .email-wrapper { width: 100% !important; }
      .email-body { padding: 24px 16px !important; }
      .data-row td { display: block !important; width: 100% !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background-color:#ECEEF2;font-family:Georgia,'Times New Roman',serif;">
  <!-- Preview text (invisible) -->
  <div style="display:none;max-height:0;overflow:hidden;font-size:1px;line-height:1px;color:#ECEEF2;">${esc(previewText)}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;</div>

  <!-- Outer wrapper -->
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#ECEEF2;">
    <tr>
      <td align="center" style="padding:32px 16px;">

        <!-- Email card -->
        <table role="presentation" class="email-wrapper" width="560" cellpadding="0" cellspacing="0"
               style="background-color:#ffffff;border-radius:4px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.10);">

          <!-- Accent bar top -->
          <tr>
            <td style="height:4px;background-color:${accentColor};font-size:0;line-height:0;">&nbsp;</td>
          </tr>

          <!-- Header -->
          <tr>
            <td style="background-color:#0D1821;padding:28px 36px 24px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <!-- Logo -->
                    <span style="font-family:Georgia,'Times New Roman',serif;font-size:22px;font-weight:700;color:#ffffff;letter-spacing:-0.5px;">
                      ADAS <span style="color:${accentColor};">PRO</span>
                    </span>
                  </td>
                  <td align="right">
                    <!-- Badge de evento -->
                    <span style="display:inline-block;background-color:${accentColor};color:#ffffff;font-family:'Courier New',Courier,monospace;font-size:9px;font-weight:700;letter-spacing:2px;padding:4px 10px;border-radius:2px;text-transform:uppercase;">${accentLabel}</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td class="email-body" style="padding:36px 36px 28px;">
              ${body}
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="padding:0 36px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="height:1px;background-color:#E8EAF0;font-size:0;line-height:0;">&nbsp;</td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:20px 36px 28px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <p style="margin:0;font-family:'Courier New',Courier,monospace;font-size:10px;color:#9AA0B0;letter-spacing:0.5px;">
                      © 2026 AutoTech Service &nbsp;·&nbsp; adaspro.com.br
                    </p>
                    <p style="margin:6px 0 0;font-family:Georgia,'Times New Roman',serif;font-size:10px;color:#B0B8CC;">
                      Este é um email automático. Não responda diretamente.
                    </p>
                  </td>
                  <td align="right" valign="middle">
                    <span style="font-family:'Courier New',Courier,monospace;font-size:9px;color:#C8D0DC;letter-spacing:1px;">${formatDate()}</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Accent bar bottom -->
          <tr>
            <td style="height:3px;background:linear-gradient(90deg,${accentColor} 0%,#0D1821 100%);font-size:0;line-height:0;">&nbsp;</td>
          </tr>

        </table>
        <!-- /Email card -->

      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ─── Template: novo usuário (para admin) ──────────────────────────────────────
// Acento: #FF6B35 (alert orange) — tom de urgência/ação

function templateNewUser(data: Record<string, any>, siteUrl: string) {
  const body = `
    <!-- Título -->
    <h1 style="margin:0 0 6px;font-family:Georgia,'Times New Roman',serif;font-size:22px;font-weight:700;color:#0D1821;letter-spacing:-0.3px;">
      Novo cadastro pendente
    </h1>
    <p style="margin:0 0 28px;font-family:Georgia,'Times New Roman',serif;font-size:14px;color:#6B7385;line-height:1.5;">
      Um técnico solicitou acesso à plataforma e aguarda sua aprovação.
    </p>

    <!-- Card de dados do usuário -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
           style="background-color:#F7F8FA;border-left:3px solid #FF6B35;border-radius:0 4px 4px 0;margin-bottom:28px;">
      <tr>
        <td style="padding:20px 24px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr class="data-row">
              <td style="padding:5px 0;width:90px;">
                <span style="font-family:'Courier New',Courier,monospace;font-size:10px;letter-spacing:1.5px;color:#9AA0B0;text-transform:uppercase;">NOME</span>
              </td>
              <td style="padding:5px 0;">
                <span style="font-family:Georgia,'Times New Roman',serif;font-size:14px;font-weight:700;color:#1B2B4D;">${esc(data.userName)}</span>
              </td>
            </tr>
            <tr class="data-row">
              <td style="padding:5px 0;">
                <span style="font-family:'Courier New',Courier,monospace;font-size:10px;letter-spacing:1.5px;color:#9AA0B0;text-transform:uppercase;">E-MAIL</span>
              </td>
              <td style="padding:5px 0;">
                <span style="font-family:'Courier New',Courier,monospace;font-size:12px;color:#4A5568;">${esc(data.userEmail)}</span>
              </td>
            </tr>
            <tr class="data-row">
              <td style="padding:5px 0;">
                <span style="font-family:'Courier New',Courier,monospace;font-size:10px;letter-spacing:1.5px;color:#9AA0B0;text-transform:uppercase;">PERFIL</span>
              </td>
              <td style="padding:5px 0;">
                <span style="font-family:'Courier New',Courier,monospace;font-size:12px;color:#4A5568;">${esc(data.level || 'Técnico')}</span>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <!-- CTA -->
    <table role="presentation" cellpadding="0" cellspacing="0">
      <tr>
        <td style="border-radius:3px;background-color:#FF6B35;">
          <a href="${siteUrl}/admin.html"
             style="display:inline-block;padding:14px 28px;font-family:'Courier New',Courier,monospace;font-size:12px;font-weight:700;letter-spacing:1.5px;color:#ffffff;text-decoration:none;text-transform:uppercase;">
            Acessar Painel Admin &rarr;
          </a>
        </td>
      </tr>
    </table>

    <p style="margin:20px 0 0;font-family:Georgia,'Times New Roman',serif;font-size:12px;color:#9AA0B0;line-height:1.6;">
      Acesse o painel de administração, aba <strong>Aprovações</strong>, para revisar o cadastro e liberar o acesso.
    </p>
  `;

  return baseWrapper('#FF6B35', 'NOVO CADASTRO', `${data.userName} solicitou acesso à plataforma ADAS PRO`, body);
}

// ─── Template: usuário aprovado (para o membro) ───────────────────────────────
// Acento: #06A77D (success green) — tom de confirmação/conquista

function templateUserApproved(data: Record<string, any>, siteUrl: string) {
  const body = `
    <!-- Título -->
    <h1 style="margin:0 0 6px;font-family:Georgia,'Times New Roman',serif;font-size:22px;font-weight:700;color:#0D1821;letter-spacing:-0.3px;">
      Acesso liberado, ${esc(data.userName.split(' ')[0])}.
    </h1>
    <p style="margin:0 0 28px;font-family:Georgia,'Times New Roman',serif;font-size:14px;color:#6B7385;line-height:1.5;">
      Seu cadastro na plataforma ADAS PRO foi aprovado. Você já pode acessar os materiais técnicos exclusivos.
    </p>

    <!-- Card de confirmação -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
           style="background-color:#F0FBF7;border-left:3px solid #06A77D;border-radius:0 4px 4px 0;margin-bottom:28px;">
      <tr>
        <td style="padding:20px 24px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="padding:4px 0;">
                <span style="font-family:'Courier New',Courier,monospace;font-size:10px;letter-spacing:2px;color:#06A77D;text-transform:uppercase;">&#10003;&nbsp; STATUS</span>
                &nbsp;&nbsp;
                <span style="font-family:'Courier New',Courier,monospace;font-size:11px;color:#0D1821;font-weight:700;">ATIVO</span>
              </td>
            </tr>
            <tr>
              <td style="padding:4px 0;">
                <span style="font-family:'Courier New',Courier,monospace;font-size:10px;letter-spacing:2px;color:#9AA0B0;text-transform:uppercase;">PLATAFORMA</span>
                &nbsp;&nbsp;
                <span style="font-family:'Courier New',Courier,monospace;font-size:11px;color:#4A5568;">adaspro.com.br</span>
              </td>
            </tr>
            <tr>
              <td style="padding:4px 0;">
                <span style="font-family:'Courier New',Courier,monospace;font-size:10px;letter-spacing:2px;color:#9AA0B0;text-transform:uppercase;">ACESSO</span>
                &nbsp;&nbsp;
                <span style="font-family:'Courier New',Courier,monospace;font-size:11px;color:#4A5568;">Biblioteca técnica · Suporte · Boletins</span>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <!-- O que você encontra na plataforma -->
    <p style="margin:0 0 12px;font-family:'Courier New',Courier,monospace;font-size:10px;letter-spacing:2px;color:#9AA0B0;text-transform:uppercase;">
      DISPONÍVEL AGORA
    </p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
      <tr>
        <td style="padding:6px 0;border-bottom:1px solid #F0F2F5;">
          <span style="font-family:Georgia,'Times New Roman',serif;font-size:13px;color:#1B2B4D;">
            &#9654;&nbsp; Documentação técnica por marca e sistema ADAS
          </span>
        </td>
      </tr>
      <tr>
        <td style="padding:6px 0;border-bottom:1px solid #F0F2F5;">
          <span style="font-family:Georgia,'Times New Roman',serif;font-size:13px;color:#1B2B4D;">
            &#9654;&nbsp; Boletins técnicos e atualizações de procedimento
          </span>
        </td>
      </tr>
      <tr>
        <td style="padding:6px 0;">
          <span style="font-family:Georgia,'Times New Roman',serif;font-size:13px;color:#1B2B4D;">
            &#9654;&nbsp; Canal de suporte direto com o mentor
          </span>
        </td>
      </tr>
    </table>

    <!-- CTA -->
    <table role="presentation" cellpadding="0" cellspacing="0">
      <tr>
        <td style="border-radius:3px;background-color:#06A77D;">
          <a href="${siteUrl}/login.html"
             style="display:inline-block;padding:14px 28px;font-family:'Courier New',Courier,monospace;font-size:12px;font-weight:700;letter-spacing:1.5px;color:#ffffff;text-decoration:none;text-transform:uppercase;">
            Acessar Plataforma &rarr;
          </a>
        </td>
      </tr>
    </table>
  `;

  return baseWrapper('#06A77D', 'ACESSO APROVADO', `Bem-vindo à plataforma ADAS PRO, ${data.userName}`, body);
}

// ─── Template: resposta no ticket (para o membro) ─────────────────────────────
// Acento: #00B4D8 (tech cyan) — tom técnico/comunicação

function templateTicketReply(data: Record<string, any>, siteUrl: string) {
  const ticketId = data.ticketId ? `TKT-${String(data.ticketId).padStart(3, '0')}` : 'TKT';

  const body = `
    <!-- Título -->
    <h1 style="margin:0 0 6px;font-family:Georgia,'Times New Roman',serif;font-size:22px;font-weight:700;color:#0D1821;letter-spacing:-0.3px;">
      Resposta no suporte
    </h1>
    <p style="margin:0 0 28px;font-family:Georgia,'Times New Roman',serif;font-size:14px;color:#6B7385;line-height:1.5;">
      Seu ticket recebeu uma resposta do mentor técnico.
    </p>

    <!-- ID + Título do ticket -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:4px;">
      <tr>
        <td>
          <span style="font-family:'Courier New',Courier,monospace;font-size:10px;letter-spacing:2px;color:#00B4D8;text-transform:uppercase;">
            ${ticketId}
          </span>
        </td>
      </tr>
    </table>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
      <tr>
        <td style="border-bottom:2px solid #00B4D8;padding-bottom:10px;">
          <span style="font-family:Georgia,'Times New Roman',serif;font-size:15px;font-weight:700;color:#1B2B4D;">
            ${esc(data.ticketTitle)}
          </span>
        </td>
      </tr>
    </table>

    <!-- Mensagem da resposta -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
           style="background-color:#F4FAFD;border-left:3px solid #00B4D8;border-radius:0 4px 4px 0;margin-bottom:28px;">
      <tr>
        <td style="padding:6px 24px 4px;">
          <span style="font-family:'Courier New',Courier,monospace;font-size:9px;letter-spacing:2px;color:#00B4D8;text-transform:uppercase;">RESPOSTA DO MENTOR</span>
        </td>
      </tr>
      <tr>
        <td style="padding:4px 24px 20px;">
          <p style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:14px;color:#2D3748;line-height:1.7;">
            ${esc(data.message)}
          </p>
        </td>
      </tr>
    </table>

    <!-- CTA -->
    <table role="presentation" cellpadding="0" cellspacing="0">
      <tr>
        <td style="border-radius:3px;background-color:#00B4D8;">
          <a href="${siteUrl}/membros.html"
             style="display:inline-block;padding:14px 28px;font-family:'Courier New',Courier,monospace;font-size:12px;font-weight:700;letter-spacing:1.5px;color:#ffffff;text-decoration:none;text-transform:uppercase;">
            Ver Ticket Completo &rarr;
          </a>
        </td>
      </tr>
    </table>

    <p style="margin:20px 0 0;font-family:Georgia,'Times New Roman',serif;font-size:12px;color:#9AA0B0;line-height:1.6;">
      Para continuar a conversa, acesse a plataforma e responda diretamente no ticket.
    </p>
  `;

  return baseWrapper('#00B4D8', 'SUPORTE TÉCNICO', `Resposta no ticket: ${data.ticketTitle}`, body);
}

// ─── Template: novo lead capturado (para admin) ───────────────────────────────
// Acento: #00B4D8 (tech cyan) — tom informativo/comercial

function templateNewLead(data: Record<string, any>, siteUrl: string) {
  const row = (label: string, value: string, mono = false) => value ? `
            <tr class="data-row">
              <td style="padding:5px 0;width:120px;vertical-align:top;">
                <span style="font-family:'Courier New',Courier,monospace;font-size:10px;letter-spacing:1.5px;color:#9AA0B0;text-transform:uppercase;">${label}</span>
              </td>
              <td style="padding:5px 0;">
                <span style="font-family:${mono ? "'Courier New',Courier,monospace;font-size:12px" : "Georgia,'Times New Roman',serif;font-size:14px;font-weight:700"};color:#1B2B4D;">${esc(value)}</span>
              </td>
            </tr>` : '';

  const body = `
    <!-- Título -->
    <h1 style="margin:0 0 6px;font-family:Georgia,'Times New Roman',serif;font-size:22px;font-weight:700;color:#0D1821;letter-spacing:-0.3px;">
      Novo lead capturado
    </h1>
    <p style="margin:0 0 28px;font-family:Georgia,'Times New Roman',serif;font-size:14px;color:#6B7385;line-height:1.5;">
      Um visitante enviou o formulário de contato da landing page.
    </p>

    <!-- Card de dados do lead -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
           style="background-color:#F4FAFD;border-left:3px solid #00B4D8;border-radius:0 4px 4px 0;margin-bottom:28px;">
      <tr>
        <td style="padding:20px 24px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            ${row('NOME', data.leadName)}
            ${row('E-MAIL', data.leadEmail, true)}
            ${row('WHATSAPP', data.leadPhone, true)}
            ${row('PERFIL', data.leadProfile, true)}
            ${row('NECESSIDADE', data.leadMessage)}
            ${row('ORIGEM', data.leadOrigin, true)}
          </table>
        </td>
      </tr>
    </table>

    <!-- CTA -->
    <table role="presentation" cellpadding="0" cellspacing="0">
      <tr>
        <td style="border-radius:3px;background-color:#00B4D8;">
          <a href="${siteUrl}/admin"
             style="display:inline-block;padding:14px 28px;font-family:'Courier New',Courier,monospace;font-size:12px;font-weight:700;letter-spacing:1.5px;color:#ffffff;text-decoration:none;text-transform:uppercase;">
            Ver Leads no Painel &rarr;
          </a>
        </td>
      </tr>
    </table>

    <p style="margin:20px 0 0;font-family:Georgia,'Times New Roman',serif;font-size:12px;color:#9AA0B0;line-height:1.6;">
      Acesse o painel de administração, seção <strong>Leads</strong>, para acompanhar e marcar o andamento do contato.
    </p>
  `;

  return baseWrapper('#00B4D8', 'NOVO LEAD', `${data.leadName} enviou o formulário de contato`, body);
}

export const __testing = { ALLOWED_ROLES, MAX_BODY_BYTES };
