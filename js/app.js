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
  const stepNames = ['Contexto', 'Referencias', 'Mapa cromático', 'Territorios', 'Informe'];
  const brandData = new Map(brandCards.map((card) => [card.dataset.brandId, {
    name: '', url: '', image: null, previewUrl: '', fileName: '',
    includeBackground: false, backgroundChoice: null, background: null, backgroundConfidence: 'ninguna',
    colors: [], extracted: [], dismissedExtracted: new Set(), secondary: [], confirmed: false,
  }]));
  let currentStep = 1;
  let latestTerritories = [];

  function showWelcome() {
    welcome.hidden = false;
    experience.hidden = true;
    document.title = 'Territorio Visual · Ana Donate';
    history.replaceState(null, '', '#inicio');
    welcome.querySelector('h1').focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function showStep(step, moveFocus = true) {
    if (step > 2 && ![...brandData.values()].some((brand) => brand.confirmed)) {
      showStep(2, false);
      const feedback = document.querySelector('[data-sample-feedback]');
      feedback.hidden = false;
      feedback.textContent = 'Antes de analizar, confirma al menos una paleta. Revisa el nombre, los códigos y la procedencia de sus colores.';
      const cardWithColors = brandCards.find((card) => brandData.get(card.dataset.brandId).colors.length);
      const focusTarget = cardWithColors ? cardWithColors.querySelector('[data-confirm-brand]') : brandCards[0].querySelector('[data-logo-file]');
      focusTarget.focus({ preventScroll: true });
      return;
    }
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
    backButton.textContent = currentStep === 1 ? 'Volver al inicio' : `Anterior · ${stepNames[currentStep - 2]}`;
    backButton.setAttribute('aria-label', currentStep === 1 ? 'Volver al inicio' : `Volver a ${stepNames[currentStep - 2]}`);
    backButton.disabled = false;

    const title = screens[currentStep - 1].querySelector('h2');
    if (currentStep === 3) renderMap();
    if (currentStep === 4) renderTerritories();
    if (currentStep === 5) renderReport();
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
    ['logo', 'Extraído del logotipo'],
    ['manual', 'Introducido manualmente'],
    ['official', 'Fuente oficial indicada por mí'],
    ['campaign', 'Color de campaña'],
  ];
  const allowedHex = /^#[\da-f]{6}$/i;

  function sourceDescription(color, brand) {
    const source = color.source;
    if (source === 'logo') return color.wasEdited
      ? `HEX ajustado por ti · origen inicial: logotipo · estimación visual, no color oficial verificado.`
      : `Extraído localmente del logotipo · estimación visual, no color oficial verificado.`;
    if (source === 'manual') return `Añadido manualmente por ti · no se ha verificado como color corporativo.`;
    if (source === 'official') return `Fuente oficial indicada por ti: ${color.sourceNote || 'sin referencia detallada'} · la aplicación no la verifica.`;
    if (source === 'campaign') return `Campaña/temporada: ${color.sourceNote} · confianza: contexto declarado · fuera de la comparación estable.`;
    return `Procedencia indicada: ${color.sourceNote || 'sin detallar'} · interpretación orientativa.`;
  }

  function markPaletteUnconfirmed(brand, card) {
    brand.confirmed = false;
    card.querySelector('[data-confirmation]').hidden = true;
    card.querySelector('[data-confirm-brand]').disabled = !brand.colors.some((color) => allowedHex.test(color.hex));
  }

  function makeColorRow(color, index, brand, card, group = 'extracted') {
    const row = document.createElement('div');
    row.className = 'palette-row';
    row.dataset.colorId = color.id;
    const pickerLabel = document.createElement('label');
    pickerLabel.className = 'color-picker-label';
    const picker = document.createElement('input');
    picker.type = 'color'; picker.value = allowedHex.test(color.hex) ? color.hex : '#FFFFFF'; picker.setAttribute('data-color-picker', '');
    picker.setAttribute('aria-label', `Editar muestra de color ${index + 1}`);
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
    note.required = color.source === 'official';
    note.hidden = color.source !== 'official';
    const remove = document.createElement('button');
    remove.className = 'remove-color'; remove.type = 'button'; remove.textContent = 'Quitar';
    remove.setAttribute('aria-label', `Eliminar el color ${color.hex}`); remove.setAttribute('data-remove-color', '');
    const details = document.createElement('p'); details.className = 'color-provenance';
    const classification = allowedHex.test(color.hex) && window.TerritorioColor.toOklch(color.hex).h === null ? 'Neutro · ' : 'Color cromático · ';
    details.textContent = `${classification}${sourceDescription(color, brand)}`;
    row.dataset.colorGroup = group;
    row.append(pickerLabel, hexLabel, sourceLabel, note);
    if (group === 'extracted') {
      const backgroundPending = brand.background && brand.backgroundConfidence !== 'alta' && !brand.backgroundChoice;
      const use = document.createElement('button'); use.type = 'button'; use.className = 'use-extracted-color';
      use.textContent = 'Usar como principal'; use.setAttribute('data-use-primary', '');
      use.disabled = !allowedHex.test(color.hex) || brand.colors.length >= 3 || backgroundPending;
      const secondary = document.createElement('button'); secondary.type = 'button'; secondary.className = 'use-extracted-color';
      secondary.textContent = color.kind === 'neutral' ? 'Guardar como neutro' : 'Guardar como secundario'; secondary.setAttribute('data-use-secondary', '');
      secondary.disabled = backgroundPending;
      row.append(use, secondary);
    }
    row.append(remove, details);
    row._color = color;
    return row;
  }

  function renderPalette(card) {
    const brand = brandData.get(card.dataset.brandId);
    const list = card.querySelector('[data-palette-list]');
    list.replaceChildren();
    if (!brand.extracted.length) {
      const empty = document.createElement('p'); empty.className = 'palette-empty';
      empty.textContent = 'No hay colores detectados. Puedes crear la paleta manualmente arriba.'; list.append(empty);
    }
    brand.extracted.forEach((color, index) => list.append(makeColorRow(color, index, brand, card, 'extracted')));
    card.querySelector('[data-clear-extracted]').hidden = !brand.extracted.length;
    renderPrimary(card);
    renderSecondary(card);
    card.querySelector('[data-confirm-brand]').disabled = !brand.colors.some((color) => allowedHex.test(color.hex));
    markPaletteUnconfirmed(brand, card);
  }

  function renderPrimary(card) {
    const brand = brandData.get(card.dataset.brandId);
    const list = card.querySelector('[data-primary-list]'); list.replaceChildren();
    for (let index = 0; index < brand.colors.length; index += 1) {
      const color = brand.colors[index];
      const slot = document.createElement('div'); slot.className = 'primary-slot';
      const number = document.createElement('span'); number.className = 'primary-slot-number'; number.textContent = `0${index + 1}`;
      const label = document.createElement('strong'); label.textContent = index < 2 ? `Principal ${index + 1}` : 'Principal adicional';
      const row = makeColorRow(color, index, brand, card, 'primary');
      slot.append(number, label, row); list.append(slot);
    }
    if (!brand.colors.length) { const note = document.createElement('p'); note.className = 'palette-empty'; note.textContent = 'Elige sugerencias de abajo o añade aquí tus colores principales.'; list.append(note); }
    card.querySelector('[data-primary-count]').textContent = `${brand.colors.length} de 2 recomendados · máximo 3`;
    card.querySelector('[data-add-primary]').disabled = brand.colors.length >= 3;
    const backgroundPending = brand.background && brand.backgroundConfidence !== 'alta' && !brand.backgroundChoice;
    card.querySelectorAll('[data-use-primary]').forEach((button) => { button.disabled = brand.colors.length >= 3 || backgroundPending; });
  }

  function renderSecondary(card) {
    const brand = brandData.get(card.dataset.brandId); const list = card.querySelector('[data-secondary-list]'); list.replaceChildren();
    const neutralColors = brand.secondary.filter((color) => color.kind === 'neutral');
    const complementaryColors = brand.secondary.filter((color) => color.kind !== 'neutral' && color.role === 'complementary');
    const secondaryColors = brand.secondary.filter((color) => color.kind !== 'neutral' && color.role !== 'complementary');
    [[secondaryColors, 'Colores secundarios'], [complementaryColors, 'Complementarios elegidos por ti'], [neutralColors, 'Neutros · blanco, negro y grises']].forEach(([colors, title]) => {
      const group = document.createElement('section'); group.className = 'secondary-color-group';
      const heading = document.createElement('h4'); heading.textContent = title;
      const entries = document.createElement('div'); entries.className = 'secondary-color-entries';
      if (!colors.length) { const empty = document.createElement('p'); empty.className = 'palette-empty'; empty.textContent = 'Sin colores añadidos.'; entries.append(empty); }
      colors.forEach((color, index) => entries.append(makeColorRow(color, index, brand, card, 'secondary')));
      group.append(heading, entries); list.append(group);
    });
  }

  function updateColorRow(row, card) {
    const brand = brandData.get(card.dataset.brandId);
    const group = row.dataset.colorGroup;
    const collection = group === 'extracted' ? brand.extracted : group === 'secondary' ? brand.secondary : brand.colors;
    const color = collection.find((item) => item.id === row.dataset.colorId);
    if (!color) return;
    const selectedSource = row.querySelector('[data-color-source]').value;
    if (selectedSource !== color.source) {
      const note = row.querySelector('[data-color-source-note]');
      note.value = '';
      note.hidden = selectedSource === 'logo';
    }
    color.hex = row.querySelector('[data-color-hex]').value.trim().toUpperCase();
    color.kind = allowedHex.test(color.hex) && window.TerritorioColor.toOklch(color.hex).h === null ? 'neutral' : 'chromatic';
    color.wasEdited = color.originalHex ? color.hex !== color.originalHex : true;
    if (color.wasEdited) color.share = null;
    color.source = selectedSource;
    color.sourceNote = row.querySelector('[data-color-source-note]').value.trim();
    row.querySelector('[data-color-picker]').value = allowedHex.test(color.hex) ? color.hex : '#FFFFFF';
    row.querySelector('[data-color-hex]').setAttribute('aria-invalid', String(!allowedHex.test(color.hex)));
    row.querySelector('[data-color-source-note]').required = color.source === 'official';
    row.querySelector('[data-color-source-note]').hidden = color.source !== 'official';
    row.querySelector('[data-color-source-note]').placeholder = color.source === 'official' ? 'Título o enlace de la fuente oficial' : 'Procedencia';
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
        const result = window.TerritorioColor.extractColors(brand.image, brand.includeBackground ? 'include' : (brand.backgroundChoice || 'auto'));
        brand.background = result.background;
        brand.backgroundConfidence = result.backgroundConfidence;
        const previousExtracted = new Map(brand.extracted.map((color) => [color.originalHex, color]));
        brand.extracted = result.colors.filter((item) => !brand.dismissedExtracted.has(item.hex)).map((item, index) => {
          const previous = previousExtracted.get(item.hex);
          return previous ? { ...previous, share: item.share } : ({
          id: `${card.dataset.brandId}-logo-${Date.now()}-${index}`,
          hex: item.hex, originalHex: item.hex, wasEdited: false, source: 'logo', sourceNote: '',
          share: item.share, method: 'Extracción local y agrupación perceptual OKLab', kind: window.TerritorioColor.toOklch(item.hex).h === null ? 'neutral' : 'chromatic',
          });
        });
        backgroundControl.hidden = !result.background && !result.backgroundTransparent && !result.semitransparentRatio;
        card.querySelector('[data-background-hex]').textContent = result.background || '';
        card.querySelector('[data-include-background]').checked = brand.includeBackground;
        const summary = card.querySelector('[data-background-summary]');
        const decision = card.querySelector('[data-background-decision]');
        const toggle = card.querySelector('[data-background-toggle]');
        decision.hidden = !result.background || result.backgroundConfidence === 'alta';
        toggle.hidden = result.backgroundConfidence !== 'alta';
        card.querySelectorAll('[data-background-decision] input').forEach((input) => { input.checked = input.value === brand.backgroundChoice; });
        const alphaNote = result.backgroundTransparent
          ? 'Se conserva la transparencia real del archivo.'
          : result.semitransparentRatio > 0.01
            ? `Los píxeles semitransparentes (${Math.round(result.semitransparentRatio * 100)} %) se ponderan para reducir halos.`
            : '';
        const backgroundNote = result.background ? `Fondo estimado en bordes: ${result.background} · confianza ${result.backgroundConfidence}.` : 'No se detectó un fondo opaco fiable.';
        summary.textContent = [backgroundNote, alphaNote].filter(Boolean).join(' ');
        status.textContent = result.background && result.backgroundConfidence === 'alta'
          ? `El fondo de borde (${result.background}) se excluye por defecto; puedes incluirlo como candidato si pertenece al logotipo.`
          : result.background
            ? `La imagen tiene un posible fondo (${result.background}), pero no se distingue con suficiente seguridad. Confirma si es fondo o parte del logotipo.`
            : result.backgroundTransparent
              ? `Se conserva la transparencia real del archivo. Los píxeles semitransparentes (${Math.round(result.semitransparentRatio * 100)} %) se ponderan para reducir halos; no se invierten los colores.`
            : `No se detectó un fondo fiable en ${brand.fileName}. Revisa las sugerencias, especialmente si el archivo tiene fondo complejo.`;
        status.dataset.state = 'success';
        renderPalette(card);
      } catch (error) {
        brand.extracted = [];
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
        brand.includeBackground = false; brand.backgroundChoice = null;
        brand.extracted = []; brand.dismissedExtracted = new Set(); brand.colors = []; brand.secondary = []; brand.confirmed = false;
        const preview = card.querySelector('[data-logo-preview]');
        const image = document.createElement('img'); image.src = loaded.previewUrl; image.alt = `Vista previa del logotipo ${file.name}`;
        preview.replaceChildren(image); preview.classList.add('has-logo');
        card.querySelector('.upload-copy strong').textContent = 'Cambiar logotipo';
        card.querySelector('.upload-copy small').textContent = `1 archivo · ${file.name}`;
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
    card.querySelectorAll('[data-background-decision] input').forEach((input) => input.addEventListener('change', () => {
      brand.backgroundChoice = input.value;
      brand.includeBackground = input.value === 'include';
      extractCurrentLogo();
    }));
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
    card.querySelector('[data-add-primary]').addEventListener('click', () => {
      if (brand.colors.length >= 3) return;
      brand.colors.push({ id: `${card.dataset.brandId}-primary-${Date.now()}`, hex: '', originalHex: '', wasEdited: true, source: 'manual', sourceNote: '', share: null, method: 'Introducido manualmente' });
      renderPalette(card); card.querySelector('[data-color-hex]:last-of-type')?.focus();
    });
    card.querySelector('[data-add-secondary]').addEventListener('click', () => {
      brand.secondary.push({ id: `${card.dataset.brandId}-secondary-${Date.now()}`, hex: '', source: 'manual', sourceNote: '', share: null }); renderPalette(card); card.querySelector('[data-color-hex]:last-of-type')?.focus();
    });
    card.querySelector('[data-add-complementary]').addEventListener('click', () => {
      brand.secondary.push({ id: `${card.dataset.brandId}-complementary-${Date.now()}`, hex: '', source: 'manual', sourceNote: '', share: null, role: 'complementary' }); renderPalette(card); card.querySelector('[data-color-hex]:last-of-type')?.focus();
    });
    card.querySelector('[data-add-neutral]').addEventListener('click', () => {
      brand.secondary.push({ id: `${card.dataset.brandId}-neutral-${Date.now()}`, hex: '', source: 'manual', sourceNote: '', kind: 'neutral', share: null }); renderPalette(card); card.querySelector('[data-color-hex]:last-of-type')?.focus();
    });
    card.querySelector('[data-clear-extracted]').addEventListener('click', () => {
      brand.extracted.forEach((color) => brand.dismissedExtracted.add(color.originalHex)); brand.extracted = []; renderPalette(card);
    });
    card.querySelector('[data-palette-list]').addEventListener('click', (event) => {
      const row = event.target.closest('.palette-row'); if (!row) return;
      const color = brand.extracted.find((item) => item.id === row.dataset.colorId); if (!color) return;
      if (event.target.closest('[data-use-primary]')) {
        if (brand.colors.length >= 3 || !allowedHex.test(color.hex)) return;
        brand.colors.push({ ...color, id: `${card.dataset.brandId}-primary-${Date.now()}`, originalHex: color.hex, wasEdited: false, fromExtracted: color.id });
        renderPalette(card); return;
      }
      if (event.target.closest('[data-use-secondary]')) {
        if (!allowedHex.test(color.hex) || brand.secondary.some((item) => item.fromExtracted === color.id)) return;
        brand.secondary.push({ ...color, id: `${card.dataset.brandId}-secondary-${Date.now()}`, originalHex: color.hex, fromExtracted: color.id });
        renderPalette(card); return;
      }
      if (event.target.closest('[data-remove-color]')) { brand.dismissedExtracted.add(color.originalHex); brand.extracted = brand.extracted.filter((item) => item.id !== color.id); renderPalette(card); }
    });
    card.querySelector('[data-confirm-brand]').addEventListener('click', () => {
      const name = card.querySelector('[data-brand-name]');
      if (!name.value.trim()) { status.textContent = 'Añade el nombre de la marca antes de confirmar.'; status.dataset.state = 'error'; name.focus(); return; }
       const rows = [...card.querySelectorAll('.palette-row[data-color-group="primary"]')];
       const invalid = rows.find((row) => !allowedHex.test(row.querySelector('[data-color-hex]').value.trim())
         || (row.querySelector('[data-color-source]').value === 'official' && !row.querySelector('[data-color-source-note]').value.trim()));
       const undecidedBackground = brand.background && brand.backgroundConfidence !== 'alta' && !brand.backgroundChoice;
       if (undecidedBackground) {
         status.textContent = 'Confirma si el color detectado en el borde es fondo del archivo o parte del logotipo.'; status.dataset.state = 'error';
         card.querySelector('[data-background-decision]').scrollIntoView({ block: 'center', behavior: 'smooth' });
         card.querySelector('[data-background-decision] input').focus(); return;
       }
      if (invalid) {
         status.textContent = 'Revisa los códigos HEX. Para indicar una fuente oficial, añade su título o enlace.'; status.dataset.state = 'error';
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
         color.method = color.source === 'logo' ? 'Extracción local y agrupación perceptual OKLab' : 'Introducido y clasificado por el usuario';
        color.oklch = window.TerritorioColor.toOklch(color.hex);
        return color;
      });
       brand.secondary = [...card.querySelectorAll('.palette-row[data-color-group="secondary"]')].map((row) => {
         const color = brand.secondary.find((item) => item.id === row.dataset.colorId) || row._color;
         color.hex = row.querySelector('[data-color-hex]').value.trim().toUpperCase(); color.source = row.querySelector('[data-color-source]').value;
         color.sourceNote = row.querySelector('[data-color-source-note]').value.trim(); color.oklch = allowedHex.test(color.hex) ? window.TerritorioColor.toOklch(color.hex) : null; return color;
       }).filter((color) => allowedHex.test(color.hex));
       brand.confirmed = true;
      card.querySelector('[data-confirmation]').hidden = false;
      const sampleFeedback = document.querySelector('[data-sample-feedback]');
      sampleFeedback.hidden = true;
      sampleFeedback.textContent = '';
      status.textContent = 'Colores confirmados por ti; la aplicación no ha verificado fuentes externas.';
      status.dataset.state = 'success';
    });
    card.addEventListener('input', (event) => {
      const row = event.target.closest('.palette-row');
       if (!row || event.target.matches('[data-color-source]')) return;
      if (event.target.matches('[data-color-picker]')) row.querySelector('[data-color-hex]').value = event.target.value.toUpperCase();
      updateColorRow(row, card);
      if (row.dataset.colorGroup === 'extracted') renderPrimary(card);
    });
    card.addEventListener('change', (event) => {
       const row = event.target.closest('.palette-row');
       if (row) {
         updateColorRow(row, card);
         if (row.dataset.colorGroup === 'extracted') renderPrimary(card);
         if (row.dataset.colorGroup === 'secondary') renderSecondary(card);
       }
    });
    card.addEventListener('click', (event) => {
       const remove = event.target.closest('[data-remove-color]');
      if (!remove) return;
      const row = remove.closest('.palette-row');
       const group = row.dataset.colorGroup;
       if (group === 'extracted') {
         const color = brand.extracted.find((item) => item.id === row.dataset.colorId); if (color) brand.dismissedExtracted.add(color.originalHex);
         brand.extracted = brand.extracted.filter((color) => color.id !== row.dataset.colorId);
       }
       else if (group === 'secondary') brand.secondary = brand.secondary.filter((color) => color.id !== row.dataset.colorId);
       else brand.colors = brand.colors.filter((color) => color.id !== row.dataset.colorId);
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
    const values = document.createElement('span'); values.className = 'color-values'; values.textContent = formatOklch(color.oklch || window.TerritorioColor.toOklch(color.hex));
    identity.append(heading);
    if (color.role) { const role = document.createElement('span'); role.className = 'color-values'; role.textContent = color.role; identity.append(role); }
    identity.append(code, values);
    const provenance = document.createElement('p'); provenance.className = 'confirmed-provenance'; provenance.textContent = sourceDescription(color, brand);
    row.append(swatch, identity, provenance);
    if (color.share !== null && color.share !== undefined) {
      const share = document.createElement('span'); share.className = 'sample-share'; share.textContent = `≈ ${Math.round(color.share * 100)} % de píxeles agrupados · ${index + 1}`;
      row.append(share);
    }
    container.append(row);
  }

  function renderBrandColorCards(container, brands) {
    container.replaceChildren();
    brands.forEach(({ data }) => {
      const card = document.createElement('article'); card.className = 'brand-color-card';
      const heading = document.createElement('h4'); heading.textContent = data.name; card.append(heading);
      const colors = [
        ...data.colors.map((color) => ({ ...color, role: 'Principal' })),
        ...data.secondary.map((color) => ({ ...color, role: color.role === 'complementary' ? 'Complementario' : (color.kind === 'neutral' ? 'Neutro · secundario' : 'Secundario') })),
      ].filter((color) => color.source !== 'campaign' && allowedHex.test(color.hex));
      if (!colors.length) { const empty = document.createElement('p'); empty.className = 'palette-empty'; empty.textContent = 'Sin colores confirmados.'; card.append(empty); }
      colors.forEach((color) => {
        const row = document.createElement('div'); row.className = 'brand-confirmed-color';
        const swatch = document.createElement('span'); swatch.className = 'confirmed-swatch'; swatch.style.backgroundColor = color.hex;
        const detail = document.createElement('div'); detail.className = 'brand-confirmed-detail';
        const role = document.createElement('strong'); role.textContent = color.role;
        const code = document.createElement('code'); code.textContent = color.hex;
        const source = document.createElement('p'); source.textContent = sourceDescription(color, data);
        detail.append(role, code, source); row.append(swatch, detail); card.append(row);
      });
      container.append(card);
    });
  }

  function renderVisualObservations(container, brands) {
    container.replaceChildren();
    const entries = brands.map((brand) => ({
      ...brand,
      stableColors: [...brand.colors, ...brand.secondary].filter((color) => color.source !== 'campaign' && allowedHex.test(color.hex)),
    })).filter((brand) => brand.stableColors.length);
    const note = (title, copy) => { const item = document.createElement('article'); item.className = 'visual-observation'; const h = document.createElement('h4'); h.textContent = title; const p = document.createElement('p'); p.textContent = copy; item.append(h,p); container.append(item); };
    if (!entries.length) { note('Aún no hay colores confirmados', 'Confirma una o más paletas para describir lo que aparece en esta muestra.'); return; }
    const palette = entries.flatMap((brand) => brand.stableColors.map((color) => ({ ...color, brand: brand.name, oklch: window.TerritorioColor.toOklch(color.hex) })));
    const family = (color) => {
      const { h, C } = color.oklch;
      if (h === null || C < 0.025) return 'neutros';
      if (h < 25 || h >= 345) return 'rojos'; if (h < 50) return 'naranjas'; if (h < 70) return 'amarillos';
      if (h < 165) return 'verdes'; if (h < 205) return 'turquesas'; if (h < 255) return 'azules'; if (h < 290) return 'índigos'; return 'violetas';
    };
    const lightness = (L) => L < 0.3 ? 'profunda' : L > 0.82 ? 'clara' : 'intermedia';
    const chroma = (C) => C < 0.025 ? 'acromática' : C < 0.075 ? 'suavizada' : 'saturada';
    const descriptions = entries.map((brand) => {
      const colors = brand.stableColors.map((color) => ({ ...color, oklch: window.TerritorioColor.toOklch(color.hex) }));
      const families = [...new Set(colors.map(family))];
      const tones = [...new Set(colors.map((color) => `${lightness(color.oklch.L)} y ${chroma(color.oklch.C)}`))];
      return `${brand.name}: ${families.join(' y ')}; ${tones.join(', ')}.`;
    });
    const shared = [...new Set(entries.flatMap((brand) => brand.stableColors.map(family)))];
    note('Carácter de las paletas', descriptions.join(' '));
    note('Códigos cromáticos compartidos', shared.length ? `En esta selección aparecen ${shared.join(', ')}. Las diferencias entre marcas se leen en los HEX confirmados y en sus valores OKLCH; la muestra no permite concluir cómo se distribuye toda la categoría.` : 'Aún no hay suficientes colores confirmados para comparar recursos cromáticos.');
    note('Punto de partida para diseñar', 'Usa estos contrastes observados —matiz, claridad y saturación— como material de exploración. La decisión de identidad deberá validarse con contexto de marca, público y aplicaciones.');
  }

  function renderMap() {
    const svg = document.querySelector('[data-map-data]');
    if (!svg) return;
    svg.replaceChildren();
    const stable = [];
    const campaign = [];
    const confirmedBrands = [...brandCards].map((card) => ({ card, data: brandData.get(card.dataset.brandId) })).filter(({ data }) => data.confirmed);
    confirmedBrands.forEach(({ card, data }, brandIndex) => [...data.colors.map((color)=>({...color,role:'Principal'})),...data.secondary.map((color)=>({...color,role:color.role==='complementary'?'Complementario':(color.kind==='neutral'?'Neutro · secundario':'Secundario')}))].forEach((color) => {
      const enriched = { ...color, oklch: window.TerritorioColor.toOklch(color.hex) };
      const datum = { ...enriched, brand: data, brandIndex };
      if (enriched.source === 'campaign') campaign.push(datum);
      else stable.push(datum);
    }));

    const summary = document.querySelector('[data-map-summary]');
    const label = document.querySelector('[data-map-label]');
    const legend = document.querySelector('[data-map-legend]');
    const colorList = document.querySelector('[data-confirmed-list]');
    const campaignSection = document.querySelector('[data-campaign-section]');
    const campaignList = document.querySelector('[data-campaign-list]');
    const observations = document.querySelector('[data-visual-observations]');
    const complementaryList = document.querySelector('[data-complementary-list]');
    const emptyMap = document.querySelector('[data-map-empty]');
    legend.replaceChildren(); colorList.replaceChildren(); campaignList.replaceChildren(); observations.replaceChildren(); complementaryList.replaceChildren();
    emptyMap.hidden = stable.length > 0;
    emptyMap.textContent = stable.length ? '' : 'Sin colores confirmados.';
    if (!confirmedBrands.length) {
      summary.textContent = 'Aún no hay datos confirmados. Vuelve a la pantalla anterior para revisar y confirmar una paleta.';
      label.textContent = 'MUESTRA · SIN CONFIRMAR';
    } else {
      const stableCount = stable.length;
      summary.textContent = stableCount
        ? `Lectura descriptiva de ${stableCount} colores confirmados en ${confirmedBrands.length} ${confirmedBrands.length === 1 ? 'marca' : 'marcas'}. La muestra puede ser insuficiente para inferir patrones de categoría.`
        : 'Hay marcas confirmadas, pero todavía no hay colores estables que comparar. Los tonos de campaña se muestran aparte.';
      label.textContent = `${confirmedBrands.length} ${confirmedBrands.length === 1 ? 'MARCA' : 'MARCAS'} · ${stableCount} COLORES ESTABLES`;
    }

    confirmedBrands.forEach(({ data }, brandIndex) => {
      const count = [...data.colors, ...data.secondary].filter((color) => color.source !== 'campaign' && allowedHex.test(color.hex)).length;
      if (!count) return;
      const item = document.createElement('span'); item.className = `brand-legend brand-symbol-${brandIndex}`;
      const symbol = document.createElement('i'); symbol.setAttribute('aria-hidden', 'true');
      const name = document.createElement('strong'); name.textContent = data.name;
      const total = document.createElement('small'); total.textContent = `${count} ${count === 1 ? 'color' : 'colores'}`;
      item.append(symbol, name, total); legend.append(item);
    });

    const plotted=[];
    stable.forEach((datum, pointIndex) => {
      const { oklch } = datum;
      const radius = (1 - oklch.L) * 190;
      const angle = oklch.h === null ? -Math.PI / 2 : (oklch.h - 90) * Math.PI / 180;
      const trueX=200+Math.cos(angle)*radius, trueY=200+Math.sin(angle)*radius;
      const overlaps=plotted.filter((p)=>Math.hypot(p.x-trueX,p.y-trueY)<18).length;
      const nudge=overlaps?12+Math.min(overlaps,2)*3:0, nudgeAngle=pointIndex*2.399963229728653;
      const cx=trueX+Math.cos(nudgeAngle)*nudge, cy=trueY+Math.sin(nudgeAngle)*nudge; plotted.push({x:trueX,y:trueY});
      if(nudge) svg.append(createSvgElement('line',{x1:trueX,y1:trueY,x2:cx,y2:cy,stroke:'#29272a','stroke-width':1,'stroke-dasharray':'2 2','aria-hidden':'true'}));
      const point = createSvgElement('circle', { cx, cy, r: 9, fill: '#fffefc', stroke: '#29272a', 'stroke-width': 1.5 });
      const colorMark = datum.brandIndex === 1
        ? createSvgElement('polygon', { points: `${cx},${cy - 6} ${cx + 6},${cy} ${cx},${cy + 6} ${cx - 6},${cy}`, fill: datum.hex, stroke: '#fffefc', 'stroke-width': 1.5 })
        : datum.brandIndex === 2
          ? createSvgElement('rect', { x: cx - 5, y: cy - 5, width: 10, height: 10, fill: datum.hex, stroke: '#fffefc', 'stroke-width': 1.5 })
          : createSvgElement('circle', { cx, cy, r: 5, fill: datum.hex, stroke: '#fffefc', 'stroke-width': 1.5 });
      const group = createSvgElement('g', { class: `map-point ${oklch.h === null ? 'map-point-neutral' : ''}`, tabindex: 0, role: 'img', 'aria-label': `${datum.brand.name}, ${datum.hex}, ${datum.role}, ${formatOklch(oklch)}` });
      const title = createSvgElement('title'); title.textContent = `${datum.brand.name} · ${datum.hex} · ${formatOklch(oklch)}`;
      group.append(title, point, colorMark); svg.append(group);
    });
    renderBrandColorCards(colorList,confirmedBrands);
    const userComplements=confirmedBrands.flatMap(({data})=>data.secondary.filter((c)=>c.role==='complementary').map((c)=>({data,color:c})));
    userComplements.forEach(({data,color})=>renderColorEntry(complementaryList,{...color,role:'Complementario elegido por ti'},data,complementaryList.children.length));
    const suggestionTitle=document.createElement('p'); suggestionTitle.className='complementary-suggestion-note'; suggestionTitle.textContent='Sugerencias geométricas · no confirmadas ni atribuidas a la marca'; complementaryList.append(suggestionTitle);
    const suggested=new Set();
    stable.filter((d)=>d.role==='Principal' && d.oklch.h!==null).forEach((d)=>{ const hex=window.TerritorioColor.complementaryHex(d.hex); const key=`${d.brand.name}-${hex}`; if(suggested.has(key))return; suggested.add(key); const row=document.createElement('article'); row.className='confirmed-color complementary-suggestion'; const swatch=document.createElement('span'); swatch.className='confirmed-swatch'; swatch.style.backgroundColor=hex; const identity=document.createElement('div'); identity.className='confirmed-identity'; const heading=document.createElement('strong'); heading.textContent=`Sugerencia para ${d.brand.name}`; const code=document.createElement('code'); code.textContent=hex; const provenance=document.createElement('p'); provenance.className='confirmed-provenance'; provenance.textContent=`Complemento geométrico sugerido para ${d.hex}. No está confirmado ni atribuido a la marca.`; identity.append(heading,code,provenance); row.append(swatch,identity); complementaryList.append(row); });
    campaignSection.hidden = campaign.length === 0;
    campaign.forEach((datum, index) => renderColorEntry(campaignList, datum, datum.brand, index));

    renderVisualObservations(observations, confirmedBrands.map(({data}) => data));
  }

  function hueFamily(oklch) {
    if (oklch.h === null || oklch.C < 0.025) return 'neutros';
    if (oklch.h < 25 || oklch.h >= 345) return 'rojos'; if (oklch.h < 50) return 'naranjas'; if (oklch.h < 70) return 'amarillos';
    if (oklch.h < 165) return 'verdes'; if (oklch.h < 205) return 'turquesas'; if (oklch.h < 255) return 'azules'; if (oklch.h < 290) return 'índigos'; return 'violetas';
  }

  function collectSession() {
    const competitors = [...brandData.values()].filter((brand) => brand.confirmed).map((brand) => ({
      name: brand.name || 'Marca sin nombre',
      colors: [...brand.colors.map((color) => ({ ...color, role: 'Principal' })), ...brand.secondary.map((color) => ({ ...color, role: color.role === 'complementary' ? 'Complementario' : (color.kind === 'neutral' ? 'Neutro · secundario' : 'Secundario') }))].filter((color) => color.source !== 'campaign' && allowedHex.test(color.hex)).map((color) => ({ ...color, oklch: window.TerritorioColor.toOklch(color.hex) })),
    }));
    const allColors = competitors.flatMap((brand) => brand.colors.map((color) => ({ ...color, brand: brand.name })));
    const mainColors = allColors.filter((color) => color.role === 'Principal' && color.kind !== 'neutral' && color.oklch.h !== null);
    const manualComplements = allColors.filter((color) => color.role === 'complementary');
    const familyPresence = new Map();
    mainColors.forEach((color) => {
      const family = hueFamily(color.oklch); const entry = familyPresence.get(family) || { brands: new Set(), count: 0 };
      entry.brands.add(color.brand); entry.count += 1; familyPresence.set(family, entry);
    });
    const dominantFamily = [...familyPresence].sort((a, b) => b[1].brands.size - a[1].brands.size || b[1].count - a[1].count)[0] || null;
    const seed = dominantFamily ? mainColors.find((color) => hueFamily(color.oklch) === dominantFamily[0]) : manualComplements.find((color) => color.oklch.h !== null) || null;
    const contrastPool = seed ? mainColors.filter((color) => color.hex !== seed.hex) : [];
    const acrossBrands = contrastPool.filter((color) => color.brand !== seed.brand);
    const contrastSeed = seed ? [...(acrossBrands.length ? acrossBrands : contrastPool)].sort((a, b) => window.TerritorioColor.deltaEOK(seed.hex, b.hex) - window.TerritorioColor.deltaEOK(seed.hex, a.hex))[0] || null : null;
    return {
      name: document.querySelector('#brand-name').value.trim() || 'Tu marca',
      sector: document.querySelector('#brand-sector').value.trim(),
      audience: document.querySelector('#brand-audience').value.trim(),
      description: document.querySelector('#brand-description').value.trim(),
      values: attributeButtons.filter((button) => button.getAttribute('aria-pressed') === 'true').map((button) => button.textContent.trim()),
      competitors, allColors, mainColors, dominantFamily, seed, contrastSeed, manualComplements,
    };
  }

  function buildTerritories(session) {
    const seed = session.seed; const contrast = session.contrastSeed;
    const hasCrossFamilyContrast = Boolean(seed && contrast && hueFamily(contrast.oklch) !== hueFamily(seed.oklch));
    const values = session.values.length ? session.values.join(', ') : 'sin valores seleccionados';
    const audience = session.audience || 'público objetivo aún por definir';
    const evidenceIsLimited = session.competitors.length < 2 || session.mainColors.length < 3;
    const evidenceNote = evidenceIsLimited
      ? `Base limitada: ${session.competitors.length} marcas y ${session.mainColors.length} colores principales cromáticos confirmados. La lectura describe esta selección, no un patrón general del sector.`
      : `Muestra: ${session.competitors.length} marcas y ${session.mainColors.length} colores principales cromáticos confirmados. El recuento indica repetición en la muestra, no porcentaje de superficie ni oportunidad de mercado.`;
    const repeated = session.dominantFamily
      ? `${session.dominantFamily[0]} aparece en ${session.dominantFamily[1].brands.size} de ${session.competitors.length} marcas y suma ${session.dominantFamily[1].count} muestras. Describe los códigos aportados, no su peso visual en el mercado.`
      : 'No hay una familia cromática principal confirmada que permita describir un patrón.';
    const proposal = (hex, role, note, status = 'propuesta') => ({ hex, role, note, status });
    const exact = (color, role) => proposal(color.hex, role, `Muestra confirmada de ${color.brand}; se usa como referencia, no se atribuye a tu marca.`, 'dato observado');
    const deriveHue = (base, delta, scale = 1) => window.TerritorioColor.adjustOklch(base.hex, {
      h: (base.oklch.h + delta + 360) % 360,
      L: base.oklch.L,
      C: Math.max(.04, Math.min(.28, base.oklch.C * scale)),
    });
    const generated = (hex, role, base, relation) => proposal(hex, role, `Matiz generado desde ${base.hex} mediante una relación ${relation}; es una exploración, no un color oficial.`, 'propuesta');
    const uniqueChromatic = (hex, base) => window.TerritorioColor.deltaEOK(hex, base.hex) < .055 ? deriveHue(base, 35, .9) : hex;
    const sameFamilySupport = seed ? session.mainColors.find((color) => color.hex !== seed.hex && hueFamily(color.oklch) === hueFamily(seed.oklch)) : null;
    const analogous = seed ? uniqueChromatic(deriveHue(seed, 24, .92), seed) : null;
    const familiarPalette = seed ? [exact(seed, 'Protagonista · código observado'), sameFamilySupport ? exact(sameFamilySupport, 'Apoyo · código observado') : generated(analogous, 'Apoyo cromático · análogo', seed, 'análoga de matiz')] : [];
    let differentiatedPalette = [];
    if (hasCrossFamilyContrast) {
      const support = uniqueChromatic(deriveHue(contrast, 24, .9), contrast);
      differentiatedPalette = [exact(contrast, 'Protagonista · contraste observado'), generated(support, 'Apoyo cromático · análogo', contrast, 'análoga de matiz')];
    } else if (seed) {
      const opposite = window.TerritorioColor.complementaryHex(seed.hex);
      differentiatedPalette = [generated(opposite, 'Protagonista · contraste propuesto', seed, 'complementaria de matiz'), exact(seed, 'Apoyo · código observado')];
    }
    const selectedComplement = session.manualComplements.find((color) => color.oklch.h !== null);
    const expressivePalette = seed ? [
      generated(deriveHue(seed, 120, .88), 'Protagonista · relación triádica', seed, 'triádica'),
      generated(deriveHue(seed, 240, .78), 'Apoyo cromático · relación triádica', seed, 'triádica'),
      ...(selectedComplement ? [proposal(selectedComplement.hex, 'Acento opcional · seleccionado', `Color elegido por ti, procedente de ${selectedComplement.brand}; no implica que sea un color oficial de esa marca.`, 'confirmado por el usuario')] : []),
    ] : [];
    const noChromaticData = !seed;
    const insufficient = 'La muestra confirmada es monocromática o no contiene colores principales cromáticos suficientes. No se propone un matiz nuevo a partir del negro, blanco o gris; añade un color objetivo o una referencia cromática para comparar estas direcciones.';
    const criteria = `Los criterios declarados (${values}) orientan jerarquía, proporción y tono de aplicación; no les asignamos significados cromáticos universales.`;
    const territoryData = [
      {
        id: 'familiar', title: 'Familiar', tag: 'EVOLUCIONAR CÓDIGOS', premise: 'Mantener un anclaje reconocible y cambiar su tratamiento, proporción y contraste.',
        why: seed ? `El color protagonista conserva el código ${hueFamily(seed.oklch)} observado en ${seed.brand}.` : insufficient,
        relation: repeated,
        difference: 'Es la ruta de mayor continuidad: utiliza un código existente y un apoyo análogo para desarrollarlo sin copiar la paleta completa de una referencia.',
        application: `Usa el color observado en el identificador o elementos recurrentes y limita el análogo a navegación, fondos de sección o acentos. En ${session.sector || 'la categoría indicada'}, prueba las piezas que más verá ${audience}.`,
        validation: 'Comprueba que no se confunda con las referencias al reducir la paleta a logotipo, avatar y una pieza digital; revisa contraste texto/fondo.',
        palette: familiarPalette,
      },
      {
        id: 'distinct', title: 'Diferenciado', tag: 'DESTACAR CON INTENCIÓN', premise: 'Elegir un contraste perceptible dentro de esta muestra y explicar qué se gana y qué debe validarse.',
        why: seed ? `${hasCrossFamilyContrast ? `${contrast.hex} (${hueFamily(contrast.oklch)}) es el color confirmado más alejado del anclaje ${seed.hex} en esta selección.` : `Se explora un matiz complementario a ${seed.hex} porque no hay otra familia cromática confirmada para comparar.`}` : insufficient,
        relation: repeated,
        difference: 'A diferencia de Familiar, cambia el protagonista hacia el color más contrastante disponible; una muestra breve no demuestra que ese código sea diferenciador en todo el mercado.',
        application: `Reserva el contraste para una llamada, navegación o señal visual y usa el color observado como apoyo. Evalúa su adecuación con ${audience} y con el posicionamiento de ${session.sector || 'la marca'}.`,
        validation: 'Valida reconocimiento, contraste accesible, reproducción en pantalla e impresión y legibilidad. No concluyas que el color diferencia fuera de las referencias comparadas.',
        palette: differentiatedPalette,
      },
      {
        id: 'expressive', title: 'Expresivo', tag: 'CONSTRUIR UN CÓDIGO PROPIO', premise: 'Explorar una relación cromática deliberada que requiere validación antes de adoptarse.',
        why: seed ? `La combinación triádica toma ${seed.hex} como anclaje de la muestra y propone dos matices relacionados para explorar una gramática propia.` : insufficient,
        relation: seed ? `La referencia es ${seed.brand} (${seed.hex}); los otros tonos son propuestas formales, no datos observados. ${selectedComplement ? `El acento ${selectedComplement.hex} fue seleccionado por ti y procede de ${selectedComplement.brand}.` : 'No se añade un tercer color porque no has seleccionado un complementario cromático.'}` : 'La muestra no ofrece un anclaje cromático del que derivar con rigor esta exploración.',
        difference: 'Familiar conserva un código observado; Diferenciado contrasta con una referencia disponible; Expresivo construye una relación de tres matices que aún debe validarse.',
        application: `Asigna funciones distintas mediante escala, frecuencia y tipografía, no por significados universales. Contrasta la combinación con ${session.values.length ? `tus criterios (${values})` : 'los valores que definas'} y con ${audience}.`,
        validation: 'Prueba fondos y texto, legibilidad, reproducción y coherencia entre logotipo, web y piezas; reduce la frecuencia de un matiz si compite con el mensaje.',
        palette: expressivePalette,
      },
    ];
    territoryData.forEach((territory) => {
      const seen = new Set(); territory.palette = territory.palette.filter((color) => { if (!color.hex || seen.has(color.hex)) return false; seen.add(color.hex); return true; });
      territory.evidenceLimited = evidenceIsLimited;
      territory.noChromaticData = noChromaticData;
      territory.insufficientMessage = insufficient;
      territory.evidenceNote = evidenceNote;
    });
    return territoryData;
  }

  function addText(parent, tag, text, className = '') {
    const element = document.createElement(tag); if (className) element.className = className; element.textContent = text; parent.append(element); return element;
  }

  function addStrategyParagraph(card, label, text) {
    const section = document.createElement('section'); section.className = 'territory-rationale';
    addText(section, 'h4', label); addText(section, 'p', text); card.append(section);
  }

  function renderTerritories() {
    const session = collectSession(); latestTerritories = buildTerritories(session);
    const context = document.querySelector('[data-territory-context]'); context.replaceChildren();
    const values = session.values.length ? session.values.join(' · ') : 'Sin atributos seleccionados';
    addText(context, 'p', `${session.name}${session.sector ? ` · ${session.sector}` : ''}`, 'territory-context-title');
    addText(context, 'p', `Público: ${session.audience || 'por definir'} · Criterios declarados: ${values}. ${session.description || 'Añade una descripción para afinar la recomendación.'}`, 'territory-context-copy');
    addText(context, 'p', `Los criterios orientan jerarquía, proporción y aplicación; no se traducen a asociaciones cromáticas universales. ${latestTerritories[0]?.evidenceNote || ''}`, 'territory-evidence');
    const grid = document.querySelector('[data-territories]'); grid.replaceChildren();
    latestTerritories.forEach((territory, index) => {
      const card = document.createElement('article'); card.className = `territory-card ${territory.id}`;
      const top = document.createElement('div'); top.className = 'territory-top'; addText(top, 'span', String.fromCharCode(65 + index), 'territory-no'); addText(top, 'span', territory.tag, 'territory-tag'); card.append(top);
      addText(card, 'h3', territory.title); addText(card, 'p', territory.premise, 'territory-premise');
      const palette = document.createElement('div'); palette.className = 'proposal-palette'; palette.setAttribute('aria-label', `Paleta propuesta ${territory.title}`);
      territory.palette.forEach((color) => { const item = document.createElement('div'); item.className = 'proposal-color'; const swatch = document.createElement('span'); swatch.className = 'proposal-swatch'; swatch.style.backgroundColor = color.hex; const detail = document.createElement('div'); addText(detail, 'strong', color.role); addText(detail, 'code', color.hex); addText(detail, 'small', color.note); item.append(swatch, detail); palette.append(item); });
      if (!territory.palette.length) addText(palette, 'p', territory.insufficientMessage, 'palette-empty');
      card.append(palette);
      addStrategyParagraph(card, 'Por qué encaja', territory.why); addStrategyParagraph(card, 'Relación con la muestra', territory.relation); addStrategyParagraph(card, 'Cómo aplicarla', territory.application); addStrategyParagraph(card, 'Qué validar', territory.validation);
      grid.append(card);
    });
  }

  function renderReport() {
    const session = collectSession(); if (!latestTerritories.length) latestTerritories = buildTerritories(session);
    const observation = document.querySelector('[data-report-observation]'); observation.replaceChildren();
    addText(observation, 'h4', 'A. Lectura visual de la competencia');
    const families = new Map(); session.mainColors.forEach((color) => { const key = hueFamily(color.oklch); families.set(key, (families.get(key) || 0) + 1); });
    const repeated = [...families].sort((a, b) => b[1] - a[1])[0];
    addText(observation, 'p', session.competitors.length
      ? `${session.competitors.length} ${session.competitors.length === 1 ? 'marca confirmada' : 'marcas confirmadas'} · ${session.mainColors.length} colores principales cromáticos confirmados. ${repeated ? `${repeated[0]} aparece en ${session.dominantFamily[1].brands.size} de ${session.competitors.length} marcas y acumula ${repeated[1]} muestras. Este recuento describe los códigos aportados, no su área visual.` : 'Las paletas principales son monocromáticas o insuficientes para resumir una familia cromática.'}`
      : 'No hay marcas confirmadas en esta sesión.');
    const provenance = { logo: 0, manual: 0, official: 0, campaign: 0 };
    session.competitors.forEach((brand) => {
      const list = brand.colors.map((color) => `${color.role} ${color.hex} (${color.source === 'logo' ? 'logotipo, estimación' : color.source === 'official' ? 'fuente indicada, no verificada' : color.source === 'manual' ? 'manual' : 'campaña'})`).join(' · ');
      const familiesForBrand = [...new Set(brand.colors.filter((color) => color.role === 'Principal' && color.oklch.h !== null).map((color) => hueFamily(color.oklch)))];
      addText(observation, 'p', `${brand.name}${familiesForBrand.length ? ` · ${familiesForBrand.join(' y ')}` : ' · paleta monocromática'}: ${list || 'sin colores estables'}`, 'report-brand-palette');
      brand.colors.forEach((color) => { if (Object.hasOwn(provenance, color.source)) provenance[color.source] += 1; });
    });
    addText(observation, 'p', `Procedencia registrada: ${provenance.logo} estimaciones de logotipo, ${provenance.manual} introducidos manualmente y ${provenance.official} con fuente indicada por el usuario (no verificada). La muestra está limitada a las referencias confirmadas y no representa todo el mercado.`, 'report-caveat');

    const implications = document.querySelector('[data-report-implications]'); implications.replaceChildren();
    addText(implications, 'h4', 'B. Implicaciones para tu marca');
    const values = session.values.length ? session.values.join(', ') : 'ningún valor seleccionado todavía';
    addText(implications, 'p', `Para ${session.name}${session.sector ? `, en ${session.sector}` : ''} y su público ${session.audience || 'aún por definir'}, los valores declarados (${values}) son criterios para jerarquía, contraste y tono de aplicación; no se traducen a asociaciones cromáticas fijas. ${session.description || 'La oferta del proyecto está vacía; complétala para interpretar mejor el contexto.'}`);
    addText(implications, 'p', session.dominantFamily
      ? `${session.dominantFamily[0]} aparece en ${session.dominantFamily[1].brands.size} marcas de la muestra. Puede conservarse como anclaje o contrastarse con otra familia, pero su repetición no define por sí sola el posicionamiento. La siguiente decisión debe considerar las aplicaciones y la respuesta de ${session.audience || 'tu público objetivo'}.`
      : 'La muestra es acromática o insuficiente para afirmar qué familia conviene conservar. No se inventa un color de oportunidad; define una referencia cromática y contrástala con el público y las aplicaciones de la marca.');

    const directions = document.querySelector('[data-report-directions]'); directions.replaceChildren(); addText(directions, 'h4', 'C. Tres direcciones recomendadas');
    latestTerritories.forEach((territory) => {
      const block = document.createElement('div'); block.className = 'report-direction'; addText(block, 'h5', territory.title);
      addText(block, 'p', territory.why);
      const palette = document.createElement('div'); palette.className = 'report-direction-palette';
      territory.palette.forEach((color) => { const item = document.createElement('div'); item.className = 'report-direction-color'; const swatch = document.createElement('span'); swatch.className = 'report-direction-swatch'; swatch.style.backgroundColor = color.hex; const label = document.createElement('span'); label.textContent = color.role; const hex = document.createElement('code'); hex.textContent = color.hex; item.append(swatch, label, hex); palette.append(item); });
      block.append(palette);
      addText(block, 'p', `Aplicación: ${territory.application} Validación: ${territory.validation}`); directions.append(block);
    });

    const steps = document.querySelector('[data-report-next-steps]'); steps.replaceChildren(); addText(steps, 'h4', 'D. Próximos pasos');
    const list = document.createElement('ol');
    latestTerritories.forEach((territory) => {
      const colors = territory.palette.map((color) => `${color.role} ${color.hex}`).join(' + ');
      addText(list, 'li', `${territory.title}: prueba ${colors || 'la combinación cuando confirmes una referencia cromática'} con texto y fondos claros y oscuros; revisa contraste, legibilidad y su aplicación a logotipo, pantalla móvil y pieza impresa.`);
    });
    addText(list, 'li', `Contrasta las tres rutas con ${session.audience || 'personas del público objetivo'} y registra qué comunica cada composición; valida reproducción y coherencia con ${session.sector || 'la categoría'} y con los valores elegidos.`);
    steps.append(list);
    const cover = document.querySelector('[data-report-brand]'); cover.textContent = ''; cover.append(document.createTextNode(`${session.name}\n`)); const emphasis = document.createElement('em'); emphasis.textContent = 'en contexto.'; cover.append(emphasis);
  }

  document.querySelector('[data-print-report]').addEventListener('click', () => window.print());
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
      attributeFeedback.textContent = `${selectedCount} de 3 seleccionados · Criterios declarados para orientar las propuestas.`;
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

