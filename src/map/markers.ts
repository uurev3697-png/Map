/** DOM-элемент кастомного маркера А / Б (используется в MapLibre и Google). */
export function createMarkerElement(which: 'from' | 'to'): HTMLDivElement {
  const el = document.createElement('div')
  el.className = `route-marker route-marker--${which}`
  el.setAttribute('aria-label', which === 'from' ? 'Точка А' : 'Точка Б')
  el.innerHTML = `
    <div class="route-marker__inner">
      <div class="route-marker__pin"><span>${which === 'from' ? 'А' : 'Б'}</span></div>
      <div class="route-marker__tip"></div>
    </div>
    <div class="route-marker__shadow"></div>`
  return el
}

/** Перезапускает анимацию «появления» маркера. */
export function replayMarker(el: HTMLElement) {
  el.classList.remove('is-dropping')
  void el.offsetWidth
  el.classList.add('is-dropping')
}
