import {
  address,
  layout,
  navigation,
  redirectRoute,
} from '@epikodelabs/switchboard';

import {
  analysisFrame,
  debriefFrame,
  dockFrame,
  handoffFrame,
  missionFrame,
  opsShellFrame,
} from './frames';

export const routes = navigation({
  frames: [
    dockFrame,
    missionFrame,
    analysisFrame,
    handoffFrame,
    debriefFrame,
  ] as const,
  entries: [
    address('/', dockFrame),
    redirectRoute(
      '/legacy',
      '/ops/mission/207?lane=thermal&zoom=2',
    ),
    layout('/ops', opsShellFrame, [
      redirectRoute(
        '',
        '/ops/mission/207?lane=thermal&zoom=2',
      ),
      address('/mission/:missionId', missionFrame),
      address('/analysis/:missionId', analysisFrame),
      handoffFrame,
      address('/debrief/:missionId', debriefFrame),
    ]),
  ] as const,
});
