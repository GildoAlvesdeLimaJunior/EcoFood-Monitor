/* =============================================
   EcoFood Monitor — Monitoramento
   Gráficos de linha para temperatura e umidade
   das zonas de armazenamento
   ============================================= */

let chartMonitor = null;
let monitorInterval = null;

// =============================================
// Popular select de zonas
// =============================================

function populateZonaSelect() {
  const select = document.getElementById('monitor-zona-select');
  if (!select) return;

  const zonas = getZonas();
  const currentValue = select.value;

  select.innerHTML = '<option value="">— Selecione uma zona —</option>';
  zonas.forEach(z => {
    const cat = CATEGORIAS.find(c => c.id === z.categoria);
    const opt = document.createElement('option');
    opt.value = z.id;
    opt.textContent = `${cat?.icone || '📦'} ${z.nome}`;
    select.appendChild(opt);
  });

  if (currentValue) select.value = currentValue;
}

// =============================================
// Calcular médias do histórico
// =============================================

function calcularMedias(zona) {
  const hist = zona.historico || [];
  if (hist.length === 0) return { tempMedia: null, umidMedia: null };

  const tempTotal = hist.reduce((s, h) => s + h.temperatura, 0);
  const umidTotal = hist.reduce((s, h) => s + h.umidade, 0);
  return {
    tempMedia: Math.round((tempTotal / hist.length) * 10) / 10,
    umidMedia: Math.round(umidTotal / hist.length),
  };
}

// =============================================
// Atualizar stats cards
// =============================================

function updateStats(zona) {
  const el = id => document.getElementById(id);
  if (!zona) {
    el('monitor-temp-media').textContent = '—';
    el('monitor-umid-media').textContent = '—';
    el('monitor-saude').textContent = '—';
    el('monitor-produtos').textContent = '—';
    if (el('monitor-saude')) el('monitor-saude').className = 'text-2xl font-extrabold text-gray-400';
    return;
  }

  const medias = calcularMedias(zona);
  const t = zona.leituraAtual?.temperatura;
  const u = zona.leituraAtual?.umidade;
  const produtos = getProductsByZona(zona.id);

  // Temperatura média (mostra a atual + média do histórico)
  const tempDisplay = t != null
    ? `${t}°C`
    : (medias.tempMedia != null ? `${medias.tempMedia}°C` : '—');
  el('monitor-temp-media').textContent = tempDisplay;

  // Umidade média
  const umidDisplay = u != null
    ? `${u}%`
    : (medias.umidMedia != null ? `${medias.umidMedia}%` : '—');
  el('monitor-umid-media').textContent = umidDisplay;

  // Saúde do ambiente
  const avaliacao = avaliarZona(zona);
  const tempDiff = Math.abs(t - zona.tempIdeal);
  const umidDiff = Math.abs(u - zona.umidIdeal);
  const tempRange = Math.max(1, zona.tempMax - zona.tempMin);
  const umidRange = Math.max(1, zona.umidMax - zona.umidMin);
  const tempHealth = Math.max(0, 100 - (tempDiff / tempRange) * 100);
  const umidHealth = Math.max(0, 100 - (umidDiff / umidRange) * 100);
  const health = Math.round((tempHealth + umidHealth) / 2);

  const saudeEl = el('monitor-saude');
  saudeEl.textContent = health != null ? `${health}%` : '—';
  if (health >= 80) saudeEl.className = 'text-2xl font-extrabold text-emerald-500';
  else if (health >= 50) saudeEl.className = 'text-2xl font-extrabold text-yellow-500';
  else saudeEl.className = 'text-2xl font-extrabold text-red-500';

  el('monitor-produtos').textContent = produtos.length;
}

// =============================================
// Inicializar gráfico
// =============================================

