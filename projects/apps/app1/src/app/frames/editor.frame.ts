import { inject } from '@angular/core';
import {
  frame,
  frameOutlet,
  s,
  view,
} from '@epikodelabs/switchboard';

import {
  EditorPage,
  EditorSidebarComponent,
} from '../components/demo-pages';
import { DemoSessionService } from '../services/demo-session.service';
import { appFrameNavigation } from './frame-graph';

export const editorFrame = frame(
  'editor',
  view(EditorPage, {
    beforeLeave: [
      () => {
        const session = inject(DemoSessionService);

        return !session.draftDirty()
          || window.confirm(
            'Leave the draft and discard unsaved changes?',
          );
      },
    ],
  }),
  {
    ...appFrameNavigation('editor'),
    paramsSchema: {
      draftId: s.number({ min: 1 }),
    },
    querySchema: {
      mode: s.string('write'),
    },
    outlets: [
      frameOutlet(
        'sidebar',
        view(EditorSidebarComponent),
      ),
    ],
  },
);
