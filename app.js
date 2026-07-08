// Конфигурация на твоя Supabase проект
const SUPABASE_URL = "https://ieyujagodnrafpbagyvn.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlleXVqYWdvZG5yYWZwYmFneXZuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTU4OTIzNDUsImV4cCI6MjAzMTQ2ODM0NX0.Your_Actual_Long_Supabase_Anon_Key_Here"; // Увери се, че тук е твоят реален дълъг public anon ключ, започващ с eyJ

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const WEEKDAYS_BG = ["Неделя", "Понеделник", "Вторник", "Сряда", "Четвъртък", "Петък", "Събота"];
const MONTHS_BG = ["Януари", "Февруари", "Март", "Април", "Май", "Юни", "Юли", "Август", "Септември", "Октомври", "Ноември", "Декември"];
const TIME_SLOTS = ["09:00 - 10:00", "10:00 - 11:00", "11:00 - 12:00", "12:00 - 13:00", "13:00 - 14:00", "14:00 - 15:00", "15:00 - 16:00", "16:00 - 17:00", "17:00 - 18:00"];

// Официални празници в България за 2026 г.
const BULGARIAN_HOLIDAYS_2026 = [
    "2026-01-01", // Нова година
    "2026-03-03", // Ден на Освобождението
    "2026-04-10", // Великден (Разпети петък)
    "2026-04-11", // Великден (Велика събота)
    "2026-04-12", // Великден
    "2026-04-13", // Великден (Понеделник след Великден)
    "2026-05-01", // Ден на труда
    "2026-05-06", // Гергьовден
    "2026-05-24", // Ден на светите братя Кирил и Методий
    "2026-05-25", // Почивен ден за 24 май
    "2026-09-06", // Съединението на България
    "2026-09-07", // Почивен ден за Съединението
    "2026-09-22", // Независимостта на България
    "2026-11-01", // Ден на народните будители
    "2026-12-24", // Бъдни вечер
    "2026-12-25", // Коледа
    "2026-12-26"  // Коледа (Втори ден)
];

// Функция за транслитерация от Кирилица към Латиница за проверка на имената (БГ/ЕН)
function cyrillicToLatin(text) {
    if (!text) return '';
    const map = {
        'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ж': 'zh', 'з': 'z',
        'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm', 'н': 'n', 'о': 'o', 'п': 'p',
        'р': 'r', 'с': 's', 'т': 't', 'у': 'u', 'ф': 'f', 'х': 'h', 'ц': 'ts', 'ч': 'ch',
        'ш': 'sh', 'щ': 'sht', 'ъ': 'a', 'ь': 'y', 'ю': 'yu', 'я': 'ya'
    };
    return text.toLowerCase().trim().split('').map(char => map[char] || char).join('');
}

let currentUserName = localStorage.getItem('current_user_name') || '';
let selectedDateStr = new Date().toISOString().split('T')[0];
let calendarCurrentDate = new Date();

let activeReservations = {}; 
let activeMeetings = {};     
let selectedDeskId = null;
let selectedSlotIndex = null;

window.onload = () => {
    buildCalendar();
    selectDate(selectedDateStr);
};

// Зареждане на данните от базата данни за избрания ден
async function fetchCloudData() {
    try {
        // 1. Изтегляне на бюра
        const { data: resData } = await supabaseClient
            .from('office_reservations')
            .select('*')
            .eq('date', selectedDateStr);
            
        activeReservations = {};
        if (resData) {
            resData.forEach(row => { activeReservations[row.desk_id] = row.user_name; });
        }

        // 2. Изтегляне на срещи
        const { data: meetData } = await supabaseClient
            .from('office_meetings')
            .select('*')
            .eq('date', selectedDateStr);
            
        activeMeetings = {};
        if (meetData) {
            meetData.forEach(row => { activeMeetings[row.slot_index] = { title: row.title, attendees: row.attendees }; });
        }

        renderOffice();
        renderMeetings();
    } catch (err) {
        console.error("Грешка при теглене на данни:", err);
    }
}

