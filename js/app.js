(() => {
  const welcome = document.querySelector('[data-screen="0"]');
  const experience = document.querySelector('[data-experience]');
  const screens = [...document.querySelectorAll('.work-screen')];
  const stepLinks = [...document.querySelectorAll('[data-go-step]')];
  const counter = document.querySelector('[data-counter]');
  const progress = document.querySelector('[data-progress]');
  const progressBar = document.querySelector('[role="progressbar"]');
  const nextButton = document.querySelector('[data-next]');
  const backButton = document.querySelector('[data-back]');
  const attributeButtons = [...document.querySelectorAll('[data-attribute]')];
  const attributeFeedback = document.querySelector('[data-attribute-feedback]');
  const brandCards = [...document.querySelectorAll('[data-brand-card]')];
  const brandData = new Map(brandCards.map((card) => [card.dataset.brandId, {
    name: '', url: '', image: null, previewUrl: '', fileName: '',
    includeBackground: false, background: null, colors: [], confirmed: false,
  }]));
  let currentStep = 1;

  function showWelcome() {
    welcome.hidden = false;
    experience.hidden = true;
    document.title = 'Territorio Visual · Ana Donate';
    history.replaceState(null, '', '#inicio');
    welcome.querySelector('h1').focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function showStep(step, moveFocus = true) {
    currentStep = Math.min(5, Math.max(1, step));
    welcome.hidden = true;
    experience.hidden = false;

    screens.forEach((screen) => {
      const active = Number(screen.dataset.screen) === currentStep;
      screen.hidden = !active;
      screen.classList.toggle('is-active', active);
    });

    stepLinks.forEach((link) => {
      const active = Number(link.dataset.goStep) === currentStep;
      link.classList.toggle('is-current', active);
      if (active) link.setAttribute('aria-current', 'step');
      else link.removeAttribute('aria-current');
    });

    counter.textContent = `${String(currentStep).padStart(2, '0')} / 05`;
    progress.style.width = `${currentStep * 20}%`;
    progressBar.setAttribute('aria-valuenow', String(currentStep));
    nextButton.innerHTML = currentStep === 5
      ? 'Volver al inicio <span aria-hidden="true">↗</span>'
      : 'Siguiente <span aria-hidden="true">→</span>';
    backButton.disabled = false;

    const title = screens[currentStep - 1].querySelector('h2');
    if (currentStep === 3) renderMap();
    document.title = `${title.innerText.replace(/\s+/g, ' ').trim()} · Territorio Visual`;
    history.replaceState(null, '', `#paso-${currentStep}`);
    if (moveFocus) title.focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  document.querySelector('[data-start]').addEventListener('click', () => showStep(1));
  nextButton.addEventListener('click', () => {
    if (currentStep === 5) showWelcome();
    else showStep(currentStep + 1);
  });
  backButton.addEventListener('click', () => {
    if (currentStep === 1) showWelcome();
    else showStep(currentStep - 1);
  });
  stepLinks.forEach((link) => {
    link.addEventListener('click', () => showStep(Number(link.dataset.goStep)));
  });
  const sourceOptions = [
    ['logo', 'Logotipo · extracción local'],
    ['manual', 'Manual de identidad'],
    ['official', 'Packaging / activo oficial'],
    ['estimate', 'Estimación visual manual'],
    ['campaign', 'Campaña temporal'],
  ];
  const allowedHex = /^#[\da-f]{6}$/i;

  function sourceDescription(color, brand) {
    const source = color.source;
    if (source === 'logo') return color.wasEdited
      ? `Ajuste manual a partir del logotipo ${brand.fileName} · extracción inicial OKLab · confianza: estimación visual, no oficial.`
      : `Logotipo: ${brand.fileName} · extracción y agrupación OKLab · confianza: estimación del logotipo, no color oficial verificado.`;
    if (source === 'manual') return `Fuente declarada por el usuario: ${color.sourceNote} · confianza: documento no verificado automáticamente.`;
    if (source === 'official') return `Activo oficial declarado: ${color.sourceNote} · confianza: fuente referida por el usuario, no contrastada por la aplicación.`;
    if (source === 'campaign') return `Campaña/temporada: ${color.sourceNote} · confianza: contexto declarado · fuera de la comparación estable.`;
    return `Estimación visual manual: ${color.sourceNote} · confianza: orientativa.`;
  }

  function markPaletteUnconfirmed(brand, card) {
    brand.confirmed = false;
    card.querySelector('[data-confirmation]').hidden = true;
    card.querySelector('[data-confirm-brand]').disabled = brand.colors.length === 0;
  }

  function makeColorRow(color, index, brand, card) {
    const row = document.createElement('div');
    row.className = 'palette-row';
    row.dataset.colorId = color.id;
    const pickerLabel = document.createElement('label');
    pickerLabel.className = 'visually-hidden';
    pickerLabel.textContent = `Muestra de color ${index + 1}`;
    const picker = document.createElement('input');
    picker.type = 'color'; picker.value = allowedHex.test(color.hex) ? color.hex : '#FFFFFF'; picker.setAttribute('data-color-picker', '');
    pickerLabel.append(picker);
    const hexLabel = document.createElement('label');
    hexLabel.className = 'hex-field'; hexLabel.textContent = 'HEX';
    const hex = document.createElement('input');
    hex.type = 'text'; hex.value = color.hex; hex.maxLength = 7; hex.spellcheck = false;
    hex.autocomplete = 'off'; hex.setAttribute('data-color-hex', ''); hex.setAttribute('aria-label', `Código HEX del color ${index + 1}`);
    hexLabel.append(hex);
    const sourceLabel = document.createElement('label');
    sourceLabel.className = 'palette-source-label'; sourceLabel.textContent = 'Procedencia';
    const source = document.createElement('select'); source.setAttribute('data-color-source', '');
    source.setAttribute('aria-label', `Procedencia del color ${index + 1}`);
    sourceOptions.forEach(([value, label]) => {
      const option = document.createElement('option'); option.value = value; option.textContent = label; source.append(option);
    });
    source.value = color.source;
    sourceLabel.append(source);
    const note = document.createElement('input');
    note.className = 'source-note'; note.type = 'text'; note.value = color.sourceNote || '';
    note.placeholder = color.source === 'logo' ? 'Archivo de origen' : 'Indica fuente, página o campaña';
    note.setAttribute('aria-label', `Detalle de la fuente del color ${index + 1}`);
    note.setAttribute('data-color-source-note', '');
    note.required = color.source !== 'logo';
    const remove = document.createElement('button');
    remove.className = 'remove-color'; remove.type = 'button'; remove.textContent = 'Quitar';
    remove.setAttribute('aria-label', `Eliminar el color ${color.hex}`); remove.setAttribute('data-remove-color', '');
    const details = document.createElement('p'); details.className = 'color-provenance';
    details.textContent = sourceDescription(color, brand);
    row.append(pickerLabel, hexLabel, sourceLabel, note, remove, details);
    row._color = color;
    return row;
  }

  function renderPalette(card) {
    const brand = brandData.get(card.dataset.brandId);
    const list = card.querySelector('[data-palette-list]');
    list.replaceChildren();
    if (!brand.colors.length) {
      const empty = document.createElement('p'); empty.className = 'palette-empty';
      empty.textContent = 'La paleta aparecerá aquí para que la revises.'; list.append(empty);
    }
    brand.colors.forEach((color, index) => list.append(makeColorRow(color, index, brand, card)));
    card.querySelector('[data-confirm-brand]').disabled = brand.colors.length === 0;
    markPaletteUnconfirmed(brand, card);
  }

  function updateColorRow(row, card) {
    const brand = brandData.get(card.dataset.brandId);
    const color = brand.colors.find((item) => item.id === row.dataset.colorId);
    if (!color) return;
    const selectedSource = row.querySelector('[data-color-source]').value;
    if (selectedSource !== color.source) {
      const note = row.querySelector('[data-color-source-note]');
      note.value = selectedSource === 'logo' ? brand.fileName : '';
    }
    color.hex = row.querySelector('[data-color-hex]').value.trim().toUpperCase();
    color.wasEdited = color.originalHex ? color.hex !== color.originalHex : true;
    if (color.wasEdited) color.share = null;
    color.source = selectedSource;
    color.sourceNote = row.querySelector('[data-color-source-note]').value.trim();
    row.querySelector('[data-color-picker]').value = allowedHex.test(color.hex) ? color.hex : '#FFFFFF';
    row.querySelector('[data-color-hex]').setAttribute('aria-invalid', String(!allowedHex.test(color.hex)));
    row.querySelector('[data-color-source-note]').required = color.source !== 'logo';
    row.querySelector('[data-color-source-note]').placeholder = color.source === 'logo' ? 'Archivo de origen' : 'Indica fuente, página o campaña';
    row.querySelector('.color-provenance').textContent = sourceDescription(color, brand);
    markPaletteUnconfirmed(brand, card);
  }

  function validateUrl(rawValue) {
    const candidate = /^[a-z][a-z\d+.-]*:\/\//i.test(rawValue) ? rawValue : `https://${rawValue}`;
    try {
      const parsed = new URL(candidate);
      return ['http:', 'https:'].includes(parsed.protocol) && parsed.hostname.includes('.') ? parsed.href : null;
    } catch { return null; }
  }

  brandCards.forEach((card) => {
    const brand = brandData.get(card.dataset.brandId);
    const logoInput = card.querySelector('[data-logo-file]');
    const status = card.querySelector('[data-brand-status]');
    const backgroundControl = card.querySelector('[data-background-control]');

    async function extractCurrentLogo() {
      try {
        const result = window.TerritorioColor.extractColors(brand.image, brand.includeBackground);
        brand.background = result.background;
        brand.colors = result.colors.map((item, index) => ({
          id: `${card.dataset.brandId}-logo-${Date.now()}-${index}`,
          hex: item.hex, originalHex: item.hex, wasEdited: false, source: 'logo', sourceNote: brand.fileName,
          share: item.share, method: 'Extracción local y agrupación perceptual OKLab',
        }));
        backgroundControl.hidden = !result.background;
        card.querySelector('[data-background-hex]').textContent = result.background || '';
        card.querySelector('[data-include-background]').checked = brand.includeBackground;
        status.textContent = result.background
          ? `Se detectó un fondo uniforme (${result.background}); se excluye por defecto. Revisa si forma parte del logotipo.`
          : `Extracción estimada desde ${brand.fileName}. El fondo no parece uniforme o transparente.`;
        status.dataset.state = 'success';
        renderPalette(card);
      } catch (error) {
        brand.colors = [];
        renderPalette(card);
        status.textContent = error.message;
        status.dataset.state = 'error';
      }
    }

    logoInput.addEventListener('change', async () => {
      const file = logoInput.files[0];
      if (!file) return;
      status.textContent = 'Procesando el archivo localmente…';
      status.dataset.state = 'working';
      card.setAttribute('aria-busy', 'true');
      try {
        const loaded = await window.TerritorioColor.loadLogo(file);
        if (brand.previewUrl) URL.revokeObjectURL(brand.previewUrl);
        brand.image = loaded.image;
        brand.previewUrl = loaded.previewUrl;
        brand.fileName = file.name;
        brand.includeBackground = false;
        const preview = card.querySelector('[data-logo-preview]');
        const image = document.createElement('img'); image.src = loaded.previewUrl; image.alt = `Vista previa del logotipo ${file.name}`;
        preview.replaceChildren(image); preview.classList.add('has-logo');
        await extractCurrentLogo();
      } catch (error) {
        status.textContent = error.message;
        status.dataset.state = 'error';
      } finally {
        card.removeAttribute('aria-busy');
        markPaletteUnconfirmed(brand, card);
      }
    });

    card.querySelector('[data-include-background]').addEventListener('change', (event) => {
      brand.includeBackground = event.currentTarget.checked;
      extractCurrentLogo();
    });
    card.querySelector('[data-brand-name]').addEventListener('input', (event) => {
      brand.name = event.currentTarget.value.trim();
      markPaletteUnconfirmed(brand, card);
    });
    card.querySelector('[data-add-url]').addEventListener('click', () => {
      const input = card.querySelector('input[type="url"]');
      const link = card.querySelector('[data-reference-link]');
      const normalized = validateUrl(input.value.trim());
      if (!normalized) {
        input.setAttribute('aria-invalid', 'true'); status.textContent = 'Escribe una dirección web válida, como marca.com.'; status.dataset.state = 'error'; return;
      }
      input.value = normalized; input.removeAttribute('aria-invalid'); link.href = normalized; link.hidden = false;
      brand.url = normalized; status.textContent = 'Enlace añadido. No leeremos esta web ni usaremos sus colores.'; status.dataset.state = 'success';
    });
    card.querySelector('[data-add-color]').addEventListener('click', () => {
      brand.colors.push({ id: `${card.dataset.brandId}-manual-${Date.now()}`, hex: '', source: 'estimate', sourceNote: '', share: null, method: 'Introducción manual por el usuario' });
      renderPalette(card);
      const note = card.querySelector('[data-color-source-note]:last-of-type');
      if (note) note.focus();
    });
    card.querySelector('[data-confirm-brand]').addEventListener('click', () => {
      const name = card.querySelector('[data-brand-name]');
      if (!name.value.trim()) { status.textContent = 'Añade el nombre de la marca antes de confirmar.'; status.dataset.state = 'error'; name.focus(); return; }
      const rows = [...card.querySelectorAll('.palette-row')];
      const invalid = rows.find((row) => !allowedHex.test(row.querySelector('[data-color-hex]').value.trim())
        || (row.querySelector('[data-color-source]').value !== 'logo' && !row.querySelector('[data-color-source-note]').value.trim()));
      if (invalid) {
        status.textContent = 'Revisa los códigos HEX e indica la fuente de cada color manual.'; status.dataset.state = 'error';
        invalid.querySelector('[data-color-hex]').focus(); return;
      }
      brand.name = name.value.trim();
      brand.colors = rows.map((row) => {
        const color = row._color;
        color.hex = row.querySelector('[data-color-hex]').value.trim().toUpperCase();
        color.wasEdited = color.originalHex ? color.hex !== color.originalHex : true;
        color.source = row.querySelector('[data-color-source]').value;
        color.sourceNote = row.querySelector('[data-color-source-note]').value.trim();
        if (color.source !== 'logo' || color.wasEdited) color.share = null;
        color.method = color.source === 'logo' ? 'Extracción local y agrupación perceptual OKLab' : 'Color introducido y clasificado manualmente';
        color.oklch = window.TerritorioColor.toOklch(color.hex);
        return color;
      });
      brand.confirmed = true;
      card.querySelector('[data-confirmation]').hidden = false;
      status.textContent = 'Colores confirmados por ti; la aplicación no ha verificado fuentes externas.';
      status.dataset.state = 'success';
    });
    card.addEventListener('input', (event) => {
      const row = event.target.closest('.palette-row');
      if (!row || event.target.matches('[data-color-source]')) return;
      if (event.target.matches('[data-color-picker]')) row.querySelector('[data-color-hex]').value = event.target.value.toUpperCase();
      updateColorRow(row, card);
    });
    card.addEventListener('change', (event) => {
      const row = event.target.closest('.palette-row');
      if (row) updateColorRow(row, card);
    });
    card.addEventListener('click', (event) => {
      const remove = event.target.closest('[data-remove-color]');
      if (!remove) return;
      const row = remove.closest('.palette-row');
      brand.colors = brand.colors.filter((color) => color.id !== row.dataset.colorId);
      renderPalette(card);
    });
  });

  function createSvgElement(name, attributes = {}) {
    const element = document.createElementNS('http://www.w3.org/2000/svg', name);
    Object.entries(attributes).forEach(([key, value]) => element.setAttribute(key, String(value)));
    return element;
  }

  function formatOklch(oklch) {
    const lightness = `${(oklch.L * 100).toFixed(1)}%`;
    const chroma = oklch.C.toFixed(3);
    return oklch.h === null
      ? `OKLCH ${lightness} ${chroma} · neutro ${oklch.neutral.toLowerCase()}`
      : `OKLCH ${lightness} ${chroma} ${oklch.h.toFixed(1)}°`;
  }

  function renderColorEntry(container, color, brand, index) {
    const row = document.createElement('article'); row.className = 'confirmed-color';
    const swatch = document.createElement('span'); swatch.className = 'confirmed-swatch'; swatch.style.backgroundColor = color.hex; swatch.setAttribute('aria-hidden', 'true');
    const identity = document.createElement('div'); identity.className = 'confirmed-identity';
    const heading = document.createElement('strong'); heading.textContent = brand.name;
    const code = document.createElement('code'); code.textContent = color.hex;
    const values = document.createElement('span'); values.className = 'color-values'; values.textContent = formatOklch(color.oklch);
    identity.append(heading, code, values);
    const provenance = document.createElement('p'); provenance.className = 'confirmed-provenance'; provenance.textContent = sourceDescription(color, brand);
    row.append(swatch, identity, provenance);
    if (color.share !== null && color.share !== undefined) {
      const share = document.createElement('span'); share.className = 'sample-share'; share.textContent = `≈ ${Math.round(color.share * 100)} % de píxeles agrupados · ${index + 1}`;
      row.append(share);
    }
    container.append(row);
  }

  function renderMap() {
    const svg = document.querySelector('[data-map-data]');
    if (!svg) return;
    svg.replaceChildren();
    const stable = [];
    const neutral = [];
    const campaign = [];
    const confirmedBrands = [...brandCards].map((card) => ({ card, data: brandData.get(card.dataset.brandId) })).filter(({ data }) => data.confirmed);
    confirmedBrands.forEach(({ card, data }, brandIndex) => data.colors.forEach((color) => {
      const enriched = { ...color, oklch: window.TerritorioColor.toOklch(color.hex) };
      const datum = { ...enriched, brand: data, brandIndex };
      if (enriched.source === 'campaign') campaign.push(datum);
      else if (enriched.oklch.neutral) neutral.push(datum);
      else stable.push(datum);
    }));

    const summary = document.querySelector('[data-map-summary]');
    const label = document.querySelector('[data-map-label]');
    const legend = document.querySelector('[data-map-legend]');
    const colorList = document.querySelector('[data-confirmed-list]');
    const neutralSection = document.querySelector('[data-neutral-section]');
    const neutralList = document.querySelector('[data-neutral-list]');
    const campaignSection = document.querySelector('[data-campaign-section]');
    const campaignList = document.querySelector('[data-campaign-list]');
    const comparisonList = document.querySelector('[data-comparison-list]');
    const emptyMap = document.querySelector('[data-map-empty]');
    legend.replaceChildren(); colorList.replaceChildren(); neutralList.replaceChildren(); campaignList.replaceChildren(); comparisonList.replaceChildren();
    emptyMap.hidden = stable.length > 0;
    emptyMap.textContent = neutral.length || campaign.length
      ? 'La muestra confirmada contiene neutros o colores estacionales, pero ningún tono cromático para ubicar.'
      : 'Sin datos cromáticos confirmados.';
    if (!confirmedBrands.length) {
      summary.textContent = 'Aún no hay datos confirmados. Vuelve a la pantalla anterior para revisar y confirmar una paleta.';
      label.textContent = 'MUESTRA · SIN CONFIRMAR';
    } else {
      const stableCount = stable.length + neutral.length;
      summary.textContent = stableCount
        ? `Lectura descriptiva de ${stableCount} colores confirmados en ${confirmedBrands.length} ${confirmedBrands.length === 1 ? 'marca' : 'marcas'}. La muestra puede ser insuficiente para inferir patrones de categoría.`
        : 'Hay marcas confirmadas, pero todavía no hay colores estables que comparar. Los tonos de campaña se muestran aparte.';
      label.textContent = `${confirmedBrands.length} ${confirmedBrands.length === 1 ? 'MARCA' : 'MARCAS'} · ${stableCount} COLORES ESTABLES`;
    }

    confirmedBrands.forEach(({ data }, brandIndex) => {
      const count = data.colors.filter((color) => color.source !== 'campaign').length;
      if (!count) return;
      const item = document.createElement('span'); item.className = `brand-legend brand-symbol-${brandIndex}`;
      const symbol = document.createElement('i'); symbol.setAttribute('aria-hidden', 'true');
      const name = document.createElement('strong'); name.textContent = data.name;
      const total = document.createElement('small'); total.textContent = `${count} ${count === 1 ? 'color' : 'colores'}`;
      item.append(symbol, name, total); legend.append(item);
    });

    stable.forEach((datum) => {
      const { oklch } = datum;
      const chromaMax = 0.36;
      const radius = Math.min(1, oklch.C / chromaMax) * 142;
      const angle = (oklch.h - 90) * Math.PI / 180;
      const cx = 200 + Math.cos(angle) * radius;
      const cy = 200 + Math.sin(angle) * radius;
      let point;
      if (datum.brandIndex === 1) point = createSvgElement('polygon', { points: `${cx},${cy - 8} ${cx + 8},${cy} ${cx},${cy + 8} ${cx - 8},${cy}`, fill: datum.hex, stroke: '#fffefc', 'stroke-width': 2 });
      else if (datum.brandIndex === 2) point = createSvgElement('rect', { x: cx - 7, y: cy - 7, width: 14, height: 14, rx: 1, fill: datum.hex, stroke: '#fffefc', 'stroke-width': 2 });
      else point = createSvgElement('circle', { cx, cy, r: 7, fill: datum.hex, stroke: '#fffefc', 'stroke-width': 2 });
      const group = createSvgElement('g', { class: 'map-point', tabindex: 0, role: 'img', 'aria-label': `${datum.brand.name}, ${datum.hex}, ${formatOklch(oklch)}` });
      const title = createSvgElement('title'); title.textContent = `${datum.brand.name} · ${datum.hex} · ${formatOklch(oklch)}`;
      group.append(title, point); svg.append(group);
      renderColorEntry(colorList, datum, datum.brand, colorList.children.length);
    });

    neutralSection.hidden = neutral.length === 0;
    neutral.forEach((datum, index) => renderColorEntry(neutralList, datum, datum.brand, index));
    campaignSection.hidden = campaign.length === 0;
    campaign.forEach((datum, index) => renderColorEntry(campaignList, datum, datum.brand, index));

    const comparisonBrands = confirmedBrands.map(({ data }) => ({
      name: data.name,
      colors: data.colors.filter((color) => color.source !== 'campaign'),
    })).filter((brand) => brand.colors.length);
    if (comparisonBrands.length < 2) {
      const note = document.createElement('p'); note.className = 'comparison-empty';
      note.textContent = 'Se necesitan al menos dos marcas con colores estables confirmados para comparar similitudes y diferencias. Con esta muestra todavía no hay una lectura entre marcas.';
      comparisonList.append(note);
    } else {
      for (let firstIndex = 0; firstIndex < comparisonBrands.length; firstIndex += 1) {
        for (let secondIndex = firstIndex + 1; secondIndex < comparisonBrands.length; secondIndex += 1) {
          const first = comparisonBrands[firstIndex]; const second = comparisonBrands[secondIndex];
          let closest = null;
          first.colors.forEach((firstColor) => second.colors.forEach((secondColor) => {
            const delta = window.TerritorioColor.deltaEOK(firstColor.hex, secondColor.hex);
            if (!closest || delta < closest.delta) closest = { firstColor, secondColor, delta };
          }));
          const item = document.createElement('article'); item.className = 'comparison-pair';
          const heading = document.createElement('h4'); heading.textContent = `${first.name} ↔ ${second.name}`;
          const pairColors = document.createElement('div'); pairColors.className = 'comparison-swatches';
          [closest.firstColor, closest.secondColor].forEach((color, index) => {
            const entry = document.createElement('span'); entry.className = 'comparison-swatch';
            const swatch = document.createElement('i'); swatch.style.backgroundColor = color.hex;
            const code = document.createElement('code'); code.textContent = `${index === 0 ? first.name : second.name} · ${color.hex}`;
            entry.append(swatch, code); pairColors.append(entry);
          });
          const result = document.createElement('p');
          result.textContent = `Par más próximo: ΔE_OK ${closest.delta.toFixed(3)} · ${closest.delta <= 0.055 ? 'proximidad cromática operativa (≤ 0,055)' : 'diferencia perceptual sobre el umbral operativo (0,055)'}.`;
          const caveat = document.createElement('small'); caveat.textContent = 'Comparación matemática de HEX confirmados; no mide reconocimiento ni posicionamiento.';
          item.append(heading, pairColors, result, caveat); comparisonList.append(item);
        }
      }
    }
  }
  attributeButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const selected = attributeButtons.filter((item) => item.getAttribute('aria-pressed') === 'true');
      const isSelected = button.getAttribute('aria-pressed') === 'true';

      if (!isSelected && selected.length >= 3) {
        attributeFeedback.textContent = 'Puedes seleccionar hasta tres atributos.';
        return;
      }

      button.setAttribute('aria-pressed', String(!isSelected));
      const selectedCount = attributeButtons.filter((item) => item.getAttribute('aria-pressed') === 'true').length;
      attributeFeedback.textContent = `${selectedCount} de 3 seleccionados · Selección de diseño, no se guarda.`;
    });
  });
  document.querySelector('[data-home]').addEventListener('click', (event) => {
    event.preventDefault();
    showWelcome();
  });

  // The first step is available as an initial design preview; no answers are stored.
  screens[0].hidden = true;
  welcome.hidden = false;
})();

