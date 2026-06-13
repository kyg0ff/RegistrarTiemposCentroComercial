/* ===== TIPOS CONFIG ===== */
const TIPOS = {
  llegada_salida: {
    label: 'Llegada y Salida',
    desc: 'Registra la llegada y salida general de vehiculos del estacionamiento',
    btnInicio: 'Llega vehiculo',
    btnFin: 'Sale vehiculo'
  },
  es_z1: {
    label: 'ES Z1',
    desc: 'Entrada y salida de la zona 1 (exterior)',
    btnInicio: 'Entra a la zona 1',
    btnFin: 'Sale de la zona 1'
  },
  es_z2: {
    label: 'ES Z2',
    desc: 'Entrada y salida de la zona 2 (segundo nivel)',
    btnInicio: 'Entra a la zona 2',
    btnFin: 'Sale de la zona 2'
  },
  estacionar_z1: {
    label: 'Estacionar Z1',
    desc: 'Estacionamiento en zona 1 (exterior)',
    btnInicio: 'Vehiculo estacionado',
    btnFin: 'Vehiculo en marcha zona 1'
  },
  estacionar_z2: {
    label: 'Estacionar Z2',
    desc: 'Estacionamiento en zona 2 (segundo nivel)',
    btnInicio: 'Vehiculo estacionado',
    btnFin: 'Vehiculo en marcha zona 2'
  }
};

/* ===== STATE ===== */
let selectedTipo = null;
let registros = [];
let idCounter = 1;

/* ===== UTILS ===== */
function pad(n) {
  return String(n).padStart(2, '0');
}

function pad3(n) {
  return String(n).padStart(3, '0');
}

function formatElapsed(ms) {
  if (ms < 0) ms = 0;
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const millis = ms % 1000;
  return `${pad(h)}:${pad(m)}:${pad(s)}.${pad3(millis)}`;
}

/* ===== GLOBAL TIMER ===== */
let timerRunning = false;
let timerStartTime = null;
let timerElapsedBefore = 0;
let globalInterval = null;

function startGlobalTimer() {
  if (timerRunning) return;
  timerRunning = true;
  timerStartTime = Date.now();
  const btn = document.getElementById('btn-timer');
  btn.textContent = 'Detener';
  btn.classList.add('running');
  globalInterval = setInterval(() => {
    const total = timerElapsedBefore + (Date.now() - timerStartTime);
    document.getElementById('global-timer').textContent = formatElapsed(total);
  }, 50);
}

function stopGlobalTimer() {
  if (!timerRunning) return;
  timerRunning = false;
  timerElapsedBefore += Date.now() - timerStartTime;
  timerStartTime = null;
  clearInterval(globalInterval);
  globalInterval = null;
  const btn = document.getElementById('btn-timer');
  btn.textContent = 'Iniciar';
  btn.classList.remove('running');
}

function resetGlobalTimer() {
  stopGlobalTimer();
  timerElapsedBefore = 0;
  document.getElementById('global-timer').textContent = '00:00:00';
  document.getElementById('btn-timer').textContent = 'Iniciar';
}

function toggleTimer() {
  if (timerRunning) {
    stopGlobalTimer();
  } else {
    startGlobalTimer();
  }
}

/* ===== REGISTRO DE EVENTOS ===== */
function getElapsedMs() {
  if (timerRunning) {
    return timerElapsedBefore + (Date.now() - timerStartTime);
  }
  return timerElapsedBefore;
}

function registrarEvento(tipo, eventoLabel) {
  const elapsed = getElapsedMs();
  const r = {
    id: idCounter++,
    tipo: tipo,
    evento: eventoLabel,
    hora: formatElapsed(elapsed),
    elapsedMs: elapsed
  };
  registros.unshift(r);
  renderRegistros();
  showToast(`${eventoLabel} - ${r.hora}`);
}