// Изграждане на интерактивния календар с отразяване на официалните празници
function buildCalendar() {
    const year = calendarCurrentDate.getFullYear();
    const month = calendarCurrentDate.getMonth();
    document.getElementById('calendar-month-year').innerText = `${MONTHS_BG[month]} ${year}`;
    
    const firstDayIndex = new Date(year, month, 1).getDay();
    const adjustedFirstDay = firstDayIndex === 0 ? 6 : firstDayIndex - 1;
    const totalDays = new Date(year, month + 1, 0).getDate();
    
    const grid = document.getElementById('calendar-days-grid');
    grid.innerHTML = '';
    
    for (let i = 0; i < adjustedFirstDay; i++) grid.appendChild(document.createElement('div'));
    
    for (let day = 1; day <= totalDays; day++) {
        const cell = document.createElement('button');
        const loopDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        cell.innerText = day;
        
        const isHoliday = BULGARIAN_HOLIDAYS_2026.includes(loopDate);

        // Базов стил за бутоните в календара
        cell.className = "p-1 text-xs font-semibold rounded hover:bg-indigo-500/20 transition-all cursor-pointer text-slate-300";
        
        // 1. Ако денят е официален празник, свети в меко червено/розово
        if (isHoliday) {
            cell.className = "p-1 text-xs font-bold rounded bg-rose-500/20 text-rose-400 hover:bg-rose-500/30 cursor-pointer border border-rose-500/30";
        }
        
        // 2. Ако денят е текущо избраният, свети в индигово синьо
        if (loopDate === selectedDateStr) {
            cell.className = "p-1 text-xs font-bold rounded bg-indigo-600 text-white shadow-sm cursor-pointer border border-indigo-500";
        }
        
        cell.onclick = () => selectDate(loopDate);
        grid.appendChild(cell);
    }
}

function selectDate(dateString) {
    selectedDateStr = dateString;
    document.getElementById('date-picker').value = dateString;
    const d = new Date(dateString);
    document.getElementById('current-selected-date-display').innerText = `${dateString} (${WEEKDAYS_BG[d.getDay()]})`;
    buildCalendar();
    fetchCloudData();
}

document.getElementById('btn-prev-month').onclick = () => { calendarCurrentDate.setMonth(calendarCurrentDate.getMonth() - 1); buildCalendar(); };
document.getElementById('btn-next-month').onclick = () => { calendarCurrentDate.setMonth(calendarCurrentDate.getMonth() + 1); buildCalendar(); };

// Рендериране на бюрата по маси
function renderOffice() {
    const tableContainers = ['t1-left', 't1-right', 't2-left', 't2-right', 't3-left', 't3-right'];
    tableContainers.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.innerHTML = '';
    });

    for(let i=1; i<=4; i++) {
        const pos = document.getElementById(`pos-M-${i}`);
        if(pos) { pos.innerHTML = ''; pos.appendChild(createDeskIcon(`M-${i}`, i)); }
    }
    for(let i=5; i<=7; i++) document.getElementById('t1-left').appendChild(createDeskIcon(`M-${i}`, i));
    for(let i=8; i<=10; i++) document.getElementById('t1-right').appendChild(createDeskIcon(`M-${i}`, i));
    for(let i=11; i<=13; i++) document.getElementById('t2-left').appendChild(createDeskIcon(`M-${i}`, i));
    for(let i=14; i<=16; i++) document.getElementById('t2-right').appendChild(createDeskIcon(`M-${i}`, i));
    for(let i=17; i<=19; i++) document.getElementById('t3-left').appendChild(createDeskIcon(`M-${i}`, i));
    for(let i=20; i<=22; i++) document.getElementById('t3-right').appendChild(createDeskIcon(`M-${i}`, i));
}

