import { inject } from '@angular/core';
import {
  defineFrameOutlet,
  defineFrameRoute,
  frame,
  s,
} from '@epikodelabs/switchboard';

import {
  EditorPage,
  EditorSidebarComponent,
} from '../demo-pages';
import { DemoSessionService } from '../demo-session.service';

export const editorFrame = defineFrameRoute(
  '/editor/:draftId',
  frame(EditorPage, {
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
    name: 'editor',
    paramsSchema: {
      draftId: s.number({ min: 1 }),
    },
    querySchema: {
      mode: s.string('write'),
    },
  },
  [
    defineFrameOutlet(
      'sidebar',
      frame(EditorSidebarComponent),
    ),
  ],
);
