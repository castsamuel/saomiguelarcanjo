const START_MONTH = 7, START_DAY = 15, END_MONTH = 8, END_DAY = 29;
const STORAGE_KEY = 'quaresma-sao-miguel-v1';

const quotes = [
  'Quem como Deus?',
  'São Miguel Arcanjo, defendei-nos no combate.',
  'Permaneça fiel até o fim.',
  'Cada pequeno sacrifício é uma oferta de amor.',
  'A perseverança fortalece a alma.'
];

let state = JSON.parse(
  localStorage.getItem(STORAGE_KEY) || '{"completed":[],"theme":"dark"}'
);

const $ = (id) => document.getElementById(id);
const atMidnight = (date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate());

const dateKey = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

const formatDate = (date) =>
  new Intl.DateTimeFormat('pt-BR', {
    day: 'numeric',
    month: 'short'
  }).format(date).replace('.', '');

function seasonFor(now) {
  return {
    start: new Date(now.getFullYear(), START_MONTH, START_DAY),
    end: new Date(now.getFullYear(), END_MONTH, END_DAY)
  };
}

function calendarDates(season) {
  const dates = [];

  for (
    let date = new Date(season.start);
    date <= season.end;
    date.setDate(date.getDate() + 1)
  ) {
    dates.push(new Date(date));
  }

  return dates;
}

function prayerDays(season) {
  const dates = calendarDates(season);
  const ordinaryDays = dates.filter((date) => date.getDay() !== 0);

  // Quando há apenas 39 dias úteis, o último domingo completa o Dia 40.
  if (ordinaryDays.length >= 40) return ordinaryDays;

  const finalSunday = dates.filter((date) => date.getDay() === 0).at(-1);

  return [...ordinaryDays, finalSunday].sort((a, b) => a - b);
}

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function inCurrentSeason(key, season) {
  return key >= dateKey(season.start) && key <= dateKey(season.end);
}

function journey() {
  const now = atMidnight(new Date());
  const season = seasonFor(now);
  const days = prayerDays(season);

  if (now < season.start) {
    return {
      phase: 'before',
      daysUntil: Math.round((season.start - now) / 86400000),
      season,
      days
    };
  }

  if (now > season.end) {
    return { phase: 'after', season, days };
  }

  return { phase: 'during', season, days };
}

function streak(season) {
  const today = atMidnight(new Date());
  const pastDays = prayerDays(season).filter((date) => date <= today);
  let count = 0;

  for (let i = pastDays.length - 1; i >= 0; i--) {
    if (state.completed.includes(dateKey(pastDays[i]))) count++;
    else break;
  }

  return count;
}

function renderCalendar(journeyData, now) {
  const calendar = $('calendar');
  const todayKey = dateKey(now);

  calendar.innerHTML = '';
  let dayNumber = 0;

  calendarDates(journeyData.season).forEach((date) => {
    const key = dateKey(date);
    const sunday = date.getDay() === 0;
    const countedSunday =
      sunday && journeyData.days.some((item) => dateKey(item) === key);

    const completed = state.completed.includes(key);
    const today = key === todayKey;
    const future = date > atMidnight(now);

    if (!sunday || countedSunday) dayNumber++;

    let label;

    if (sunday && !countedSunday) label = '✠ Domingo — oração';
    else if (countedSunday) label = '✠ Domingo contado';
    else if (completed) label = '✓ Concluído';
    else if (today) label = '📍 Hoje';
    else if (future) label = '⏳ Futuro';
    else label = '○ Não marcado';

    const card = document.createElement('article');

    card.className = `day-card ${sunday ? 'sunday' : ''} ${
      countedSunday ? 'counted-sunday' : ''
    } ${completed ? 'completed' : ''} ${today ? 'today' : ''} ${
      future ? 'future' : ''
    }`;

    card.id = today ? 'dia-atual' : '';

    card.innerHTML = `
      <span class="day-number">${sunday && !countedSunday ? '✠' : dayNumber}</span>
      <span class="day-date">${formatDate(date)}</span>
      <span class="day-status">${label}</span>
    `;

    calendar.append(card);
  });
}

