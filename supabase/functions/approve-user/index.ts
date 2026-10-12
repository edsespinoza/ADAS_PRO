// ADAS PRO — Edge Function: approve-user — entrada
// Executa aprovação/bloqueio de usuários com service_role (server-side)
// Deploy: supabase functions deploy approve-user
// A lógica testável está em handler.ts.

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.0';
import { handler, type ApproveUserDeps } from './handler.ts';

const deps: ApproveUserDeps = {
  createUserClient: (authHeader) =>
    createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    ),
  createAdminClient: () =>
    createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    ),
  // Encaminha o JWT do chamador para o gate de auth do `notify` (server→server).
  notify: async (authHeader, event, data) => {
    const res = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/notify`, {
      method: 'POST',
      headers: { Authorization: authHeader, 'Content-Type': 'application/json' },
      body: JSON.stringify({ event, data }),
    });
    return res.ok;
  },
};

if (import.meta.main) {
  serve((req) => handler(req, deps));
}