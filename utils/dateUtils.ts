
/**
 * Formats a Date object into a "YYYY-MM-DD" string, adjusted for the local timezone.
 * This is crucial for correctly querying the database, which expects dates in this format
 * without timezone information.
 * @param date - The Date object to format.
 * @returns A string in "YYYY-MM-DD" format.
 */
export const formatDateForInput = (date: Date): string => {
    // Adjust for timezone offset to display the correct local date in the input
    const adjustedDate = new Date(date.getTime() - (date.getTimezoneOffset() * 60000));
    return adjustedDate.toISOString().split("T")[0];
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
