export const sceneStyles = `
  .scene {
    position: relative;
    display: grid;
    gap: 0.8rem;
    padding: clamp(0.85rem, 1.4vw, 1.15rem);
    border: 1px solid var(--line-soft);
    border-radius: 0.5rem;
    background:
      linear-gradient(180deg, rgb(255 252 247 / 0.99), rgb(250 245 236 / 0.97)),
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
    opacity: 0.5;
    pointer-events: none;
  }

  .scene-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 0.75rem;
    flex-wrap: wrap;
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
    font-size: clamp(1.35rem, 2vw, 1.9rem);
    line-height: 1.1;
  }

  .scene-copy {
    max-width: 44rem;
    margin: 0.4rem 0 0;
    font-size: 0.94rem;
    line-height: 1.55;
    font-family: var(--font-body);
    color: var(--ink-soft);
  }

  .status-chip {
    min-width: 6.5rem;
    padding: 0.45rem 0.65rem;
    border: 1px solid var(--line-soft);
    border-left: 2px solid var(--signal-amber);
    border-radius: 0.3rem;
    background: rgb(255 250 243 / 0.95);
    color: var(--ink-strong);
    font-family: var(--font-display);
    font-weight: 600;
    font-size: 0.82rem;
    text-align: center;
  }

  .status-chip--posted { border-left-color: var(--signal-cyan); }
  .status-chip--draft { border-left-color: var(--signal-amber); }
  .status-chip--voided { border-left-color: var(--signal-crimson); }

  .metric-strip {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(9.5rem, 1fr));
    gap: 0.55rem;
  }

  .metric {
    padding: 0.65rem 0.75rem;
    border: 1px solid var(--line-soft);
    border-radius: 0.35rem;
    background: linear-gradient(180deg, rgb(255 252 247 / 0.98), rgb(247 241 232 / 0.92));
  }

  .metric span {
    display: block;
    color: var(--ink-soft);
    font-size: 0.7rem;
    font-family: var(--font-body);
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }

  .metric strong {
    display: block;
    margin-top: 0.22rem;
    color: var(--signal-cyan);
    font-size: 0.95rem;
    font-family: var(--font-display);
  }

  .panel-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.7rem;
  }

  .panel {
    padding: 0.8rem 0.9rem;
    border: 1px solid var(--line-soft);
    border-radius: 0.4rem;
    background: var(--panel-strong);
  }

  .panel h3 {
    margin: 0 0 0.5rem;
    color: var(--ink-strong);
    font-size: 0.88rem;
  }

  .action-row {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .action-link,
  .action-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 2.35rem;
    padding: 0.5rem 0.8rem;
    border: 1px solid var(--line-strong);
    border-radius: 0.3rem;
    background: rgb(255 252 247 / 0.95);
    color: var(--ink-strong);
    font-family: var(--font-display);
    font-weight: 600;
    font-size: 0.86rem;
    text-decoration: none;
    cursor: pointer;
    transition: border-color 160ms ease, color 160ms ease, background-color 160ms ease;
  }

  .action-button--accent,
  .action-link--accent {
    border-color: var(--signal-cyan);
    background: var(--signal-cyan);
    color: #fffaf3;
  }

  .action-button--danger {
    border-color: rgb(196 92 92 / 0.5);
    color: #a84848;
  }

  .action-link:hover,
  .action-button:hover {
    border-color: var(--signal-cyan);
    color: var(--signal-cyan);
  }

  .action-button--accent:hover,
  .action-link--accent:hover {
    color: #fffaf3;
    background: #9a5a32;
  }

  .data-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.88rem;
  }

  .data-table th {
    text-align: left;
    padding: 0.45rem 0.55rem;
    color: var(--ink-soft);
    font-weight: 600;
    font-size: 0.72rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    border-bottom: 1px solid var(--line-soft);
  }

  .data-table th.num,
  .data-table td.num {
    text-align: right;
    font-variant-numeric: tabular-nums;
    font-family: var(--font-display);
  }

  .data-table td {
    padding: 0.5rem 0.55rem;
    border-bottom: 1px solid rgb(120 90 55 / 0.08);
    color: var(--ink-body);
  }

  .data-table tr:hover td {
    background: rgb(184 107 60 / 0.06);
  }

  .data-table a {
    color: var(--signal-cyan);
    text-decoration: none;
  }

  .data-table a:hover {
    text-decoration: underline;
  }

  .form-grid { display: grid; gap: 0.65rem; }

  .form-row {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(10rem, 1fr));
    gap: 0.55rem;
  }

  .field { display: grid; gap: 0.28rem; }

  .field label {
    color: var(--ink-soft);
    font-size: 0.72rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .field input,
  .field select,
  .field textarea {
    min-height: 2.3rem;
    padding: 0.45rem 0.6rem;
    border: 1px solid var(--line-soft);
    border-radius: 0.3rem;
    background: rgb(255 252 247 / 0.98);
    color: var(--ink-strong);
    font-family: var(--font-body);
  }

  .field textarea { min-height: 4rem; resize: vertical; }

  .field input:focus,
  .field select:focus,
  .field textarea:focus {
    outline: none;
    border-color: var(--signal-cyan);
  }

  .empty-state {
    padding: 1.4rem 1rem;
    text-align: center;
    color: var(--ink-soft);
    border: 1px dashed var(--line-soft);
    border-radius: 0.4rem;
  }

  .badge {
    display: inline-flex;
    align-items: center;
    padding: 0.15rem 0.45rem;
    border-radius: 0.25rem;
    font-size: 0.72rem;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }

  .badge--posted { background: rgb(184 107 60 / 0.14); color: var(--signal-cyan); }
  .badge--draft { background: rgb(196 137 58 / 0.16); color: var(--signal-amber); }
  .badge--voided { background: rgb(196 92 92 / 0.14); color: #a84848; }

  .filter-bar {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    align-items: center;
  }

  .filter-bar input[type="search"] {
    min-width: 12rem;
    flex: 1;
    min-height: 2.3rem;
    padding: 0.45rem 0.65rem;
    border: 1px solid var(--line-soft);
    border-radius: 0.3rem;
    background: rgb(255 252 247 / 0.98);
    color: var(--ink-strong);
  }

  .chip-toggle {
    min-height: 2.1rem;
    padding: 0.35rem 0.65rem;
    border: 1px solid var(--line-soft);
    border-radius: 0.3rem;
    background: rgb(255 250 243 / 0.95);
    color: var(--ink-soft);
    font-size: 0.8rem;
    font-weight: 600;
    cursor: pointer;
  }

  .chip-toggle--active {
    border-color: var(--signal-cyan);
    color: var(--signal-cyan);
    background: rgb(184 107 60 / 0.1);
  }

  @media (max-width: 760px) {
    .panel-grid { grid-template-columns: 1fr; }
    .scene-header { flex-direction: column; }
  }
`;

