/**
 * Charts Screen - Visualize spending data
 */
const ChartsUI = (function() {
    let currentYear, currentMonth;
    let chartType = 'pie'; // 'pie' or 'bar'
    let selectedCategoryId = ''; // '' = all categories
    let chart = null;

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
        render();
    }

    function goToNextMonth() {
        const next = DateUtils.getNextMonth(currentYear, currentMonth);
        currentYear = next.year;
        currentMonth = next.month;
        render();
    }

    function bindEvents() {
        // Chart type toggle
        document.getElementById('chart-pie-btn').addEventListener('click', () => {
            chartType = 'pie';
            updateToggleButtons();
            render();
        });

        document.getElementById('chart-bar-btn').addEventListener('click', () => {
            chartType = 'bar';
            updateToggleButtons();
            render();
        });

        // Category filter
        document.getElementById('chart-category-filter').addEventListener('change', (e) => {
            selectedCategoryId = e.target.value;
            render();
        });

        // Period navigation (for pie charts - month selector)
        document.getElementById('chart-prev').addEventListener('click', goToPrevMonth);
        document.getElementById('chart-next').addEventListener('click', goToNextMonth);

        // Swipe support (only for pie charts which have month nav)
        const screen = document.getElementById('screen-charts');
        App.enableSwipe(screen, goToNextMonth, goToPrevMonth);
    }

    function updateToggleButtons() {
        document.getElementById('chart-pie-btn').classList.toggle('active', chartType === 'pie');
        document.getElementById('chart-bar-btn').classList.toggle('active', chartType === 'bar');
    }

    function render() {
        updateCategoryFilter();
        updatePeriodDisplay();

        if (chartType === 'pie') {
            document.getElementById('chart-nav').classList.remove('hidden');
            document.getElementById('bar-chart-container').classList.add('hidden');
            document.getElementById('pie-chart-container').classList.remove('hidden');
            renderPieChartView();
        } else {
            document.getElementById('chart-nav').classList.add('hidden');
            document.getElementById('pie-chart-container').classList.add('hidden');
            document.getElementById('bar-chart-container').classList.remove('hidden');
            renderBarChartView();
        }
    }

    function updateCategoryFilter() {
        const select = document.getElementById('chart-category-filter');
        const categories = Storage.getCategories();

        select.innerHTML = '<option value="">All Categories</option>' +
            categories.map(c =>
                `<option value="${c.id}" ${selectedCategoryId === c.id ? 'selected' : ''}>${escapeHtml(c.name)}</option>`
            ).join('');
    }

    function updatePeriodDisplay() {
        document.getElementById('chart-period').textContent =
            DateUtils.formatMonthYear(currentYear, currentMonth);
    }

    function renderPieChartView() {
        const entries = Storage.getEntriesByMonth(currentYear, currentMonth);
        const categories = Storage.getCategories();

        let data = [];
        let grandTotal = 0;

        if (selectedCategoryId) {
            // Single category selected - show subcategories
            const category = Storage.getCategoryById(selectedCategoryId);
            if (!category) {
                renderEmptyPieChart();
                renderEmptyBreakdown();
                return;
            }

            const categoryEntries = entries.filter(e => e.categoryId === selectedCategoryId);
            const subcategories = ['General', ...category.subcategories];

            // Group by subcategory
            const subcatTotals = {};
            subcategories.forEach(sub => subcatTotals[sub] = 0);

            categoryEntries.forEach(e => {
                if (subcatTotals[e.subcategory] !== undefined) {
                    subcatTotals[e.subcategory] += e.amount;
                } else {
                    subcatTotals['General'] += e.amount;
                }
            });

            data = subcategories
                .map((sub, index) => ({
                    name: sub,
                    total: subcatTotals[sub],
                    color: ColorUtils.getSubcategoryColor(index)
                }))
                .filter(item => item.total > 0);

        } else {
            // All categories - show category breakdown
            const categoryTotals = {};
            categories.forEach(cat => categoryTotals[cat.id] = 0);

            entries.forEach(e => {
                if (categoryTotals[e.categoryId] !== undefined) {
                    categoryTotals[e.categoryId] += e.amount;
                }
            });

            data = categories
                .map((cat, index) => ({
                    name: cat.name,
                    total: categoryTotals[cat.id],
                    color: ColorUtils.getCategoryColor(index)
                }))
                .filter(item => item.total > 0);
        }

        if (data.length === 0) {
            renderEmptyPieChart();
            renderEmptyBreakdown();
            return;
        }

        grandTotal = data.reduce((sum, item) => sum + item.total, 0);
        renderPieChart(data);
        renderBreakdown(data, grandTotal);
    }

    function renderBarChartView() {
        const container = document.getElementById('bar-chart-container');
        if (!container) {
            console.error('Bar chart container not found');
            return;
        }

        const categories = Storage.getCategories();

        // Get all entries and find date range
        const allEntries = Storage.getEntries();
        if (allEntries.length === 0) {
            container.innerHTML = '<p class="empty-state">No spending data to display</p>';
            document.getElementById('category-breakdown').innerHTML = '';
            return;
        }

        // Find min/max months
        const timestamps = allEntries.map(e => new Date(e.date).getTime());
        const minDate = new Date(Math.min(...timestamps));
        const maxDate = new Date(Math.max(...timestamps));

        // Generate list of months from oldest to newest
        const months = [];
        let current = new Date(minDate.getFullYear(), minDate.getMonth(), 1);
        const end = new Date(maxDate.getFullYear(), maxDate.getMonth(), 1);

        while (current <= end) {
            months.push({
                year: current.getFullYear(),
                month: current.getMonth(),
                label: DateUtils.formatMonthYear(current.getFullYear(), current.getMonth())
            });
            current.setMonth(current.getMonth() + 1);
        }

        // Reverse to show newest first
        months.reverse();

        if (selectedCategoryId) {
            // Single category - show stacked subcategory bars if subcategories exist
            const category = Storage.getCategoryById(selectedCategoryId);
            const categoryIndex = categories.findIndex(c => c.id === selectedCategoryId);
            const subcategories = ['General', ...category.subcategories];
            const hasSubcategories = category.subcategories.length > 0;

            const monthlyData = months.map(m => {
                const monthEntries = Storage.getEntriesByMonth(m.year, m.month)
                    .filter(e => e.categoryId === selectedCategoryId);

                if (hasSubcategories) {
                    // Group by subcategory
                    const subTotals = {};
                    subcategories.forEach(sub => subTotals[sub] = 0);
                    monthEntries.forEach(e => {
                        if (subTotals[e.subcategory] !== undefined) {
                            subTotals[e.subcategory] += e.amount;
                        } else {
                            subTotals['General'] += e.amount;
                        }
                    });
                    return {
                        totals: subTotals,
                        total: Object.values(subTotals).reduce((a, b) => a + b, 0)
                    };
                } else {
                    const total = monthEntries.reduce((sum, e) => sum + e.amount, 0);
                    return { total };
                }
            });

            const maxValue = Math.max(...monthlyData.map(d => d.total), 1);

            if (hasSubcategories) {
                // Stacked bars for subcategories
                container.innerHTML = `
                    <div class="bar-chart-scroll">
                        ${months.map((m, i) => {
                            const data = monthlyData[i];
                            let segments = '';

                            subcategories.forEach((sub, subIndex) => {
                                const value = data.totals[sub];
                                if (value > 0) {
                                    const width = (value / maxValue) * 100;
                                    const color = ColorUtils.getSubcategoryColor(subIndex);
                                    segments += `<div class="bar-segment" style="width: ${width}%; background-color: ${color};" title="${escapeHtml(sub)}: ${formatCurrency(value)}"></div>`;
                                }
                            });

                            return `
                                <div class="bar-row">
                                    <div class="bar-track bar-stacked">
                                        ${segments || '<div class="bar-segment" style="width: 0%;"></div>'}
                                    </div>
                                    <div class="bar-info">
                                        <div class="bar-label">${m.label}</div>
                                        <div class="bar-value">${formatCurrency(data.total)}</div>
                                    </div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                `;
            } else {
                // Simple bars for category with no subcategories
                const color = ColorUtils.getCategoryColor(categoryIndex);
                container.innerHTML = `
                    <div class="bar-chart-scroll">
                        ${months.map((m, i) => {
                            const value = monthlyData[i].total;
                            const width = Math.max((value / maxValue) * 100, value > 0 ? 2 : 0);
                            return `
                                <div class="bar-row">
                                    <div class="bar-track">
                                        <div class="bar-fill" style="width: ${width}%; background-color: ${color};"></div>
                                    </div>
                                    <div class="bar-info">
                                        <div class="bar-label">${m.label}</div>
                                        <div class="bar-value">${formatCurrency(value)}</div>
                                    </div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                `;
            }

            // Show breakdown for this category's subcategories (yearly total)
            renderSingleCategoryBreakdown(selectedCategoryId);

        } else {
            // All categories - stacked horizontal bars
            const monthlyData = months.map(m => {
                const monthEntries = Storage.getEntriesByMonth(m.year, m.month);
                const catTotals = {};
                categories.forEach(cat => catTotals[cat.id] = 0);
                monthEntries.forEach(e => {
                    if (catTotals[e.categoryId] !== undefined) {
                        catTotals[e.categoryId] += e.amount;
                    }
                });
                return {
                    totals: catTotals,
                    total: Object.values(catTotals).reduce((a, b) => a + b, 0)
                };
            });

            const maxValue = Math.max(...monthlyData.map(d => d.total), 1);

            container.innerHTML = `
                <div class="bar-chart-scroll">
                    ${months.map((m, i) => {
                        const data = monthlyData[i];
                        let segments = '';

                        categories.forEach((cat, catIndex) => {
                            const value = data.totals[cat.id];
                            if (value > 0) {
                                const width = (value / maxValue) * 100;
                                const color = ColorUtils.getCategoryColor(catIndex);
                                segments += `<div class="bar-segment" style="width: ${width}%; background-color: ${color};" title="${escapeHtml(cat.name)}: ${formatCurrency(value)}"></div>`;
                            }
                        });

                        return `
                            <div class="bar-row">
                                <div class="bar-track bar-stacked">
                                    ${segments}
                                </div>
                                <div class="bar-info">
                                    <div class="bar-label">${m.label}</div>
                                    <div class="bar-value">${formatCurrency(data.total)}</div>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            `;

            // Show category breakdown for all time
            renderAllCategoriesBreakdown();
        }
    }

    function renderSingleCategoryBreakdown(categoryId) {
        const container = document.getElementById('category-breakdown');
        const category = Storage.getCategoryById(categoryId);
        if (!category) {
            container.innerHTML = '';
            return;
        }

        const entries = Storage.getEntriesByCategory(categoryId);
        const subcategories = ['General', ...category.subcategories];

        const subcatTotals = {};
        subcategories.forEach(sub => subcatTotals[sub] = 0);

        entries.forEach(e => {
            if (subcatTotals[e.subcategory] !== undefined) {
                subcatTotals[e.subcategory] += e.amount;
            } else {
                subcatTotals['General'] += e.amount;
            }
        });

        const data = subcategories
            .map((sub, index) => ({
                name: sub,
                total: subcatTotals[sub],
                color: ColorUtils.getSubcategoryColor(index)
            }))
            .filter(item => item.total > 0);

        const grandTotal = data.reduce((sum, item) => sum + item.total, 0);

        if (data.length === 0) {
            container.innerHTML = '<p class="empty-state">No data</p>';
            return;
        }

        renderBreakdown(data, grandTotal);
    }

    function renderAllCategoriesBreakdown() {
        const container = document.getElementById('category-breakdown');
        const categories = Storage.getCategories();
        const entries = Storage.getEntries();

        const categoryTotals = {};
        categories.forEach(cat => categoryTotals[cat.id] = 0);

        entries.forEach(e => {
            if (categoryTotals[e.categoryId] !== undefined) {
                categoryTotals[e.categoryId] += e.amount;
            }
        });

        const data = categories
            .map((cat, index) => ({
                name: cat.name,
                total: categoryTotals[cat.id],
                color: ColorUtils.getCategoryColor(index)
            }))
            .filter(item => item.total > 0);

        const grandTotal = data.reduce((sum, item) => sum + item.total, 0);

        if (data.length === 0) {
            container.innerHTML = '<p class="empty-state">No data</p>';
            return;
        }

        renderBreakdown(data, grandTotal);
    }

    function renderPieChart(data) {
        const ctx = document.getElementById('main-chart').getContext('2d');

        if (chart) {
            chart.destroy();
        }

        chart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: data.map(d => d.name),
                datasets: [{
                    data: data.map(d => d.total),
                    backgroundColor: data.map(d => d.color),
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const value = context.raw;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percent = ((value / total) * 100).toFixed(1);
                                return `$${value.toFixed(2)} (${percent}%)`;
                            }
                        }
                    }
                },
                cutout: '60%'
            }
        });
    }

    function renderEmptyPieChart() {
        const ctx = document.getElementById('main-chart').getContext('2d');

        if (chart) {
            chart.destroy();
        }

        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        ctx.fillStyle = '#9ca3af';
        ctx.font = '16px -apple-system, BlinkMacSystemFont, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('No data for this period', ctx.canvas.width / 2, ctx.canvas.height / 2);

        chart = null;
    }

    function renderBreakdown(data, grandTotal) {
        const container = document.getElementById('category-breakdown');

        container.innerHTML = `
            <div class="breakdown-item" style="font-weight: 600; border-bottom: 2px solid var(--gray-200);">
                <span class="breakdown-name">Total</span>
                <span class="breakdown-amount">${formatCurrency(grandTotal)}</span>
                <span class="breakdown-percent">100%</span>
            </div>
            ${data.map(item => {
                const percent = ((item.total / grandTotal) * 100).toFixed(1);
                return `
                    <div class="breakdown-item">
                        <div class="breakdown-color" style="background: ${item.color}"></div>
                        <span class="breakdown-name">${escapeHtml(item.name)}</span>
                        <span class="breakdown-amount">${formatCurrency(item.total)}</span>
                        <span class="breakdown-percent">${percent}%</span>
                    </div>
                `;
            }).join('')}
        `;
    }

    function renderEmptyBreakdown() {
        document.getElementById('category-breakdown').innerHTML = `
            <p class="empty-state" style="padding: 24px;">No spending data to display</p>
        `;
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
