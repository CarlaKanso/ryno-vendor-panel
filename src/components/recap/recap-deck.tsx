"use client";

import { ArrowLeft, ChevronDown, ChevronUp, Printer } from "lucide-react";
import { useReducedMotion } from "motion/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { cn } from "@/lib/cn";

/**
 * The recap deck: one slide per screen, scroll-snapped, played in order.
 *
 * What the JavaScript here actually does is small, and worth being precise
 * about, because the rest of the recap is server-rendered:
 *
 *  - an IntersectionObserver decides which slide is "active", and remembers
 *    every slide that has ever been reached (`seen`);
 *  - `data-seen` on a slide is what lets its entrances play — the CSS in
 *    `globals.css` holds the animations paused until then, so each slide
 *    plays when you arrive at it rather than all at once on load;
 *  - arrow keys, page keys and space move between slides; Escape goes home.
 *
 * The cover slide is marked `data-seen` in the server HTML, so it plays on
 * first paint like every other entrance in the app, with no wait for
 * hydration. And with no JavaScript at all nothing is ever paused: the deck
 * degrades to a page of sections, every one of them visible and printable.
 */

export type SlideTone = "green" | "gold" | "light";

export type RecapSlide = {
  /** Short, for the progress dots' accessible names. */
  label: string;
  tone: SlideTone;
  content: ReactNode;
};

const TONE_CLASS: Record<SlideTone, string> = {
  green: "bg-ryno-900 text-white",
  gold: "bg-gold-400 text-ryno-950",
  light: "bg-canvas text-ink-900",
};

/**
 * The overlay chrome sits on whichever slide is active, so it has to change
 * with it: white on the deep green, ink on gold and on the light slides.
 */
const CHROME: Record<
  SlideTone,
  { button: string; pill: string; dot: string; dotActive: string; muted: string }
> = {
  green: {
    button: "bg-white/10 text-white hover:bg-white/20",
    pill: "bg-black/25",
    dot: "bg-white/50 hover:bg-white/80",
    dotActive: "bg-gold-400",
    muted: "text-white/70 hover:text-white",
  },
  gold: {
    button: "bg-ryno-950/10 text-ryno-950 hover:bg-ryno-950/20",
    pill: "bg-ryno-950/10",
    dot: "bg-ryno-950/30 hover:bg-ryno-950/60",
    dotActive: "bg-ryno-950",
    muted: "text-ryno-950/60 hover:text-ryno-950",
  },
  light: {
    button: "bg-ink-900/10 text-ink-900 hover:bg-ink-900/15",
    pill: "bg-ink-900/10",
    dot: "bg-ink-900/25 hover:bg-ink-900/50",
    dotActive: "bg-ryno-600",
    muted: "text-ink-900/50 hover:text-ink-900",
  },
};

const SeenContext = createContext(false);

/** Whether the slide this sits inside has been reached — what a count-up waits for. */
export function useSlideSeen(): boolean {
  return useContext(SeenContext);
}

