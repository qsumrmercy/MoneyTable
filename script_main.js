// ===== Константы =====

const STORAGE_KEY = 'budget-app-state-v1';

// План доходов по умолчанию (в профиле можно задать свой — см. getIncomePlan)
const INCOME_PLAN = 95000;
const EXPENSE_PLAN = 60000;

const MONTH_NAMES = [
    'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
    'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
];

// ===== Генератор уникальных id =====

let idCounter = 0;
function generateId(prefix) {
    idCounter += 1;
    return prefix + '-' + Date.now().toString(36) + '-' + idCounter + Math.random().toString(36).slice(2, 6);
}

// ===== Хранилище (localStorage) =====
//
// Структура данных:
// state = {
//   currentProfileId: 'profile-...',
//   profiles: [
//     {
//       id, name,
//       categories: [{ id, name, description }],
//       operations: [{ id, type, categoryId, date, amount, description }],
//       incomePlan: число | null,   // план доходов на месяц (null = значение по умолчанию)
//       savings: {
//         goal: { amount, date } | null,
//         deposits: [{ id, date, amount, description }]
//       }
//     }
//   ]
// }

function createEmptySavings() {
    return { goal: null, deposits: [] };
}

// Проверяет блок накоплений профиля (у старых данных его может не быть)
function sanitizeSavings(raw) {
    const result = createEmptySavings();
    if (!raw || typeof raw !== 'object') return result;

    if (raw.goal
        && Number.isFinite(raw.goal.amount)
        && raw.goal.amount > 0
        && typeof raw.goal.date === 'string') {
        result.goal = { amount: raw.goal.amount, date: raw.goal.date };
    }

    if (Array.isArray(raw.deposits)) {
        result.deposits = raw.deposits
            .filter((d) => d
                && typeof d.id === 'string'
                && typeof d.date === 'string'
                && Number.isFinite(d.amount))
            .map((d) => ({
                id: d.id,
                date: d.date,
                amount: d.amount,
                description: typeof d.description === 'string' ? d.description : ''
            }));
    }

    return result;
}

function createDefaultState() {
    const id = generateId('profile');
    return {
        currentProfileId: id,
        profiles: [{ id: id, name: 'Основной профиль', categories: [], operations: [], savings: createEmptySavings(), incomePlan: null }]
    };
}

// Проверяет и «чинит» данные, прочитанные из хранилища
function sanitizeState(raw) {
    if (!raw || !Array.isArray(raw.profiles)) return null;

    const profiles = raw.profiles
        .filter((p) => p && typeof p.id === 'string' && typeof p.name === 'string')
        .map((p) => ({
            id: p.id,
            name: p.name,
            categories: (Array.isArray(p.categories) ? p.categories : [])
                .filter((c) => c && typeof c.id === 'string' && typeof c.name === 'string')
                .map((c) => ({
                    id: c.id,
                    name: c.name,
                    description: typeof c.description === 'string' ? c.description : ''
                })),
            operations: (Array.isArray(p.operations) ? p.operations : [])
                .filter((o) => o
                    && typeof o.id === 'string'
                    && (o.type === 'income' || o.type === 'expense')
                    && typeof o.date === 'string'
                    && Number.isFinite(o.amount))
                .map((o) => ({
                    id: o.id,
                    type: o.type,
                    categoryId: typeof o.categoryId === 'string' ? o.categoryId : '',
                    date: o.date,
                    amount: o.amount,
                    description: typeof o.description === 'string' ? o.description : ''
                })),
            savings: sanitizeSavings(p.savings),
            incomePlan: Number.isFinite(p.incomePlan) && p.incomePlan > 0 ? p.incomePlan : null
        }));

    if (profiles.length === 0) return null;

    const currentProfileId = profiles.some((p) => p.id === raw.currentProfileId)
        ? raw.currentProfileId
        : profiles[0].id;

    return { currentProfileId: currentProfileId, profiles: profiles };
}

function loadState() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return null;
        return sanitizeState(JSON.parse(raw));
    } catch (error) {
        return null;
    }
}

function saveState() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
        console.warn('Не удалось сохранить данные:', error);
    }
}

let state = loadState() || createDefaultState();

function getProfile() {
    return state.profiles.find((p) => p.id === state.currentProfileId);
}

function getOperations() {
    return getProfile().operations;
}

function getCategories() {
    return getProfile().categories;
}

function getSavings() {
    return getProfile().savings;
}

function getIncomePlan() {
    const plan = getProfile().incomePlan;
    return Number.isFinite(plan) && plan > 0 ? plan : INCOME_PLAN;
}

// ===== Ссылки на элементы =====

const addOperationBtn = document.getElementById('addOperationBtn');
const addRowBtn = document.getElementById('addRowBtn');

const modalOverlay = document.getElementById('modalOverlay');
const modalTitleEl = document.getElementById('modalTitle');
const modalClose = document.getElementById('modalClose');
const modalCancel = document.getElementById('modalCancel');
const modalDelete = document.getElementById('modalDelete');
const modalSubmit = document.getElementById('modalSubmit');
const operationForm = document.getElementById('operationForm');

const typeOptions = document.querySelectorAll('.type-option');

const categorySelect = document.getElementById('opCategory');
const categoryAddBtn = document.getElementById('categoryAddBtn');
const newCategoryRow = document.getElementById('newCategoryRow');
const newCategoryInput = document.getElementById('newCategoryInput');
const categoryConfirmBtn = document.getElementById('categoryConfirmBtn');

const dateInput = document.getElementById('opDate');
const sumInput = document.getElementById('opSum');
const descriptionInput = document.getElementById('opDescription');

const tableBody = document.getElementById('tableBody');
const filterChips = document.querySelectorAll('.filter-chip');

const incomeSumEl = document.getElementById('incomeSum');
const incomePlanTextEl = document.getElementById('incomePlanText');
const expenseSumEl = document.getElementById('expenseSum');
const expenseProgressEl = document.getElementById('expenseProgress');
const expenseCommentEl = document.getElementById('expenseComment');
const balanceSumEl = document.getElementById('balanceSum');

const categoriesBtn = document.getElementById('categoriesBtn');
const categoryOverlay = document.getElementById('categoryOverlay');
const categoryModalClose = document.getElementById('categoryModalClose');
const categoryList = document.getElementById('categoryList');

