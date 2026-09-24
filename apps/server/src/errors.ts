export class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

export const badRequest = (message: string) => new HttpError(400, 'bad_request', message);
export const unauthorized = (message = 'Accesso richiesto') => new HttpError(401, 'unauthorized', message);
export const forbidden = (message = 'Operazione non consentita') => new HttpError(403, 'forbidden', message);
export const notFound = (message = 'Non trovato') => new HttpError(404, 'not_found', message);
export const conflict = (message: string) => new HttpError(409, 'conflict', message);

/** Tiny body validators: keep the API strict without a schema dependency. */
export function str(body: unknown, key: string, opts: { min?: number; max?: number; optional?: boolean; pattern?: RegExp } = {}): string {
  const v = (body as Record<string, unknown> | null)?.[key];
  if (v === undefined || v === null || v === '') {
    if (opts.optional) return '';
    throw badRequest(`Campo obbligatorio: ${key}`);
  }
  if (typeof v !== 'string') throw badRequest(`Il campo ${key} deve essere testo`);
  const s = v.trim();
  if (opts.min !== undefined && s.length < opts.min) throw badRequest(`${key}: almeno ${opts.min} caratteri`);
  if (opts.max !== undefined && s.length > opts.max) throw badRequest(`${key}: massimo ${opts.max} caratteri`);
  if (opts.pattern && !opts.pattern.test(s)) throw badRequest(`${key}: formato non valido`);
  return s;
}
