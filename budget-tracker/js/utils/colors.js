/**
 * Color Utilities - Vibrant colors for dark mode
 */
const ColorUtils = (function() {
    // Vibrant colors that pop on dark backgrounds
    const SUBCATEGORY_COLORS = [
        '#00d4aa', // electric teal (primary)
        '#ff6b9d', // coral pink
        '#7c5cff', // electric purple
        '#00c9a7', // bright mint
        '#ff8a5c', // soft coral
        '#5cb8ff', // sky blue
        '#c77dff', // soft violet
        '#4ecdc4', // aqua
        '#ff6b6b', // salmon
        '#95e679', // lime green
        '#ffd93d', // golden yellow
        '#6bcbff', // light blue
        '#ff85a2', // rose pink
        '#a8e6cf', // seafoam
        '#b388ff', // lavender
    ];

    // Category colors - vibrant and distinct for dark mode
    const CATEGORY_COLORS = [
        '#00d4aa', // electric teal
        '#ff6b9d', // coral pink
        '#7c5cff', // electric purple
        '#00c9a7', // bright mint
        '#ff8a5c', // soft coral
        '#5cb8ff', // sky blue
        '#c77dff', // soft violet
        '#4ecdc4', // aqua
        '#ff6b6b', // salmon
        '#95e679', // lime green
    ];

    /**
     * Get color for a subcategory by index
     * @param {number} index - The subcategory index (0-based)
     * @returns {string} Hex color
     */
    function getSubcategoryColor(index) {
        return SUBCATEGORY_COLORS[index % SUBCATEGORY_COLORS.length];
    }

    /**
     * Get color for a category by index
     * @param {number} index - The category index (0-based)
     * @returns {string} Hex color
     */
    function getCategoryColor(index) {
        return CATEGORY_COLORS[index % CATEGORY_COLORS.length];
    }

    /**
     * Get all subcategory colors for a category
     * @param {Array} subcategories - Array of subcategory names (including "General")
     * @returns {Object} Map of subcategory name to color
     */
    function getSubcategoryColorMap(subcategories) {
        const colorMap = {};
        subcategories.forEach((sub, index) => {
            colorMap[sub] = getSubcategoryColor(index);
        });
        return colorMap;
    }

    /**
     * Lighten a hex color for backgrounds
     * @param {string} hex - Hex color
     * @param {number} amount - Amount to lighten (0-1)
     * @returns {string} Lightened hex color
     */
    function lighten(hex, amount = 0.3) {
        const num = parseInt(hex.slice(1), 16);
        const r = Math.min(255, Math.floor((num >> 16) + (255 - (num >> 16)) * amount));
        const g = Math.min(255, Math.floor(((num >> 8) & 0x00FF) + (255 - ((num >> 8) & 0x00FF)) * amount));
        const b = Math.min(255, Math.floor((num & 0x0000FF) + (255 - (num & 0x0000FF)) * amount));
        return `#${(1 << 24 | r << 16 | g << 8 | b).toString(16).slice(1)}`;
    }

    return {
        SUBCATEGORY_COLORS,
        CATEGORY_COLORS,
        getSubcategoryColor,
        getCategoryColor,
        getSubcategoryColorMap,
        lighten
    };
})();