const prevMonthBtn = document.getElementById('prevMonthBtn');
const nextMonthBtn = document.getElementById('nextMonthBtn');
const monthSelectedEl = document.getElementById('monthSelected');
const currentMonthTitleEl = document.getElementById('currentMonthTitle');

const exportBtn = document.getElementById('exportBtn');
const toastEl = document.getElementById('toast');

const accountBtn = document.getElementById('accountBtn');
const profileOverlay = document.getElementById('profileOverlay');
const profileModalClose = document.getElementById('profileModalClose');
const profileList = document.getElementById('profileList');
const profileAddBtn = document.getElementById('profileAddBtn');
const newProfileRow = document.getElementById('newProfileRow');
const newProfileInput = document.getElementById('newProfileInput');
const newProfileConfirmBtn = document.getElementById('newProfileConfirmBtn');

const viewOverviewEl = document.getElementById('viewOverview');
const viewSavingsEl = document.getElementById('viewSavings');
const navItems = document.querySelectorAll('.nav_menu li[data-view]');

const savingsSumEl = document.getElementById('savingsSum');
const savingsProgressEl = document.getElementById('savingsProgress');
const savingsPercentEl = document.getElementById('savingsPercent');
const goalLinkBtn = document.getElementById('goalLinkBtn');
const depositsBody = document.getElementById('depositsBody');
const addDepositBtn = document.getElementById('addDepositBtn');

const depositOverlay = document.getElementById('depositOverlay');
const depositModalTitle = document.getElementById('depositModalTitle');
const depositModalClose = document.getElementById('depositModalClose');
const depositForm = document.getElementById('depositForm');
const depositDateInput = document.getElementById('depositDate');
const depositSumInput = document.getElementById('depositSum');
const depositDescriptionInput = document.getElementById('depositDescription');
const depositDelete = document.getElementById('depositDelete');
const depositCancel = document.getElementById('depositCancel');
const depositSubmit = document.getElementById('depositSubmit');

const goalOverlay = document.getElementById('goalOverlay');
const goalModalTitle = document.getElementById('goalModalTitle');
const goalModalClose = document.getElementById('goalModalClose');
const goalForm = document.getElementById('goalForm');
const goalDateInput = document.getElementById('goalDate');
const goalSumInput = document.getElementById('goalSum');
const goalDelete = document.getElementById('goalDelete');
const goalCancel = document.getElementById('goalCancel');
const goalSubmit = document.getElementById('goalSubmit');

const incomePlanBtn = document.getElementById('incomePlanText');
const planOverlay = document.getElementById('planOverlay');
const planModalClose = document.getElementById('planModalClose');
const planForm = document.getElementById('planForm');
const planSumInput = document.getElementById('planSum');
const planCancel = document.getElementById('planCancel');

const categoryPanelAddBtn = document.getElementById('categoryPanelAddBtn');
const categoryPanelNewRow = document.getElementById('categoryPanelNewRow');
const categoryPanelInput = document.getElementById('categoryPanelInput');
const categoryPanelConfirmBtn = document.getElementById('categoryPanelConfirmBtn');

// ===== Состояние интерфейса (не сохраняется) =====

const today = new Date();
let selectedYear = today.getFullYear();
let selectedMonth = today.getMonth(); // 0–11

let selectedType = 'income';
let editingOperationId = null;
let expandedCategoryId = null;
let activeFilter = 'all'; // 'all' | 'income' | 'expense'
let renamingProfileId = null;

// ===== Форматирование =====

// "97000" -> "97 000"
function formatNumberWithSpaces(numStr) {
    return numStr.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

// 97000 -> "97 000 ₽"
function formatCurrency(amount) {
    return formatNumberWithSpaces(String(Math.round(Math.abs(amount)))) + ' ₽';
}

// Русское склонение слова "операция"
function pluralizeOperations(n) {
    const mod10 = n % 10;
    const mod100 = n % 100;
    if (mod10 === 1 && mod100 !== 11) return 'операция';
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'операции';
    return 'операций';
}

function getCategoryById(categoryId) {
    return getCategories().find((cat) => cat.id === categoryId);
}

function getCategoryName(categoryId) {
    const cat = getCategoryById(categoryId);
    return cat ? cat.name : '—';
}

function getAvatarLetter(name) {
    const trimmed = name.trim();
    return trimmed ? trimmed.charAt(0).toUpperCase() : '?';
}

// ===== Работа с месяцами =====

// "05.09.26" -> { month: 8, year: 2026 }
function parseOperationDate(dateStr) {
    const match = dateStr.match(/^(\d{2})\.(\d{2})\.(\d{2})$/);
    if (!match) return null;
    return { month: Number(match[2]) - 1, year: 2000 + Number(match[3]) };
}

function isInSelectedMonth(op) {
    const parsed = parseOperationDate(op.date);
    return parsed !== null && parsed.month === selectedMonth && parsed.year === selectedYear;
}

function getMonthOperations() {
    return getOperations().filter(isInSelectedMonth);
}

function renderMonthLabel() {
    const label = MONTH_NAMES[selectedMonth] + ' ' + selectedYear;
    monthSelectedEl.textContent = label;
    currentMonthTitleEl.textContent = label;
}

function shiftMonth(delta) {
    selectedMonth += delta;
    if (selectedMonth < 0) {
        selectedMonth = 11;
        selectedYear -= 1;
    } else if (selectedMonth > 11) {
        selectedMonth = 0;
        selectedYear += 1;
    }
    renderMonthLabel();
    renderTable();
    renderSummary();
}

prevMonthBtn.addEventListener('click', () => shiftMonth(-1));
nextMonthBtn.addEventListener('click', () => shiftMonth(1));

// ===== Фильтр "Все / Доходы / Расходы" =====

filterChips.forEach((chip) => {
    chip.addEventListener('click', () => {
        activeFilter = chip.dataset.filter;
        filterChips.forEach((c) => c.classList.toggle('active', c === chip));
        renderTable();
    });
});

// ===== Открытие / закрытие модального окна операции =====

function openModal() {
    modalOverlay.classList.add('open');
    document.body.style.overflow = 'hidden';
}

function closeModal() {
    modalOverlay.classList.remove('open');
    document.body.style.overflow = '';
    operationForm.reset();
    dateInput.classList.remove('input-error');
    sumInput.classList.remove('input-error');
    categorySelect.classList.remove('input-error');
    hideNewCategoryRow();
    setActiveType('income');
    editingOperationId = null;
}

function openCreateModal() {
    editingOperationId = null;
    operationForm.reset();
    setActiveType('income');
    renderCategoryOptions();
    modalTitleEl.textContent = 'Новая операция';
    modalSubmit.textContent = 'Добавить';
    modalDelete.classList.remove('visible');
    openModal();
}

function openEditModal(operationId) {
    const op = getOperations().find((o) => o.id === operationId);
    if (!op) return;

    editingOperationId = operationId;

    setActiveType(op.type);
    renderCategoryOptions(op.categoryId);
    dateInput.value = op.date;
    sumInput.value = formatNumberWithSpaces(String(op.amount));
    descriptionInput.value = op.description;

    dateInput.classList.remove('input-error');
    sumInput.classList.remove('input-error');
    categorySelect.classList.remove('input-error');
    hideNewCategoryRow();

    modalTitleEl.textContent = 'Редактировать операцию';
    modalSubmit.textContent = 'Сохранить';
    modalDelete.classList.add('visible');

    openModal();
}

addOperationBtn.addEventListener('click', () => {
    if (currentView === 'savings') {
        openDepositModal();
    } else {
        openCreateModal();
    }
});
addRowBtn.addEventListener('click', openCreateModal);
modalClose.addEventListener('click', closeModal);
modalCancel.addEventListener('click', closeModal);

modalDelete.addEventListener('click', () => {
    if (!editingOperationId) return;
    const idToDelete = editingOperationId;
    closeModal();
    deleteOperation(idToDelete);
});

// Закрытие по клику вне модального окна
modalOverlay.addEventListener('click', (event) => {
    if (event.target === modalOverlay) {
        closeModal();
    }
});

// Закрытие по Escape
document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
        if (modalOverlay.classList.contains('open')) closeModal();
        if (categoryOverlay.classList.contains('open')) closeCategoryModal();
        if (profileOverlay.classList.contains('open')) closeProfileModal();
        if (depositOverlay.classList.contains('open')) closeDepositModal();
        if (goalOverlay.classList.contains('open')) closeGoalModal();
        if (planOverlay.classList.contains('open')) closePlanModal();
    }
});