export function RecapDeck({
  slides,
  title,
  homeHref = "/",
}: {
  slides: RecapSlide[];
  title: string;
  homeHref?: string;
}) {
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const deckRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const [seen, setSeen] = useState<ReadonlySet<number>>(() => new Set([0]));

  useEffect(() => {
    const deck = deckRef.current;
    if (!deck) return;

    // `data-js` is the CSS's signal that the deck is in charge of the reveal
    // choreography. It is set on the node, not rendered, because it must be
    // absent from the server HTML — that is what keeps the no-JavaScript
    // fallback (everything visible) working.
    deck.dataset.js = "";

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const index = Number((entry.target as HTMLElement).dataset.index);
          setActive(index);
          setSeen((previous) => (previous.has(index) ? previous : new Set(previous).add(index)));
        }
      },
      // Half the slide in view is "arrived": early enough that the entrance
      // is under way as the snap settles, late enough not to fire on a flick past.
      { root: deck, threshold: 0.5 },
    );

    for (const slide of deck.querySelectorAll<HTMLElement>("[data-index]")) {
      observer.observe(slide);
    }
    deck.focus({ preventScroll: true });

    return () => observer.disconnect();
  }, []);

  const goTo = useCallback(
    (index: number) => {
      const clamped = Math.max(0, Math.min(slides.length - 1, index));
      // The stylesheet already turns `scroll-behavior` off under
      // `prefers-reduced-motion`, but a scroll requested from script does not
      // read the stylesheet, so the preference has to be honoured here too.
      deckRef.current
        ?.querySelector<HTMLElement>(`[data-index="${clamped}"]`)
        ?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
    },
    [slides.length, reduceMotion],
  );

  const chrome = CHROME[slides[active]?.tone ?? "green"];

  const onKeyDown = (event: React.KeyboardEvent) => {
    // Leave typing alone: nothing on the deck takes text input, but a
    // browser extension might, and the Escape shortcut is for the deck only.
    if ((event.target as HTMLElement).closest("input, textarea, [contenteditable]")) return;

    switch (event.key) {
      case "ArrowDown":
      case "ArrowRight":
      case "PageDown":
      case " ":
        event.preventDefault();
        goTo(active + 1);
        break;
      case "ArrowUp":
      case "ArrowLeft":
      case "PageUp":
        event.preventDefault();
        goTo(active - 1);
        break;
      case "Home":
        event.preventDefault();
        goTo(0);
        break;
      case "End":
        event.preventDefault();
        goTo(slides.length - 1);
        break;
      case "Escape":
        router.push(homeHref);
        break;
    }
  };

  return (
    <div className="relative h-dvh bg-ryno-900 print:h-auto">
      {/* The page's one heading. The slides carry h2s; this is what a screen
          reader lands on, and what the document is called. */}
      <h1 className="sr-only">{title}</h1>

      {/* With no JavaScript, `seen` never grows past the cover — nothing
          would ever un-pause a later slide's entrance. This is the one thing
          CSS genuinely cannot express on its own ("is a script running"), so
          it is the one purpose-built tool for it: cancels the paused default
          in `globals.css`, and only a no-JS browser ever parses it. */}
      <noscript>
        <style>{`.recap-slide:not([data-seen]) :is(.reveal, .grow-x, .grow-up, .pop-in) { animation-play-state: running !important; }`}</style>
      </noscript>

      <div
        ref={deckRef}
        role="region"
        tabIndex={0}
        onKeyDown={onKeyDown}
        aria-label={title}
        className="recap-deck h-dvh overflow-y-auto scroll-smooth outline-none scrollbar-thin"
      >
        {slides.map((slide, index) => (
          <SeenContext.Provider key={index} value={seen.has(index)}>
            <section
              data-index={index}
              data-seen={seen.has(index) ? "" : undefined}
              aria-current={active === index ? "step" : undefined}
              aria-label={`${slide.label} — ${index + 1} of ${slides.length}`}
              className={cn(
                "recap-slide relative flex min-h-dvh w-full items-center justify-center overflow-hidden px-6 py-16 sm:px-10",
                TONE_CLASS[slide.tone],
              )}
            >
              <div className="w-full max-w-3xl">{slide.content}</div>
            </section>
          </SeenContext.Provider>
        ))}
      </div>

      {/* Chrome that sits over the deck: home, print, the step dots, and a
          nudge on the cover. All of it hidden in print — the slides are the
          document, the controls are not. */}
      <div className="pointer-events-none absolute inset-0 print:hidden">
        <div className="pointer-events-auto absolute left-4 top-4 flex items-center gap-2 sm:left-6 sm:top-6">
          <Link
            href={homeHref}
            className={cn(
              "inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-[13px] font-medium backdrop-blur transition-colors",
              chrome.button,
            )}
          >
            <ArrowLeft className="size-4" aria-hidden />
            Dashboard
          </Link>
        </div>

        <div className="pointer-events-auto absolute right-4 top-4 sm:right-6 sm:top-6">
          <button
            type="button"
            onClick={() => window.print()}
            className={cn(
              "inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-[13px] font-medium backdrop-blur transition-colors",
              chrome.button,
            )}
          >
            <Printer className="size-4" aria-hidden />
            Print
          </button>
        </div>

        <nav
          aria-label="Slides"
          className={cn(
            "pointer-events-auto absolute bottom-5 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full px-3 py-2 backdrop-blur sm:bottom-auto sm:left-auto sm:right-6 sm:top-1/2 sm:-translate-y-1/2 sm:translate-x-0 sm:flex-col sm:bg-transparent sm:px-0 sm:py-0 sm:backdrop-blur-none",
            chrome.pill,
          )}
        >
          <button
            type="button"
            onClick={() => goTo(active - 1)}
            disabled={active === 0}
            aria-label="Previous slide"
            className={cn(
              "hidden size-8 place-items-center rounded-full transition-colors disabled:opacity-30 sm:grid",
              chrome.muted,
            )}
          >
            <ChevronUp className="size-4" aria-hidden />
          </button>
          {slides.map((slide, index) => (
            <button
              key={index}
              type="button"
              onClick={() => goTo(index)}
              aria-label={`${slide.label}, slide ${index + 1} of ${slides.length}`}
              aria-current={active === index ? "step" : undefined}
              className={cn(
                "size-2.5 rounded-full transition-all",
                active === index ? cn("scale-125", chrome.dotActive) : chrome.dot,
              )}
            />
          ))}
          <button
            type="button"
            onClick={() => goTo(active + 1)}
            disabled={active === slides.length - 1}
            aria-label="Next slide"
            className={cn(
              "hidden size-8 place-items-center rounded-full transition-colors disabled:opacity-30 sm:grid",
              chrome.muted,
            )}
          >
            <ChevronDown className="size-4" aria-hidden />
          </button>
        </nav>

        {active === 0 && slides.length > 1 ? (
          <button
            type="button"
            onClick={() => goTo(1)}
            className="pointer-events-auto absolute bottom-16 left-1/2 flex -translate-x-1/2 flex-col items-center gap-1 text-[12px] font-medium uppercase tracking-widest text-white/60 transition-colors hover:text-white sm:bottom-8"
          >
            Scroll
            <ChevronDown className="float-y size-5" aria-hidden />
          </button>
        ) : null}
      </div>
    </div>
  );
}
