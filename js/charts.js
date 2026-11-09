
let categoryChartInstance = null;
let monthlyChartInstance = null;
let personChartInstance = null;

window.initCharts = function () {
    // Initial setup if needed
    console.log("Charts module loaded");
};

window.renderCharts = function (targetDate) {
    if (!document.getElementById('categoryChart')) return;
    if (typeof Chart === 'undefined') {
        setTimeout(() => window.renderCharts(targetDate), 100);
        return;
    }

    const allExpenses = StorageService.getExpenses().filter(e => !e._deleted && e.type === 'expense');
    const allIncome = StorageService.getExpenses().filter(e => !e._deleted && e.type === 'income');

    // --- 1. Category Chart (Doughnut) for Target Month ---
    const viewMonth = targetDate.getMonth();
    const viewYear = targetDate.getFullYear();

    const monthExpenses = allExpenses.filter(e => {
        const d = new Date(e.date);
        return d.getMonth() === viewMonth && d.getFullYear() === viewYear;
    });

    // Aggregate by Category
    const categoryTotals = {};
    monthExpenses.forEach(e => {
        if (!categoryTotals[e.category]) categoryTotals[e.category] = 0;
        categoryTotals[e.category] += parseFloat(e.amount);
    });

    const categories = Object.keys(categoryTotals);
    const dataValues = Object.values(categoryTotals);

    // Translation Map
    const CATEGORY_NAMES = {
        'supermarket': '🛒 Supermercado', 'home': '🏠 Casa', 'transport': '🚗 Transporte',
        'leisure': '🎉 Ocio', 'health': '💊 Salud', 'clothing': '👕 Ropa', 'other': '📦 Otros',
        'salary': '💰 Nómina', 'gift': '🎁 Regalo'
    };
    const labels = categories.map(c => CATEGORY_NAMES[c] || c);

    // Render Doughnut
    const ctxCat = document.getElementById('categoryChart').getContext('2d');

    if (categoryChartInstance) {
        categoryChartInstance.destroy();
    }

    if (categories.length === 0) {
        // Handle empty state manually or just show empty chart
    }

    categoryChartInstance = new Chart(ctxCat, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: dataValues,
                backgroundColor: [
                    '#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#6B7280'
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });

    // --- 1.2 Person Chart (Doughnut) for Target Month ---
    const personChartEl = document.getElementById('personChart');
    if (personChartEl) {
        const personTotals = {};
        monthExpenses.forEach(e => {
            const p = (e.createdBy && e.createdBy.trim()) ? e.createdBy.trim() : 'Familia';
            if (!personTotals[p]) personTotals[p] = 0;
            personTotals[p] += parseFloat(e.amount);
        });

        const people = Object.keys(personTotals);
        const personDataValues = Object.values(personTotals);
        const ctxPerson = personChartEl.getContext('2d');

        if (personChartInstance) {
            personChartInstance.destroy();
        }

        personChartInstance = new Chart(ctxPerson, {
            type: 'doughnut',
            data: {
                labels: people.map(p => `👤 ${p}`),
                datasets: [{
                    data: personDataValues,
                    backgroundColor: [
                        '#4F46E5', '#10B981', '#F59E0B', '#EC4899', '#8B5CF6', '#3B82F6', '#14B8A6'
                    ],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    }


    // --- 2. Monthly Evolution (Bar Chart) - Last 6 Months ---
    const labelsHistory = [];
    const expenseDataHistory = [];
    const incomeDataHistory = [];

    for (let i = 5; i >= 0; i--) {
        const d = new Date(targetDate);
        d.setMonth(d.getMonth() - i);
        const m = d.getMonth();
        const y = d.getFullYear();

        const monthName = d.toLocaleDateString('es-ES', { month: 'short' });
        labelsHistory.push(`${monthName}`);

        // Calc Total for this month
        const expensesInMonth = allExpenses.filter(e => {
            const ed = new Date(e.date);
            return ed.getMonth() === m && ed.getFullYear() === y;
        }).reduce((sum, e) => sum + parseFloat(e.amount), 0);

        const incomeInMonth = allIncome.filter(e => {
            const ed = new Date(e.date);
            return ed.getMonth() === m && ed.getFullYear() === y;
        }).reduce((sum, e) => sum + parseFloat(e.amount), 0);

        expenseDataHistory.push(expensesInMonth);
        incomeDataHistory.push(incomeInMonth);
    }

    const ctxMonth = document.getElementById('monthlyChart').getContext('2d');

    if (monthlyChartInstance) {
        monthlyChartInstance.destroy();
    }

    monthlyChartInstance = new Chart(ctxMonth, {
        type: 'bar',
        data: {
            labels: labelsHistory,
            datasets: [
                {
                    label: 'Gastos',
                    data: expenseDataHistory,
                    backgroundColor: '#EF4444',
                    borderRadius: 4
                },
                {
                    label: 'Ingresos',
                    data: incomeDataHistory,
                    backgroundColor: '#10B981',
                    borderRadius: 4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
};
