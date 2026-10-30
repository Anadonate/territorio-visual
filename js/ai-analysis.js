(() => {
'use strict';
const endpoint = (window.TERRITORIO_AI_ENDPOINT || '').trim();
const button = document.querySelector('[data-analyze]');
const form = document.querySelector('[data-brief]');
const status = document.querySelector('[data-global-status]');
const results = document.querySelector('[data-results]');
if (!button || !form || !endpoint) return;

button.innerHTML = 'Generar diagnóstico estratégico con IA <span>↗</span>';
const $ = (selector) => document.querySelector(selector);
const hexPattern = /^#[0-9a-f]{6}$/i;
const getCompetitors = () => [...document.querySelectorAll('[data-entry="competitor"]')].map((entry, index) => {
  const name = entry.querySelector('[data-name]').value.trim() || 'Marca ' + (index + 1);
  const colors = [];
  ['a', 'b'].forEach((slot) => {
    const root = entry.querySelector('[data-color-slot="' + slot + '"]');
    const hex = root.querySelector('[data-hex]').value.trim();
    if (root.querySelector('[data-include]').checked && hexPattern.test(hex)) colors.push({ hex: hex.toUpperCase(), slot });
  });
  const bg = entry.querySelector('[data-background-control]');
  if (bg && !bg.hidden && bg.querySelector('[data-background-include]').checked) {
    const hex = bg.querySelector('[data-background-hex]').value.trim();
    if (hexPattern.test(hex)) colors.push({ hex: hex.toUpperCase(), slot: 'fondo' });
  }
  return { name, colors };
}).filter((brand) => brand.colors.length);

function el(tag, className, content) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (content !== undefined) node.textContent = content;
  return node;
}
function listInto(parent, items) {
  if (!items || !items.length) return;
  const list = el('ul', 'ai-result-list');
  items.forEach((item) => list.append(el('li', '', item)));
  parent.append(list);
}
function render(analysis, briefing, competitorCount, colorCount) {
  $('[data-result-brand]').textContent = briefing.brandName;
  $('[data-result-intro]').textContent = 'Diagnóstico estratégico asistido por IA · ' + briefing.sector + ' · basado en ' + competitorCount + ' marcas y ' + colorCount + ' tonos validados.';
  $('[data-observation]').textContent = analysis.competitive_diagnosis.observations.join(' ') || 'No se han identificado observaciones suficientes.';
  $('[data-interpretation]').textContent = analysis.competitive_diagnosis.interpretation;
  const summary = $('.analysis-summary');
  let executive = $('[data-ai-summary]');
  if (!executive) {
    executive = el('div', 'ai-executive-summary');
    executive.setAttribute('data-ai-summary', '');
    const label = el('p', 'eyebrow', 'SÍNTESIS DEL CONSULTOR');
    const heading = el('h3', '', 'Lectura estratégica');
    const paragraph = el('p', '');
    paragraph.setAttribute('data-ai-summary-text', '');
    executive.append(label, heading, paragraph);
    summary.parentNode.insertBefore(executive, summary);
  }
  $('[data-ai-summary-text]').textContent = analysis.executive_summary;

  const host = $('[data-routes]');
  host.replaceChildren();
  analysis.territories.forEach((territory, index) => {
    const card = el('article', 'territory-card');
    card.append(el('p', 'route-tag', 'VÍA 0' + (index + 1) + ' · TERRITORIO DE EXPLORACIÓN'));
    card.append(el('h3', '', territory.name));
    const field = el('div', 'territory-field');
    const marker = el('span', 'territory-field-marker');
    marker.style.setProperty('--field-hue', String([205, 32, 285][index]));
    field.append(marker, el('span', '', 'DIRECCIÓN DE EXPLORACIÓN · NO ES UNA PALETA'));
    card.append(field);
    card.append(el('p', '', territory.concept));
    const direction = el('div', 'territory-detail');
    direction.append(el('h4', '', 'Dirección cromática'), el('p', '', territory.chromatic_direction));
    card.append(direction);
    const relationship = el('div', 'territory-detail');
    relationship.append(el('h4', '', 'Relación con la competencia'), el('p', '', territory.relationship_to_sample));
    card.append(relationship);
    const fit = el('div', 'territory-detail');
    fit.append(el('h4', '', 'Ajuste al briefing'), el('p', '', territory.briefing_fit));
    card.append(fit);
    const opportunities = el('div', 'territory-detail');
    opportunities.append(el('h4', '', 'Oportunidades'));
    listInto(opportunities, territory.opportunities);
    card.append(opportunities);
    const risks = el('div', 'territory-watch');
    risks.append(el('strong', '', 'Puntos críticos'), document.createTextNode(' ' + territory.risks.join(' ')));
    card.append(risks);
    const tests = el('div', 'territory-detail');
    tests.append(el('h4', '', 'Qué conviene validar'));
    listInto(tests, territory.validation_tests);
    card.append(tests);
    host.append(card);
  });
  $('[data-recommendation-title]').textContent = analysis.recommendation.preferred_territory;
  $('[data-recommendation]').textContent = analysis.recommendation.reasoning + ' Alternativa que conviene conservar: ' + analysis.recommendation.alternative_to_preserve + ' Pruebas: ' + analysis.recommendation.validation_tests.join(' ');
  let limitations = $('.limitations');
  const warnings = [...analysis.competitive_diagnosis.limitations, ...analysis.competitive_diagnosis.potential_conventions.map((x) => 'Convención posible: ' + x)];
  limitations.textContent = 'Alcance y límites: el análisis se basa únicamente en el briefing y en las referencias aportadas. ' + warnings.join(' ');
  let fitPanel = $('[data-ai-fit]');
  if (!fitPanel) {
    fitPanel = el('div', 'ai-fit-panel');
    fitPanel.setAttribute('data-ai-fit', '');
    const heading = el('h3', '', 'Ajuste estratégico con la marca');
    const copy = el('p', '');
    copy.setAttribute('data-ai-fit-copy', '');
    const tensions = el('div', '');
    tensions.setAttribute('data-ai-tensions', '');
    fitPanel.append(heading, copy, tensions);
    summary.parentNode.insertBefore(fitPanel, summary.nextSibling);
  }
  $('[data-ai-fit-copy]').textContent = analysis.brand_fit.alignment;
  const tensionHost = $('[data-ai-tensions]');
  tensionHost.replaceChildren();
  listInto(tensionHost, analysis.brand_fit.tensions);
  const implications = el('div', 'ai-implications');
  implications.append(el('h4', '', 'Implicaciones cromáticas'));
  listInto(implications, analysis.brand_fit.chromatic_implications);
  fitPanel.append(implications);
  results.hidden = false;
  status.textContent = 'Diagnóstico estratégico generado con IA. Revisa las hipótesis y valida las propuestas antes de tomar decisiones.';
  results.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

button.addEventListener('click', async (event) => {
  event.preventDefault();
  event.stopImmediatePropagation();
  if (!form.reportValidity()) {
    form.reportValidity();
    $('#briefing').scrollIntoView({ behavior: 'smooth' });
    return;
  }
  const competitors = getCompetitors();
  if (competitors.length < 2) {
    status.textContent = 'Añade y valida al menos dos marcas de referencia.';
    $('#competencia').scrollIntoView({ behavior: 'smooth' });
    return;
  }
  const briefing = Object.fromEntries(new FormData(form).entries());
  const colorCount = competitors.reduce((sum, brand) => sum + brand.colors.length, 0);
  button.disabled = true;
  button.textContent = 'Preparando diagnóstico estratégico…';
  status.textContent = 'Enviando el briefing y los colores validados para su interpretación. Las imágenes originales no se envían.';
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        briefing,
        competitors,
        sampleContext: { competitorCount: competitors.length, validatedColorCount: colorCount }
      })
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || 'No se ha podido generar el análisis.');
    if (!payload.analysis || !Array.isArray(payload.analysis.territories) || payload.analysis.territories.length !== 3) {
      throw new Error('La respuesta recibida no tiene la estructura esperada.');
    }
    render(payload.analysis, briefing, competitors.length, colorCount);
  } catch (error) {
    status.textContent = 'No se ha podido generar el análisis con IA: ' + error.message + ' Comprueba la conexión e inténtalo de nuevo.';
    status.classList.add('is-error');
  } finally {
    button.disabled = false;
    button.innerHTML = 'Generar diagnóstico estratégico con IA <span>↗</span>';
  }
}, true);
})();
