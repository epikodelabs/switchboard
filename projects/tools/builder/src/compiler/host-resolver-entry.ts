export function createHostResolverSource(specifiers: readonly string[]): string {
  const modules = [...new Set(['@epikodelabs/switchboard', ...specifiers])].sort();
  const imports = modules.map((specifier, index) => `import * as module${index} from ${JSON.stringify(specifier)};`);
  const switchboardIndex = modules.indexOf('@epikodelabs/switchboard');
  const entries = modules.map((specifier, index) => `    ${JSON.stringify(specifier)}: module${index},`);
  return [
    `// Switchboard generated server-frame resolver.`, ...imports, ``,
    `export const resolveFrames =`,
    `  module${switchboardIndex}.createServerFrameResolver({`,
    `    hostModules: {`, ...entries, `    },`, `  });`, ``,
  ].join('\n');
}
