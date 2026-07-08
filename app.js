const OFFICIAL_HOLIDAYS = [
    '2026-01-01', '2026-03-03', '2026-04-10', '2026-04-13',
    '2026-05-01', '2026-05-06', '2026-05-24', '2026-09-06',
    '2026-09-22', '2026-11-01', '2026-12-24', '2026-12-25', '2026-12-26'
];

const WEEKDAYS_BG = ["Неделя", "Понеделник", "Вторник", "Сряда", "Четвъртък", "Петък", "Събота"];

const datePicker = document.getElementById('date-picker');
const dateInfo = document.getElementById('date-info');
const weekendWarning = document.getElementById('weekend-warning');

// Локална памет (база данни)
let reservations = JSON.parse(localStorage.getItem('office_reservations')) || {};
let currentUserName = localStorage.getItem('current_user_name') || '';
let selectedDeskId = null;

// Инициализиране с днешна дата по подразбиране
const todayStr = new Date().toISOString().split('T')[0];
datePicker.value = todayStr;

function checkDateStatus(dateString) {
    const dateObj = new Date(dateString);
    const dayOfWeek = dateObj.getDay();
    const isWeekend = (dayOfWeek === 0 || dayOfWeek === 6);
    const isHoliday = OFFICIAL_HOLIDAYS.includes(dateString);
    return { isClosed: (isWeekend || isHoliday), dayName: WEEKDAYS_BG[dayOfWeek] };
}

function renderOffice() {
    const selectedDate = datePicker.value;
    if (!reservations[selectedDate]) reservations[selectedDate] = {};
    
    const dayRes = reservations[selectedDate];
    const dateStatus = checkDateStatus(selectedDate);

    dateInfo.innerText = `${dateStatus.dayName}`;
    if (dateStatus.isClosed) {
        weekendWarning.classList.remove('hidden');
    } else {
        weekendWarning.classList.add('hidden');
    }

    // ИЗЧИСТВАНЕ НА ЗОНИТЕ ПРЕДИ ЗАРЕЖДАНЕ
    const zones = {
        'left-top': document.getElementById('left-top-row'),
        'left-bottom': document.getElementById('left-bottom-row'),
        't1-top': document.getElementById('main-table-1-top'),
        't1-bottom': document.getElementById('main-table-1-bottom'),
        't2-top': document.getElementById('main-table-2-top'),
        't2-bottom': document.getElementById('main-table-2-bottom'),
        't3-top': document.getElementById('main-table-3-top'),
        't3-bottom': document.getElementById('main-table-3-bottom'),
        'small': document.getElementById('small-room-top')
    };
    Object.values(zones).forEach(z => z.innerHTML = '');

    // 1. ЛЯВ КРАЙ (Монитори 1 и 2 отгоре, 3 и 4 отдолу)
    zones['left-top'].appendChild(createDeskIcon('M-1', '1', dayRes, dateStatus.isClosed, 'down'));
    zones['left-top'].appendChild(createDeskIcon('M-2', '2', dayRes, dateStatus.isClosed, 'down'));
    zones['left-bottom'].appendChild(createDeskIcon('M-3', '3', dayRes, dateStatus.isClosed, 'up'));
    zones['left-bottom'].appendChild(createDeskIcon('M-4', '4', dayRes, dateStatus.isClosed, 'up'));

    // 2. ДЪЛГИ МАСИ (3 маси по 6 монитора: 3 сочат надолу, 3 сочат нагоре)
    // Маса 1 (Бюра 5-10)
    for(let i=5; i<=7; i++) zones['t1-top'].appendChild(createDeskIcon(`M-${i}`, i, dayRes, dateStatus.isClosed, 'down'));
    for(let i=8; i<=10; i++) zones['t1-bottom'].appendChild(createDeskIcon(`M-${i}`, i, dayRes, dateStatus.isClosed, 'up'));

    // Маса 2 (Бюра 11-16)
    for(let i=11; i<=13; i++) zones['t2-top'].appendChild(createDeskIcon(`M-${i}`, i, dayRes, dateStatus.isClosed, 'down'));
    for(let i=14; i<=16; i++) zones['t2-bottom'].appendChild(createDeskIcon(`M-${i}`, i, dayRes, dateStatus.isClosed, 'up'));

    // Маса 3 (Бюра 17-22)
    for(let i=17; i<=19; i++) zones['t3-top'].appendChild(createDeskIcon(`M-${i}`, i, dayRes, dateStatus.isClosed, 'down'));
    for(let i=20; i<=22; i++) zones['t3-bottom'].appendChild(createDeskIcon(`M-${i}`, i, dayRes, dateStatus.isClosed, 'up'));

    // 3. МАЛКА СТАЯ (3 монитора в редица)
    for(let i=1; i<=3; i++) zones['small'].appendChild(createDeskIcon(`S-${i}`, i, dayRes, dateStatus.isClosed, 'down'));
}

