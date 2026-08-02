import {
  Component,
  inject,
  input,
} from '@angular/core';
import { Router } from '@epikodelabs/switchboard';

import { DataInput } from './route-inputs';
import { sceneStyles } from './scene-styles';
import { HandoffPacket } from '../services/operations-room.service';

@Component({
  standalone: true,
  template: `
    <section class="scene">
      <header class="scene-header">
        <div>
          <p class="scene-eyebrow">Internal-only frame</p>
          <h1 class="scene-title">Silent handoff</h1>
          <p class="scene-copy">
            This frame has no public address entry. It renders from the frame graph,
            keeps the browser address public, and carries its packet through
            navigation state instead of URL parameters.
          </p>
        </div>
        <span class="status-chip">{{ packet()?.packetId }}</span>
      </header>

      <div class="metric-strip">
        <article class="metric">
          <span>Mission</span>
          <strong>{{ packet()?.codeName }}</strong>
        </article>
        <article class="metric">
          <span>Origin</span>
          <strong>{{ packet()?.originFrame }}</strong>
        </article>
        <article class="metric">
          <span>Channel</span>
          <strong>{{ packet()?.channel }}</strong>
        </article>
        <article class="metric">
          <span>Public address</span>
          <strong>{{ publicAddress() }}</strong>
        </article>
      </div>

      <div class="panel-grid">
        <article class="panel">
          <h3>Packet payload</h3>
          <ul class="signal-list">
            <li>{{ packet()?.operatorName }} opened the packet.</li>
            <li>{{ packet()?.operatorCallsign }} remains the active callsign.</li>
            <li>{{ packet()?.note }}</li>
          </ul>
        </article>

        <article class="panel">
          <h3>Why this matters</h3>
          <p>
            You can inspect the distinction between the current frame id and the
            address bar. The router is on <code>handoff</code>, but the visible URL
            stays on the last public projection until a new addressable frame is
            committed.
          </p>
        </article>
      </div>

      <div class="action-row">
        <button
          type="button"
          class="action-button action-button--accent"
          (click)="commitDebrief()"
        >
          Commit debrief
        </button>
        <button type="button" class="action-button" (click)="returnToOrigin()">
          Return to {{ packet()?.originFrame }}
        </button>
      </div>
    </section>
  `,
  styles: [sceneStyles],
})
export class HandoffPage {
  private readonly router = inject(Router);

  protected readonly data = input<DataInput>({});

  protected packet(): HandoffPacket | null {
    return (this.data()['packet'] as HandoffPacket | undefined) ?? null;
  }

  protected publicAddress(): string {
    return `${window.location.pathname}${window.location.search}`;
  }

  protected commitDebrief(): void {
    const packet = this.packet();

    if (!packet) {
      return;
    }

    void this.router.navigate(
      {
        frame: 'debrief',
        params: {
          missionId: packet.missionId,
        },
        query: {
          tab: 'packet',
        },
        payload: packet,
      },
      {
        state: packet,
      },
    );
  }

  protected returnToOrigin(): void {
    const packet = this.packet();

    if (!packet) {
      return;
    }

    if (packet.originFrame === 'analysis') {
      void this.router.navigate({
        frame: 'analysis',
        params: {
          missionId: packet.missionId,
        },
        query: {
          lens: packet.channel,
          detail: packet.returnDetail,
        },
      });
      return;
    }

    void this.router.navigate({
      frame: 'mission',
      params: {
        missionId: packet.missionId,
      },
      query: {
        lane: packet.channel,
        zoom: packet.returnDetail,
      },
    });
  }
}
