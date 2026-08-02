import { inject } from '@angular/core';
import {
  frame,
  frameOutlet,
  view,
} from '@epikodelabs/switchboard';

import {
  EditorPage,
  EditorSidebarComponent,
} from '../components/demo-pages';
import { DemoSessionService } from '../services/demo-session.service';

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
    transitions: [
      'workspace',
      'settings',
      'reports',
      'admin',
    ],
    outlets: [
      frameOutlet(
        'sidebar',
        view(EditorSidebarComponent),
      ),
    ],
  },
);
