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
  document.querySelector('[data-home]').addEventListener('click', (event) => {
    event.preventDefault();
    showWelcome();
  });

  // The first step is available as an initial design preview; no answers are stored.
  screens[0].hidden = true;
  welcome.hidden = false;
})();

