/**
 * Glance Screen - Calendar view of monthly spending
 */
const GlanceUI = (function() {
    let currentYear, currentMonth;
    let selectedDate = null;

    function init() {
        const now = DateUtils.getCurrentMonth();
        currentYear = now.year;
        currentMonth = now.month;

        bindEvents();
    }

    function goToPrevMonth() {
        const prev = DateUtils.getPreviousMonth(currentYear, currentMonth);
        currentYear = prev.year;
        currentMonth = prev.month;
        selectedDate = null;
        render();
    }

    function goToNextMonth() {
        const next = DateUtils.getNextMonth(currentYear, currentMonth);
        currentYear = next.year;
        currentMonth = next.month;
        selectedDate = null;
        render();
    }

    function bindEvents() {
        // Month navigation
        document.getElementById('glance-prev-month').addEventListener('click', goToPrevMonth);
        document.getElementById('glance-next-month').addEventListener('click', goToNextMonth);

        // Swipe support
        const screen = document.getElementById('screen-glance');
        App.enableSwipe(screen, goToNextMonth, goToPrevMonth);
    }

    function render() {
        updateMonthDisplay();
        renderCalendar();
    }

    function updateMonthDisplay() {
        document.getElementById('glance-current-month').textContent =
            DateUtils.formatMonthYear(currentYear, currentMonth);
    }

    function renderCalendar() {
        const container = document.getElementById('glance-dates-list');
        const entries = Storage.getEntriesByMonth(currentYear, currentMonth);
        const categories = Storage.getCategories();

        // Create category map
        const categoryMap = {};
        categories.forEach((cat, index) => {
            categoryMap[cat.id] = {
                name: cat.name,
                color: ColorUtils.getCategoryColor(index)
            };
        });

        // Group entries by date
        const entriesByDate = {};
        entries.forEach(entry => {
            const day = new Date(entry.date + 'T00:00:00').getDate();
            if (!entriesByDate[day]) {
                entriesByDate[day] = [];
            }
            entriesByDate[day].push(entry);
        });

        // Calculate calendar grid
        const firstDay = new Date(currentYear, currentMonth, 1);
        const lastDay = new Date(currentYear, currentMonth + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startDayOfWeek = firstDay.getDay(); // 0 = Sunday

        // Build calendar HTML
        let calendarHTML = `
            <div class="calendar-grid">
                <div class="calendar-header">
                    <span>Sun</span>
                    <span>Mon</span>
                    <span>Tue</span>
                    <span>Wed</span>
                    <span>Thu</span>
                    <span>Fri</span>
                    <span>Sat</span>
                </div>
                <div class="calendar-days">
        `;

        // Add empty cells for days before the 1st
        for (let i = 0; i < startDayOfWeek; i++) {
            calendarHTML += '<div class="calendar-day empty"></div>';
        }

        // Add days of the month
        const today = new Date();
        const isCurrentMonth = today.getFullYear() === currentYear && today.getMonth() === currentMonth;
        const todayDate = today.getDate();

        for (let day = 1; day <= daysInMonth; day++) {
            const dayEntries = entriesByDate[day] || [];
            const hasEntries = dayEntries.length > 0;
            const isToday = isCurrentMonth && day === todayDate;
            const isSelected = selectedDate === day;

            // Calculate daily total and get unique categories
            let dailyTotal = 0;
            const dayCategoryTotals = {};

            dayEntries.forEach(entry => {
                dailyTotal += entry.amount;
                if (!dayCategoryTotals[entry.categoryId]) {
                    dayCategoryTotals[entry.categoryId] = 0;
                }
                dayCategoryTotals[entry.categoryId] += entry.amount;
            });

            // Build spending indicators (colored dots)
            let spendingHTML = '';
            if (hasEntries) {
                const categoryDots = Object.keys(dayCategoryTotals).map(catId => {
                    const cat = categoryMap[catId];
                    if (!cat) return '';
                    return `<span class="calendar-dot" style="background-color: ${cat.color}"></span>`;
                }).join('');

                spendingHTML = `
                    <div class="calendar-spending">
                        <div class="calendar-dots">${categoryDots}</div>
                        <div class="calendar-amount">$${dailyTotal.toFixed(0)}</div>
                    </div>
                `;
            }

            calendarHTML += `
                <div class="calendar-day ${hasEntries ? 'has-entries' : ''} ${isToday ? 'today' : ''} ${isSelected ? 'selected' : ''}" data-day="${day}">
                    <span class="calendar-day-number">${day}</span>
                    ${spendingHTML}
                </div>
            `;
        }

        // Add empty cells to complete the last row
        const totalCells = startDayOfWeek + daysInMonth;
        const remainingCells = (7 - (totalCells % 7)) % 7;
        for (let i = 0; i < remainingCells; i++) {
            calendarHTML += '<div class="calendar-day empty"></div>';
        }

        calendarHTML += `
                </div>
            </div>
        `;

        // Add detail panel for selected day
        calendarHTML += '<div id="calendar-detail" class="calendar-detail"></div>';

        container.innerHTML = calendarHTML;

        // Bind click events for days
        container.querySelectorAll('.calendar-day.has-entries').forEach(dayEl => {
            dayEl.addEventListener('click', () => {
                const day = parseInt(dayEl.dataset.day);

                // Toggle selection
                if (selectedDate === day) {
                    selectedDate = null;
                    dayEl.classList.remove('selected');
                    document.getElementById('calendar-detail').innerHTML = '';
                } else {
                    // Remove previous selection
                    container.querySelectorAll('.calendar-day.selected').forEach(el => {
                        el.classList.remove('selected');
                    });

                    selectedDate = day;
                    dayEl.classList.add('selected');
                    renderDayDetail(day, entriesByDate[day], categoryMap);
                }
            });
        });
    }

    function renderDayDetail(day, entries, categoryMap) {
        const detailContainer = document.getElementById('calendar-detail');

        // Format the date
        const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const formattedDate = DateUtils.formatDate(dateStr, { includeDay: true });

        // Group by category
        const categoryGroups = {};
        let dayTotal = 0;

        entries.forEach(entry => {
            dayTotal += entry.amount;
            if (!categoryGroups[entry.categoryId]) {
                categoryGroups[entry.categoryId] = {
                    entries: [],
                    total: 0
                };
            }
            categoryGroups[entry.categoryId].entries.push(entry);
            categoryGroups[entry.categoryId].total += entry.amount;
        });

        let detailHTML = `
            <div class="detail-header">
                <span class="detail-date">${formattedDate}</span>
                <span class="detail-total">${formatCurrency(dayTotal)}</span>
            </div>
            <div class="detail-entries">
        `;

        Object.entries(categoryGroups).forEach(([catId, group]) => {
            const cat = categoryMap[catId];
            if (!cat) return;

            detailHTML += `
                <div class="detail-category">
                    <div class="detail-category-header">
                        <span class="detail-dot" style="background-color: ${cat.color}"></span>
                        <span class="detail-category-name">${escapeHtml(cat.name)}</span>
                        <span class="detail-category-total">${formatCurrency(group.total)}</span>
                    </div>
            `;

            group.entries.forEach(entry => {
                detailHTML += `
                    <div class="detail-entry">
                        <span class="detail-entry-sub">${escapeHtml(entry.subcategory)}</span>
                        <span class="detail-entry-amount">${formatCurrency(entry.amount)}</span>
                    </div>
                `;
                if (entry.note) {
                    detailHTML += `<div class="detail-entry-note">${escapeHtml(entry.note)}</div>`;
                }
            });

            detailHTML += '</div>';
        });

        detailHTML += '</div>';
        detailContainer.innerHTML = detailHTML;
    }

    function formatCurrency(amount) {
        return '$' + amount.toFixed(2);
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    return {
        init,
        render
    };
})();
