import {
  Component,
  input,
} from '@angular/core';
import { RouterLink } from '@epikodelabs/switchboard';

import { ParamsInput } from './route-inputs';
import { sidebarStyles } from './scene-styles';

@Component({
  standalone: true,
  imports: [RouterLink],
  template: `
    <section class="sidebar-stack">
      <article class="sidebar-card">
        <h3>Analysis sidebar</h3>
        <p>
          Lazy frame, eager companion outlet. This is useful for checking grouped
          commits while the primary frame loads.
        </p>
      </article>

      <article class="sidebar-card">
        <h3>Lens presets</h3>
        <div class="sidebar-links">
          <a
            [routerLink]="{
              name: 'analysis',
              params: { missionId: missionId() },
              query: { lens: 'thermal', detail: 2 }
            }"
          >
            Thermal focus
          </a>
          <a
            [routerLink]="{
              name: 'analysis',
              params: { missionId: missionId() },
              query: { lens: 'echo', detail: 3 }
            }"
          >
            Echo focus
          </a>
        </div>
      </article>
    </section>
  `,
  styles: [sidebarStyles],
})
export class AnalysisSidebarComponent {
  protected readonly params = input<ParamsInput>({});

  protected missionId(): number {
    return Number(this.params()['missionId'] ?? 0);
  }
}
