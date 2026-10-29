(() => {
  const entries = [...document.querySelectorAll('[data-entry]')];
  const brandEntry = entries.find((entry) => entry.dataset.entry === 'brand');
  const competitorEntries = entries.filter((entry) => entry.dataset.entry === 'competitor');
  const results = document.querySelector('[data-results]');
  const globalStatus = document.querySelector('[data-global-status]');
  const hexPattern = /^#[0-9a-f]{6}$/i;

  function setStatus(entry, message, error = false) {
    const status = entry.querySelector('[data-status]');
    status.textContent = message;
    status.classList.toggle('is-error', error);
  }
  function setColor(entry, hex, message) {
    entry.querySelector('[data-color-control]').hidden = false;
    entry.querySelector('[data-picker]').value = hex;
    entry.querySelector('[data-hex]').value = hex.toUpperCase();
    entry.dataset.color = hex.toUpperCase();
    setStatus(entry, message || 'Revisa que esta muestra represente el color principal de la marca.');
  }
  entries.forEach((entry) => {
    const fileInput = entry.querySelector('[data-file]');
    const nameInput = entry.querySelector('[data-name]');
    const preview = entry.querySelector('[data-preview]');
    const uploadTitle = entry.querySelector('[data-upload-title]');
    const picker = entry.querySelector('[data-picker]');
    const hexInput = entry.querySelector('[data-hex]');
    let previewUrl = null;
    let loadToken = 0;
    fileInput.addEventListener('change', async () => {
      const file = fileInput.files && fileInput.files[0];
      if (!file) return;
      const token = ++loadToken;
      uploadTitle.textContent = 'Analizando logotipo…';
      setStatus(entry, 'Buscando el color con más presencia en la imagen.');
      try {
        const loaded = await window.TerritorioColor.loadLogo(file);
        if (token !== loadToken) { URL.revokeObjectURL(loaded.previewUrl); return; }
        const extracted = window.TerritorioColor.extractColors(loaded.image);
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        previewUrl = loaded.previewUrl;
        preview.replaceChildren();
        const image = document.createElement('img');
        image.src = previewUrl;
        image.alt = 'Vista previa del logotipo subido';
        preview.append(image);
        uploadTitle.textContent = file.name;
        setColor(entry, extracted.colors[0].hex, 'Color dominante estimado. Comprueba que corresponda al color principal y no al fondo.');
      } catch (error) {
        if (token !== loadToken) return;
        uploadTitle.textContent = 'No se pudo leer el archivo';
        setStatus(entry, error.message || 'Prueba con un PNG o JPEG.', true);
      }
    });
    picker.addEventListener('input', () => {
      hexInput.value = picker.value.toUpperCase();
      entry.dataset.color = picker.value.toUpperCase();
      setStatus(entry, 'Color ajustado por ti. Se usará esta muestra en la comparación.');
    });
    hexInput.addEventListener('change', () => {
      const value = hexInput.value.trim();
      if (!hexPattern.test(value)) {
        hexInput.setAttribute('aria-invalid', 'true');
        setStatus(entry, 'Introduce un código HEX válido, por ejemplo #EA5A77.', true);
        return;
      }
      hexInput.removeAttribute('aria-invalid');
      setColor(entry, value.toUpperCase(), 'Color ajustado por ti. Se usará esta muestra en la comparación.');
    });
    nameInput.addEventListener('input', () => { entry.dataset.brandName = nameInput.value.trim(); });
  });

  function nameFor(entry, fallback) { return entry.querySelector('[data-name]').value.trim() || fallback; }
  function colorFamily(hex) {
    const color = window.TerritorioColor.toOklch(hex);
    if (color.h === null || color.C < 0.035) {
      if (color.L < 0.23) return 'negro';
      if (color.L > 0.91) return 'blanco';
      return 'neutro';
    }
    const h = color.h;
    if (h < 18 || h >= 345) return 'rojo y rosa';
    if (h < 45) return 'naranja';
    if (h < 68) return 'amarillo';
    if (h < 160) return 'verde';
    if (h < 205) return 'turquesa';
    if (h < 255) return 'azul';
    if (h < 290) return 'violeta';
    if (h < 325) return 'magenta';
    return 'rojo y rosa';
  }
  function colorLabel(hex) {
    const family = colorFamily(hex);
    const labels = {'rojo y rosa':'rojos y rosas',naranja:'naranjas',amarillo:'amarillos',verde:'verdes',turquesa:'turquesas',azul:'azules',violeta:'violetas',magenta:'magenta',negro:'negros',blanco:'blancos',neutro:'tonos neutros'};
    return labels[family] || family;
  }
  function readableText(hex) {
    const value = hex.slice(1);
    const channels = [0,2,4].map((i) => parseInt(value.slice(i,i+2),16)/255).map((v) => v <= .04045 ? v/12.92 : ((v+.055)/1.055)**2.4);
    return .2126*channels[0]+.7152*channels[1]+.0722*channels[2] > .48 ? '#292729' : '#FFFFFF';
  }
  function buildBoard(all) {
    const board = document.querySelector('[data-board]');
    board.replaceChildren();
    all.forEach((item, index) => {
      const card = document.createElement('article');
      card.className = index === 0 ? 'comparison-item comparison-own' : 'comparison-item';
      const swatch = document.createElement('div');
      swatch.className = 'comparison-swatch';
      swatch.style.backgroundColor = item.hex;
      swatch.style.color = readableText(item.hex);
      const tag = document.createElement('span');
      tag.textContent = index === 0 ? 'TU MARCA' : 'REFERENCIA';
      const hex = document.createElement('strong');
      hex.textContent = item.hex;
      swatch.append(tag, hex);
      const name = document.createElement('h3');
      name.textContent = item.name;
      const family = document.createElement('p');
      family.textContent = colorLabel(item.hex);
      card.append(swatch, name, family);
      board.append(card);
    });
  }
  function renderResults() {
    const own = {name:nameFor(brandEntry,'Tu marca'),hex:brandEntry.dataset.color};
    const competitors = competitorEntries.filter((entry) => hexPattern.test(entry.dataset.color || '')).map((entry,index) => ({name:nameFor(entry,'Marca '+(index+1)),hex:entry.dataset.color}));
    const families = competitors.map((item) => colorFamily(item.hex));
    const ownFamily = colorFamily(own.hex);
    const sameFamily = competitors.filter((item) => colorFamily(item.hex) === ownFamily);
    buildBoard([own,...competitors]);
    const observation = document.querySelector('[data-observation]');
    const observationTitle = document.querySelector('[data-observation-title]');
    const interpretation = document.querySelector('[data-interpretation]');
    const recommendation = document.querySelector('[data-recommendation]');
    const familyName = colorLabel(own.hex);
    observationTitle.textContent = 'Tu color principal está en la familia de '+familyName+'.';
    if (sameFamily.length === competitors.length) {
      observation.textContent = (competitors.length === 1 ? 'La marca de referencia también utiliza' : 'Todas las marcas de referencia utilizan')+' un color de la familia de '+familyName+'. Es una coincidencia de familia cromática; no significa que los tonos sean idénticos.';
      interpretation.textContent = 'Compartir una familia de color puede hacer que varias marcas se perciban como parte de un mismo universo visual. La diferencia también depende de la forma del logotipo, la tipografía, el tono exacto y cómo se aplica el color.';
      recommendation.textContent = 'Antes de cambiar de familia, prueba a ajustar el tono, la luminosidad o la proporción de color y revisa el resultado junto a los logotipos de tu categoría. Si buscas una diferencia más visible, compara también una ruta cromática alternativa con tu público.';
    } else if (sameFamily.length > 0) {
      observation.textContent = sameFamily.map((item) => item.name).join(', ')+' comparte'+(sameFamily.length > 1 ? 'n' : '')+' contigo la familia de '+familyName+'. '+(competitors.length-sameFamily.length)+' '+(competitors.length-sameFamily.length === 1 ? 'marca utiliza' : 'marcas utilizan')+' otra familia cromática en esta muestra.';
      interpretation.textContent = 'Tu color aparece en una parte del paisaje visual observado, pero no en todas las referencias. Esto puede ofrecer un punto de familiaridad y, a la vez, margen para diferenciar el tono o el sistema visual.';
      recommendation.textContent = 'Decide si quieres reforzar los códigos reconocibles de la categoría o separarte de ellos. Compara variaciones de tu color principal y pruébalas en el logotipo, la web y los materiales reales antes de decidir.';
    } else {
      observation.textContent = 'Ninguna de las '+competitors.length+' marcas que has añadido está clasificada en la misma familia cromática que tu color principal. Dentro de esta pequeña muestra, tu color tiene una familia distinta.';
      interpretation.textContent = 'La diferencia puede ayudar a que la identidad destaque visualmente en este conjunto, pero no demuestra que exista una oportunidad de mercado ni que el público vaya a recordarla mejor.';
      recommendation.textContent = 'Comprueba que el color encaje con la personalidad, el público y el contexto de tu marca. Prueba el logotipo junto a referencias reales y valida si la diferencia se entiende como intencionada, no como una elección desconectada de la categoría.';
    }
    if (new Set(families).size === 1 && competitors.length > 1) observation.textContent += ' Además, las referencias se concentran en una sola familia cromática.';
    else if (new Set(families).size === competitors.length && competitors.length > 1) observation.textContent += ' Las referencias se reparten entre distintas familias cromáticas.';
    results.hidden = false;
    globalStatus.textContent = 'Comparación preparada: tu marca y '+competitors.length+' '+(competitors.length === 1 ? 'referencia' : 'referencias')+'.';
    results.scrollIntoView({behavior:'smooth',block:'start'});
  }
  document.querySelector('[data-analyze]').addEventListener('click', () => {
    if (!hexPattern.test(brandEntry.dataset.color || '')) {
      globalStatus.textContent = 'Primero sube el logotipo de tu marca y revisa su color principal.';
      brandEntry.scrollIntoView({behavior:'smooth',block:'center'});
      brandEntry.querySelector('[data-file]').focus();
      return;
    }
    const competitors = competitorEntries.filter((entry) => hexPattern.test(entry.dataset.color || ''));
    if (!competitors.length) {
      globalStatus.textContent = 'Añade al menos un logotipo de referencia para poder comparar colores.';
      competitorEntries[0].scrollIntoView({behavior:'smooth',block:'center'});
      competitorEntries[0].querySelector('[data-file]').focus();
      return;
    }
    renderResults();
  });
  document.querySelector('[data-edit]').addEventListener('click', () => document.querySelector('#comparar').scrollIntoView({behavior:'smooth'}));
  document.querySelector('[data-print]').addEventListener('click', () => window.print());
})();