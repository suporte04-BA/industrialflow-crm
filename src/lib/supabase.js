import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://mbcdbclosomqpfboyffj.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1iY2RiY2xvc29tcXBmYm95ZmZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE2MDcxMTksImV4cCI6MjA5NzE4MzExOX0.iNh0wpvpblUGCAo3wOkNxelMTlLUe7RBoFlqPLjxXxE';

let _supabase = null;
let _config = null;
let _configPromise = null;

function getClient() {
  if (_supabase) return _supabase;
  _supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  });
  return _supabase;
}

export const supabase = {
  get auth() { return getClient().auth; },
  from(table) { return getClient().from(table); },
  get storage() { return getClient().storage; },
  rpc(fn, params) { return getClient().rpc(fn, params); },
};

export async function loadConfig() {
  if (_config) return _config;
  if (_configPromise) return _configPromise;

  _configPromise = (async () => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      const res = await fetch('/api/config', { signal: controller.signal });
      clearTimeout(timeoutId);
      if (!res.ok) throw new Error('Config fetch failed');
      const data = await res.json();
      _config = {
        supabaseUrl: data.supabaseUrl || SUPABASE_URL,
        supabaseAnonKey: data.supabaseAnonKey || SUPABASE_ANON_KEY,
        emailRecipient: data.emailRecipient || '',
        emailFrom: data.emailFrom || '',
      };
      return _config;
    } catch (err) {
      console.warn('[supabase] loadConfig failed, using defaults:', err.message);
      _config = { supabaseUrl: SUPABASE_URL, supabaseAnonKey: SUPABASE_ANON_KEY, emailRecipient: '', emailFrom: '' };
      _configPromise = null;
      return _config;
    }
  })();

  return _configPromise;
}

export function resetConfig() {
  _config = null;
  _configPromise = null;
}

export function isConfigured() {
  return true;
}

export const signUp = async (email, password, fullName) => {
  if (!isConfigured()) return { data: null, error: { message: 'Supabase nao configurado' } };
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName, role: 'funcionario' },
        emailRedirectTo: window.location.origin,
        emailSubmitConfirmation: false,
        emailVerificationRequired: false,
      },
    });
    return { data, error };
  } catch {
    return { data: null, error: { message: 'Falha ao conectar. Verifique sua conexao e tente novamente.' } };
  }
};

export const signUpByName = async (name, password) => {
  if (!isConfigured()) return { data: null, error: { message: 'Supabase nao configurado' } };

  const slug = name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '')
    .trim();
  const email = `${slug}@transobra.app`;

  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: name, role: 'funcionario' },
        emailRedirectTo: window.location.origin,
      },
    });
    return { data, error };
  } catch {
    return { data: null, error: { message: 'Falha ao conectar. Verifique sua conexao e tente novamente.' } };
  }
};

export const signIn = async (email, password) => {
  if (!isConfigured()) return { data: null, error: { message: 'Supabase nao configurado' } };
  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    return { data, error };
  } catch {
    return { data: null, error: { message: 'Falha ao conectar. Verifique sua conexao e tente novamente.' } };
  }
};

export const signInByName = async (name, password) => {
  if (!isConfigured()) return { data: null, error: { message: 'Supabase nao configurado' } };

  try {
    const { data: profiles, error: profileErr } = await supabase
      .from('profiles')
      .select('email')
      .ilike('full_name', name)
      .limit(1);

    if (profileErr) {
      return { data: null, error: { message: 'Erro ao buscar usuario. Tente usar o email para entrar.' } };
    }

    if (!profiles || profiles.length === 0) {
      return { data: null, error: { message: 'Usuario nao encontrado. Use o email para entrar.' } };
    }

    const { data, error } = await supabase.auth.signInWithPassword({ email: profiles[0].email, password });
    return { data, error };
  } catch {
    return { data: null, error: { message: 'Falha ao conectar. Verifique sua conexao e tente novamente.' } };
  }
};

export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  return { error };
};

export const getCurrentUser = async () => {
  if (!isConfigured()) return { user: null, error: { message: 'Supabase nao configurado' } };

  try {
    const { data: { session } } = await supabase.auth.getSession();
    const { data: { user }, error } = await supabase.auth.getUser();
    const accessToken = session?.access_token;
    if (user?.id && accessToken) {
      const response = await fetch('/api/profiles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jwt: accessToken })
      });
      if (response.ok) {
        const { user: profile } = await response.json();
        return { user: { ...user, ...profile }, error: null };
      }
    }
    return { user, error };
  } catch (e) {
    console.error('Worker profile fetch failed:', e);
    const { data: { user }, error } = await supabase.auth.getUser();
    return { user, error };
  }
};

export async function getEmailHeaders() {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export const storage = {
  upload: async (bucket, path, file) => {
    const { data, error } = await supabase.storage.from(bucket).upload(path, file);
    return { data, error };
  },
  getUrl: async (bucket, path) => {
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return data?.publicUrl;
  },
  download: async (bucket, path) => {
    const { data, error } = await supabase.storage.from(bucket).download(path);
    return { data, error };
  },
};