// Функция за създаване на икона-монитор с физическа ориентация
function createDeskIcon(id, displayNum, dayRes, isClosedDay, direction) {
    const wrapper = document.createElement('div');
    const isOccupied = !!dayRes[id];
    const occupant = dayRes[id];
    const isMe = isOccupied && occupant === currentUserName;

    // Определяне на цвета спрямо статуса
    let colorClass = 'text-emerald-500 hover:text-emerald-400 border-emerald-500/20 bg-emerald-500/5 monitor-free';
    if (isOccupied) {
        colorClass = isMe 
            ? 'text-indigo-400 border-indigo-500/50 bg-indigo-500/10 monitor-mine' 
            : 'text-rose-500 border-rose-500/20 bg-rose-500/5 monitor-occupied';
    }
    if (isClosedDay) {
        colorClass = 'text-slate-700 border-slate-900 bg-slate-900/10 cursor-not-allowed';
    }

    wrapper.className = `flex flex-col items-center justify-center p-2 rounded-xl border transition-all duration-200 ${isClosedDay ? '' : 'hover:scale-110 cursor-pointer'} ${colorClass} w-14 h-14 relative group`;
    
    // Визуална стрелкичка, която показва накъде гледа монитора на масата
    const arrow = direction === 'down' ? '🔽' : '🔼';

    wrapper.innerHTML = `
        <i class="fa-solid fa-desktop text-base"></i>
        <span class="text-[10px] font-black font-mono tracking-tighter mt-0.5">${displayNum}</span>
        <!-- Tooltip при посочване (Ховър ефект) -->
        <span class="absolute bottom-full mb-1 scale-0 group-hover:scale-100 transition-all text-[10px] bg-slate-900 text-slate-200 px-2 py-1 rounded border border-slate-700 font-medium whitespace-nowrap z-10 shadow-xl">
            ${isOccupied ? `Заето от: ${occupant}` : isClosedDay ? 'Затворено' : 'Свободно (Dell 24")'}
        </span>
    `;

    if (!isClosedDay) {
        wrapper.onclick = () => handleDeskClick(id, isOccupied, isMe, occupant);
    }
    return wrapper;
}

function handleDeskClick(id, isOccupied, isMe, occupant) {
    selectedDeskId = id;
    const selectedDate = datePicker.value;
    
    if (isOccupied) {
        if (isMe) {
            if (confirm(`Желаете ли да откажете резервацията си за Монитор ${id.split('-')[1]} за дата ${selectedDate}?`)) {
                delete reservations[selectedDate][id];
                localStorage.setItem('office_reservations', JSON.stringify(reservations));
                renderOffice();
            }
        }
    } else {
        document.getElementById('modal-subtitle').innerText = `${id.includes('M') ? 'Основна стая' : 'Малка стая'}, Монитор ${id.split('-')[1]} (${selectedDate})`;
        document.getElementById('user-name').value = currentUserName;
        document.getElementById('booking-modal').style.display = 'flex';
    }
}

document.getElementById('btn-confirm-booking').onclick = () => {
    const nameInput = document.getElementById('user-name').value.trim();
    if (!nameInput) return alert('Моля, въведете име!');

    currentUserName = nameInput;
    localStorage.setItem('current_user_name', currentUserName);

    const selectedDate = datePicker.value;
    reservations[selectedDate][selectedDeskId] = currentUserName;
    
    localStorage.setItem('office_reservations', JSON.stringify(reservations));
    document.getElementById('booking-modal').style.display = 'none';
    renderOffice();
};

document.getElementById('btn-close-modal').onclick = () => {
    document.getElementById('booking-modal').style.display = 'none';
};

datePicker.onchange = () => renderOffice();

// Табове логика
const tabMain = document.getElementById('tab-main');
const tabSmall = document.getElementById('tab-small');
const roomMainContainer = document.getElementById('room-main-container');
const roomSmallContainer = document.getElementById('room-small-container');

tabMain.onclick = () => {
    tabMain.className = "flex-1 text-center py-2.5 rounded-lg font-bold text-sm transition-all duration-300 bg-indigo-600 text-white shadow-lg shadow-indigo-600/10 cursor-pointer";
    tabSmall.className = "flex-1 text-center py-2.5 rounded-lg font-bold text-sm transition-all duration-300 text-slate-400 hover:text-slate-200 cursor-pointer";
    roomMainContainer.className = "block"; roomSmallContainer.className = "hidden";
};
tabSmall.onclick = () => {
    tabSmall.className = "flex-1 text-center py-2.5 rounded-lg font-bold text-sm transition-all duration-300 bg-indigo-600 text-white shadow-lg shadow-indigo-600/10 cursor-pointer";
    tabMain.className = "flex-1 text-center py-2.5 rounded-lg font-bold text-sm transition-all duration-300 text-slate-400 hover:text-slate-200 cursor-pointer";
    roomSmallContainer.className = "block"; roomMainContainer.className = "hidden";
};

renderOffice();
