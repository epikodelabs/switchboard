import { inject } from '@angular/core';
import {
  frame,
  frameOutlet,
  s,
  view,
} from '@epikodelabs/switchboard';

import { DebriefPage } from '../components/debrief.page';
import { DebriefSidebarComponent } from '../components/debrief-sidebar.component';
import { OperationsRoomService } from '../services/operations-room.service';

export const debriefFrame = frame(
  'debrief',
  view(DebriefPage, {
    prepare: [
      async context => ({
        summary: await inject(OperationsRoomService).prepareDebrief(
          Number(context.params['missionId'] ?? 0),
          context.historyState,
        ),
      }),
    ],
  }),
  {
    transitions: [
      'mission',
      'analysis',
    ],
    directEntryRedirectTo: {
      name: 'dock',
    },
    paramsSchema: {
      missionId: s.number({ min: 1 }),
    },
    querySchema: {
      tab: s.string('summary'),
    },
    outlets: [
      frameOutlet(
        'sidebar',
        view(DebriefSidebarComponent),
      ),
    ],
  },
);