// ===== Переключатель "Доход / Расход" =====

function setActiveType(type) {
    selectedType = type;
    typeOptions.forEach((btn) => {
        btn.classList.toggle('active', btn.dataset.type === type);
    });
}

typeOptions.forEach((btn) => {
    btn.addEventListener('click', () => setActiveType(btn.dataset.type));
});

// ===== Категории (выбор внутри формы операции) =====

function renderCategoryOptions(selectValue) {
    categorySelect.innerHTML = '';

    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.disabled = true;
    placeholder.textContent = 'Выберите категорию';
    categorySelect.appendChild(placeholder);

    getCategories().forEach((cat) => {
        const option = document.createElement('option');
        option.value = cat.id;
        option.textContent = cat.name;
        categorySelect.appendChild(option);
    });

    categorySelect.value = selectValue || '';
    if (!categorySelect.value) {
        placeholder.selected = true;
    }
}

function showNewCategoryRow() {
    newCategoryRow.classList.add('open');
    categoryAddBtn.classList.add('active');
    newCategoryInput.focus();
}

function hideNewCategoryRow() {
    newCategoryRow.classList.remove('open');
    categoryAddBtn.classList.remove('active');
    newCategoryInput.value = '';
    newCategoryInput.classList.remove('input-error');
}

categoryAddBtn.addEventListener('click', () => {
    if (newCategoryRow.classList.contains('open')) {
        hideNewCategoryRow();
    } else {
        showNewCategoryRow();
    }
});

function addNewCategory() {
    const name = newCategoryInput.value.trim();
    if (!name) {
        newCategoryInput.classList.add('input-error');
        return;
    }

    const categories = getCategories();
    const existing = categories.find(
        (cat) => cat.name.toLowerCase() === name.toLowerCase()
    );

    const targetId = existing ? existing.id : generateId('cat');

    if (!existing) {
        categories.push({ id: targetId, name: name, description: '' });
        saveState();
    }

    renderCategoryOptions(targetId);
    categorySelect.classList.remove('input-error');
    hideNewCategoryRow();
}

categoryConfirmBtn.addEventListener('click', addNewCategory);

newCategoryInput.addEventListener('input', () => {
    newCategoryInput.classList.remove('input-error');
});

newCategoryInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
        event.preventDefault();
        addNewCategory();
    }
});

categorySelect.addEventListener('change', () => {
    categorySelect.classList.remove('input-error');

    const cat = getCategoryById(categorySelect.value);
    if (cat && cat.description && !descriptionInput.value.trim()) {
        descriptionInput.value = cat.description;
    }
});

// ===== Маска даты (дд.мм.гг) =====

dateInput.addEventListener('input', () => {
    let digits = dateInput.value.replace(/\D/g, '').slice(0, 6);
    let formatted = digits;

    if (digits.length > 4) {
        formatted = digits.slice(0, 2) + '.' + digits.slice(2, 4) + '.' + digits.slice(4);
    } else if (digits.length > 2) {
        formatted = digits.slice(0, 2) + '.' + digits.slice(2);
    }

    dateInput.value = formatted;
    dateInput.classList.remove('input-error');
});

function isValidDate(value) {
    const match = value.match(/^(\d{2})\.(\d{2})\.(\d{2})$/);
    if (!match) return false;

    const day = Number(match[1]);
    const month = Number(match[2]);

    if (month < 1 || month > 12) return false;
    if (day < 1 || day > 31) return false;

    return true;
}

// ===== Маска суммы (пробел через каждые 3 цифры) =====

sumInput.addEventListener('input', () => {
    let digits = sumInput.value.replace(/\D/g, '');
    digits = digits.replace(/^0+(?=\d)/, ''); // убираем ведущие нули
    sumInput.value = formatNumberWithSpaces(digits);
    sumInput.classList.remove('input-error');
});

// ===== Выпадающие меню «три точки» =====

function closeAllRowMenus() {
    document.querySelectorAll('.row-menu.open').forEach((menu) => {
        menu.classList.remove('open');
    });
}

document.addEventListener('click', closeAllRowMenus);

