import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';

const corsHeaders = {
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

type Database = {
  public: {
    Tables: {
      media_posts: {
        Row: {
          file_url: string;
          id: string;
          user_id: string;
        };
      };
    };
  };
};

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (request.method !== 'POST') {
    return jsonResponse(405, { error: 'Only POST is allowed.', step: 'request' });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const authorization = request.headers.get('authorization') ?? '';
  const token = authorization.replace(/^Bearer\s+/i, '');

  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse(500, {
      error: 'Delete account function is missing server configuration.',
      step: 'configuration',
    });
  }

  if (!token) {
    return jsonResponse(401, {
      error: 'Missing authenticated user token.',
      step: 'authentication',
    });
  }

  const adminClient = createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const {
    data: { user },
    error: userError,
  } = await adminClient.auth.getUser(token);

  if (userError || !user) {
    return jsonResponse(401, {
      error: userError?.message ?? 'Unable to verify authenticated user.',
      step: 'authentication',
    });
  }

  const { data: mediaPosts, error: mediaError } = await adminClient
    .from('media_posts')
    .select('id, user_id, file_url')
    .eq('user_id', user.id);

  if (mediaError) {
    return jsonResponse(500, {
      error: mediaError.message,
      step: 'load-media',
    });
  }

  const storagePaths = Array.from(
    new Set(
      (mediaPosts ?? [])
        .map((post) => getMediaStoragePath(post.file_url))
        .filter((path): path is string => Boolean(path)),
    ),
  );

  for (let index = 0; index < storagePaths.length; index += 100) {
    const batch = storagePaths.slice(index, index + 100);
    const { error: storageError } = await adminClient.storage
      .from('media')
      .remove(batch);

    if (storageError) {
      return jsonResponse(500, {
        error: storageError.message,
        step: 'delete-storage',
      });
    }
  }

  const { error: profileError } = await adminClient
    .from('profiles')
    .delete()
    .eq('id', user.id);

  if (profileError) {
    return jsonResponse(500, {
      error: profileError.message,
      step: 'delete-profile',
    });
  }

  const { error: deleteUserError } = await adminClient.auth.admin.deleteUser(
    user.id,
  );

  if (deleteUserError) {
    return jsonResponse(500, {
      error: deleteUserError.message,
      step: 'delete-auth-user',
    });
  }

  return jsonResponse(200, {
    deletedStorageFiles: storagePaths.length,
    ok: true,
  });
});

function jsonResponse(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
    status,
  });
}

function getMediaStoragePath(fileUrlOrPath: string | null | undefined) {
  const value = fileUrlOrPath?.trim();

  if (!value) {
    return null;
  }

  if (!value.startsWith('http://') && !value.startsWith('https://')) {
    return normalizeStoragePath(value);
  }

  try {
    const parsedUrl = new URL(value);
    const marker = '/storage/v1/object/public/media/';
    const markerIndex = parsedUrl.pathname.indexOf(marker);

    if (markerIndex === -1) {
      return null;
    }

    return decodeURIComponent(
      parsedUrl.pathname.slice(markerIndex + marker.length),
    );
  } catch {
    return null;
  }
}

function normalizeStoragePath(fileUrlOrPath: string) {
  return fileUrlOrPath.replace(/^\/+/, '').replace(/^media\//, '');
}
