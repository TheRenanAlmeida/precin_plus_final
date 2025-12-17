
import type { UserProfile } from '../types';

// Gera ou recupera um token de sessão curto (ex: AB12) que dura enquanto a aba estiver aberta
export const getSessionToken = (): string => {
  if (typeof sessionStorage === 'undefined') return '????';
  
  let token = sessionStorage.getItem('pp_wmark_session');
  if (!token) {
    // Gera 4 caracteres aleatórios alfanuméricos maiúsculos
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    token = Array.from({ length: 4 }, () => chars.charAt(Math.floor(Math.random() * chars.length))).join('');
    sessionStorage.setItem('pp_wmark_session', token);
  }
  return token;
};

// Formata CNPJ mascarado: 12.345.678/0001-90 -> 12...1-90
const maskCNPJ = (cnpj: string | null): string => {
  if (!cnpj) return '****';
  const clean = cnpj.replace(/\D/g, '');
  if (clean.length < 12) return clean; // Se for muito curto, mostra o que tem
  return `${clean.slice(0, 2)}...${clean.slice(-4)}`;
};

// Pega os últimos 8 caracteres do ID
const shortUID = (id: string): string => {
  if (!id) return 'Unknown';
  return id.slice(-8).toUpperCase();
};

export const buildUserWatermark = (user: UserProfile, base?: string): { line1: string; line2: string } => {
  const email = user.email ? user.email.split('@')[0] : 'usuario'; // Apenas a parte antes do @ para economizar espaço
  const cnpj = user.cnpj ? `CNPJ ${maskCNPJ(user.cnpj)}` : 'CPF/CNPJ ****';
  const baseName = base ? base.split(' - ')[0] : (user.preferencias?.[0]?.base.split(' - ')[0] || 'Geral');
  
  const uid = shortUID(user.id);
  const session = getSessionToken();
  
  // Timestamp arredondado por minuto (YYYY-MM-DD HH:mm)
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10);
  const timeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  // Linha 1: email | CNPJ **** | base
  const line1 = `${email} | ${cnpj} | ${baseName}`;
  
  // Linha 2: UID XXXXXXXX | YYYY-MM-DD HH:mm | S:AB12
  const line2 = `UID ${uid} | ${dateStr} ${timeStr} | S:${session}`;

  return { line1, line2 };
};
