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
