// ADAS PRO — Edge Function: notify
// Dispara e-mails transacionais via Resend. Exige JWT de gestor/admin/superadmin
// ativo (sem MFA pendente). A lógica/testes ficam em handler.ts (puro, sem
// módulos remotos); aqui fica apenas o wiring de runtime.

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.0';
import { handler } from './handler.ts';

const RESEND_KEY   = Deno.env.get('RESEND_API_KEY');
const ADMIN_EMAIL  = Deno.env.get('ADMIN_EMAIL')  || 'superadmin@adaspro.com.br';
const SITE_URL     = Deno.env.get('SITE_URL')     || 'https://adaspro.com.br';
const SUPA_URL     = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ANON_KEY     = Deno.env.get('SUPABASE_ANON_KEY')!;

serve((req) =>
  handler(req, {
    resendKey: RESEND_KEY,
    adminEmail: ADMIN_EMAIL,
    siteUrl: SITE_URL,
    createUserClient: (authHeader) =>
      createClient(SUPA_URL, ANON_KEY, { global: { headers: { Authorization: authHeader } } }),
    createAdminClient: () => createClient(SUPA_URL, SERVICE_ROLE),
    sendEmail: (payload) =>
      fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }),
  })
);
