"use client";

import gsap from "gsap";
import { type ComponentProps, createContext, type MouseEvent, type ReactNode, useCallback, useContext, useRef } from "react";

import { Link, useRouter } from "@/i18n/navigation";

import type { TurnDirection } from "./turn-direction";

// Turning the diary's page when moving between sections: the current page
// lifts and turns over the spine (on phones, whose notebook is bound at the
// top, it flips up), and the new screen's content comes in once it lands.
//
// The turning page is a copy of the current one in an overlay that outlives
// the navigation. While it turns, the content it came from is hidden
// ([data-turned-away]) and the new screen's entrance waits
// (html[data-turning] pauses enter-stagger/paint-in, see globals.css).
// Under reduced motion it's a plain navigation.

type Href = ComponentProps<typeof Link>["href"];
type Turn = (href: Href, direction: TurnDirection) => void;

const PageTurnContext = createContext<Turn | null>(null);

/** The desktop page's size in the notebook scene (NotebookShell), and half the spine between pages. */
const PAGE = { width: 462, height: 908, halfSpine: 12 };
const NOTEBOOK_QUERY = "(min-width: 1200px)";

function div(style: Partial<CSSStyleDeclaration>, className?: string) {
  const el = document.createElement("div");
  Object.assign(el.style, style);
  if (className) el.className = className;
  return el;
}

/** A face of the turning page: paper, and optionally a copy of what was written on it. */
function face(paper: string, content: HTMLElement | null, back: boolean) {
  const el = div({
    position: "absolute",
    inset: "0",
    overflow: "hidden",
    backfaceVisibility: "hidden",
    background: `url(${paper}) 0 0 / 100% 100% no-repeat`,
    transform: back ? "rotateY(180deg)" : "",
  });
  if (content) el.append(content);
  return el;
}

/**
 * Hides what the turning page carries away, until the next screen replaces
 * it. Only the old screen's elements, captured when the turn starts: if the
 * new screen has already arrived, they're gone and there's nothing to hide.
 */
function turnAway(el: Element | null) {
  if (el?.isConnected) el.setAttribute("data-turned-away", "");
}

function restore() {
  for (const el of document.querySelectorAll("[data-turned-away]")) el.removeAttribute("data-turned-away");
}

/** The two-page notebook: the right page turns over the spine to the left, or back. */
function turnDesktop(direction: TurnDirection) {
  const fromSide = direction === "forward" ? "right" : "left";
  const toSide = direction === "forward" ? "left" : "right";
  const sheet = document.querySelector(`[data-sheet="${fromSide}"]`);
  if (!sheet) return null;
  const rect = sheet.getBoundingClientRect();
  const scale = rect.width / PAGE.width;

  // A copy of the page's content, scrolled as it was.
  const page = document.querySelector<HTMLElement>(`[data-page="${fromSide}"]`);
  const copy = page ? (page.cloneNode(true) as HTMLElement) : null;
  if (copy && page) {
    copy.removeAttribute("data-page");
    copy.style.height = "100%";
    queueMicrotask(() => (copy.scrollTop = page.scrollTop));
  }

  const overlay = div(
    {
      position: "fixed",
      left: `${rect.left}px`,
      top: `${rect.top}px`,
      width: `${PAGE.width}px`,
      height: `${PAGE.height}px`,
      transform: `scale(${scale})`,
      transformOrigin: "0 0",
      perspective: "2600px",
      zIndex: "50",
      pointerEvents: "none",
    },
    "page-flap",
  );
  // It turns around the middle of the spine, so it lands exactly on the other page.
  const leaf = div({
    position: "absolute",
    inset: "0",
    transformStyle: "preserve-3d",
    transformOrigin: direction === "forward" ? `${-PAGE.halfSpine}px 50%` : `${PAGE.width + PAGE.halfSpine}px 50%`,
  });
  const front = face(`/paper/page-${fromSide}.webp`, copy, false);
  // The light catches the page as it rises, and its shadow falls as it lands.
  const shade = div({
    position: "absolute",
    inset: "0",
    opacity: "0",
    background: `linear-gradient(${direction === "forward" ? "90deg" : "270deg"}, rgba(43,32,20,0.45), rgba(43,32,20,0) 70%)`,
  });
  front.append(shade);
  const back = face(`/paper/page-${toSide}.webp`, null, true);
  const backShade = div({ position: "absolute", inset: "0", opacity: "0.35", background: "rgba(43,32,20,0.4)" });
  back.append(backShade);
  leaf.append(front, back);
  overlay.append(leaf);
  document.body.append(overlay);

  const otherPage = document.querySelector(`[data-page="${toSide}"]`);
  turnAway(page);
  const angle = direction === "forward" ? -180 : 180;
  const tl = gsap.timeline();
  tl.to(leaf, { rotateY: angle, duration: 0.75, ease: "power2.inOut" }, 0)
    .to(shade, { opacity: 1, duration: 0.375, ease: "power1.in" }, 0)
    .to(backShade, { opacity: 0, duration: 0.375, ease: "power1.out" }, 0.375)
    // Halfway, the page starts covering the other one: what was written there goes with the old screen.
    .call(() => turnAway(otherPage), [], 0.375)
    .to(overlay, { opacity: 0, duration: 0.15, ease: "power1.out" }, 0.75);
  // The new screen starts writing itself as the page lands.
  return { overlay, tl, landsAt: 0.6 };
}

