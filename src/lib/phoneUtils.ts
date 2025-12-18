
/**
 * Formats a phone number to the Brazilian standard: 55 + DDD + 9 + 8 digits (Total 13 digits).
 * Removes all non-numeric characters.
 * Handles cases:
 * - 10 digits (DDD + 8 digits): Adds 55 and 9.
 * - 11 digits (DDD + 9 digits): Adds 55.
 * - 12 digits (55 + DDD + 8 digits): Adds 9.
 * - 13 digits (55 + DDD + 9 digits): Keeps as is.
 * 
 * Returns null if the number doesn't fit a recognizable pattern.
 */
export function formatBrazilPhone(input: string | number): string | null {
    if (!input) return null;

    // Remove non-digits
    const cleaned = String(input).replace(/\D/g, '');

    // Case 0: Empty or too short
    if (cleaned.length < 10) return null;

    // Case 1: 10 digits (DDD + 8 digits) -> Add 55 + 9
    // Ex: 1188887777 -> 5511988887777
    if (cleaned.length === 10) {
        return `55${cleaned.slice(0, 2)}9${cleaned.slice(2)}`;
    }

    // Case 2: 11 digits (DDD + 9 digits) -> Add 55
    // Ex: 11988887777 -> 5511988887777
    if (cleaned.length === 11) {
        // Check if it's already 55... + 9 digits (unlikely for 11 digits total 55 + 11... no wait)
        // Common error: stored as 551188887777 (12 digits) treated below.
        // If str starts with 55? 55 + 9 digits = 11 digits. 
        // 55 11 98888 7777 => 13 digits.

        // Normal case: 11 98888 7777 (DDD + 9)
        return `55${cleaned}`;
    }

    // Case 3: 12 digits (55 + DDD + 8 digits) -> Add 9
    // Ex: 551188887777 -> 5511988887777
    if (cleaned.length === 12 && cleaned.startsWith('55')) {
        const ddd = cleaned.slice(2, 4);
        const number = cleaned.slice(4);
        return `55${ddd}9${number}`;
    }

    // Case 4: 13 digits (55 + DDD + 9 digits) -> Perfect
    // Ex: 5511988887777
    if (cleaned.length === 13 && cleaned.startsWith('55')) {
        return cleaned;
    }

    // Fallback for larger numbers or non-standard, just return cleaned if looks like a DDI number
    if (cleaned.length > 8) return cleaned;

    return null;
}
