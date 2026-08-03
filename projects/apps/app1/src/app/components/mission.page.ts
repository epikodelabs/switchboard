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
  MissionSnapshot,
  OperationsRoomService,
} from '../services/operations-room.service';

@Component({
  standalone: true,
  imports: [RouterLink],
  template: `
    <section class="scene scene--flat">
      <header class="scene-header">
        <div>
          <p class="scene-eyebrow">Addressable frame</p>
          <h1 class="scene-title">{{ snapshot()?.codeName }}</h1>
          <p class="scene-copy">{{ snapshot()?.headline }}</p>
        </div>
        <span class="status-chip">{{ queryValue('lane', 'thermal') }} lane</span>
      </header>

      <div class="metric-strip">
        <article class="metric">
          <span>Mission</span>
          <strong>#{{ missionId() }}</strong>
        </article>
        <article class="metric">
          <span>Sector</span>
          <strong>{{ snapshot()?.sector }}</strong>
        </article>
        <article class="metric">
          <span>Operator</span>
          <strong>{{ snapshot()?.operatorName }}</strong>
        </article>
        <article class="metric">
          <span>Window</span>
          <strong>{{ snapshot()?.routeWindow }}</strong>
        </article>
      </div>

      <div class="panel-grid">
        <article class="panel">
          <h3>Prepared frame data</h3>
          <ul class="signal-list">
            <li>Role: {{ snapshot()?.operatorTitle }}</li>
            <li>Risk band: {{ snapshot()?.risk }}</li>
            <li>Suggested lens: {{ snapshot()?.recommendedLens }}</li>
            <li>Anomaly profile: {{ snapshot()?.anomalyBand }}</li>
          </ul>
        </article>

        <article class="panel">
          <h3>Typed route values</h3>
          <dl class="data-list">
            <div>
              <dt>missionId</dt>
              <dd>{{ missionId() }}</dd>
            </div>
            <div>
              <dt>lane</dt>
              <dd>{{ queryValue('lane', 'thermal') }}</dd>
            </div>
            <div>
              <dt>zoom</dt>
              <dd>{{ queryValue('zoom', 2) }}</dd>
            </div>
            <div>
              <dt>next mission</dt>
              <dd>#{{ snapshot()?.nextMissionId }}</dd>
            </div>
          </dl>
        </article>
      </div>

      <div class="action-row">
        <button type="button" class="action-button" (click)="openAnalysis()">
          Shift to analysis
        </button>
        <button
          type="button"
          class="action-button action-button--accent"
          (click)="openHandoff()"
        >
          Open silent handoff
        </button>
        <a
          class="action-link"
          [routerLink]="{
            name: 'mission',
            params: { missionId: snapshot()?.nextMissionId ?? 207 },
            query: { lane: 'survey', zoom: 1 }
          }"
        >
          Rotate to next mission
        </a>
      </div>
    </section>
  `,
  styles: [sceneStyles],
})
export class MissionPage {
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

  protected snapshot(): MissionSnapshot | null {
    return (this.data()['snapshot'] as MissionSnapshot | undefined) ?? null;
  }

  protected openAnalysis(): void {
    void this.router.navigate({
      frame: 'analysis',
      params: {
        missionId: this.missionId(),
      },
      query: {
        lens: this.snapshot()?.recommendedLens ?? 'echo',
        detail: 3,
      },
    });
  }

  protected openHandoff(): void {
    const packet = this.room.createHandoffPacket({
      missionId: this.missionId(),
      originFrame: 'mission',
      channel: String(this.queryValue('lane', 'thermal')),
      note: 'Mission board requesting a sealed transfer before public release.',
      returnDetail: Number(this.queryValue('zoom', 2)),
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

