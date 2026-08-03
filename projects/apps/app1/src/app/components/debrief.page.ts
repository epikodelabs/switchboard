import {
  Component,
  inject,
  input,
} from '@angular/core';
import { RouterLink } from '@epikodelabs/switchboard';

import { DataInput, ParamsInput, QueryInput } from './route-inputs';
import { sceneStyles } from './scene-styles';
import { DebriefSummary } from '../services/operations-room.service';

@Component({
  standalone: true,
  imports: [RouterLink],
  template: `
    <section class="scene">
      <header class="scene-header">
        <div>
          <p class="scene-eyebrow">Guarded direct entry</p>
          <h1 class="scene-title">{{ summary()?.codeName }} debrief</h1>
          <p class="scene-copy">
            Direct entry is blocked; this frame only makes sense after handoff.
          </p>
        </div>
        <span class="status-chip">{{ queryValue('tab', 'summary') }}</span>
      </header>

      <div class="metric-strip">
        <article class="metric">
          <span>Packet</span>
          <strong>{{ summary()?.packetId }}</strong>
        </article>
        <article class="metric">
          <span>Operator</span>
          <strong>{{ summary()?.operatorName }}</strong>
        </article>
        <article class="metric">
          <span>Readiness</span>
          <strong>{{ summary()?.readiness }}</strong>
        </article>
        <article class="metric">
          <span>Frame route</span>
          <strong>#{{ missionId() }}</strong>
        </article>
      </div>

      <div class="panel-grid">
        <article class="panel">
          <h3>Packet summary</h3>
          <ul class="signal-list">
            <li>Origin frame: {{ summary()?.originFrame }}</li>
            <li>Channel: {{ summary()?.channel }}</li>
            <li>{{ summary()?.note }}</li>
          </ul>
        </article>

        <article class="panel">
          <h3>Next move</h3>
          <p>{{ summary()?.nextMove }}</p>
          <p>
            If you type this route directly into the address bar, the runtime should
            reject the shortcut and redirect to the dock instead of bypassing the
            frame graph.
          </p>
        </article>
      </div>

      <div class="action-row">
        <a
          class="action-link"
          [routerLink]="{
            name: 'mission',
            params: { missionId: missionId() },
            query: { lane: 'thermal', zoom: 2 }
          }"
        >
          Return to mission
        </a>
        <a
          class="action-link action-link--accent"
          [routerLink]="{
            name: 'analysis',
            params: { missionId: missionId() },
            query: { lens: 'echo', detail: 3 }
          }"
        >
          Re-open analysis
        </a>
      </div>
    </section>
  `,
  styles: [sceneStyles],
})
export class DebriefPage {
  protected readonly params = input<ParamsInput>({});
  protected readonly query = input<QueryInput>({});
  protected readonly data = input<DataInput>({});

  protected missionId(): number {
    return Number(this.params()['missionId'] ?? 0);
  }

  protected queryValue(
    key: string,
    fallback: unknown,
  ): unknown {
    return this.query()[key] ?? fallback;
  }

  protected summary(): DebriefSummary | null {
    return (this.data()['summary'] as DebriefSummary | undefined) ?? null;
  }
}