// ===== Удаление операции (из таблицы, из модалки и из панели категорий) =====

function deleteOperation(operationId) {
    if (!window.confirm('Удалить эту операцию?')) return;

    const operations = getOperations();
    const idx = operations.findIndex((o) => o.id === operationId);
    if (idx !== -1) operations.splice(idx, 1);

    saveState();
    renderTable();
    renderSummary();

    if (categoryOverlay.classList.contains('open')) {
        renderCategoryList();
    }
}

// ===== Отрисовка таблицы =====

function createCell(className, text) {
    const span = document.createElement('span');
    span.className = className;
    span.textContent = text;
    return span;
}

function getEmptyMessage(monthOpsCount) {
    if (monthOpsCount === 0) return 'В этом месяце операций пока нет — добавьте первую';
    if (activeFilter === 'income') return 'Доходов в этом месяце нет';
    return 'Расходов в этом месяце нет';
}

function renderTable() {
    tableBody.innerHTML = '';

    const monthOps = getMonthOperations();
    const visibleOps = monthOps.filter(
        (op) => activeFilter === 'all' || op.type === activeFilter
    );

    if (visibleOps.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'table-empty';
        empty.textContent = getEmptyMessage(monthOps.length);
        tableBody.appendChild(empty);
        return;
    }

    visibleOps.forEach((op) => {
        const isIncome = op.type === 'income';
        const row = document.createElement('div');
        row.className = 'table-row';

        row.appendChild(createCell('col-date', op.date));
        row.appendChild(createCell('col-category', getCategoryName(op.categoryId)));
        row.appendChild(createCell('col-description', op.description || '—'));

        const typeWrap = document.createElement('span');
        typeWrap.className = 'col-type';
        typeWrap.appendChild(
            createCell('type-tag ' + (isIncome ? 'tag-income' : 'tag-expense'), isIncome ? 'Доход' : 'Расход')
        );
        row.appendChild(typeWrap);

        const sign = isIncome ? '+' : '−';
        row.appendChild(
            createCell('col-sum ' + (isIncome ? 'income-sum' : 'expense-sum'), sign + formatCurrency(op.amount))
        );

        row.appendChild(createRowActions(() => openEditModal(op.id), () => deleteOperation(op.id)));

        tableBody.appendChild(row);
    });
}

function createRowActions(onEdit, onDelete) {
    const wrap = document.createElement('span');
    wrap.className = 'col-actions';

    const menuBtn = document.createElement('button');
    menuBtn.type = 'button';
    menuBtn.className = 'row-menu-btn';
    menuBtn.textContent = '⋮';
    menuBtn.setAttribute('aria-label', 'Действия с операцией');

    const menu = document.createElement('div');
    menu.className = 'row-menu';

    const editBtn = document.createElement('button');
    editBtn.type = 'button';
    editBtn.className = 'row-menu-item';
    editBtn.textContent = 'Редактировать';
    editBtn.addEventListener('click', (event) => {
        event.stopPropagation();
        closeAllRowMenus();
        onEdit();
    });

    const deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
    deleteBtn.className = 'row-menu-item row-menu-item-danger';
    deleteBtn.textContent = 'Удалить';
    deleteBtn.addEventListener('click', (event) => {
        event.stopPropagation();
        closeAllRowMenus();
        onDelete();
    });

    menu.appendChild(editBtn);
    menu.appendChild(deleteBtn);

    menuBtn.addEventListener('click', (event) => {
        event.stopPropagation();
        const isOpen = menu.classList.contains('open');
        closeAllRowMenus();
        if (!isOpen) menu.classList.add('open');
    });

    wrap.appendChild(menuBtn);
    wrap.appendChild(menu);
    return wrap;
}

// ===== Пересчёт карточек (только за выбранный месяц) =====

function renderSummary() {
    const monthOps = getMonthOperations();

    const totalIncome = monthOps
        .filter((op) => op.type === 'income')
        .reduce((sum, op) => sum + op.amount, 0);

    const totalExpense = monthOps
        .filter((op) => op.type === 'expense')
        .reduce((sum, op) => sum + op.amount, 0);

    const balance = totalIncome - totalExpense;

    incomeSumEl.textContent = formatCurrency(totalIncome);
    incomePlanTextEl.textContent = 'План на месяц: ' + formatCurrency(getIncomePlan());

    expenseSumEl.textContent = formatCurrency(totalExpense);
    const expensePercent = Math.min(100, Math.round((totalExpense / EXPENSE_PLAN) * 100));
    expenseProgressEl.style.width = expensePercent + '%';
    expenseCommentEl.textContent = expensePercent + '% от плана ' + formatCurrency(EXPENSE_PLAN);

    balanceSumEl.textContent = (balance < 0 ? '−' : '') + formatCurrency(balance);
}

// ===== Отправка формы операции (создание и редактирование) =====

operationForm.addEventListener('submit', (event) => {
    event.preventDefault();

    const categoryValue = categorySelect.value;
    const dateValue = dateInput.value.trim();
    const sumDigits = sumInput.value.replace(/\D/g, '');
    const description = descriptionInput.value.trim();

    let hasError = false;

    if (!categoryValue) {
        categorySelect.classList.add('input-error');
        hasError = true;
    }

    if (!isValidDate(dateValue)) {
        dateInput.classList.add('input-error');
        hasError = true;
    }

    if (!sumDigits || Number(sumDigits) === 0) {
        sumInput.classList.add('input-error');
        hasError = true;
    }

    if (hasError) return;

    if (editingOperationId) {
        const op = getOperations().find((o) => o.id === editingOperationId);
        if (op) {
            op.type = selectedType;
            op.categoryId = categoryValue;
            op.date = dateValue;
            op.amount = Number(sumDigits);
            op.description = description;
        }
    } else {
        getOperations().push({
            id: generateId('op'),
            type: selectedType,
            categoryId: categoryValue,
            date: dateValue,
            amount: Number(sumDigits),
            description: description
        });
    }

    // Если дата операции в другом месяце — переходим на этот месяц,
    // чтобы сохранённая операция сразу была видна
    const parsedDate = parseOperationDate(dateValue);
    if (parsedDate) {
        selectedYear = parsedDate.year;
        selectedMonth = parsedDate.month;
    }

    saveState();
    renderMonthLabel();
    renderTable();
    renderSummary();
    closeModal();
});

