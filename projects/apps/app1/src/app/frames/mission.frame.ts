import { inject } from '@angular/core';
import {
  frame,
  frameOutlet,
  s,
  view,
} from '@epikodelabs/switchboard';

import { MissionPage } from '../components/mission.page';
import { MissionSidebarComponent } from '../components/mission-sidebar.component';
import { OperationsRoomService } from '../services/operations-room.service';

export const missionFrame = frame(
  'mission',
  view(MissionPage, {
    prepare: [
      async context => ({
        snapshot: await inject(OperationsRoomService).prepareMission(
          Number(context.params['missionId'] ?? 0),
          String(context.query['lane'] ?? 'thermal'),
          Number(context.query['zoom'] ?? 2),
        ),
      }),
    ],
  }),
  {
    directEntry: true,
    transitions: [
      'analysis',
      'handoff',
    ],
    paramsSchema: {
      missionId: s.number({ min: 1 }),
    },
    querySchema: {
      lane: s.string('thermal'),
      zoom: s.number({ default: 2, min: 1, max: 5 }),
    },
    outlets: [
      frameOutlet(
        'sidebar',
        view(MissionSidebarComponent),
      ),
    ],
  },
);

