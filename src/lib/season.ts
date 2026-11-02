/** Новогодний сезон: гирлянда — с 1 декабря по 15 января; ёлочка вместо «Б» — 31 декабря и 1 января. */
const forced = () => {
  try {
    return new URLSearchParams(window.location.search).has('newyear')
  } catch {
    return false
  }
}

export function isNewYearSeason(d = new Date()) {
  const m = d.getMonth()
  const day = d.getDate()
  return forced() || m === 11 || (m === 0 && day <= 15)
}

export function isNewYearEve(d = new Date()) {
  const m = d.getMonth()
  const day = d.getDate()
  return forced() || (m === 11 && day === 31) || (m === 0 && day === 1)
}
