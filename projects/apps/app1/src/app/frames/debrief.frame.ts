import { inject } from '@angular/core';
import { frame, s } from '@epikodelabs/switchboard';
import { DebriefPage } from '../components/debrief.page';
import { DebriefSidebarComponent } from '../components/debrief-sidebar.component';
import { OperationsRoomService } from '../services/operations-room.service';

export const debriefFrame = frame('debrief', DebriefPage, {
  transitions: ['mission', 'analysis'],
  directEntryRedirectTo: { name: 'dock' },
  params: {
    missionId: s.number({ min: 1 }),
  },
  query: {
    tab: s.string('summary'),
  },
  outlets: {
    sidebar: DebriefSidebarComponent,
  },
  prepare: async context => ({
    summary: await inject(OperationsRoomService).prepareDebrief(
      Number(context.params['missionId'] ?? 0),
      context.historyState,
    ),
  }),
});
