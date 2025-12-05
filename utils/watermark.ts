import type { UserProfile } from '../types';

export const buildUserWatermark = (user: UserProfile): string => {
  const email = user.email ?? 'sem-email';
  const cnpj = user.cnpj ?? 'sem-CNPJ';
  return `${email} • CNPJ: ${cnpj}`;
};
