declare namespace Deno {
  export const env: {
    get(key: string): string | undefined;
  };
}

declare module 'https://deno.land/std@0.224.0/http/server.ts' {
  export function serve(
    handler: (request: Request) => Response | Promise<Response>
  ): void;
}

interface ImportMeta {
  readonly main: boolean;
}

declare module 'https://esm.sh/@supabase/supabase-js@2.49.0' {
  export interface SupabaseClient {
    [key: string]: unknown;
  }

  export function createClient(
    supabaseUrl: string,
    supabaseKey: string,
    options?: Record<string, unknown>
  ): any;
}