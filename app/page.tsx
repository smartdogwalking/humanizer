"use client";

import { gsap } from "gsap";
import {
  FormEvent,
  PointerEvent as ReactPointerEvent,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

const MAX_INPUT_LENGTH = 20_000;

type HumanizeResponse = {
  humanized?: string;
  error?: string;
};

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export default function Home() {
  const pageRef = useRef<HTMLDivElement>(null);
  const humanizeButtonRef = useRef<HTMLButtonElement>(null);
  const outputRef = useRef<HTMLTextAreaElement>(null);
  const copyButtonRef = useRef<HTMLButtonElement>(null);
  const copyResetRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [original, setOriginal] = useState("");
  const [humanized, setHumanized] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [copyLabel, setCopyLabel] = useState("Copy");

  useLayoutEffect(() => {
    if (!pageRef.current || prefersReducedMotion()) {
      return;
    }

    const context = gsap.context(() => {
      gsap.fromTo(
        "[data-reveal]",
        { autoAlpha: 0, y: 10 },
        {
          autoAlpha: 1,
          y: 0,
          duration: 0.4,
          stagger: 0.055,
          ease: "power2.out",
          clearProps: "opacity,visibility,transform",
        },
      );
    }, pageRef);

    return () => context.revert();
  }, []);

  useLayoutEffect(() => {
    if (!humanized || !outputRef.current) {
      return;
    }

    const output = outputRef.current;

    if (prefersReducedMotion()) {
      output.focus({ preventScroll: true });
      return;
    }

    gsap.fromTo(
      output,
      { autoAlpha: 0.55, y: 7 },
      {
        autoAlpha: 1,
        y: 0,
        duration: 0.36,
        ease: "power2.out",
        clearProps: "opacity,visibility,transform",
        onStart: () => output.focus({ preventScroll: true }),
      },
    );
  }, [humanized]);

  useEffect(() => {
    return () => {
      if (copyResetRef.current) {
        clearTimeout(copyResetRef.current);
      }
    };
  }, []);

  function handleMagneticMove(event: ReactPointerEvent<HTMLDivElement>) {
    const button = humanizeButtonRef.current;

    if (
      !button ||
      event.pointerType !== "mouse" ||
      prefersReducedMotion() ||
      isLoading ||
      !original.trim()
    ) {
      return;
    }

    const bounds = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - bounds.left) / bounds.width - 0.5) * 8;
    const y = ((event.clientY - bounds.top) / bounds.height - 0.5) * 6;

    gsap.to(button, {
      x,
      y,
      duration: 0.22,
      ease: "power2.out",
      overwrite: "auto",
    });
  }

  function resetMagneticButton() {
    const button = humanizeButtonRef.current;

    if (!button || prefersReducedMotion()) {
      return;
    }

    gsap.to(button, {
      x: 0,
      y: 0,
      scale: 1,
      duration: 0.32,
      ease: "power3.out",
      overwrite: "auto",
    });
  }

  function pressHumanizeButton() {
    const button = humanizeButtonRef.current;

    if (!button || prefersReducedMotion() || button.disabled) {
      return;
    }

    gsap.to(button, {
      scale: 0.97,
      duration: 0.08,
      ease: "power2.out",
      overwrite: "auto",
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!original.trim() || isLoading) {
      return;
    }

    setIsLoading(true);
    setError("");
    setCopyLabel("Copy");

    try {
      const response = await fetch("/api/humanize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: original }),
      });

      const data = (await response.json()) as HumanizeResponse;

      if (!response.ok || typeof data.humanized !== "string") {
        throw new Error(data.error || "Humanizer could not rewrite that text.");
      }

      setHumanized(data.humanized);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Humanizer could not rewrite that text.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function handleCopy() {
    if (!humanized) {
      return;
    }

    try {
      await navigator.clipboard.writeText(humanized);
      setCopyLabel("Copied ✓");

      if (copyButtonRef.current && !prefersReducedMotion()) {
        gsap.fromTo(
          copyButtonRef.current,
          { scale: 0.94 },
          { scale: 1, duration: 0.24, ease: "back.out(2)" },
        );
      }
    } catch {
      setCopyLabel("Copy failed");
    }

    if (copyResetRef.current) {
      clearTimeout(copyResetRef.current);
    }

    copyResetRef.current = setTimeout(() => setCopyLabel("Copy"), 1_500);
  }

  return (
    <main>
      <div className="page-shell" ref={pageRef}>
        <header className="site-header">
          <p className="logo" data-reveal>
            Humanizer
          </p>
          <h1 data-reveal>Make AI-written text sound like a person wrote it.</h1>
        </header>

        <form className="workspace" onSubmit={handleSubmit}>
          <section className="field-group" data-reveal>
            <div className="field-heading">
              <label htmlFor="original">Original</label>
              <span
                id="original-count"
                className={`character-count${
                  original.length > MAX_INPUT_LENGTH * 0.9
                    ? " is-near-limit"
                    : original.length > 0
                      ? " has-text"
                      : ""
                }`}
              >
                {original.length.toLocaleString()} / {MAX_INPUT_LENGTH.toLocaleString()}
              </span>
            </div>
            <textarea
              id="original"
              name="original"
              value={original}
              onChange={(event) => setOriginal(event.target.value)}
              maxLength={MAX_INPUT_LENGTH}
              placeholder="Paste AI-written text here…"
              rows={12}
              required
              aria-describedby="original-count"
            />
          </section>

          <div
            className="button-magnet-zone"
            onPointerMove={handleMagneticMove}
            onPointerLeave={resetMagneticButton}
            data-reveal
          >
            <button
              ref={humanizeButtonRef}
              className="primary-button"
              type="submit"
              disabled={!original.trim() || isLoading}
              onPointerDown={pressHumanizeButton}
              onPointerUp={resetMagneticButton}
              onPointerCancel={resetMagneticButton}
              aria-busy={isLoading}
            >
              <span>{isLoading ? "Humanizing" : "Humanize"}</span>
              {isLoading ? (
                <span className="loading-dots" aria-hidden="true">
                  <span>.</span>
                  <span>.</span>
                  <span>.</span>
                </span>
              ) : null}
            </button>
          </div>

          {error ? (
            <p className="error-message" role="alert">
              {error}
            </p>
          ) : null}

          <section className="field-group output-field" data-reveal>
            <div className="field-heading">
              <label htmlFor="humanized">Humanized</label>
              <button
                ref={copyButtonRef}
                className="copy-button"
                type="button"
                onClick={handleCopy}
                disabled={!humanized}
              >
                {copyLabel}
              </button>
            </div>
            <textarea
              ref={outputRef}
              id="humanized"
              name="humanized"
              value={humanized}
              placeholder="Your humanized text will appear here."
              rows={12}
              readOnly
              aria-live="polite"
            />
          </section>
        </form>
      </div>
    </main>
  );
}
