import type { DistributorStyle, DistributorDBStyle } from '../types';

/**
 * Extracts the base brand name from a potentially modified display name.
 * This handles names with state suffixes (e.g., "Ipiranga SP") or numeric suffixes ("Ipiranga 2").
 * @param displayName The full display name of the distributor.
 * @returns The original, base name of the brand.
 */
export const getOriginalBrandName = (displayName: string): string => {
    if (!displayName) return '';
    let baseName = displayName;
    
    // Remove numeric suffix like " 2"
    baseName = baseName.replace(/ \d+$/, '').trim();

    // Remove state suffix like " SP"
    const parts = baseName.split(' ');
    if (parts.length > 1 && parts[parts.length - 1].length === 2 && parts[parts.length - 1].toUpperCase() === parts[parts.length - 1]) {
        return parts.slice(0, -1).join(' ');
    }
    
    return baseName;
};

/**
 * A default style object for distributors that do not have a custom style defined.
 */
export const defaultDistributorStyle: DistributorStyle = {
    background: 'rgba(107, 114, 128, 0.95)', // slate-500
    border: '#FFFFFF',
    shadowColor: 'rgba(107, 114, 128, 0.5)'
};

/**
 * A style factory for distributors. It retrieves a distributor's style from a map
 * of database styles. If no specific style is found for the original brand name,
 * it returns a default style.
 * 
 * @param distributorName The display name of the distributor.
 * @param dbStyles A Map where keys are original brand names and values are DB style objects.
 * @returns A `DistributorStyle` object.
 */
export const getDistributorStyle = (distributorName: string, dbStyles: Map<string, DistributorDBStyle>): DistributorStyle => {
    const originalName = getOriginalBrandName(distributorName);
    const dbStyle = dbStyles.get(originalName);

    if (dbStyle) {
        return {
            background: dbStyle.bg_color,
            border: dbStyle.text_color,
            shadowColor: dbStyle.shadow_style || undefined,
        };
    }
    
    return defaultDistributorStyle;
};
