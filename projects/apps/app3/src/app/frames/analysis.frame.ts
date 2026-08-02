import { inject } from '@angular/core';
import {
  frame,
  frameOutlet,
  lazyView,
  s,
  view,
} from '@epikodelabs/switchboard';

import { AnalysisSidebarComponent } from '../components/analysis-sidebar.component';
import { OperationsRoomService } from '../services/operations-room.service';

export const analysisFrame = frame(
  'analysis',
  lazyView(
    () =>
      import('../components/analysis.page').then(
        module => module.AnalysisPage,
      ),
    {
      prepare: [
        async context => ({
          snapshot: await inject(OperationsRoomService).prepareAnalysis(
            Number(context.params['missionId'] ?? 0),
            String(context.query['lens'] ?? 'thermal'),
            Number(context.query['detail'] ?? 2),
          ),
        }),
      ],
    },
  ),
  {
    directEntry: true,
    transitions: [
      'mission',
      'handoff',
    ],
    paramsSchema: {
      missionId: s.number({ min: 1 }),
    },
    querySchema: {
      lens: s.string('thermal'),
      detail: s.number({ default: 2, min: 1, max: 5 }),
    },
    outlets: [
      frameOutlet(
        'sidebar',
        view(AnalysisSidebarComponent),
      ),
    ],
  },
);