// ===== Панель категорий =====

function openCategoryModal() {
    renderCategoryList();
    categoryOverlay.classList.add('open');
    document.body.style.overflow = 'hidden';
}

function closeCategoryModal() {
    hideCategoryPanelRow();
    categoryOverlay.classList.remove('open');
    document.body.style.overflow = '';
}

categoriesBtn.addEventListener('click', openCategoryModal);
categoryModalClose.addEventListener('click', closeCategoryModal);

categoryOverlay.addEventListener('click', (event) => {
    if (event.target === categoryOverlay) closeCategoryModal();
});

function renderCategoryList() {
    categoryList.innerHTML = '';

    const categories = getCategories();

    if (categories.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'category-list-empty';
        empty.textContent = 'Пока нет ни одной категории — добавьте первую кнопкой ниже';
        categoryList.appendChild(empty);
        return;
    }

    categories.forEach((cat) => {
        categoryList.appendChild(createCategoryCard(cat));
    });
}

function createCategoryCard(cat) {
    const card = document.createElement('div');
    card.className = 'category-card';
    if (cat.id === expandedCategoryId) card.classList.add('expanded');

    // В панели категорий показываются операции за всё время
    const catOps = getOperations().filter((op) => op.categoryId === cat.id);

    // --- Заголовок карточки ---
    const header = document.createElement('div');
    header.className = 'category-card-header';

    const expandBtn = document.createElement('button');
    expandBtn.type = 'button';
    expandBtn.className = 'category-expand-btn';
    expandBtn.textContent = '▸';
    expandBtn.addEventListener('click', () => {
        expandedCategoryId = expandedCategoryId === cat.id ? null : cat.id;
        renderCategoryList();
    });

    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.className = 'category-name-input';
    nameInput.value = cat.name;
    nameInput.addEventListener('change', () => {
        const newName = nameInput.value.trim();
        if (!newName) {
            nameInput.value = cat.name;
            return;
        }
        cat.name = newName;
        saveState();
        renderTable();
    });

    const countEl = document.createElement('span');
    countEl.className = 'category-ops-count';
    countEl.textContent = catOps.length + ' ' + pluralizeOperations(catOps.length);

    header.appendChild(expandBtn);
    header.appendChild(nameInput);
    header.appendChild(countEl);

    // --- Тело карточки (описание + операции) ---
    const body = document.createElement('div');
    body.className = 'category-card-body';

    const descLabel = document.createElement('label');
    descLabel.textContent = 'Описание по умолчанию';

    const descInput = document.createElement('textarea');
    descInput.className = 'category-desc-input';
    descInput.rows = 2;
    descInput.placeholder = 'Будет подставляться в описание при выборе этой категории';
    descInput.value = cat.description;
    descInput.addEventListener('change', () => {
        cat.description = descInput.value.trim();
        saveState();
    });

    const opsWrap = document.createElement('div');
    opsWrap.className = 'category-operations';

    if (catOps.length === 0) {
        const emptyOps = document.createElement('div');
        emptyOps.className = 'category-op-empty';
        emptyOps.textContent = 'В этой категории пока нет операций';
        opsWrap.appendChild(emptyOps);
    } else {
        catOps.forEach((op) => {
            opsWrap.appendChild(createCategoryOpRow(op));
        });
    }

    body.appendChild(descLabel);
    body.appendChild(descInput);
    body.appendChild(opsWrap);

    card.appendChild(header);
    card.appendChild(body);

    return card;
}

function createCategoryOpRow(op) {
    const isIncome = op.type === 'income';

    const row = document.createElement('div');
    row.className = 'category-op-row';

    row.appendChild(createCell('cat-op-date', op.date));
    row.appendChild(createCell('cat-op-desc', op.description || '—'));

    const sign = isIncome ? '+' : '−';
    row.appendChild(
        createCell('cat-op-sum ' + (isIncome ? 'income-sum' : 'expense-sum'), sign + formatCurrency(op.amount))
    );

    const actions = document.createElement('div');
    actions.className = 'cat-op-actions';

    const editBtn = document.createElement('button');
    editBtn.type = 'button';
    editBtn.className = 'cat-op-edit';
    editBtn.textContent = 'Изменить';
    editBtn.addEventListener('click', () => {
        closeCategoryModal();
        openEditModal(op.id);
    });

    const deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
    deleteBtn.className = 'cat-op-delete';
    deleteBtn.textContent = 'Удалить';
    deleteBtn.addEventListener('click', () => {
        deleteOperation(op.id);
    });

    actions.appendChild(editBtn);
    actions.appendChild(deleteBtn);
    row.appendChild(actions);

    return row;
}

// ===== Панель категорий: добавление новой категории =====

function showCategoryPanelRow() {
    categoryPanelNewRow.classList.add('open');
    categoryPanelInput.focus();
}

function hideCategoryPanelRow() {
    categoryPanelNewRow.classList.remove('open');
    categoryPanelInput.value = '';
    categoryPanelInput.classList.remove('input-error');
}

categoryPanelAddBtn.addEventListener('click', () => {
    if (categoryPanelNewRow.classList.contains('open')) {
        hideCategoryPanelRow();
    } else {
        showCategoryPanelRow();
    }
});

function addCategoryFromPanel() {
    const name = categoryPanelInput.value.trim();
    if (!name) {
        categoryPanelInput.classList.add('input-error');
        return;
    }

    const categories = getCategories();
    const existing = categories.find(
        (cat) => cat.name.toLowerCase() === name.toLowerCase()
    );

    if (existing) {
        // Такая категория уже есть — просто раскрываем её
        expandedCategoryId = existing.id;
        showToast('Такая категория уже есть');
    } else {
        const category = { id: generateId('cat'), name: name, description: '' };
        categories.push(category);
        expandedCategoryId = category.id;
        saveState();
    }

    hideCategoryPanelRow();
    renderCategoryList();
}

categoryPanelConfirmBtn.addEventListener('click', addCategoryFromPanel);

categoryPanelInput.addEventListener('input', () => {
    categoryPanelInput.classList.remove('input-error');
});

categoryPanelInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
        event.preventDefault();
        addCategoryFromPanel();
    }
});

// ===== План доходов на месяц =====

attachSumMask(planSumInput);

