
/**
 * Formata um objeto Date para uma string "YYYY-MM-DD", ajustado para a data LOCAL do dispositivo.
 * Crucial para bater com a data do <input type="date"> e evitar que a data mude 
 * precocemente para o dia seguinte devido ao fuso UTC.
 * @param date - O objeto Date a ser formatado.
 * @returns Uma string no formato "YYYY-MM-DD".
 */
export const formatDateForInput = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

export const BRAZIL_TZ_LABEL = "Horário de Brasília";

export function formatBrazilDateTime(date: Date): string {
  const options: Intl.DateTimeFormatOptions = { timeZone: 'America/Sao_Paulo' };
  
  const weekday = date.toLocaleDateString("pt-BR", { ...options, weekday: "long" });
  const day = date.toLocaleDateString("pt-BR", { ...options, day: "2-digit" });
  const month = date.toLocaleDateString("pt-BR", { ...options, month: "long" });
  const year = date.toLocaleDateString("pt-BR", { ...options, year: "numeric" });
  const time = date.toLocaleTimeString("pt-BR", { ...options, hour12: false });

  return `${weekday}, ${day} de ${month} de ${year} às ${time}`;
}
