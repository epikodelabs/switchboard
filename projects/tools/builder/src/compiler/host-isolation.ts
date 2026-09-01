import fs from 'node:fs/promises';
import path from 'node:path';

export interface ProtectedFrameModuleMarker {
  readonly artifactKey: string;
  readonly sourceFile: string;
  readonly exportName: string;
}

/**
 * Verifies that protected frame source modules are absent from the public host
 * output. Artifact ids are compiler-owned now, so isolation is checked from
 * source provenance rather than from author-written framesFor() ids.
 */
export async function assertNoProtectedFrameModulesInHost(
  publicRoot: string,
  artifacts: readonly ProtectedFrameModuleMarker[],
): Promise<void> {
  if (artifacts.length === 0) return;

  const files = await readableHostFiles(publicRoot);

  for (const file of files) {
    const contents = await fs.readFile(file, 'utf8');

    for (const artifact of artifacts) {
      if (!containsSourceReference(contents, artifact.sourceFile)) continue;

      throw new Error(
        `Server-delivered frame artifact "${artifact.artifactKey}" leaked into public host output: ${file}. ` +
        `Protected source ${JSON.stringify(artifact.sourceFile)} must not be imported by the Angular host graph.`,
      );
    }
  }
}

function containsSourceReference(
  contents: string,
  sourceFile: string,
): boolean {
  const normalized = sourceFile.split(path.sep).join('/');
  const basename = path.basename(sourceFile);
  const withoutDrive = normalized.replace(/^[A-Za-z]:/, '');

  return contents.includes(normalized)
    || contents.includes(withoutDrive)
    || contents.includes(basename);
}

async function readableHostFiles(root: string): Promise<string[]> {
  const files: string[] = [];

  async function visit(directory: string): Promise<void> {
    for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
      const file = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        await visit(file);
      } else if (/\.(?:m?js|cjs|html|json|map)$/i.test(entry.name)) {
        files.push(file);
      }
    }
  }

  await visit(root);
  return files.sort();
}
