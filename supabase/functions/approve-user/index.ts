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
};

if (import.meta.main) {
  serve((req) => handler(req, deps));
}