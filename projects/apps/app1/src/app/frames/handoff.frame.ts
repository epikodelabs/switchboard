import { inject } from '@angular/core';
import { frame } from '@epikodelabs/switchboard';
import { HandoffPage } from '../components/handoff.page';
import { HandoffSidebarComponent } from '../components/handoff-sidebar.component';
import { OperationsRoomService } from '../services/operations-room.service';

export const handoffFrame = frame('handoff', HandoffPage, {
  transitions: ['mission', 'analysis', 'debrief'],
  outlets: {
    sidebar: HandoffSidebarComponent,
  },
  prepare: async context => ({
    packet: await inject(OperationsRoomService).hydrateHandoff(
      context.historyState,
    ),
  }),
});