function createDeskIcon(id, displayNum) {
    const wrapper = document.createElement('div');
    const occupant = activeReservations[id];
    const isOccupied = !!occupant;
    
    const savedName = localStorage.getItem('current_user_name') || '';
    
    // Сравнение на латиница за визуализация дали е "мое" мястото
    const myNameNormalized = cyrillicToLatin(savedName);
    const occupantNormalized = cyrillicToLatin(occupant);
    const isMe = isOccupied && myNameNormalized && (occupantNormalized === myNameNormalized);

    if (isOccupied) {
        if (isMe) {
            wrapper.style.backgroundColor = "#4f46e5";
            wrapper.style.color = "#ffffff";
            wrapper.style.borderColor = "#4338ca";
        } else {
            wrapper.style.backgroundColor = "#ffe4e6";
            wrapper.style.color = "#e11d48";
            wrapper.style.borderColor = "#fecdd3";
        }
    } else {
        wrapper.style.backgroundColor = "#ffffff";
        wrapper.style.color = "#059669";
        wrapper.style.borderColor = "#a7f3d0";
    }

    wrapper.className = "flex flex-col items-center justify-center p-1 rounded-xl border transition-all duration-200 hover:scale-110 cursor-pointer w-11 h-11 relative group shadow-sm";
    wrapper.innerHTML = `
        <i class="fa-solid fa-desktop text-sm"></i>
        <span class="text-[9px] font-black font-mono tracking-tighter mt-0.5">${displayNum}</span>
        <span class="absolute bottom-full mb-1 scale-0 group-hover:scale-100 transition-all text-[10px] bg-slate-900 text-slate-200 px-2 py-1 rounded border border-slate-700 font-medium whitespace-nowrap z-10 shadow-xl">
            ${isOccupied ? `Заето от: ${occupant}` : 'Свободно'}
        </span>
    `;

    wrapper.onclick = async () => {
        selectedDeskId = id;
        if (isOccupied) {
            const currentSaved = localStorage.getItem('current_user_name') || '';
            const checkMyName = cyrillicToLatin(currentSaved);
            const checkOccupant = cyrillicToLatin(occupant);
            const isReallyMe = checkMyName && (checkMyName === checkOccupant);

            if (isReallyMe) {
                if (confirm(`Желаете ли да откажете ВАШАТА резервация за Бюро ${displayNum}?`)) {
                    await supabaseClient.from('office_reservations').delete().eq('date', selectedDateStr).eq('desk_id', id);
                    fetchCloudData();
                }
            } else {
                alert(`Грешка: Бюро ${displayNum} е запазено от ${occupant}. Не можете да триете чужди резервации!`);
            }
        } else {
            document.getElementById('modal-subtitle').innerText = `Бюро ${displayNum} (${selectedDateStr})`;
            document.getElementById('user-name').value = localStorage.getItem('current_user_name') || '';
            document.getElementById('booking-modal').style.display = 'flex';
        }
    };
    return wrapper;
}

// Рендериране на залата за срещи
function renderMeetings() {
    const container = document.getElementById('meeting-slots-container');
    if (!container) return;
    container.innerHTML = '';

    TIME_SLOTS.forEach((slot, index) => {
        const isBooked = !!activeMeetings[index];
        const data = activeMeetings[index];
        const card = document.createElement('div');
        
        if (isBooked) {
            card.className = "p-4 rounded-xl border border-rose-900/40 bg-rose-950/20 flex flex-col justify-between gap-2 shadow-sm";
            card.innerHTML = `
                <div>
                    <div class="flex justify-between items-center">
                        <span class="text-xs font-mono font-bold bg-rose-500/10 text-rose-400 px-2 py-0.5 rounded border border-rose-500/20"><i class="fa-regular fa-clock mr-1"></i>${slot}</span>
                        <span class="text-xs uppercase font-black tracking-wider text-rose-500">Заета</span>
                    </div>
                    <h4 class="text-sm font-bold text-slate-100 mt-2">${data.title}</h4>
                    <p class="text-xs text-slate-400 mt-1"><i class="fa-solid fa-users text-indigo-400 mr-1"></i> ${data.attendees}</p>
                </div>
                <button class="mt-2 text-left text-[11px] font-bold text-rose-400/70 hover:text-rose-400 cursor-pointer"><i class="fa-regular fa-trash-can mr-1"></i>Освободи залата</button>
            `;
            card.querySelector('button').onclick = async () => {
                if (confirm(`Изтриване на срещата "${data.title}"?`)) {
                    await supabaseClient.from('office_meetings').delete().eq('date', selectedDateStr).eq('slot_index', index);
                    fetchCloudData();
                }
            };
        } else {
            card.className = "p-4 rounded-xl border border-slate-800 bg-slate-900/20 hover:border-indigo-500/50 hover:bg-indigo-500/5 transition-all flex justify-between items-center cursor-pointer group shadow-sm";
            card.innerHTML = `
                <div class="flex items-center gap-3">
                    <span class="text-xs font-mono font-bold bg-slate-800 text-slate-300 px-2 py-1 rounded border border-slate-700">${slot}</span>
                    <span class="text-xs font-semibold text-slate-400">Свободен слот</span>
                </div>
                <i class="fa-solid fa-circle-plus text-slate-700 group-hover:text-indigo-400 text-lg"></i>
            `;
            card.onclick = () => {
                selectedSlotIndex = index;
                document.getElementById('meeting-modal-subtitle').innerText = `Час: ${slot} (${selectedDateStr})`;
                document.getElementById('meeting-title').value = '';
                document.getElementById('meeting-attendees').value = '';
                document.getElementById('meeting-modal').style.display = 'flex';
            };
        }
        container.appendChild(card);
    });
}

