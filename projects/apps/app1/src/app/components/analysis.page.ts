import {
  Component,
  inject,
  input,
} from '@angular/core';
import {
  Router,
  RouterLink,
} from '@epikodelabs/switchboard';

import { DataInput, ParamsInput, QueryInput } from './route-inputs';
import { sceneStyles } from './scene-styles';
import {
  AnalysisSnapshot,
  OperationsRoomService,
} from '../services/operations-room.service';

@Component({
  standalone: true,
  imports: [RouterLink],
  template: `
    <section class="scene">
      <header class="scene-header">
        <div>
          <p class="scene-eyebrow">Lazy frame</p>
          <h1 class="scene-title">{{ snapshot()?.codeName }} analysis</h1>
          <p class="scene-copy">
            This frame is lazy-loaded and still participates in the frame graph. It
            prepares typed data before the commit and can move into the internal
            handoff without projecting new payload fields into the address.
          </p>
        </div>
        <span class="status-chip">{{ snapshot()?.lens }} lens</span>
      </header>

      <div class="metric-strip">
        <article class="metric">
          <span>Confidence</span>
          <strong>{{ snapshot()?.confidence }}</strong>
        </article>
        <article class="metric">
          <span>Drift</span>
          <strong>{{ snapshot()?.drift }}</strong>
        </article>
        <article class="metric">
          <span>Action window</span>
          <strong>{{ snapshot()?.actionWindow }}</strong>
        </article>
        <article class="metric">
          <span>Detail</span>
          <strong>{{ queryValue('detail', 2) }}</strong>
        </article>
      </div>

      <div class="panel-grid">
        <article class="panel">
          <h3>Hot spots</h3>
          <ul class="signal-list">
            @for (spot of snapshot()?.hotSpots ?? []; track $index) {
              <li>{{ spot }}</li>
            }
          </ul>
        </article>

        <article class="panel">
          <h3>Analyst note</h3>
          <p>{{ snapshot()?.recommendedNote }}</p>
          <dl class="data-list">
            <div>
              <dt>missionId</dt>
              <dd>{{ missionId() }}</dd>
            </div>
            <div>
              <dt>lens</dt>
              <dd>{{ queryValue('lens', 'thermal') }}</dd>
            </div>
            <div>
              <dt>detail</dt>
              <dd>{{ queryValue('detail', 2) }}</dd>
            </div>
          </dl>
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
        <button
          type="button"
          class="action-button action-button--accent"
          (click)="openHandoff()"
        >
          Seal analysis handoff
        </button>
      </div>
    </section>
  `,
  styles: [sceneStyles],
})
export class AnalysisPage {
  private readonly router = inject(Router);
  private readonly room = inject(OperationsRoomService);

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

  protected snapshot(): AnalysisSnapshot | null {
    return (this.data()['snapshot'] as AnalysisSnapshot | undefined) ?? null;
  }

  protected openHandoff(): void {
    const packet = this.room.createHandoffPacket({
      missionId: this.missionId(),
      originFrame: 'analysis',
      channel: String(this.queryValue('lens', 'thermal')),
      note: 'Analysis frame validated the anomaly cluster and requests sealed review.',
      returnDetail: Number(this.queryValue('detail', 2)),
    });

    void this.router.navigate(
      {
        frame: 'handoff',
        payload: packet,
      },
      {
        state: packet,
      },
    );
  }
}
