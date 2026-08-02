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
        <h3>Debrief sidebar</h3>
        <p>
          Addressable frame with direct-entry defense. The route exists, but the
          frame graph still decides whether it is a legal initial destination.
        </p>
      </article>

      <article class="sidebar-card">
        <h3>Useful links</h3>
        <div class="sidebar-links">
          <a
            [routerLink]="{
              name: 'mission',
              params: { missionId: missionId() },
              query: { lane: 'thermal', zoom: 2 }
            }"
          >
            Mission board
          </a>
          <a [routerLink]="'/'">Back to dock</a>
        </div>
      </article>
    </section>
  `,
  styles: [sidebarStyles],
})
export class DebriefSidebarComponent {
  protected readonly params = input<ParamsInput>({});

  protected missionId(): number {
    return Number(this.params()['missionId'] ?? 0);
  }
}
