import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Credentials check: if missing, supabase client uses placeholder and isConfigured() returns false

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key'
);

export const isConfigured = () => {
  return supabaseUrl && supabaseAnonKey && !supabaseUrl.includes('placeholder');
};

export const signUp = async (email, password, fullName) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName } },
  });
  return { data, error };
};

export const signIn = async (email, password) => {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  return { data, error };
};

export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  return { error };
};

export const getCurrentUser = async () => {
  const { data: { user }, error } = await supabase.auth.getUser();
  return { user, error };
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