// Потвърждаване на резервация за бюро с лимит до 1 място и БГ/ЕН сигурност
document.getElementById('btn-confirm-booking').onclick = async () => {
    const name = document.getElementById('user-name').value.trim();
    if (!name) return alert('Въведете име!');
    
    const newNameNormalized = cyrillicToLatin(name);

    // ПРОВЕРКА: Има ли вече заето бюро от този човек на тази дата (БГ/ЕН)
    const hasAlreadyBooked = Object.values(activeReservations).some(occupant => {
        return cyrillicToLatin(occupant) === newNameNormalized;
    });

    if (hasAlreadyBooked) {
        alert(`Грешка: Името "${name}" вече има запазено бюро за тази дата!\n\nАко това е ваш съименник (друг колега със същото име), моля въведете и фамилия (напр. ${name} Иванов / ${name} I.), за да се разграничите.`);
        document.getElementById('booking-modal').style.display = 'none';
        return;
    }
    
    currentUserName = name;
    localStorage.setItem('current_user_name', name);
    
    await supabaseClient.from('office_reservations').insert([{ date: selectedDateStr, desk_id: selectedDeskId, user_name: name }]);
    document.getElementById('booking-modal').style.display = 'none';
    fetchCloudData();
};

// Потвърждаване на резервация за среща
document.getElementById('btn-confirm-meeting').onclick = async () => {
    const title = document.getElementById('meeting-title').value.trim();
    const attendees = document.getElementById('meeting-attendees').value.trim();
    if (!title || !attendees) return alert('Попълнете полетата!');
    
    await supabaseClient.from('office_meetings').insert([{ date: selectedDateStr, slot_index: selectedSlotIndex, title, attendees }]);
    document.getElementById('meeting-modal').style.display = 'none';
    fetchCloudData();
};

document.getElementById('btn-close-modal').onclick = () => document.getElementById('booking-modal').style.display = 'none';
document.getElementById('btn-close-meeting-modal').onclick = () => document.getElementById('meeting-modal').style.display = 'none';

// Превключване на табовете
const tabMain = document.getElementById('tab-main'); const tabSmall = document.getElementById('tab-small');
const roomMainContainer = document.getElementById('room-main-container'); const roomSmallContainer = document.getElementById('room-small-container');

if (tabMain && tabSmall) {
    tabMain.onclick = () => {
        tabMain.className = "flex-1 text-center py-2.5 rounded-lg font-bold text-sm bg-indigo-600 text-white shadow-lg cursor-pointer";
        tabSmall.className = "flex-1 text-center py-2.5 rounded-lg font-bold text-sm text-slate-400 hover:text-slate-200 cursor-pointer";
        roomMainContainer.className = "block"; roomSmallContainer.className = "hidden";
    };
    tabSmall.onclick = () => {
        tabSmall.className = "flex-1 text-center py-2.5 rounded-lg font-bold text-sm bg-indigo-600 text-white shadow-lg cursor-pointer";
        tabMain.className = "flex-1 text-center py-2.5 rounded-lg font-bold text-sm text-slate-400 hover:text-slate-200 cursor-pointer";
        roomSmallContainer.className = "block"; roomMainContainer.className = "hidden";
    };
}
