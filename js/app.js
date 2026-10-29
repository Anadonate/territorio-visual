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
    const secondaryColors = brand.secondary.filter((color) => color.kind !== 'neutral');
    [[secondaryColors, 'Colores secundarios'], [neutralColors, 'Neutros · blanco, negro y grises']].forEach(([colors, title]) => {
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
    const neutralRamp = document.querySelector('[data-neutral-ramp]');
    const campaignSection = document.querySelector('[data-campaign-section]');
    const campaignList = document.querySelector('[data-campaign-list]');
    const comparisonList = document.querySelector('[data-comparison-list]');
    const emptyMap = document.querySelector('[data-map-empty]');
    legend.replaceChildren(); colorList.replaceChildren(); neutralList.replaceChildren(); neutralRamp.replaceChildren(); campaignList.replaceChildren(); comparisonList.replaceChildren();
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
      const radius = (1 - oklch.L) * 190;
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
    if (neutral.length) {
      const track = document.createElement('div'); track.className = 'neutral-track';
      neutral.forEach((datum) => {
        const marker = document.createElement('span'); marker.className = 'neutral-marker';
        const neutralPosition = (1 - datum.oklch.L) * 100;
        marker.style.left = `${neutralPosition}%`;
        if (neutralPosition < 24) marker.classList.add('neutral-marker-start');
        if (neutralPosition > 76) marker.classList.add('neutral-marker-end');
        marker.style.backgroundColor = datum.hex;
        marker.setAttribute('role', 'img');
        marker.setAttribute('aria-label', `${datum.brand.name}, ${datum.hex}, ${formatOklch(datum.oklch)}`);
        const title = document.createElement('span'); title.textContent = `${datum.brand.name} · ${datum.hex}`;
        marker.append(title); track.append(marker);
      });
      const whiteLabel = document.createElement('span'); whiteLabel.className = 'neutral-ramp-white'; whiteLabel.textContent = 'L 100 · BLANCO';
      const blackLabel = document.createElement('span'); blackLabel.className = 'neutral-ramp-black'; blackLabel.textContent = 'L 0 · NEGRO';
      neutralRamp.append(track, whiteLabel, blackLabel);
    }
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

