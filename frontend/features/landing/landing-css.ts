"use client";

export const LANDING_CSS = `
  @keyframes marquee { 0%{transform:translateX(0)} 100%{transform:translateX(-50%)} }
  @keyframes floatBadge { 0%,100%{transform:translateY(0px) rotate(-1deg)} 50%{transform:translateY(-8px) rotate(1deg)} }
  .marquee-inner { animation: marquee 24s linear infinite; will-change: transform; }
  .marquee-wrap:hover .marquee-inner { animation-play-state: paused; }
  .float-badge { animation: floatBadge 3.8s ease-in-out infinite; will-change: transform; }
  .reveal {
    opacity: 0; transform: translateY(26px);
    transition: opacity .55s ease, transform .55s ease;
    will-change: opacity, transform;
  }
  .reveal.is-visible { opacity: 1; transform: translateY(0); }
  .btn-brutalist {
    border: 2.5px solid #222; box-shadow: 4px 4px 0 #222;
    transition: transform .12s ease, box-shadow .12s ease; cursor: pointer;
    display: inline-flex; align-items: center; justify-content: center;
    text-decoration: none; gap: 8px;
    font-family: var(--font-space-grotesk, 'Space Grotesk'),sans-serif;
    font-weight: 700; font-size: 16px; letter-spacing: .03em;
    padding: 14px 28px; border-radius: 8px;
  }
  .btn-brutalist:hover { transform: translate(2px,2px); box-shadow: 2px 2px 0 #222; }
  .btn-brutalist:active { transform: translate(4px,4px); box-shadow: 0 0 0 #222; }
  .card-brutalist {
    border: 2.5px solid #222; box-shadow: 5px 5px 0 #222;
    transition: transform .12s ease, box-shadow .12s ease;
  }
  .card-brutalist:hover { transform: translate(2px,2px); box-shadow: 3px 3px 0 #222; }
  .grid-paper {
    background-image:
      linear-gradient(rgba(34,34,34,.07) 1px,transparent 1px),
      linear-gradient(90deg,rgba(34,34,34,.07) 1px,transparent 1px);
    background-size: 48px 48px;
  }
  .grid-paper-sm {
    background-image:
      linear-gradient(rgba(34,34,34,.05) 1px,transparent 1px),
      linear-gradient(90deg,rgba(34,34,34,.05) 1px,transparent 1px);
    background-size: 24px 24px;
  }
  .sticker-label {
    font-family: var(--font-jetbrains-mono, 'JetBrains Mono'),monospace;
    font-size: 11px; font-weight: 600; letter-spacing: .12em;
    text-transform: uppercase; border: 2px solid #222;
    padding: 3px 8px; border-radius: 4px;
    background: #FFF7D6; display: inline-block;
  }
  .coord-label {
    font-family: var(--font-jetbrains-mono, 'JetBrains Mono'),monospace;
    font-size: 10px; color: #666; letter-spacing: .08em;
  }
  @media (prefers-reduced-motion: reduce) {
    .marquee-inner { animation: none; }
    .float-badge { animation: none; }
    .reveal { opacity: 1; transform: none; transition: none; }
  }
`;
