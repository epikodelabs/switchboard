export const appFrameGraph = {
  intro: {
    directEntry: true,
    transitions: [
      'workspace',
      'settings',
    ],
  },
  workspace: {
    transitions: [
      'settings',
      'editor',
      'reports',
      'admin',
    ],
  },
  settings: {
    transitions: [
      'workspace',
      'editor',
      'reports',
      'admin',
    ],
  },
  editor: {
    transitions: [
      'workspace',
      'settings',
      'reports',
      'admin',
    ],
  },
  reports: {
    transitions: [
      'workspace',
      'settings',
      'editor',
      'admin',
    ],
  },
  admin: {
    transitions: [
      'workspace',
      'settings',
      'editor',
      'reports',
    ],
  },
} as const;

export type AppFrameId =
  keyof typeof appFrameGraph;

export function appFrameNavigation<
  TFrameId extends AppFrameId,
>(
  frameId: TFrameId,
): (typeof appFrameGraph)[TFrameId] {
  return appFrameGraph[frameId];
}