/** The phone's notebook is bound at the top: forward, the page flips up and away; backward, one comes down. */
function turnPhone(direction: TurnDirection) {
  const wrapper = document.querySelector<HTMLElement>('[data-sheet="mobile"]');
  if (!wrapper) return null;
  const rect = wrapper.getBoundingClientRect();
  const content = wrapper.querySelector("main");

  // Below the tab bar (z-10), above the page.
  const overlay = div(
    { position: "fixed", inset: "0", overflow: "hidden", perspective: "1800px", zIndex: "9", pointerEvents: "none" },
    "page-flap",
  );
  const leaf = div({
    position: "absolute",
    left: `${rect.left}px`,
    top: "0",
    width: `${rect.width}px`,
    height: "100%",
    transformStyle: "preserve-3d",
    transformOrigin: "50% 0",
  });
  let copy: HTMLElement | null = null;
  if (direction === "forward") {
    // The page as it is on screen, scrolled.
    copy = wrapper.cloneNode(true) as HTMLElement;
    copy.removeAttribute("data-sheet");
    Object.assign(copy.style, { position: "absolute", top: `${rect.top}px`, left: "0", width: "100%", margin: "0" });
  }
  const front = face("/paper/page-mobile.webp", copy, false);
  const shade = div({ position: "absolute", inset: "0", opacity: "0", background: "linear-gradient(0deg, rgba(43,32,20,0.4), rgba(43,32,20,0) 60%)" });
  front.append(shade);
  leaf.append(front);
  overlay.append(leaf);
  document.body.append(overlay);

  const tl = gsap.timeline();
  if (direction === "forward") {
    turnAway(content);
    tl.to(leaf, { rotateX: -105, duration: 0.55, ease: "power2.in" }, 0)
      .to(shade, { opacity: 1, duration: 0.45 }, 0)
      .to(overlay, { opacity: 0, duration: 0.15 }, 0.42);
  } else {
    // A blank page comes down over this one, then the previous screen is written on it.
    gsap.set(leaf, { rotateX: -105 });
    gsap.set(shade, { opacity: 1 });
    tl.to(leaf, { rotateX: 0, duration: 0.5, ease: "power2.out" }, 0)
      .to(shade, { opacity: 0, duration: 0.4 }, 0.1)
      .call(() => turnAway(content), [], 0.5)
      .to(overlay, { opacity: 0, duration: 0.15 }, 0.52);
  }
  return { overlay, tl, landsAt: direction === "forward" ? 0.4 : 0.5 };
}

export function PageTurnProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const turning = useRef(false);

  const turn = useCallback<Turn>(
    (href, direction) => {
      const go = () => router.push(href as Parameters<typeof router.push>[0]);
      // A click while a page is still turning goes straight there: never swallowed, never two pages at once.
      if (turning.current) return go();
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return go();

      const animation = window.matchMedia(NOTEBOOK_QUERY).matches ? turnDesktop(direction) : turnPhone(direction);
      if (!animation) return go();

      turning.current = true;
      const root = document.documentElement;
      const startUrl = window.location.href;
      root.setAttribute("data-turning", direction);
      go();

      animation.tl.call(() => root.removeAttribute("data-turning"), [], animation.landsAt);
      animation.tl.eventCallback("onComplete", () => {
        animation.overlay.remove();
        root.removeAttribute("data-turning");
        turning.current = false;
        // If the navigation went nowhere (an error, the same URL), the old
        // screen is still there, hidden: show it again once it's clear.
        const started = performance.now();
        const check = () => {
          if (window.location.href !== startUrl || performance.now() - started > 4000) restore();
          else requestAnimationFrame(check);
        };
        check();
      });
    },
    [router],
  );

  return <PageTurnContext.Provider value={turn}>{children}</PageTurnContext.Provider>;
}

/**
 * A link that turns the diary's page: forward or backward. Without a
 * direction (or outside PageTurnProvider) it's a plain Link; new-tab and
 * modified clicks are left to the browser.
 */
export function TurnLink({
  direction,
  onClick,
  ...props
}: ComponentProps<typeof Link> & { direction?: TurnDirection }) {
  const turn = useContext(PageTurnContext);
  return (
    <Link
      {...props}
      data-turn={direction}
      onClick={(event: MouseEvent<HTMLAnchorElement>) => {
        onClick?.(event);
        if (!direction || !turn || event.defaultPrevented) return;
        if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        event.preventDefault();
        turn(props.href, direction);
      }}
    />
  );
}
