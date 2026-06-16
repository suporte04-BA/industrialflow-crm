export class AppError extends Error {
  constructor(message, status = 500, code = 'UNKNOWN') {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.code = code;
  }
}

export class SupabaseQueryError extends AppError {
  constructor(message, details = null) {
    super(message, 400, 'SUPABASE_QUERY');
    this.name = 'SupabaseQueryError';
    this.details = details;
  }
}

export class SupabaseAuthError extends AppError {
  constructor(message) {
    super(message, 401, 'SUPABASE_AUTH');
    this.name = 'SupabaseAuthError';
  }
}

export class ValidationError extends AppError {
  constructor(message, field = null) {
    super(message, 422, 'VALIDATION');
    this.name = 'ValidationError';
    this.field = field;
  }
}

export function handleSupabaseError(error) {
  if (!error) return null;
  if (error.code === 'PGRST116') return null;
  if (error.message?.includes('new row violates')) {
    return new SupabaseQueryError(
      'Dados invalidos para esta operacao. Verifique os campos obrigatorios.',
      error.details
    );
  }
  if (error.message?.includes('duplicate key')) {
    return new SupabaseQueryError('Este registro ja existe.', error.details);
  }
  if (error.message?.includes('violates foreign key')) {
    return new SupabaseQueryError('Referencia invalida. Verifique os dados selecionados.', error.details);
  }
  if (error.message?.includes('violates row-level security')) {
    return new SupabaseAuthError('Voce nao tem permissao para esta operacao.');
  }
  return new SupabaseQueryError(error.message || 'Erro desconhecido na consulta.', error);
}

export function formatErrorMessage(error) {
  if (error instanceof AppError) return error.message;
  if (typeof error === 'string') return error;
  return 'Ocorreu um erro inesperado. Tente novamente.';
}
