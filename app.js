// Списък с официални неработни празнични дни (формат: ГГГГ-ММ-ДД)
// Можеш да добавяш нови дати тук ръчно, когато излязат за съответната година
const OFFICIAL_HOLIDAYS = [
    '2026-01-01', // Нова година
    '2026-03-03', // Освобождение на България
    '2026-04-10', // Разпети петък (примерна дата за Великден 2026)
    '2026-04-13', // Великденски понеделник
    '2026-05-01', // Ден на труда
    '2026-05-06', // Гергьовден
    '2026-05-24', // Ден на светите братя Кирил и Методий
    '2026-09-06', // Съединение на България
    '2026-09-22', // Независимост на България
    '2026-11-01', // Ден на народните будители
    '2026-12-24', // Бъдни вечер
    '2026-12-25', // Коледа
    '2026-12-26'  // Коледа
];

const datePicker = document.getElementById('date-picker');
const dateInfo = document.getElementById('date-info');
const weekendWarning = document.getElementById('weekend-warning');

// По подразбиране зареждаме днешната календарна дата (формат: 2026-07-08)
const todayDateString = new Date().toISOString().split('T')[0];
datePicker.value = todayDateString;

// База данни, записана трайно в браузъра под ключ 'office_reservations'
let reservations = JSON.parse(localStorage.getItem('office_reservations')) || {};

let currentRoom = 'main';
let selectedDeskId = null;
let currentUserName = localStorage.getItem('current_user_name') || '';

// Помощни масиви за показване името на деня от седмицата
const WEEKDAYS_BG = ["Неделя", "Понеделник", "Вторник", "Сряда", "Четвъртък", "Петък", "Събота"];

// Функция, която проверява статуса на избраната дата
function checkDateStatus(dateString) {
    const dateObj = new Date(dateString);
    const dayOfWeek = dateObj.getDay(); // 0 = Неделя, 6 = Събота
    
    const isWeekend = (dayOfWeek === 0 || dayOfWeek === 6);
    const isHoliday = OFFICIAL_HOLIDAYS.includes(dateString);
    
    return {
        isWeekend: isWeekend,
        isHoliday: isHoliday,
        isClosed: (isWeekend || isHoliday),
        dayName: WEEKDAYS_BG[dayOfWeek]
    };
}

// Главна функция за рендериране
function renderOffice() {
    const selectedDate = datePicker.value;
    
    // Ако за тази конкретна дата няма обект в базата данни, създаваме го празен
    if (!reservations[selectedDate]) {
        reservations[selectedDate] = {};
    }

    const currentDayReservations = reservations[selectedDate];
    const dateStatus = checkDateStatus(selectedDate);

    // Изписваме деня от седмицата до календара за допълнителна яснота
    dateInfo.innerText = `${dateStatus.dayName} ${dateStatus.isHoliday ? '(Празник)' : ''}`;

    // Ако е почивен ден, показваме голямо предупреждение и скриваме/деактивираме картите
    if (dateStatus.isClosed) {
        weekendWarning.classList.remove('hidden');
    } else {
        weekendWarning.classList.add('hidden');
    }

    // 1. Основна стая - Ляв блок (4 монитора)
    const leftBlock = document.getElementById('left-block');
    leftBlock.innerHTML = '';
    for (let i = 1; i <= 4; i++) {
        leftBlock.appendChild(createDeskElement(`M-${i}`, i, currentDayReservations, dateStatus.isClosed));
    }

    // 2. Основна стая - Острови (Редици 3 по 3, общо 18 бюра)
    const rowsBlock = document.getElementById('rows-block');
    rowsBlock.innerHTML = '';
    for (let i = 5; i <= 22; i++) {
        rowsBlock.appendChild(createDeskElement(`M-${i}`, i, currentDayReservations, dateStatus.isClosed));
    }

    // 3. Малка стая (3 монитора)
    const smallRoomBlock = document.getElementById('small-room-block');
    smallRoomBlock.innerHTML = '';
    for (let i = 1; i <= 3; i++) {
        smallRoomBlock.appendChild(createDeskElement(`S-${i}`, i, currentDayReservations, dateStatus.isClosed));
    }
}