export const sidebarStyles = `
  .sidebar-stack { display: grid; gap: 0.75rem; }

  .sidebar-card {
    padding: 0.85rem;
    border: 1px solid var(--line-soft);
    border-radius: 0.4rem;
    background: linear-gradient(180deg, rgb(255 252 247 / 0.98), rgb(247 241 232 / 0.95));
  }

  .sidebar-card h3 {
    margin: 0 0 0.55rem;
    color: var(--ink-strong);
    font-size: 0.86rem;
  }

  .sidebar-card p, .sidebar-card li {
    line-height: 1.5;
    font-family: var(--font-body);
    font-size: 0.86rem;
    color: var(--ink-soft);
  }

  .sidebar-card ul { margin: 0; padding-left: 1rem; }

  .sidebar-links { display: grid; gap: 0.4rem; }

  .sidebar-links a,
  .sidebar-links button {
    display: block;
    width: 100%;
    text-align: left;
    padding: 0.55rem 0.7rem;
    border: 1px solid var(--line-soft);
    border-left: 2px solid var(--signal-cyan-dim);
    border-radius: 0.3rem;
    background: rgb(184 107 60 / 0.06);
    color: var(--ink-strong);
    font-family: var(--font-display);
    font-size: 0.82rem;
    text-decoration: none;
    cursor: pointer;
  }

  .sidebar-links a:hover,
  .sidebar-links button:hover {
    border-left-color: var(--signal-cyan);
  }
`;
