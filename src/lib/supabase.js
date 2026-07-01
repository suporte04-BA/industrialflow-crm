import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key'
);

export const isConfigured = () => {
  return supabaseUrl && supabaseAnonKey && !supabaseUrl.includes('placeholder');
};

export const signUp = async (email, password, fullName) => {
  if (!isConfigured()) return { data: null, error: { message: 'Supabase nao configurado' } };
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName, role: 'funcionario' },
        emailRedirectTo: window.location.origin,
      },
    });
    return { data, error };
  } catch {
    return { data: null, error: { message: 'Falha ao conectar. Verifique sua conexao e tente novamente.' } };
  }
};

export const signUpByName = async (name, password) => {
  if (!isConfigured()) return { data: null, error: { message: 'Supabase nao configurado' } };
  const email = name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '')
    .trim() + '@transobra.local';

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
    const { data: { user }, error } = await supabase.auth.getUser();
    if (user?.id && user.access_token) {
      const response = await fetch('/api/profiles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jwt: user.access_token })
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