function render() {
  const now = new Date();
  const today = atMidnight(now);
  const todayKey = dateKey(now);
  const j = journey();
  const total = j.days.length;

  const done = state.completed.filter((key) =>
    inCurrentSeason(key, j.season)
  );

  const pastPrayerDays = j.days.filter((date) => date <= today);
  const isSunday = now.getDay() === 0;
  const isCountedSunday =
    isSunday && j.days.some((date) => dateKey(date) === todayKey);

  $('today-date').textContent = new Intl.DateTimeFormat('pt-BR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(now);

  $('today-weekday').textContent = new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long'
  }).format(now);

  $('daily-quote').textContent =
    quotes[
      Math.floor((today - new Date(now.getFullYear(), 0, 0)) / 86400000) %
        quotes.length
    ];

  let percent = 0;
  let remaining = total;
  let title = 'Caminhada';

  if (j.phase === 'before') {
    $('journey-state').textContent =
      `Faltam ${j.daysUntil} dia${j.daysUntil === 1 ? '' : 's'} para começar`;
  } else if (j.phase === 'after') {
    $('journey-state').textContent =
      'A Quaresma foi concluída. Deo gratias!';
    title = 'Jornada concluída';
    percent = 100;
    remaining = 0;
  } else {
    const completedSchedule = pastPrayerDays.length;
    const dayNumber =
      j.days.findIndex((date) => dateKey(date) === todayKey) + 1;

    percent = Math.round((completedSchedule / total) * 100);
    remaining = total - completedSchedule;

    $('journey-state').textContent =
      isSunday && !isCountedSunday
        ? 'Domingo da Quaresma — a oração continua.'
        : `Dia ${dayNumber} da Quaresma${isCountedSunday ? ' — domingo contado.' : ''}`;
  }

  $('progress-title').textContent = title;
  $('progress-percent').textContent = `${percent}%`;
  $('progress-bar').style.width = `${percent}%`;
  $('progress-wrap')
    .querySelector('[role=progressbar]')
    .setAttribute('aria-valuenow', percent);

  $('days-completed').textContent = done.length;
  $('days-remaining').textContent = remaining;
  $('stat-prayers').textContent = done.length;
  $('stat-penance').textContent = done.length;
  $('stat-remaining').textContent = remaining;
  $('stat-streak').textContent = streak(j.season);

  const todayDone = state.completed.includes(todayKey);

  $('complete-button').textContent =
    todayDone ? '✓ Dia concluído' : '✓ Cumpri hoje';

  $('complete-button').disabled =
    todayDone || (isSunday && !isCountedSunday);

  $('complete-button').style.opacity =
    todayDone || (isSunday && !isCountedSunday) ? '.62' : '1';

  $('sunday-note').hidden = !isSunday;

  $('penance-message').textContent = isSunday
    ? 'Hoje é domingo: acolha este dia com alegria, sem esquecer da oração.'
    : 'Hoje, lembre-se de oferecer este pequeno sacrifício com amor.';

  renderCalendar(j, now);
}

function completeToday() {
  const j = journey();
  const key = dateKey(new Date());
  const countedSunday = j.days.some((date) => dateKey(date) === key);

  if (j.phase !== 'during') {
    alert('A marcação diária fica disponível durante a Quaresma.');
    return;
  }

  if (new Date().getDay() === 0 && !countedSunday) {
    alert('Hoje é domingo. A penitência não entra na contagem, mas a oração continua.');
    return;
  }

  if (!state.completed.includes(key)) {
    state.completed.push(key);
    save();
    render();
  }
}

function tick() {
  $('clock').textContent = new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date());
}

$('complete-button').addEventListener('click', completeToday);

$('today-button').addEventListener('click', () => {
  document.getElementById('dia-atual')?.scrollIntoView({
    behavior: 'smooth',
    block: 'center'
  });
});

$('theme-toggle').addEventListener('click', () => {
  state.theme = state.theme === 'light' ? 'dark' : 'light';
  save();
  applyTheme();
});

$('start-journey').addEventListener('click', () => {
  $('welcome').hidden = true;
  localStorage.setItem('quaresma-welcome', 'seen');
});

function applyTheme() {
  document.body.classList.toggle('light', state.theme === 'light');
  $('theme-toggle').textContent = state.theme === 'light' ? '☾' : '☼';
}

applyTheme();

if (!localStorage.getItem('quaresma-welcome')) {
  $('welcome').hidden = false;
}

tick();
setInterval(tick, 1000);
render();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('service-worker.js');
  });
}
