import { useEffect, useRef } from 'react'

interface Flake {
  x: number
  y: number
  r: number
  vy: number
  sway: number
  phase: number
  a: number
}

/**
 * Лёгкий снегопад поверх карты (canvas, без зависимостей).
 * Не перехватывает клики, засыпает во вкладке в фоне и уважает prefers-reduced-motion.
 */
export function Snowfall({ dark }: { dark: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let w = 0
    let h = 0
    let flakes: Flake[] = []
    const spawn = (anyY: boolean): Flake => {
      const r = Math.random() ** 2 * 2.6 + (dark ? 0.8 : 1.2)
      return {
        x: Math.random() * w,
        y: anyY ? Math.random() * h : -10,
        r,
        vy: 18 + r * 16 + Math.random() * 10, // px/с — крупные падают быстрее
        sway: 8 + Math.random() * 18,
        phase: Math.random() * Math.PI * 2,
        a: 0.55 + Math.random() * 0.4,
      }
    }
    const resize = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      w = canvas.clientWidth
      h = canvas.clientHeight
      canvas.width = w * dpr
      canvas.height = h * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      const target = Math.min(170, Math.round((w * h) / 9000))
      while (flakes.length < target) flakes.push(spawn(true))
      flakes = flakes.slice(0, target)
    }
    resize()
    window.addEventListener('resize', resize)

    let raf = 0
    let last = performance.now()
    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      ctx.clearRect(0, 0, w, h)
      // На светлой карте снежинкам нужна лёгкая тень, иначе они теряются
      // На тёмной карте — мягкое свечение; на светлой (заснеженной) белое сливается с фоном,
      // поэтому даём снежинкам тонкий голубовато-серый контур
      ctx.shadowColor = dark ? 'rgba(255,255,255,0.35)' : 'transparent'
      ctx.shadowBlur = dark ? 4 : 0
      ctx.fillStyle = '#ffffff'
      ctx.strokeStyle = 'rgba(70,105,150,0.75)'
      ctx.lineWidth = 0.9
      for (let i = 0; i < flakes.length; i++) {
        const f = flakes[i]
        f.y += f.vy * dt
        f.phase += dt * 0.9
        const x = f.x + Math.sin(f.phase) * f.sway
        if (f.y - f.r > h) flakes[i] = spawn(false)
        ctx.globalAlpha = f.a
        ctx.beginPath()
        ctx.arc(x, f.y, f.r, 0, Math.PI * 2)
        ctx.fill()
        if (!dark) ctx.stroke()
      }
      raf = requestAnimationFrame(frame)
    }
    const start = () => {
      cancelAnimationFrame(raf)
      last = performance.now()
      raf = requestAnimationFrame(frame)
    }
    const onVis = () => (document.hidden ? cancelAnimationFrame(raf) : start())
    document.addEventListener('visibilitychange', onVis)
    start()

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [dark])

  return <canvas ref={ref} aria-hidden className="pointer-events-none absolute inset-0 z-10 h-full w-full" />
}
