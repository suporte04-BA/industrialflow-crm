import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, isConfigured, getEmailHeaders } from '../lib/supabase';
import { toCamel } from '../lib/converters';
import { nameToEmail } from '../lib/validation';

const LOCAL_KEY = 'usuarios_local';

function getLocal() {
  try { return JSON.parse(localStorage.getItem(LOCAL_KEY) || '[]'); } catch { return []; }
}

function saveLocal(items) {
  localStorage.setItem(LOCAL_KEY, JSON.stringify(items));
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
    staleTime: 0,
    refetchOnWindowFocus: true,
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
    mutationFn: async ({ fullName, password, role, email, temEmail }) => {
      const internalEmail = nameToEmail(fullName);

      if (!isConfigured()) {
        const local = {
          id: crypto.randomUUID(),
          fullName,
          email: temEmail === false ? internalEmail : (email || internalEmail),
          role: role || 'funcionario',
          tem_email: temEmail !== false,
          createdAt: new Date().toISOString(),
        };
        const stored = getLocal();
        stored.unshift(local);
        saveLocal(stored);
        return local;
      }

      const res = await fetch('/api/users/create', {
        method: 'POST',
        headers: await getEmailHeaders(),
        body: JSON.stringify({
          email: email || internalEmail,
          password,
          full_name: fullName,
          role: role || 'funcionario',
          tem_email: temEmail !== false,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao criar usuario');

      return { id: data.user?.id, fullName, email: email || internalEmail, role: role || 'funcionario', tem_email: temEmail !== false };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usuarios'] });
    },
  });
}

export function useUpdateUsuarioRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, role }) => {
      if (!isConfigured()) {
        const users = getLocal();
        const targetUser = users.find((u) => u.id === id);
        if (targetUser && (targetUser.role === 'gestor' || targetUser.role === 'admin')) {
          const gestorCount = users.filter((u) => u.role === 'gestor' || u.role === 'admin').length;
          if (gestorCount <= 1 && role === 'funcionario') {
            throw new Error('Deve haver pelo menos um gestor no sistema.');
          }
        }
        const stored = getLocal();
        const idx = stored.findIndex((u) => u.id === id);
        if (idx >= 0) stored[idx] = { ...stored[idx], role };
        saveLocal(stored);
        return { id, role };
      }

      const { data: allProfiles } = await supabase.from('profiles').select('id, role');
      if (allProfiles) {
        const target = allProfiles.find((u) => u.id === id);
        if (target && (target.role === 'gestor' || target.role === 'admin')) {
          const gestorCount = allProfiles.filter((u) => u.role === 'gestor' || u.role === 'admin').length;
          if (gestorCount <= 1 && role === 'funcionario') {
            throw new Error('Deve haver pelo menos um gestor no sistema.');
          }
        }
      }

      const { error } = await supabase
        .from('profiles')
        .update({ role })
        .eq('id', id);
      if (error) throw error;

      try {
        const headers = await getEmailHeaders();
        await fetch('/api/users/role-change', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            user_id: id,
            user_name: allProfiles?.find((u) => u.id === id)?.full_name || '',
            user_email: allProfiles?.find((u) => u.id === id)?.email || '',
            new_role: role,
            old_role: allProfiles?.find((u) => u.id === id)?.role || '',
          }),
        });
      } catch { /* email is best effort */ }

      return { id, role };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usuarios'] });
    },
  });
}

export function useUpdateUsuario() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, fullName, email }) => {
      if (!isConfigured()) {
        const users = getLocal();
        const idx = users.findIndex((u) => u.id === id);
        if (idx >= 0) {
          users[idx] = { ...users[idx], fullName, email };
          saveLocal(users);
        }
        return { id, fullName, email };
      }
      const payload = {};
      if (fullName !== undefined) payload.full_name = fullName;
      if (email !== undefined) payload.email = email;
      const { error } = await supabase.from('profiles').update(payload).eq('id', id);
      if (error) throw error;
      return { id, fullName, email };
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
        throw new Error('Você não pode remover seu próprio usuário.');
      }

      if (!isConfigured()) {
        const users = getLocal();
        const targetUser = users.find((u) => u.id === id);
        if (targetUser && (targetUser.role === 'gestor' || targetUser.role === 'admin')) {
          const gestorCount = users.filter((u) => u.role === 'gestor' || u.role === 'admin').length;
          if (gestorCount <= 1) {
            throw new Error('Deve haver pelo menos um gestor no sistema.');
          }
        }
        const stored = getLocal().filter((u) => u.id !== id);
        saveLocal(stored);
        return;
      }

      const { data: allProfiles } = await supabase.from('profiles').select('id, role');
      if (allProfiles) {
        const target = allProfiles.find((u) => u.id === id);
        if (target && (target.role === 'gestor' || target.role === 'admin')) {
          const gestorCount = allProfiles.filter((u) => u.role === 'gestor' || u.role === 'admin').length;
          if (gestorCount <= 1) {
            throw new Error('Deve haver pelo menos um gestor no sistema.');
          }
        }
      }

      const { error: profileError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', id);
      if (profileError) throw profileError;

      try {
        await fetch('/api/users/delete', {
          method: 'POST',
          headers: await getEmailHeaders(),
          body: JSON.stringify({ user_id: id }),
        });
      } catch { /* best effort */ }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usuarios'] });
    },
  });
}
