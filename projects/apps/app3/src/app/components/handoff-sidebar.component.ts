import { Component } from '@angular/core';

import { sidebarStyles } from './scene-styles';

@Component({
  standalone: true,
  template: `
    <section class="sidebar-stack">
      <article class="sidebar-card">
        <h3>Internal frame sidebar</h3>
        <p>
          No address entry is declared for this frame. The sidebar still swaps as
          part of the same grouped navigation commit.
        </p>
      </article>

      <article class="sidebar-card">
        <h3>Checks</h3>
        <ul>
          <li>The frame id changes to <code>handoff</code>.</li>
          <li>The address bar stays on the last public frame.</li>
          <li>Debrief receives the packet through history state.</li>
        </ul>
      </article>
    </section>
  `,
  styles: [sidebarStyles],
})
export class HandoffSidebarComponent {}
