import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase credentials not configured. Using mock mode.');
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key'
);

// Helper: check if supabase is configured
export const isConfigured = () => {
  return supabaseUrl && supabaseAnonKey && !supabaseUrl.includes('placeholder');
};

// Auth helpers
export const signUp = async (email, password, fullName) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName },
    },
  });
  return { data, error };
};

export const signIn = async (email, password) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
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

// Database helpers
export const db = {
  // Ordens de Servico
  ordensServico: {
    list: async (filters = {}) => {
      let query = supabase.from('ordens_servico').select('*');
      if (filters.status && filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }
      if (filters.search) {
        query = query.or(`cliente.ilike.%${filters.search}%,id.ilike.%${filters.search}%`);
      }
      const { data, error } = await query.order('created_at', { ascending: false });
      return { data, error };
    },
    get: async (id) => {
      const { data, error } = await supabase.from('ordens_servico').select('*').eq('id', id).single();
      return { data, error };
    },
    create: async (os) => {
      const { data, error } = await supabase.from('ordens_servico').insert(os).select().single();
      return { data, error };
    },
    update: async (id, updates) => {
      const { data, error } = await supabase.from('ordens_servico').update(updates).eq('id', id).select().single();
      return { data, error };
    },
    delete: async (id) => {
      const { error } = await supabase.from('ordens_servico').delete().eq('id', id);
      return { error };
    },
  },

  // Equipamentos
  equipamentos: {
    list: async (filters = {}) => {
      let query = supabase.from('equipamentos').select('*');
      if (filters.status && filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }
      if (filters.search) {
        query = query.or(`nome.ilike.%${filters.search}%,categoria.ilike.%${filters.search}%`);
      }
      const { data, error } = await query.order('created_at', { ascending: false });
      return { data, error };
    },
    create: async (eq) => {
      const { data, error } = await supabase.from('equipamentos').insert(eq).select().single();
      return { data, error };
    },
    update: async (id, updates) => {
      const { data, error } = await supabase.from('equipamentos').update(updates).eq('id', id).select().single();
      return { data, error };
    },
    delete: async (id) => {
      const { error } = await supabase.from('equipamentos').delete().eq('id', id);
      return { error };
    },
  },

  // Contratos
  contratos: {
    list: async (filters = {}) => {
      let query = supabase.from('contratos').select('*');
      if (filters.status && filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }
      if (filters.search) {
        query = query.or(`cliente.ilike.%${filters.search}%,id.ilike.%${filters.search}%`);
      }
      const { data, error } = await query.order('created_at', { ascending: false });
      return { data, error };
    },
    create: async (ct) => {
      const { data, error } = await supabase.from('contratos').insert(ct).select().single();
      return { data, error };
    },
    update: async (id, updates) => {
      const { data, error } = await supabase.from('contratos').update(updates).eq('id', id).select().single();
      return { data, error };
    },
    delete: async (id) => {
      const { error } = await supabase.from('contratos').delete().eq('id', id);
      return { error };
    },
  },

  // Comprovantes de Entrega
  comprovantes: {
    list: async () => {
      const { data, error } = await supabase.from('comprovantes_entrega').select('*').order('created_at', { ascending: false });
      return { data, error };
    },
    create: async (comp) => {
      const { data, error } = await supabase.from('comprovantes_entrega').insert(comp).select().single();
      return { data, error };
    },
    update: async (id, updates) => {
      const { data, error } = await supabase.from('comprovantes_entrega').update(updates).eq('id', id).select().single();
      return { data, error };
    },
  },

  // Assinaturas
  assinaturas: {
    create: async (sig) => {
      const { data, error } = await supabase.from('assinaturas').insert(sig).select().single();
      return { data, error };
    },
  },

  // Notas
  notas: {
    list: async () => {
      const { data, error } = await supabase.from('notas').select('*').order('updated_at', { ascending: false });
      return { data, error };
    },
    create: async (nota) => {
      const { data, error } = await supabase.from('notas').insert(nota).select().single();
      return { data, error };
    },
    update: async (id, updates) => {
      const { data, error } = await supabase.from('notas').update(updates).eq('id', id).select().single();
      return { data, error };
    },
    delete: async (id) => {
      const { error } = await supabase.from('notas').delete().eq('id', id);
      return { error };
    },
  },
};

// Storage helpers
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