function openPlanModal() {
    planSumInput.value = formatNumberWithSpaces(String(getIncomePlan()));
    planSumInput.classList.remove('input-error');
    planOverlay.classList.add('open');
    document.body.style.overflow = 'hidden';
    planSumInput.focus();
    planSumInput.select();
}

function closePlanModal() {
    planOverlay.classList.remove('open');
    document.body.style.overflow = '';
    planSumInput.classList.remove('input-error');
}

incomePlanBtn.addEventListener('click', openPlanModal);
planModalClose.addEventListener('click', closePlanModal);
planCancel.addEventListener('click', closePlanModal);

planOverlay.addEventListener('click', (event) => {
    if (event.target === planOverlay) closePlanModal();
});

planForm.addEventListener('submit', (event) => {
    event.preventDefault();

    const sumDigits = planSumInput.value.replace(/\D/g, '');
    if (!sumDigits || Number(sumDigits) === 0) {
        planSumInput.classList.add('input-error');
        return;
    }

    getProfile().incomePlan = Number(sumDigits);
    saveState();
    renderSummary();
    closePlanModal();
});

// ===== Профили =====

function updateAvatar() {
    const name = getProfile().name;
    accountBtn.textContent = getAvatarLetter(name);
    accountBtn.title = 'Профиль: ' + name;
}

function openProfileModal() {
    renamingProfileId = null;
    hideNewProfileRow();
    renderProfileList();
    profileOverlay.classList.add('open');
    document.body.style.overflow = 'hidden';
}

function closeProfileModal() {
    profileOverlay.classList.remove('open');
    document.body.style.overflow = '';
    renamingProfileId = null;
    closeAllRowMenus();
}

accountBtn.addEventListener('click', openProfileModal);
accountBtn.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        openProfileModal();
    }
});
profileModalClose.addEventListener('click', closeProfileModal);

profileOverlay.addEventListener('click', (event) => {
    if (event.target === profileOverlay) closeProfileModal();
});

profileList.addEventListener('scroll', closeAllRowMenus);

function switchProfile(profileId) {
    if (profileId !== state.currentProfileId) {
        state.currentProfileId = profileId;
        expandedCategoryId = null;
        saveState();
        renderAll();
    }
    closeProfileModal();
}

function renderProfileList() {
    profileList.innerHTML = '';
    state.profiles.forEach((profile) => {
        profileList.appendChild(createProfileRow(profile));
    });
}

function createProfileRow(profile) {
    const isCurrent = profile.id === state.currentProfileId;

    const row = document.createElement('div');
    row.className = 'profile-row' + (isCurrent ? ' current' : '');
    row.addEventListener('click', () => {
        if (renamingProfileId) return;
        switchProfile(profile.id);
    });

    const avatar = document.createElement('div');
    avatar.className = 'profile-avatar';
    avatar.textContent = getAvatarLetter(profile.name);

    const info = document.createElement('div');
    info.className = 'profile-info';

    if (renamingProfileId === profile.id) {
        info.appendChild(createRenameInput(profile));
    } else {
        const nameEl = document.createElement('span');
        nameEl.className = 'profile-name';
        nameEl.textContent = profile.name;

        const count = profile.operations.length;
        const meta = document.createElement('span');
        meta.className = 'profile-meta';
        meta.textContent = (isCurrent ? 'Текущий · ' : '') + count + ' ' + pluralizeOperations(count);

        info.appendChild(nameEl);
        info.appendChild(meta);
    }

    row.appendChild(avatar);
    row.appendChild(info);
    row.appendChild(createProfileMenu(profile));

    return row;
}

function createRenameInput(profile) {
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'profile-rename-input';
    input.value = profile.name;
    input.maxLength = 30;

    let finished = false;

    function finish(save) {
        if (finished) return;
        finished = true;

        if (save) {
            const newName = input.value.trim();
            if (newName) {
                profile.name = newName;
                saveState();
                if (profile.id === state.currentProfileId) updateAvatar();
            }
        }

        renamingProfileId = null;
        renderProfileList();
    }

    input.addEventListener('click', (event) => event.stopPropagation());
    input.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            finish(true);
        } else if (event.key === 'Escape') {
            event.stopPropagation(); // не закрываем всё окно профилей
            finish(false);
        }
    });
    input.addEventListener('blur', () => finish(true));

    return input;
}

function createProfileMenu(profile) {
    const wrap = document.createElement('div');
    wrap.className = 'profile-menu-wrap';
    // Клики внутри меню не должны переключать профиль
    wrap.addEventListener('click', (event) => event.stopPropagation());

    const menuBtn = document.createElement('button');
    menuBtn.type = 'button';
    menuBtn.className = 'row-menu-btn';
    menuBtn.textContent = '⋮';
    menuBtn.setAttribute('aria-label', 'Действия с профилем');

    const menu = document.createElement('div');
    menu.className = 'row-menu profile-menu';

    // Переименовать
    const renameItem = document.createElement('button');
    renameItem.type = 'button';
    renameItem.className = 'row-menu-item';
    renameItem.textContent = 'Изменить имя';
    renameItem.addEventListener('click', () => {
        closeAllRowMenus();
        renamingProfileId = profile.id;
        renderProfileList();
        const input = profileList.querySelector('.profile-rename-input');
        if (input) {
            input.focus();
            input.select();
        }
    });

    // Очистить данные
    const clearItem = document.createElement('button');
    clearItem.type = 'button';
    clearItem.className = 'row-menu-item';
    clearItem.textContent = 'Очистить данные';
    clearItem.addEventListener('click', () => {
        closeAllRowMenus();
        const message = 'Очистить данные профиля «' + profile.name + '»?\n'
            + 'Все операции, категории, накопления и план доходов будут сброшены.';
        if (!window.confirm(message)) return;

        profile.operations = [];
        profile.categories = [];
        profile.savings = createEmptySavings();
        profile.incomePlan = null;
        saveState();

        if (profile.id === state.currentProfileId) {
            expandedCategoryId = null;
            renderAll();
        }
        renderProfileList();
    });

    // Удалить профиль (нельзя удалить единственный)
    const deleteItem = document.createElement('button');
    deleteItem.type = 'button';
    deleteItem.className = 'row-menu-item row-menu-item-danger';
    deleteItem.textContent = 'Удалить профиль';

    if (state.profiles.length <= 1) {
        deleteItem.disabled = true;
        deleteItem.title = 'Нельзя удалить единственный профиль';
    } else {
        deleteItem.addEventListener('click', () => {
            closeAllRowMenus();
            const message = 'Удалить профиль «' + profile.name + '» вместе со всеми его данными?';
            if (!window.confirm(message)) return;

            const idx = state.profiles.findIndex((p) => p.id === profile.id);
            if (idx !== -1) state.profiles.splice(idx, 1);

            if (state.currentProfileId === profile.id) {
                state.currentProfileId = state.profiles[0].id;
                expandedCategoryId = null;
                renderAll();
            }

            saveState();
            renderProfileList();
        });
    }

    menu.appendChild(renameItem);
    menu.appendChild(clearItem);
    menu.appendChild(deleteItem);

    menuBtn.addEventListener('click', (event) => {
        event.stopPropagation();
        const isOpen = menu.classList.contains('open');
        closeAllRowMenus();
        if (isOpen) return;

        menu.classList.add('open');

        // Меню позиционируется через fixed, чтобы не обрезаться прокруткой списка
        const rect = menuBtn.getBoundingClientRect();
        const menuWidth = menu.offsetWidth;
        const menuHeight = menu.offsetHeight;

        let top = rect.bottom + 4;
        if (top + menuHeight > window.innerHeight - 8) {
            top = rect.top - menuHeight - 4;
        }
        let left = rect.right - menuWidth;
        if (left < 8) left = 8;

        menu.style.top = top + 'px';
        menu.style.left = left + 'px';
    });

    wrap.appendChild(menuBtn);
    wrap.appendChild(menu);
    return wrap;
}

