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
        <h3>Mission sidebar</h3>
        <p>
          Addressable primary frame with a coordinated sidebar outlet. Move between
          missions and keep the outlet commit in the same navigation step.
        </p>
      </article>

      <article class="sidebar-card">
        <h3>Quick lane swaps</h3>
        <div class="sidebar-links">
          <a
            [routerLink]="{
              name: 'mission',
              params: { missionId: missionId() },
              query: { lane: 'thermal', zoom: 2 }
            }"
          >
            Thermal lane
          </a>
          <a
            [routerLink]="{
              name: 'mission',
              params: { missionId: missionId() },
              query: { lane: 'survey', zoom: 1 }
            }"
          >
            Survey lane
          </a>
          <a
            [routerLink]="{
              name: 'analysis',
              params: { missionId: missionId() },
              query: { lens: 'echo', detail: 3 }
            }"
          >
            Jump to analysis
          </a>
        </div>
      </article>
    </section>
  `,
  styles: [sidebarStyles],
})
export class MissionSidebarComponent {
  protected readonly params = input<ParamsInput>({});

  protected missionId(): number {
    return Number(this.params()['missionId'] ?? 0);
  }
}
