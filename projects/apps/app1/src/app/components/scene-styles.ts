export const sceneStyles = `
  .scene {
    position: relative;
    display: grid;
    gap: 0.8rem;
    padding: clamp(0.85rem, 1.4vw, 1.15rem);
    border: 1px solid var(--line-soft);
    border-radius: 0.5rem;
    background:
      linear-gradient(180deg, rgb(22 18 14 / 0.98), rgb(11 9 6 / 0.94)),
      var(--panel-base);
    box-shadow: var(--stage-shadow);
    overflow: hidden;
  }

  .scene::before {
    content: '';
    position: absolute;
    inset: 0 auto auto 0;
    width: 100%;
    height: 2px;
    background: var(--ruler-ticks);
    opacity: 0.45;
    pointer-events: none;
  }

  .scene-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 0.75rem;
  }

  .scene-eyebrow {
    margin: 0 0 0.45rem;
    color: var(--signal-cyan);
    font-family: var(--font-display);
    font-size: 0.7rem;
    font-weight: 700;
    letter-spacing: 0.16em;
    text-transform: uppercase;
  }

  .scene-title {
    margin: 0;
    color: var(--ink-strong);
    font-size: clamp(1.5rem, 2vw, 2.1rem);
    line-height: 1.05;
  }

  .scene-copy {
    max-width: 44rem;
    margin: 0.4rem 0 0;
    font-size: 0.94rem;
    line-height: 1.55;
    font-family: var(--font-body);
  }

  .status-chip {
    min-width: 7rem;
    padding: 0.5rem 0.7rem;
    border: 1px solid var(--line-soft);
    border-left: 2px solid var(--signal-amber);
    border-radius: 0.3rem;
    background: rgb(16 13 10 / 0.8);
    color: var(--ink-strong);
    font-family: var(--font-display);
    font-weight: 600;
    text-align: center;
  }

  .metric-strip {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(10rem, 1fr));
    gap: 0.6rem;
  }

  .metric {
    padding: 0.7rem 0.8rem;
    border: 1px solid var(--line-soft);
    border-radius: 0.35rem;
    background: linear-gradient(180deg, rgb(23 19 14 / 0.9), rgb(16 13 10 / 0.86));
  }

  .metric span {
    display: block;
    color: var(--ink-soft);
    font-size: 0.72rem;
    font-family: var(--font-body);
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }

  .metric strong {
    display: block;
    margin-top: 0.28rem;
    color: var(--signal-cyan);
    font-size: 0.96rem;
  }

  .panel-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.7rem;
  }

  .panel {
    padding: 0.82rem 0.92rem;
    border: 1px solid var(--line-soft);
    border-radius: 0.4rem;
    background: var(--panel-strong);
  }

  .panel h3 {
    margin: 0 0 0.55rem;
    color: var(--ink-strong);
    font-size: 0.92rem;
  }

  .panel p,
  .panel li {
    line-height: 1.5;
    font-size: 0.92rem;
    font-family: var(--font-body);
  }

  .signal-list {
    display: grid;
    gap: 0.5rem;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .signal-list li {
    display: flex;
    align-items: center;
    gap: 0.7rem;
  }

  .signal-list li::before {
    content: '';
    width: 0.4rem;
    height: 0.4rem;
    background: var(--signal-cyan);
    flex: none;
    box-shadow: 0 0 0 0.2rem rgb(90 217 255 / 0.1);
  }

  .data-list {
    display: grid;
    gap: 0.46rem;
    margin: 0;
    font-family: var(--font-display);
  }

  .data-list div {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.8rem;
  }

  .data-list dt {
    color: var(--ink-soft);
    font-family: var(--font-body);
  }

  .data-list dd {
    margin: 0;
    color: var(--signal-cyan);
    font-weight: 700;
    text-align: right;
  }

  .action-row {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .action-link,
  .action-button {
    display: inline-flex;
    position: relative;
    align-items: center;
    justify-content: center;
    min-height: 2.4rem;
    padding: 0.58rem 0.85rem;
    border: 1px solid var(--line-strong);
    border-radius: 0.32rem;
    background: rgb(17 14 10 / 0.88);
    color: var(--ink-strong);
    font-family: var(--font-display);
    font-weight: 600;
    text-decoration: none;
    cursor: pointer;
    transition:
      border-color 160ms ease,
      color 160ms ease,
      background-color 160ms ease;
  }

  .action-button--accent,
  .action-link--accent {
    border-color: var(--signal-cyan);
    background: var(--signal-cyan);
    color: var(--signal-deep);
  }

  .action-link:hover,
  .action-button:hover {
    border-color: var(--signal-cyan);
    color: var(--signal-cyan);
  }

  .action-button--accent:hover,
  .action-link--accent:hover {
    color: var(--signal-deep);
    background: #8ee6ff;
  }

  .action-link:active,
  .action-button:active {
    transform: translateY(1px);
  }

  @media (max-width: 760px) {
    .scene-header {
      flex-direction: column;
    }

    .panel-grid {
      grid-template-columns: 1fr;
    }

    .status-chip {
      min-width: 0;
      width: 100%;
    }
  }
`;

export const sidebarStyles = `
  .sidebar-stack {
    display: grid;
    gap: 0.85rem;
  }

  .sidebar-card {
    padding: 1rem;
    border: 1px solid var(--line-soft);
    border-radius: 0.45rem;
    background: linear-gradient(180deg, rgb(19 16 12 / 0.94), rgb(11 9 6 / 0.88));
  }

  .sidebar-card h3 {
    margin: 0 0 0.7rem;
    color: var(--ink-strong);
    font-size: 0.9rem;
  }

  .sidebar-card p,
  .sidebar-card li {
    line-height: 1.6;
    font-family: var(--font-body);
    font-size: 0.9rem;
  }

  .sidebar-card ul {
    margin: 0;
    padding-left: 1.1rem;
  }

  .sidebar-links {
    display: grid;
    gap: 0.5rem;
  }

  .sidebar-links a {
    display: block;
    padding: 0.7rem 0.8rem;
    border: 1px solid var(--line-soft);
    border-left: 2px solid var(--signal-cyan-dim);
    border-radius: 0.3rem;
    background: rgb(90 217 255 / 0.05);
    color: var(--ink-strong);
    font-family: var(--font-display);
    font-size: 0.86rem;
    text-decoration: none;
    transition: border-left-color 160ms ease;
  }

  .sidebar-links a:hover {
    border-left-color: var(--signal-cyan);
  }
`;