function initMonitorChart(zona, metrica) {
  const ctx = document.getElementById('chart-monitoramento');
  const empty = document.getElementById('monitor-empty');
  if (!ctx) return;

  if (!zona || !zona.historico || zona.historico.length === 0) {
    if (empty) empty.classList.remove('hidden');
    if (chartMonitor) { chartMonitor.destroy(); chartMonitor = null; }
    return;
  }

  if (empty) empty.classList.add('hidden');

  const hist = zona.historico;
  const labels = hist.map((_, i) => {
    const seconds = (hist.length - i) * 3;
    if (seconds < 60) return `-${seconds}s`;
    return `-${Math.floor(seconds / 60)}min`;
  }).reverse();

  // Adicionar o atual
  labels.push('Agora');
  const tempData = hist.map(h => h.temperatura);
  tempData.push(zona.leituraAtual.temperatura);
  const umidData = hist.map(h => h.umidade);
  umidData.push(zona.leituraAtual.umidade);

  const datasets = [];

  if (metrica === 'temperatura' || metrica === 'ambas') {
    const tempColor = '#059669';
    datasets.push({
      label: 'Temperatura (°C)',
      data: tempData,
      borderColor: tempColor,
      backgroundColor: tempColor + '15',
      fill: true,
      tension: 0.4,
      pointRadius: 2,
      pointHitRadius: 8,
      borderWidth: 2,
    });
  }

  if (metrica === 'umidade' || metrica === 'ambas') {
    const umidColor = '#0ea5e9';
    datasets.push({
      label: 'Umidade (%)',
      data: umidData,
      borderColor: umidColor,
      backgroundColor: umidColor + '15',
      fill: true,
      tension: 0.4,
      pointRadius: 2,
      pointHitRadius: 8,
      borderWidth: 2,
      yAxisID: 'y1',
    });
  }

  const isTempOnly = metrica === 'temperatura';
  const isUmidOnly = metrica === 'umidade';

  if (chartMonitor) chartMonitor.destroy();

  chartMonitor = new Chart(ctx, {
    type: 'line',
    data: { labels, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false,
      },
      plugins: {
        legend: {
          position: 'top',
          labels: { usePointStyle: true, padding: 16, font: { size: 11 } }
        },
        tooltip: {
          backgroundColor: 'rgba(15, 23, 42, 0.9)',
          titleFont: { size: 12 },
          bodyFont: { size: 12 },
          padding: 12,
          cornerRadius: 8,
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { font: { size: 10 }, maxTicksLimit: 10 },
        },
        y: isTempOnly ? {
          beginAtZero: false,
          grid: { color: 'rgba(0,0,0,0.04)' },
          ticks: { font: { size: 10 }, callback: v => v + '°C' },
          title: { display: true, text: 'Temperatura (°C)', font: { size: 11 } },
        } : isUmidOnly ? {
          beginAtZero: true,
          max: 100,
          grid: { color: 'rgba(0,0,0,0.04)' },
          ticks: { font: { size: 10 }, callback: v => v + '%' },
          title: { display: true, text: 'Umidade (%)', font: { size: 11 } },
        } : {
          beginAtZero: false,
          position: 'left',
          grid: { color: 'rgba(0,0,0,0.04)' },
          ticks: { font: { size: 10 }, callback: v => v + '°C' },
          title: { display: true, text: 'Temperatura (°C)', font: { size: 11 } },
        },
        y1: !isTempOnly && !isUmidOnly ? {
          beginAtZero: true,
          max: 100,
          position: 'right',
          grid: { display: false },
          ticks: { font: { size: 10 }, callback: v => v + '%' },
          title: { display: true, text: 'Umidade (%)', font: { size: 11 } },
        } : undefined,
      }
    }
  });
}

// =============================================
// Renderizar tabela comparativa
// =============================================

function renderComparativo() {
  const tbody = document.getElementById('monitor-comparativo-tbody');
  if (!tbody) return;

  const zonas = getZonas();

  if (zonas.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="text-center py-8 text-sm text-gray-400">Nenhuma zona cadastrada.</td></tr>`;
    return;
  }

  tbody.innerHTML = zonas.map(z => {
    const cat = CATEGORIAS.find(c => c.id === z.categoria);
    const avaliacao = avaliarZona(z);
    const t = z.leituraAtual?.temperatura;
    const u = z.leituraAtual?.umidade;
    const produtos = getProductsByZona(z.id);

    return `
      <tr class="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors">
        <td class="px-3 py-3">
          <span class="inline-flex items-center gap-1.5 text-sm font-medium text-gray-900 dark:text-white">
            <span>${cat?.icone || '📦'}</span> ${z.nome}
          </span>
        </td>
        <td class="px-3 py-3 text-sm ${avaliacao.status === 'crítico' ? 'text-red-500 font-medium' : avaliacao.status === 'alerta' ? 'text-yellow-500 font-medium' : 'text-gray-600 dark:text-gray-300'}">
          ${t != null ? t + '°C' : '—'}
        </td>
        <td class="px-3 py-3 text-sm text-gray-500">${z.tempMin}°C – ${z.tempMax}°C</td>
        <td class="px-3 py-3 text-sm ${avaliacao.status === 'crítico' ? 'text-red-500 font-medium' : avaliacao.status === 'alerta' ? 'text-yellow-500 font-medium' : 'text-gray-600 dark:text-gray-300'}">
          ${u != null ? u + '%' : '—'}
        </td>
        <td class="px-3 py-3 text-sm text-gray-500">${z.umidMin}% – ${z.umidMax}%</td>
        <td class="px-3 py-3"><span class="badge ${avaliacao.color}">${avaliacao.label}</span></td>
        <td class="px-3 py-3 text-sm text-gray-600 dark:text-gray-300">${produtos.length}</td>
      </tr>
    `;
  }).join('');
}

// =============================================
// Atualizar gráfico e stats
// =============================================

const chartTitle = document.getElementById('monitor-chart-title');

function updateMonitor() {
  const zonaId = document.getElementById('monitor-zona-select')?.value;
  const metrica = document.getElementById('monitor-metrica-select')?.value || 'temperatura';

  const zona = zonaId ? getZonaById(zonaId) : null;

  if (chartTitle) {
    if (zona) {
      const cat = CATEGORIAS.find(c => c.id === zona.categoria);
      chartTitle.textContent = `${cat?.icone || '📦'} ${zona.nome} — Histórico de Leituras (últimos ${Math.min(60, (zona.historico?.length || 0))} registros)`;
    } else {
      chartTitle.textContent = 'Histórico de Leituras';
    }
  }

  initMonitorChart(zona, metrica);
  updateStats(zona);
}

// =============================================
// Auto-refresh a cada 3s (acompanhar simulação)
// =============================================

function startMonitoramento() {
  if (monitorInterval) clearInterval(monitorInterval);

  // Atualizar a cada 3s
  monitorInterval = setInterval(() => {
    populateZonaSelect();
    renderComparativo();
    updateMonitor();
  }, 3000);
}

// =============================================
// Event listeners
// =============================================

document.addEventListener('DOMContentLoaded', () => {
  populateZonaSelect();
  renderComparativo();
  startMonitoramento();

  document.getElementById('monitor-zona-select')?.addEventListener('change', updateMonitor);
  document.getElementById('monitor-metrica-select')?.addEventListener('change', updateMonitor);
});
