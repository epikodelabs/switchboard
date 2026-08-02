export const sceneStyles = `
  .scene {
    position: relative;
    display: grid;
    gap: 0.8rem;
    padding: clamp(0.85rem, 1.4vw, 1.15rem);
    border: 1px solid var(--line-soft);
    border-radius: 1.25rem;
    background:
      linear-gradient(180deg, rgb(255 255 255 / 0.9), rgb(246 250 253 / 0.82)),
      var(--panel-base);
    box-shadow: var(--stage-shadow);
    overflow: hidden;
  }

  .scene::before {
    content: '';
    position: absolute;
    inset: 0 auto auto 0;
    width: 14rem;
    height: 14rem;
    background: radial-gradient(circle, rgb(0 143 180 / 0.14), transparent 70%);
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
    font-size: 0.72rem;
    font-weight: 700;
    letter-spacing: 0.16em;
    text-transform: uppercase;
  }

  .scene-title {
    margin: 0;
    color: var(--ink-strong);
    font-size: clamp(1.55rem, 2vw, 2.2rem);
    line-height: 0.98;
  }

  .scene-copy {
    max-width: 44rem;
    margin: 0.4rem 0 0;
    font-size: 0.94rem;
    line-height: 1.5;
  }

  .status-chip {
    min-width: 7rem;
    padding: 0.52rem 0.72rem;
    border: 1px solid rgb(0 143 180 / 0.18);
    border-radius: 0.9rem;
    background: rgb(255 255 255 / 0.74);
    color: var(--signal-deep);
    font-weight: 700;
    text-align: center;
  }

  .metric-strip {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(10rem, 1fr));
    gap: 0.65rem;
  }

  .metric {
    padding: 0.72rem 0.82rem;
    border: 1px solid var(--line-soft);
    border-radius: 0.95rem;
    background: rgb(255 255 255 / 0.72);
  }

  .metric span {
    display: block;
    color: var(--ink-soft);
    font-size: 0.76rem;
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }

  .metric strong {
    display: block;
    margin-top: 0.28rem;
    color: var(--ink-strong);
    font-size: 0.98rem;
  }

  .panel-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.7rem;
  }

  .panel {
    padding: 0.82rem 0.92rem;
    border: 1px solid var(--line-soft);
    border-radius: 1rem;
    background: var(--panel-strong);
  }

  .panel h3 {
    margin: 0 0 0.55rem;
    color: var(--ink-strong);
    font-size: 0.96rem;
  }

  .panel p,
  .panel li {
    line-height: 1.45;
    font-size: 0.92rem;
  }

  .signal-list {
    display: grid;
    gap: 0.52rem;
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
    width: 0.55rem;
    height: 0.55rem;
    border-radius: 999px;
    background: linear-gradient(135deg, var(--signal-cyan), var(--signal-teal));
    box-shadow: 0 0 0 0.25rem rgb(0 143 180 / 0.12);
    flex: none;
  }

  .data-list {
    display: grid;
    gap: 0.48rem;
    margin: 0;
  }

  .data-list div {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.8rem;
  }

  .data-list dt {
    color: var(--ink-soft);
  }

  .data-list dd {
    margin: 0;
    color: var(--ink-strong);
    font-weight: 700;
    text-align: right;
  }

  .action-row {
    display: flex;
    flex-wrap: wrap;
    gap: 0.55rem;
  }

  .action-link,
  .action-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 2.5rem;
    padding: 0.6rem 0.88rem;
    border: 1px solid rgb(0 143 180 / 0.16);
    border-radius: 999px;
    background: rgb(255 255 255 / 0.82);
    color: var(--signal-deep);
    font-weight: 700;
    text-decoration: none;
    cursor: pointer;
    transition:
      transform 160ms ease,
      box-shadow 160ms ease,
      border-color 160ms ease,
      background-color 160ms ease;
  }

  .action-button--accent,
  .action-link--accent {
    border-color: transparent;
    background: linear-gradient(135deg, var(--signal-cyan), var(--signal-teal));
    color: #fff;
    box-shadow: 0 14px 24px rgb(0 143 180 / 0.18);
  }

  .action-link:hover,
  .action-button:hover {
    transform: translateY(-1px);
    box-shadow: 0 12px 24px rgb(17 34 48 / 0.1);
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
    gap: 0.9rem;
  }

  .sidebar-card {
    padding: 1rem;
    border: 1px solid var(--line-soft);
    border-radius: 1.1rem;
    background: rgb(255 255 255 / 0.76);
  }

  .sidebar-card h3 {
    margin: 0 0 0.7rem;
    color: var(--ink-strong);
  }

  .sidebar-card p,
  .sidebar-card li {
    line-height: 1.6;
  }

  .sidebar-card ul {
    margin: 0;
    padding-left: 1.1rem;
  }

  .sidebar-links {
    display: grid;
    gap: 0.55rem;
  }

  .sidebar-links a {
    display: block;
    padding: 0.75rem 0.85rem;
    border-radius: 0.95rem;
    background: rgb(0 143 180 / 0.08);
    color: var(--signal-deep);
    font-weight: 600;
    text-decoration: none;
  }
`;
