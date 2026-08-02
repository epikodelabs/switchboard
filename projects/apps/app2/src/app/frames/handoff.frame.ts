import { inject } from '@angular/core';
import {
  frame,
  frameOutlet,
  view,
} from '@epikodelabs/switchboard';

import { HandoffPage } from '../components/handoff.page';
import { HandoffSidebarComponent } from '../components/handoff-sidebar.component';
import { OperationsRoomService } from '../services/operations-room.service';

export const handoffFrame = frame(
  'handoff',
  view(HandoffPage, {
    prepare: [
      async context => ({
        packet: await inject(OperationsRoomService).hydrateHandoff(
          context.historyState,
        ),
      }),
    ],
  }),
  {
    transitions: [
      'mission',
      'analysis',
      'debrief',
    ],
    outlets: [
      frameOutlet(
        'sidebar',
        view(HandoffSidebarComponent),
      ),
    ],
  },
);