function showNewProfileRow() {
    newProfileRow.classList.add('open');
    newProfileInput.focus();
}

function hideNewProfileRow() {
    newProfileRow.classList.remove('open');
    newProfileInput.value = '';
    newProfileInput.classList.remove('input-error');
}

profileAddBtn.addEventListener('click', () => {
    if (newProfileRow.classList.contains('open')) {
        hideNewProfileRow();
    } else {
        showNewProfileRow();
    }
});

function addProfile() {
    const name = newProfileInput.value.trim();
    if (!name) {
        newProfileInput.classList.add('input-error');
        return;
    }

    const profile = {
        id: generateId('profile'),
        name: name,
        categories: [],
        operations: [],
        savings: createEmptySavings(),
        incomePlan: null
    };

    state.profiles.push(profile);
    state.currentProfileId = profile.id;
    expandedCategoryId = null;

    saveState();
    renderAll();
    closeProfileModal();
}

newProfileConfirmBtn.addEventListener('click', addProfile);

newProfileInput.addEventListener('input', () => {
    newProfileInput.classList.remove('input-error');
});

newProfileInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
        event.preventDefault();
        addProfile();
    }
});

// ===== Вкладки (Обзор / Накопления) =====

let currentView = 'overview';
let editingDepositId = null;

function getViewFromHash() {
    return window.location.hash === '#savings' ? 'savings' : 'overview';
}

function setView(view) {
    currentView = view;
    viewOverviewEl.hidden = view !== 'overview';
    viewSavingsEl.hidden = view !== 'savings';
    navItems.forEach((li) => li.classList.toggle('active', li.dataset.view === view));
    document.body.classList.toggle('view-savings', view === 'savings');
    addOperationBtn.textContent = view === 'savings' ? 'Добавить пополнение' : 'Добавить операцию';
}

window.addEventListener('hashchange', () => setView(getViewFromHash()));

// ===== Маски для полей даты и суммы (вкладка «Накопления») =====

function attachDateMask(input) {
    input.addEventListener('input', () => {
        const digits = input.value.replace(/\D/g, '').slice(0, 6);
        let formatted = digits;

        if (digits.length > 4) {
            formatted = digits.slice(0, 2) + '.' + digits.slice(2, 4) + '.' + digits.slice(4);
        } else if (digits.length > 2) {
            formatted = digits.slice(0, 2) + '.' + digits.slice(2);
        }

        input.value = formatted;
        input.classList.remove('input-error');
    });
}

function attachSumMask(input) {
    input.addEventListener('input', () => {
        let digits = input.value.replace(/\D/g, '');
        digits = digits.replace(/^0+(?=\d)/, '');
        input.value = formatNumberWithSpaces(digits);
        input.classList.remove('input-error');
    });
}

attachDateMask(depositDateInput);
attachSumMask(depositSumInput);
attachDateMask(goalDateInput);
attachSumMask(goalSumInput);

// ===== Накопления: расчёты и отрисовка =====

// "05.09.26" -> 260905 (чтобы сортировать даты по возрастанию/убыванию)
function dateSortKey(dateStr) {
    const match = dateStr.match(/^(\d{2})\.(\d{2})\.(\d{2})$/);
    if (!match) return 0;
    return Number(match[3]) * 10000 + Number(match[2]) * 100 + Number(match[1]);
}

function getTotalSaved() {
    return getSavings().deposits.reduce((sum, d) => sum + d.amount, 0);
}

function renderSavings() {
    const savings = getSavings();
    const total = getTotalSaved();

    savingsSumEl.textContent = formatCurrency(total);

    if (savings.goal) {
        const goal = savings.goal;
        const percent = Math.min(100, Math.floor((total / goal.amount) * 100));
        const remaining = goal.amount - total;

        savingsProgressEl.style.width = percent + '%';
        goalLinkBtn.textContent = 'Цель: ' + formatCurrency(goal.amount) + ' к ' + goal.date + ' · изменить';
        savingsPercentEl.textContent = remaining > 0
            ? percent + '% · осталось ' + formatCurrency(remaining)
            : 'Цель достигнута 🎉';
    } else {
        savingsProgressEl.style.width = '0%';
        goalLinkBtn.textContent = 'Добавить цель';
        savingsPercentEl.textContent = '';
    }

    renderDeposits();
}

function renderDeposits() {
    depositsBody.innerHTML = '';

    const deposits = getSavings().deposits
        .slice()
        .sort((a, b) => dateSortKey(b.date) - dateSortKey(a.date));

    if (deposits.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'table-empty';
        empty.textContent = 'Пополнений пока нет — добавьте первое';
        depositsBody.appendChild(empty);
        return;
    }

    deposits.forEach((deposit) => {
        const row = document.createElement('div');
        row.className = 'table-row';

        row.classList.add('deposit-row');
        row.appendChild(createCell('col-date', deposit.date));
        row.appendChild(createCell('col-description', deposit.description || '—'));
        row.appendChild(createCell('col-sum income-sum', '+' + formatCurrency(deposit.amount)));
        row.appendChild(createRowActions(
            () => openDepositModal(deposit.id),
            () => deleteDeposit(deposit.id)
        ));

        depositsBody.appendChild(row);
    });
}

