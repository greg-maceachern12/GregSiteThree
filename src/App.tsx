import { useEffect, useId, useRef, useState } from 'react'
import { moments, type Card } from './content/moments'
import { stones } from './content/stones'
import { village } from './content/village'
import type { Diorama } from './scene/createDiorama'

const cards: Card[] = [...moments, ...stones, ...village]

function hostLabel(href: string) {
  try {
    return new URL(href).host.replace(/^www\./, '')
  } catch {
    return href
  }
}

export function App() {
  const worldRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const cardRef = useRef<HTMLDivElement>(null)
  const buttonRefs = useRef(new Map<string, HTMLButtonElement>())
  const dioramaRef = useRef<Diorama | null>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'failed'>('loading')
  const [progress, setProgress] = useState(0)
  const [paused, setPaused] = useState(false)
  const [reduced, setReduced] = useState(false)
  const [openId, setOpenId] = useState<string | null>(null)
  const titleId = useId()
  const openIndex = openId ? cards.findIndex((card) => card.id === openId) : -1
  const open = openIndex >= 0 ? cards[openIndex] : null
  const percent = Math.round(progress * 100)
  const hold = status === 'loading'

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const apply = () => {
      setReduced(media.matches)
      dioramaRef.current?.setReducedMotion(media.matches)
    }
    apply()
    media.addEventListener('change', apply)
    return () => media.removeEventListener('change', apply)
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    const world = worldRef.current
    if (!canvas || !world) return

    let dead = false
    const anchors = cards.flatMap((card) => {
      const element = buttonRefs.current.get(card.id)
      if (!element) return []
      return [{
        id: card.id,
        name: card.name,
        position: card.position,
        element,
        icon: card.icon,
        place: card.place,
      }]
    })

    void (async () => {
      try {
        const { createDiorama } = await import('./scene/createDiorama')
        if (dead) return
        const diorama = await createDiorama(canvas, {
          world,
          anchors,
          reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
          onProgress: (ratio) => {
            if (!dead) setProgress(ratio)
          },
          onReady: () => {
            if (!dead) setStatus('ready')
          },
          onFail: () => {
            if (!dead) setStatus('failed')
          },
        })
        if (dead) {
          diorama.dispose()
          return
        }
        dioramaRef.current = diorama
      } catch {
        if (!dead) setStatus('failed')
      }
    })()

    return () => {
      dead = true
      dioramaRef.current?.dispose()
      dioramaRef.current = null
    }
  }, [])

  useEffect(() => {
    const diorama = dioramaRef.current
    if (!diorama) return
    diorama.setPaused(paused)
    diorama.setReducedMotion(reduced)
    diorama.setCard(openId, openId ? cardRef.current : null)
  }, [paused, reduced, openId, status])

  useEffect(() => {
    if (!openId) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeCard(true)
      } else if (event.key === 'ArrowRight') {
        event.preventDefault()
        stepCard(1)
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault()
        stepCard(-1)
      }
    }
    const onPointer = (event: PointerEvent) => {
      const target = event.target
      if (!(target instanceof Node)) return
      if (cardRef.current?.contains(target)) return
      if (target instanceof Element && target.closest('[data-anchor], .controls, .intro')) return
      closeCard(false)
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('pointerdown', onPointer)
    cardRef.current?.querySelector<HTMLButtonElement>('[data-close]')?.focus()
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('pointerdown', onPointer)
    }
  }, [openId])

  function closeCard(restoreFocus: boolean) {
    const id = openId
    setOpenId(null)
    if (restoreFocus && id) buttonRefs.current.get(id)?.focus()
  }

  function stepCard(delta: number) {
    if (openIndex < 0) return
    const nextIndex = (openIndex + delta + cards.length) % cards.length
    setOpenId(cards[nextIndex].id)
  }

  return (
    <main
      className="page"
      data-scene-status={status}
      data-modal-open={open ? 'true' : undefined}
      aria-busy={status === 'loading'}
    >
      <header className="intro" inert={hold}>
        <div className="intro-row">
          <h1>Greg Mac</h1>
          <nav aria-label="Links">
            {/* TODO: GitHub handle */}
            <a
              href="#"
              aria-label="GitHub"
              onClick={(event) => event.preventDefault()}
            >
              <GitHubIcon />
            </a>
          </nav>
        </div>
      </header>

      <div
        className="world"
        ref={worldRef}
        role="region"
        aria-label="Interactive lake"
        aria-busy={status === 'loading'}
        inert={hold}
      >
        {status === 'failed' ? (
          <div className="preview" aria-hidden="true">
            <picture>
              <source media="(max-width: 700px)" srcSet="/map-preview/mobile.webp" />
              <img
                src="/map-preview/desktop.webp"
                alt=""
                width={2400}
                height={800}
                decoding="async"
              />
            </picture>
          </div>
        ) : null}
        <canvas ref={canvasRef} aria-hidden="true" />
        {cards.map((card) => {
          const isMilestone = !card.place
          return (
            <button
              key={card.id}
              type="button"
              className={`anchor ${isMilestone ? 'anchor-milestone' : `anchor-${card.place}`}`}
              data-anchor={card.id}
              data-kind={card.place ?? 'milestone'}
              aria-label={card.name}
              aria-haspopup="dialog"
              aria-expanded={openId === card.id}
              ref={(node) => {
                if (node) buttonRefs.current.set(card.id, node)
                else buttonRefs.current.delete(card.id)
              }}
              onPointerEnter={() => dioramaRef.current?.setHovered(card.id)}
              onPointerLeave={() => dioramaRef.current?.setHovered(null)}
              onFocus={() => dioramaRef.current?.setHovered(card.id)}
              onBlur={() => dioramaRef.current?.setHovered(null)}
              onClick={() => setOpenId(card.id)}
            >
              {isMilestone ? (
                <span className="milestone-pill" aria-hidden="true">
                  <span className="point" />
                  <span className="milestone-text">
                    {card.id === 'microsoft' ? <FourPaneMark /> : null}
                    <span className="milestone-name">{card.name}</span>
                  </span>
                  <span className="milestone-cta">+</span>
                </span>
              ) : (
                <span className="marker-badge" aria-hidden="true">
                  <span className="point" />
                  {card.icon ? <img className="marker-icon" src={card.icon} alt="" /> : null}
                  <span className="marker-plus">+</span>
                </span>
              )}
              <span className="hover-label">
                {card.id === 'microsoft' ? <FourPaneMark /> : null}
                {card.icon ? <img src={card.icon} alt="" /> : null}
                <span className="hover-label-copy">
                  <span className="hover-label-title">{card.name}</span>
                  {card.role || card.detail ? (
                    <span className="hover-label-sub">{card.role ?? card.detail}</span>
                  ) : null}
                </span>
                <span className="hover-label-hint" aria-hidden="true">
                  Expand →
                </span>
              </span>
            </button>
          )
        })}

        {open ? (
          <div className="modal-backdrop" aria-hidden="false">
            <div
              key={open.id}
              className="card"
              ref={cardRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby={titleId}
            >
              <div className="card-topbar">
                <button
                  type="button"
                  className="close"
                  data-close
                  aria-label="Close"
                  onClick={() => closeCard(true)}
                >
                  ×
                </button>
              </div>

              <div className="card-header">
                {open.id === 'microsoft' || open.icon ? (
                  <div className="card-emblem" aria-hidden="true">
                    {open.id === 'microsoft' ? <FourPaneMark /> : null}
                    {open.icon ? <img className="project-icon" src={open.icon} alt="" /> : null}
                  </div>
                ) : (
                  <div className="card-emblem card-emblem-glyph" aria-hidden="true">
                    <MomentGlyph id={open.id} />
                  </div>
                )}
                <div className="card-titles">
                  <h2 id={titleId}>{open.name}</h2>
                  {open.role ? <p className="role">{open.role}</p> : null}
                </div>
              </div>

              {open.detail ? <p className="detail">{open.detail}</p> : null}
              {open.summary ? <p className="card-summary">{open.summary}</p> : null}

              <div className="card-footer">
                {open.href ? (
                  <a className="card-link" href={open.href} target="_blank" rel="noreferrer">
                    <span>{hostLabel(open.href)}</span>
                    <span className="card-link-arrow" aria-hidden="true">↗</span>
                  </a>
                ) : (
                  <span className="card-counter">
                    {openIndex + 1} / {cards.length}
                  </span>
                )}

                <div className="card-nav" role="group" aria-label="Navigate moments">
                  <button
                    type="button"
                    className="card-nav-btn"
                    aria-label="Previous moment"
                    onClick={() => stepCard(-1)}
                  >
                    ←
                  </button>
                  <button
                    type="button"
                    className="card-nav-btn"
                    aria-label="Next moment"
                    onClick={() => stepCard(1)}
                  >
                    →
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {status === 'failed' ? (
          <ul className="fallback">
            {cards.map((card) => (
              <li key={card.id}>
                <button type="button" onClick={() => setOpenId(card.id)}>
                  {card.name}
                </button>
                {card.href ? (
                  <a href={card.href} target="_blank" rel="noreferrer">
                    {hostLabel(card.href)}
                  </a>
                ) : null}
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      <p className="sr" role="status">
        {status === 'loading'
          ? 'Loading the lake'
          : status === 'ready'
            ? 'The lake is ready.'
            : 'The lake could not be loaded.'}
      </p>

      <div className="loading-screen" aria-hidden={status !== 'loading'}>
        <LakeMark />
        <div
          className="loading-track"
          role="progressbar"
          aria-label="Loading the lake"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent}
        >
          <span className="loading-fill" style={{ width: `${percent}%` }} />
        </div>
      </div>

      <footer className="footer" inert={hold}>
        <div className="controls">
          <button
            type="button"
            disabled={status !== 'ready'}
            aria-label={paused ? 'Play motion' : 'Pause motion'}
            aria-pressed={paused}
            onClick={() => setPaused((value) => !value)}
          >
            {paused ? '▶' : 'Ⅱ'}
          </button>
          <button
            type="button"
            disabled={status !== 'ready'}
            aria-label="Reset view"
            onClick={() => {
              setOpenId(null)
              dioramaRef.current?.setHovered(null)
              dioramaRef.current?.resetView()
            }}
          >
            ↺
          </button>
        </div>
      </footer>
    </main>
  )
}

function LakeMark() {
  return (
    <svg className="loading-mark" viewBox="0 0 64 40" aria-hidden="true">
      <ellipse cx="32" cy="20" rx="22" ry="12" fill="#3f7c82" />
    </svg>
  )
}

function FourPaneMark() {
  return (
    <span className="mark" aria-hidden="true">
      <i />
      <i />
      <i />
      <i />
    </span>
  )
}

function MomentGlyph({ id }: { id: string }) {
  switch (id) {
    case 'queens':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 3L2 8l10 5 10-5-10-5z" />
          <path d="M6 10.5V16c0 1.7 2.7 3 6 3s6-1.3 6-3v-5.5" />
        </svg>
      )
    case 'seattle':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 3v14" />
          <path d="M12 4l7 10h-7" />
          <path d="M12 6L6 14h6" />
          <path d="M4 17h16l-2 3H6l-2-3z" />
        </svg>
      )
    case 'newyork':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 10.5L12 3l9 7.5" />
          <path d="M5 9.5V20h14V9.5" />
          <path d="M9 20v-6h6v6" />
        </svg>
      )
    case 'music':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 18V5l12-2v13" />
          <circle cx="6" cy="18" r="3" />
          <circle cx="18" cy="16" r="3" />
        </svg>
      )
    case 'range':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 19l6-8 4 5 3-4 5 7H3z" />
          <circle cx="17" cy="6" r="2" />
        </svg>
      )
    default:
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="8" />
          <path d="M12 8v4l2.5 2.5" />
        </svg>
      )
  }
}

function GitHubIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M12 2.2a10 10 0 0 0-3.16 19.49c.5.09.68-.22.68-.48v-1.7c-2.78.6-3.37-1.18-3.37-1.18-.45-1.16-1.1-1.47-1.1-1.47-.9-.62.07-.6.07-.6 1 .07 1.52 1.02 1.52 1.02.9 1.52 2.34 1.08 2.91.83.09-.65.35-1.08.63-1.33-2.22-.25-4.56-1.11-4.56-4.95 0-1.09.39-1.99 1.03-2.69-.1-.25-.45-1.27.1-2.64 0 0 .84-.27 2.75 1.02a9.5 9.5 0 0 1 5 0c1.91-1.29 2.75-1.02 2.75-1.02.55 1.37.2 2.39.1 2.64.64.7 1.03 1.6 1.03 2.69 0 3.85-2.34 4.7-4.57 4.95.36.31.68.92.68 1.86v2.76c0 .26.18.58.69.48A10 10 0 0 0 12 2.2Z"
      />
    </svg>
  )
}