// Функция за създаване на всяка кутийка-бюро
function createDeskElement(id, displayNum, currentDayReservations, isClosedDay) {
    const desk = document.createElement('div');
    const isOccupied = !!currentDayReservations[id];
    const occupant = currentDayReservations[id];
    const isMe = isOccupied && occupant === currentUserName;

    let bgClass = 'bg-emerald-500/10 border-emerald-500 text-emerald-400 hover:bg-emerald-500/20';
    
    if (isOccupied) {
        bgClass = isMe 
            ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-600/30' 
            : 'bg-rose-500/10 border-rose-500/50 text-rose-400 hover:bg-rose-500/20';
    }

    // Ако денят е затворен (уикенд/празник), правим бюрата сиви и неактивни
    if (isClosedDay) {
        bgClass = 'bg-slate-800/50 border-slate-700 text-slate-500 cursor-not-allowed';
    }

    desk.className = `border-2 ${bgClass} rounded-xl p-4 flex flex-col items-center justify-center transition-all duration-200 transform ${isClosedDay ? '' : 'hover:scale-105 cursor-pointer'} min-w-[75px]`;
    desk.innerHTML = `
        <i class="fa-solid fa-desktop text-xl mb-1"></i>
        <span class="text-xs font-bold font-mono">${displayNum}</span>
        ${isOccupied ? `<span class="text-[10px] mt-1 bg-slate-950/60 px-1.5 py-0.5 rounded text-ellipsis max-w-full overflow-hidden whitespace-nowrap">${occupant}</span>` : ''}
    `;

    // Клик събитие (само ако денят е отворен за работа)
    if (!isClosedDay) {
        desk.onclick = () => handleDeskClick(id, isOccupied, isMe, occupant);
    }
    
    return desk;
}

// Логика при кликване на работно място
function handleDeskClick(id, isOccupied, isMe, occupant) {
    selectedDeskId = id;
    const selectedDate = datePicker.value;
    
    if (isOccupied) {
        if (isMe) {
            // Твърдо потвърждение с точна календарна дата в текста
            if (confirm(`Искате ли да отмените резервацията си за Монитор ${id.split('-')[1]} за датата ${selectedDate}?`)) {
                delete reservations[selectedDate][id];
                saveData();
                renderOffice();
            }
        } else {
            alert(`Това място е резервирано от: ${occupant}`);
        }
    } else {
        // Отваряне на модала за резервация за конкретната избрана дата
        document.getElementById('modal-title').innerText = "Резервация на място";
        document.getElementById('modal-subtitle').innerText = `${id.includes('M') ? 'Основна стая' : 'Малка стая'}, Монитор ${id.split('-')[1]} за дата: ${selectedDate}`;
        document.getElementById('user-name').value = currentUserName;
        document.getElementById('booking-modal').style.display = 'flex';
    }
}

// Запис в базата данни (localStorage)
function saveData() {
    localStorage.setItem('office_reservations', JSON.stringify(reservations));
}

// Потвърждаване на резервацията от Popup прозореца
document.getElementById('btn-confirm-booking').onclick = () => {
    const nameInput = document.getElementById('user-name').value.trim();
    if (!nameInput) {
        alert('Моля, въведете име!');
        return;
    }

    currentUserName = nameInput;
    localStorage.setItem('current_user_name', currentUserName);

    const selectedDate = datePicker.value;
    reservations[selectedDate][selectedDeskId] = currentUserName;
    
    saveData();
    document.getElementById('booking-modal').style.display = 'none';
    renderOffice();
};

// Затваряне на попъпа
document.getElementById('btn-close-modal').onclick = () => {
    document.getElementById('booking-modal').style.display = 'none';
};

// При смяна на деня от календара, веднага преначертаваме всичко за новата дата
datePicker.onchange = () => {
    renderOffice();
};

// Табове - превключване между стаите
const tabMain = document.getElementById('tab-main');
const tabSmall = document.getElementById('tab-small');
const roomMainContainer = document.getElementById('room-main-container');
const roomSmallContainer = document.getElementById('room-small-container');

tabMain.onclick = () => {
    tabMain.className = "px-6 py-3 font-semibold text-indigo-400 border-b-2 border-indigo-500 transition-all";
    tabSmall.className = "px-6 py-3 font-semibold text-slate-400 hover:text-slate-200 transition-all";
    roomMainContainer.className = "block";
    roomSmallContainer.className = "hidden";
};

tabSmall.onclick = () => {
    tabSmall.className = "px-6 py-3 font-semibold text-indigo-400 border-b-2 border-indigo-500 transition-all";
    tabMain.className = "px-6 py-3 font-semibold text-slate-400 hover:text-slate-200 transition-all";
    roomSmallContainer.className = "block";
    roomMainContainer.className = "hidden";
};

// Първоначално стартиране при зареждане на страницата
renderOffice();
