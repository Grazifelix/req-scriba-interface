// Nome do responsável pelas alterações, enviado no cabeçalho X-Usuario. É identificação, não autenticação.
const STORAGE_KEY = 'reqscriba.usuario';
const MAX_LENGTH = 100;
// O fetch só aceita cabeçalhos em Latin-1; outros caracteres fariam toda alteração falhar.
const HEADER_SAFE = /^[\x20-\x7E\xA0-\xFF]*$/;

export const USER_NAME_MAX_LENGTH = MAX_LENGTH;

export const validateUserName = (name: string): string | null => {
  if (name.length > MAX_LENGTH) return `Use no máximo ${MAX_LENGTH} caracteres.`;
  if (!HEADER_SAFE.test(name)) return 'Use apenas letras do alfabeto latino, números e pontuação comum.';
  return null;
};

export const getUserName = (): string | null => {
  try {
    const name = localStorage.getItem(STORAGE_KEY);
    return name && !validateUserName(name) ? name : null;
  } catch {
    return null;
  }
};

export const saveUserName = (name: string | null): void => {
  try {
    if (name) localStorage.setItem(STORAGE_KEY, name);
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Sem armazenamento local, o nome vale apenas nesta sessão.
  }
};
