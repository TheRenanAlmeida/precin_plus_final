
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

// Formata CNPJ completo com pontos e traços para melhor legibilidade na marca d'água
const formatFullCNPJ = (cnpj: string | null): string => {
  if (!cnpj) return '****';
  const clean = cnpj.replace(/\D/g, '');
  if (clean.length !== 14) return clean; 
  return clean.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
};

// Pega os últimos 8 caracteres do ID
const shortUID = (id: string): string => {
  if (!id) return 'Unknown';
  return id.slice(-8).toUpperCase();
};

export const buildUserWatermark = (user: UserProfile): { line1: string; line2: string; line3: string } => {
  const name = user.nome || 'Usuário';
  const cnpj = formatFullCNPJ(user.cnpj);
  const uid = shortUID(user.id);
  const session = getSessionToken();
  
  // Data formatada como DD/MM/AAAA
  const now = new Date();
  const dateStr = now.toLocaleDateString('pt-BR');

  // Estrutura de 3 Linhas solicitada:
  // Linha 1: Cabeçalho
  const line1 = "PRECIN PLUS • CONFIDENCIAL";
  
  // Linha 2: Nome do Usuário | SESSÃO (Sigla S:)
  const line2 = `${name} | S: ${session}`;

  // Linha 3: CNPJ | DATA | UID
  const line3 = `${cnpj} | ${dateStr} | UID ${uid}`;

  return { line1, line2, line3 };
};
