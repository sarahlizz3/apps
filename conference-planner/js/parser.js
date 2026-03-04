/**
 * Messy copy-paste event parser
 */
const Parser = (function() {
    // Date patterns
    const datePatterns = [
        // March 5, 2026 or March 5th, 2026
        /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2})(?:st|nd|rd|th)?,?\s*(\d{4})?\b/i,
        // 3/5/2026 or 3/5/26
        /\b(\d{1,2})\/(\d{1,2})\/(\d{2,4})\b/,
        // 2026-03-05
        /\b(\d{4})-(\d{2})-(\d{2})\b/,
        // March 5 (no year)
        /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2})(?:st|nd|rd|th)?\b/i,
    ];

    // Time patterns
    const timePatterns = [
        // 9:00 AM - 10:30 PM or 9:00am - 10:30pm
        /\b(\d{1,2}):(\d{2})\s*(am|pm)?\s*[-–—to]+\s*(\d{1,2}):(\d{2})\s*(am|pm)?\b/i,
        // 9:00 AM or 9:00am
        /\b(\d{1,2}):(\d{2})\s*(am|pm)\b/i,
        // 9am - 10pm
        /\b(\d{1,2})\s*(am|pm)\s*[-–—to]+\s*(\d{1,2})\s*(am|pm)\b/i,
        // 9:00-10:30 (24h)
        /\b(\d{1,2}):(\d{2})\s*[-–—to]+\s*(\d{1,2}):(\d{2})\b/,
        // 9am or 9pm
        /\b(\d{1,2})\s*(am|pm)\b/i,
    ];

    // Location indicators
    const locationIndicators = [
        /location:\s*(.+)/i,
        /room:\s*(.+)/i,
        /venue:\s*(.+)/i,
        /where:\s*(.+)/i,
        /\b(room\s+\w+[\s\w]*)/i,
        /\b(hall\s+\w+[\s\w]*)/i,
        /\b(building\s+\w+[\s\w]*)/i,
        /\b(ballroom\s+\w+[\s\w]*)/i,
        /\b(auditorium\s+\w+[\s\w]*)/i,
        /\b(theater\s+\w+[\s\w]*)/i,
        /\b(conference\s+room\s+\w+[\s\w]*)/i,
    ];

    const monthNames = {
        'january': 0, 'february': 1, 'march': 2, 'april': 3,
        'may': 4, 'june': 5, 'july': 6, 'august': 7,
        'september': 8, 'october': 9, 'november': 10, 'december': 11
    };

    function parseDate(text) {
        for (const pattern of datePatterns) {
            const match = text.match(pattern);
            if (match) {
                let year, month, day;

                if (pattern.source.includes('January|February')) {
                    // Month name format
                    month = monthNames[match[1].toLowerCase()];
                    day = parseInt(match[2], 10);
                    year = match[3] ? parseInt(match[3], 10) : new Date().getFullYear();
                } else if (pattern.source.startsWith('\\b(\\d{4})')) {
                    // ISO format: YYYY-MM-DD
                    year = parseInt(match[1], 10);
                    month = parseInt(match[2], 10) - 1;
                    day = parseInt(match[3], 10);
                } else {
                    // MM/DD/YYYY format
                    month = parseInt(match[1], 10) - 1;
                    day = parseInt(match[2], 10);
                    year = parseInt(match[3], 10);
                    if (year < 100) year += 2000;
                }

                return new Date(year, month, day);
            }
        }
        return null;
    }

    function parseTime(text) {
        let startTime = null;
        let endTime = null;

        // Try range patterns first
        const rangeMatch = text.match(timePatterns[0]) || text.match(timePatterns[2]) || text.match(timePatterns[3]);

        if (rangeMatch) {
            if (rangeMatch[3] && rangeMatch[6]) {
                // Full range with AM/PM: 9:00 AM - 10:30 PM
                startTime = normalizeTime(rangeMatch[1], rangeMatch[2], rangeMatch[3]);
                endTime = normalizeTime(rangeMatch[4], rangeMatch[5], rangeMatch[6]);
            } else if (rangeMatch[2] && rangeMatch[4]) {
                // Simple range: 9am - 10pm
                startTime = normalizeTime(rangeMatch[1], '00', rangeMatch[2]);
                endTime = normalizeTime(rangeMatch[3], '00', rangeMatch[4]);
            } else {
                // 24h range: 9:00-10:30
                startTime = { hours: parseInt(rangeMatch[1], 10), minutes: parseInt(rangeMatch[2], 10) };
                endTime = { hours: parseInt(rangeMatch[3], 10), minutes: parseInt(rangeMatch[4], 10) };
            }
        } else {
            // Try single time patterns
            const singleMatch = text.match(timePatterns[1]) || text.match(timePatterns[4]);
            if (singleMatch) {
                if (singleMatch[2]) {
                    // 9:00 AM
                    startTime = normalizeTime(singleMatch[1], singleMatch[2] || '00', singleMatch[3]);
                } else {
                    // 9am
                    startTime = normalizeTime(singleMatch[1], '00', singleMatch[2]);
                }
            }
        }

        return { startTime, endTime };
    }

    function normalizeTime(hours, minutes, ampm) {
        let h = parseInt(hours, 10);
        const m = parseInt(minutes, 10);

        if (ampm) {
            const isPM = ampm.toLowerCase() === 'pm';
            if (isPM && h !== 12) h += 12;
            if (!isPM && h === 12) h = 0;
        }

        return { hours: h, minutes: m };
    }

    function parseLocation(text) {
        const lines = text.split('\n');

        for (const pattern of locationIndicators) {
            const match = text.match(pattern);
            if (match) {
                return match[1].trim();
            }
        }

        // Look for lines that might be locations
        for (const line of lines) {
            const trimmed = line.trim();
            if (/^(room|hall|building|ballroom|auditorium|floor|level)/i.test(trimmed)) {
                return trimmed;
            }
        }

        return null;
    }

    function parseTitle(text) {
        const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);

        if (lines.length === 0) return 'Untitled Event';

        // First non-empty line that's not a date/time/location
        for (const line of lines) {
            // Skip lines that are mostly date/time
            if (/^\d{1,2}[\/\-]\d{1,2}/.test(line)) continue;
            if (/^\d{1,2}:\d{2}/.test(line)) continue;
            if (/^(room|hall|building|location:|venue:|where:)/i.test(line)) continue;

            // Return first substantial line
            if (line.length > 3 && line.length < 200) {
                return line;
            }
        }

        return lines[0].substring(0, 100);
    }

    function parseDescription(text, parsedData) {
        // Remove the parts we've already extracted
        let description = text;

        if (parsedData.title) {
            description = description.replace(parsedData.title, '').trim();
        }
        if (parsedData.location) {
            description = description.replace(new RegExp(parsedData.location.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), '').trim();
        }

        // Clean up multiple newlines
        description = description.replace(/\n{3,}/g, '\n\n').trim();

        return description || null;
    }

    function parse(text) {
        if (!text || typeof text !== 'string') {
            return {
                title: '',
                startTime: null,
                endTime: null,
                location: null,
                description: null
            };
        }

        const title = parseTitle(text);
        const date = parseDate(text);
        const { startTime, endTime } = parseTime(text);
        const location = parseLocation(text);

        let startDateTime = null;
        let endDateTime = null;

        if (date) {
            if (startTime) {
                startDateTime = new Date(date);
                startDateTime.setHours(startTime.hours, startTime.minutes, 0, 0);
            } else {
                startDateTime = date;
            }

            if (endTime) {
                endDateTime = new Date(date);
                endDateTime.setHours(endTime.hours, endTime.minutes, 0, 0);
            }
        }

        const parsedData = {
            title,
            startTime: startDateTime ? startDateTime.toISOString() : null,
            endTime: endDateTime ? endDateTime.toISOString() : null,
            location
        };

        parsedData.description = parseDescription(text, parsedData);

        return parsedData;
    }

    return {
        parse,
        parseDate,
        parseTime,
        parseLocation,
        parseTitle
    };
})();
