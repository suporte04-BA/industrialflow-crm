import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, isConfigured } from '../lib/supabase';
import { toCamel, toSnake } from '../lib/converters';
import { nameToEmail } from '../lib/validation';

const LOCAL_KEY = 'usuarios_local';

function getLocal() {
  return JSON.parse(localStorage.getItem(LOCAL_KEY) || '[]');
}

function saveLocal(items) {
  localStorage.setItem(LOCAL_KEY, JSON.stringify(items));
}

function getGestorCount() {
  const users = getLocal();
  return users.filter((u) => u.role === 'gestor' || u.role === 'admin').length;
}

export function useUsuarios() {
  const query = useQuery({
    queryKey: ['usuarios'],
    queryFn: async () => {
      if (!isConfigured()) {
        const local = getLocal();
        if (local.length === 0) {
          const seed = [
            { id: '1', fullName: 'Admin TransObra', email: 'admin@transobra.com', role: 'admin', createdAt: new Date().toISOString() },
            { id: '2', fullName: 'Carlos Gestor', email: 'carlos@transobra.local', role: 'gestor', createdAt: new Date().toISOString() },
            { id: '3', fullName: 'Roberto Funcionario', email: 'roberto@transobra.local', role: 'funcionario', createdAt: new Date().toISOString() },
          ];
          saveLocal(seed);
          return seed;
        }
        return local;
      }
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) {
        return getLocal();
      }
      return (data || []).map(toCamel);
    },
    staleTime: 10000,
  });

  return {
    data: query.data || [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}

export function useCreateUsuario() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ fullName, password, role }) => {
      const email = nameToEmail(fullName);

      if (!isConfigured()) {
        const local = {
          id: crypto.randomUUID(),
          fullName,
          email,
          role: role || 'funcionario',
          createdAt: new Date().toISOString(),
        };
        const stored = getLocal();
        stored.unshift(local);
        saveLocal(stored);
        return local;
      }

      try {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName, role: role || 'funcionario' },
            emailRedirectTo: window.location.origin,
          },
        });
        if (error) throw error;

        if (data.user) {
          const { error: profileError } = await supabase
            .from('profiles')
            .upsert({
              id: data.user.id,
              full_name: fullName,
              email,
              role: role || 'funcionario',
            });
          if (profileError) console.error('Profile insert error:', profileError);
        }

        return { id: data.user?.id, fullName, email, role: role || 'funcionario' };
      } catch (err) {
        const local = {
          id: crypto.randomUUID(),
          fullName,
          email,
          role: role || 'funcionario',
          createdAt: new Date().toISOString(),
        };
        const stored = getLocal();
        stored.unshift(local);
        saveLocal(stored);
        return local;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usuarios'] });
    },
  });
}

export function useUpdateUsuarioRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, role, currentUserId }) => {
      const users = getLocal();
      const targetUser = users.find((u) => u.id === id);

      if (targetUser && (targetUser.role === 'gestor' || targetUser.role === 'admin')) {
        const gestorCount = users.filter((u) => u.role === 'gestor' || u.role === 'admin').length;
        if (gestorCount <= 1 && role === 'funcionario') {
          throw new Error('Deve haver pelo menos um gestor no sistema.');
        }
      }

      if (!isConfigured()) {
        const stored = getLocal();
        const idx = stored.findIndex((u) => u.id === id);
        if (idx >= 0) stored[idx] = { ...stored[idx], role };
        saveLocal(stored);
        return { id, role };
      }

      const { error } = await supabase
        .from('profiles')
        .update({ role })
        .eq('id', id);
      if (error) throw error;
      return { id, role };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usuarios'] });
    },
  });
}

export function useDeleteUsuario() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, currentUserId }) => {
      if (id === currentUserId) {
        throw new Error('Voce nao pode remover seu proprio usuario.');
      }

      const users = getLocal();
      const targetUser = users.find((u) => u.id === id);
      if (targetUser && (targetUser.role === 'gestor' || targetUser.role === 'admin')) {
        const gestorCount = users.filter((u) => u.role === 'gestor' || u.role === 'admin').length;
        if (gestorCount <= 1) {
          throw new Error('Deve haver pelo menos um gestor no sistema.');
        }
      }

      if (!isConfigured()) {
        const stored = getLocal().filter((u) => u.id !== id);
        saveLocal(stored);
        return;
      }

      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usuarios'] });
    },
  });
}
