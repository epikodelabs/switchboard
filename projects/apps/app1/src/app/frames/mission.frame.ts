import { inject } from '@angular/core';
import { frame, s } from '@epikodelabs/switchboard';
import { MissionPage } from '../components/mission.page';
import { MissionSidebarComponent } from '../components/mission-sidebar.component';
import { OperationsRoomService } from '../services/operations-room.service';

export const missionFrame = frame('mission', MissionPage, {
  directEntry: true,
  transitions: ['analysis', 'handoff'],
  params: {
    missionId: s.number({ min: 1 }),
  },
  query: {
    lane: s.string('thermal'),
    zoom: s.number({ default: 2, min: 1, max: 5 }),
  },
  outlets: {
    sidebar: MissionSidebarComponent,
  },
  prepare: async context => ({
    snapshot: await inject(OperationsRoomService).prepareMission(
      Number(context.params['missionId'] ?? 0),
      String(context.query['lane'] ?? 'thermal'),
      Number(context.query['zoom'] ?? 2),
    ),
  }),
});
