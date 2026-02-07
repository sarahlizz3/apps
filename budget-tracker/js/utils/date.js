/**
 * Date Utilities
 */
const DateUtils = (function() {
    const MONTHS = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];

    const MONTHS_SHORT = [
        'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];

    const DAYS = [
        'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'
    ];

    const DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    function getMonthName(month, short = false) {
        return short ? MONTHS_SHORT[month] : MONTHS[month];
    }

    function getDayName(day, short = false) {
        return short ? DAYS_SHORT[day] : DAYS[day];
    }

    function formatMonthYear(year, month) {
        return `${MONTHS[month]} ${year}`;
    }

    function formatDate(dateString, options = {}) {
        const date = new Date(dateString + 'T00:00:00');
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        const dateOnly = new Date(date);
        dateOnly.setHours(0, 0, 0, 0);

        if (options.relative !== false) {
            if (dateOnly.getTime() === today.getTime()) {
                return 'Today';
            }
            if (dateOnly.getTime() === yesterday.getTime()) {
                return 'Yesterday';
            }
        }

        const day = date.getDate();
        const month = MONTHS_SHORT[date.getMonth()];
        const year = date.getFullYear();
        const dayName = DAYS_SHORT[date.getDay()];

        if (options.includeDay) {
            return `${dayName}, ${month} ${day}`;
        }

        if (options.includeYear || year !== today.getFullYear()) {
            return `${month} ${day}, ${year}`;
        }

        return `${month} ${day}`;
    }

    function getToday() {
        return new Date().toISOString().split('T')[0];
    }

    function getCurrentMonth() {
        const now = new Date();
        return { year: now.getFullYear(), month: now.getMonth() };
    }

    function getPreviousMonth(year, month) {
        if (month === 0) {
            return { year: year - 1, month: 11 };
        }
        return { year, month: month - 1 };
    }

    function getNextMonth(year, month) {
        if (month === 11) {
            return { year: year + 1, month: 0 };
        }
        return { year, month: month + 1 };
    }

    function groupByDate(entries) {
        const groups = {};
        entries.forEach(entry => {
            if (!groups[entry.date]) {
                groups[entry.date] = [];
            }
            groups[entry.date].push(entry);
        });

        // Sort dates descending
        const sortedDates = Object.keys(groups).sort((a, b) =>
            new Date(b) - new Date(a)
        );

        return sortedDates.map(date => ({
            date,
            entries: groups[date],
            total: groups[date].reduce((sum, e) => sum + e.amount, 0)
        }));
    }

    return {
        MONTHS,
        MONTHS_SHORT,
        DAYS,
        DAYS_SHORT,
        getMonthName,
        getDayName,
        formatMonthYear,
        formatDate,
        getToday,
        getCurrentMonth,
        getPreviousMonth,
        getNextMonth,
        groupByDate
    };
})();
