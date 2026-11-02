export type MarkerKind = 'from' | 'stop' | 'to'

/** DOM-элемент кастомного маркера (А / остановка / Б) — используется в MapLibre. */
export function createMarkerElement(kind: MarkerKind, label: string): HTMLDivElement {
  const el = document.createElement('div')
  el.className = `route-marker route-marker--${kind}`
  el.innerHTML = `
    <div class="route-marker__inner">
      <div class="route-marker__pin"><span></span></div>
      <div class="route-marker__tip"></div>
    </div>
    <div class="route-marker__shadow"></div>`
  updateMarkerElement(el, kind, label)
  return el
}

export function updateMarkerElement(el: HTMLElement, kind: MarkerKind, label: string) {
  el.className = el.className.replace(/route-marker--\w+/, `route-marker--${kind}`)
  el.setAttribute('aria-label', kind === 'from' ? 'Старт' : kind === 'to' ? 'Финиш' : `Остановка ${label}`)
  const span = el.querySelector('.route-marker__pin span')
  if (span) span.textContent = label
}

/** Перезапускает анимацию «появления» маркера. */
export function replayMarker(el: HTMLElement) {
  el.classList.remove('is-dropping')
  void el.offsetWidth
  el.classList.add('is-dropping')
}

/** Маркер «Я здесь»: синяя точка с пульсацией и конусом направления */
export function createMeElement(): HTMLDivElement {
  const el = document.createElement('div')
  el.className = 'me-marker'
  el.setAttribute('aria-label', 'Вы здесь')
  el.innerHTML = `<div class="me-marker__cone"></div><div class="me-marker__pulse"></div><div class="me-marker__dot"></div>`
  return el
}