/* ===== RENDER ===== */
function renderRegistros() {
  const container = document.getElementById('registros-lista');

  if (registros.length === 0) {
    container.innerHTML = '<p class="empty-msg">No hay registros.</p>';
    return;
  }

  container.innerHTML = registros.map(r => {
    const tipoLabel = TIPOS[r.tipo] ? TIPOS[r.tipo].label : r.tipo;
    return `
      <div class="registro-item">
        <span class="ri-hora">${r.hora}</span>
        <span class="ri-tipo">${tipoLabel}</span>
        <span class="ri-evento">${r.evento}</span>
        <span class="ri-num">#${r.id}</span>
      </div>
    `;
  }).join('');
}

function renderPanelAccion() {
  const panel = document.getElementById('panel-accion');

  if (!selectedTipo) {
    panel.innerHTML = '<p class="empty-msg">Selecciona un tipo de medicion arriba.</p>';
    return;
  }

  const info = TIPOS[selectedTipo];
  panel.innerHTML = `
    <div class="pa-header">${info.label}</div>
    <p class="pa-desc">${info.desc}</p>
    <div class="pa-buttons">
      <button class="btn btn-marca-inicio btn-lg btn-marca" data-tipo="${selectedTipo}" data-evento="${info.btnInicio}">
        ${info.btnInicio}
      </button>
      <button class="btn btn-marca-fin btn-lg btn-marca" data-tipo="${selectedTipo}" data-evento="${info.btnFin}">
        ${info.btnFin}
      </button>
    </div>
  `;

  panel.querySelectorAll('.btn-marca').forEach(btn => {
    btn.addEventListener('click', () => {
      registrarEvento(btn.dataset.tipo, btn.dataset.evento);
    });
  });
}

function selectTipo(tipo) {
  selectedTipo = tipo;
  document.querySelectorAll('.tm-btn').forEach(btn => {
    btn.classList.toggle('selected', btn.dataset.tipo === tipo);
  });
  renderPanelAccion();
}

/* ===== CSV EXPORT ===== */
function escapeCSV(val) {
  if (val === null || val === undefined) return '';
  const s = String(val);
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

function exportCSV() {
  if (registros.length === 0) {
    showToast('No hay datos para exportar');
    return;
  }

  const headers = ['ID', 'Tipo', 'Evento', 'Hora'];
  let csv = '\uFEFF';
  csv += headers.map(escapeCSV).join(',') + '\n';

  const sorted = [...registros].reverse();
  sorted.forEach(r => {
    const tipoLabel = TIPOS[r.tipo] ? TIPOS[r.tipo].label : r.tipo;
    csv += [r.id, tipoLabel, r.evento, r.hora].map(escapeCSV).join(',') + '\n';
  });

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'registros_cronometro.csv';
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast('CSV exportado');
}

/* ===== LIMPIAR TODO ===== */
function limpiarTodo() {
  if (registros.length === 0) {
    showToast('No hay datos que eliminar');
    return;
  }
  if (!confirm('Eliminar todos los registros? Esta accion no se puede deshacer.')) return;
  registros = [];
  idCounter = 1;
  resetGlobalTimer();
  renderRegistros();
  showToast('Todos los registros eliminados');
}

/* ===== TOAST ===== */
let toastTimer = null;

function showToast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    el.classList.add('hidden');
  }, 3000);
}

/* ===== EVENTS ===== */
function setupEventListeners() {
  document.querySelectorAll('.tm-btn').forEach(btn => {
    btn.addEventListener('click', () => selectTipo(btn.dataset.tipo));
  });

  document.getElementById('export-csv').addEventListener('click', exportCSV);
  document.getElementById('btn-timer').addEventListener('click', toggleTimer);
  document.getElementById('btn-limpiar').addEventListener('click', limpiarTodo);
}

/* ===== INIT ===== */
function init() {
  renderRegistros();
  renderPanelAccion();
  setupEventListeners();
}

document.addEventListener('DOMContentLoaded', init);