// ===== Накопления: окно пополнения =====

function openDepositModal(depositId) {
    depositForm.reset();
    depositDateInput.classList.remove('input-error');
    depositSumInput.classList.remove('input-error');
    editingDepositId = null;

    const deposit = depositId
        ? getSavings().deposits.find((d) => d.id === depositId)
        : null;

    if (deposit) {
        editingDepositId = deposit.id;
        depositDateInput.value = deposit.date;
        depositSumInput.value = formatNumberWithSpaces(String(deposit.amount));
        depositDescriptionInput.value = deposit.description;
        depositModalTitle.textContent = 'Редактировать пополнение';
        depositSubmit.textContent = 'Сохранить';
        depositDelete.classList.add('visible');
    } else {
        depositModalTitle.textContent = 'Новое пополнение';
        depositSubmit.textContent = 'Добавить';
        depositDelete.classList.remove('visible');
    }

    depositOverlay.classList.add('open');
    document.body.style.overflow = 'hidden';
}

function closeDepositModal() {
    depositOverlay.classList.remove('open');
    document.body.style.overflow = '';
    depositForm.reset();
    depositDateInput.classList.remove('input-error');
    depositSumInput.classList.remove('input-error');
    editingDepositId = null;
}

function deleteDeposit(depositId) {
    if (!window.confirm('Удалить это пополнение?')) return;

    const deposits = getSavings().deposits;
    const idx = deposits.findIndex((d) => d.id === depositId);
    if (idx !== -1) deposits.splice(idx, 1);

    saveState();
    renderSavings();
}

addDepositBtn.addEventListener('click', () => openDepositModal());
depositModalClose.addEventListener('click', closeDepositModal);
depositCancel.addEventListener('click', closeDepositModal);

depositOverlay.addEventListener('click', (event) => {
    if (event.target === depositOverlay) closeDepositModal();
});

depositDelete.addEventListener('click', () => {
    if (!editingDepositId) return;
    const idToDelete = editingDepositId;
    closeDepositModal();
    deleteDeposit(idToDelete);
});

depositForm.addEventListener('submit', (event) => {
    event.preventDefault();

    const dateValue = depositDateInput.value.trim();
    const sumDigits = depositSumInput.value.replace(/\D/g, '');
    const description = depositDescriptionInput.value.trim();

    let hasError = false;

    if (!isValidDate(dateValue)) {
        depositDateInput.classList.add('input-error');
        hasError = true;
    }

    if (!sumDigits || Number(sumDigits) === 0) {
        depositSumInput.classList.add('input-error');
        hasError = true;
    }

    if (hasError) return;

    const deposits = getSavings().deposits;

    if (editingDepositId) {
        const deposit = deposits.find((d) => d.id === editingDepositId);
        if (deposit) {
            deposit.date = dateValue;
            deposit.amount = Number(sumDigits);
            deposit.description = description;
        }
    } else {
        deposits.push({
            id: generateId('dep'),
            date: dateValue,
            amount: Number(sumDigits),
            description: description
        });
    }

    saveState();
    renderSavings();
    closeDepositModal();
});

// ===== Накопления: окно цели =====

function openGoalModal() {
    goalForm.reset();
    goalDateInput.classList.remove('input-error');
    goalSumInput.classList.remove('input-error');

    const goal = getSavings().goal;

    if (goal) {
        goalDateInput.value = goal.date;
        goalSumInput.value = formatNumberWithSpaces(String(goal.amount));
        goalModalTitle.textContent = 'Изменить цель';
        goalSubmit.textContent = 'Сохранить';
        goalDelete.classList.add('visible');
    } else {
        goalModalTitle.textContent = 'Новая цель';
        goalSubmit.textContent = 'Добавить';
        goalDelete.classList.remove('visible');
    }

    goalOverlay.classList.add('open');
    document.body.style.overflow = 'hidden';
}

function closeGoalModal() {
    goalOverlay.classList.remove('open');
    document.body.style.overflow = '';
    goalForm.reset();
    goalDateInput.classList.remove('input-error');
    goalSumInput.classList.remove('input-error');
}

goalLinkBtn.addEventListener('click', openGoalModal);
goalModalClose.addEventListener('click', closeGoalModal);
goalCancel.addEventListener('click', closeGoalModal);

goalOverlay.addEventListener('click', (event) => {
    if (event.target === goalOverlay) closeGoalModal();
});

goalDelete.addEventListener('click', () => {
    if (!window.confirm('Удалить цель накопления?')) return;
    getSavings().goal = null;
    saveState();
    renderSavings();
    closeGoalModal();
});

goalForm.addEventListener('submit', (event) => {
    event.preventDefault();

    const dateValue = goalDateInput.value.trim();
    const sumDigits = goalSumInput.value.replace(/\D/g, '');

    let hasError = false;

    if (!isValidDate(dateValue)) {
        goalDateInput.classList.add('input-error');
        hasError = true;
    }

    if (!sumDigits || Number(sumDigits) === 0) {
        goalSumInput.classList.add('input-error');
        hasError = true;
    }

    if (hasError) return;

    getSavings().goal = { amount: Number(sumDigits), date: dateValue };

    saveState();
    renderSavings();
    closeGoalModal();
});

// ===== Всплывающее уведомление =====

let toastTimer = null;

function showToast(message) {
    toastEl.textContent = message;
    toastEl.classList.add('visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
        toastEl.classList.remove('visible');
    }, 3000);
}

// ===== Экспорт (пока не реализован) =====

exportBtn.addEventListener('click', () => {
    showToast('Прости, но пока что это не реализовано');
});

// ===== Полная перерисовка страницы =====

function renderAll() {
    updateAvatar();
    renderMonthLabel();
    renderTable();
    renderSummary();
    renderCategoryOptions();
    renderSavings();
}

// ===== Первичная отрисовка =====

renderAll();
setView(getViewFromHash());
