// Temporary manual control for checking upgrade thresholds in the Vite dev server.
export function createUpgradeDebug(state, upgrades, onTrigger) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'upgrade-debug-button';
  button.addEventListener('click', () => {
    if (state.mode !== 'playing') return;
    onTrigger();
    update();
  });
  document.querySelector('.hud').append(button);

  function update() {
    button.classList.toggle('hidden', state.mode !== 'playing');
    button.textContent = `Test upgrade at ${upgrades.nextThreshold}`;
  }

  update();
  return { update };
}
