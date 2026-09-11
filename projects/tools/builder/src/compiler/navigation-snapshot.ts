import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import ts from 'typescript';

export interface LoadedContribution {
  readonly definition: any;
  readonly sourceFile: string;
  readonly exportName: string;
}
export interface NavigationSnapshot {
  readonly rootFrames: readonly any[];
  readonly contributions: readonly LoadedContribution[];
}

export async function loadNavigationSnapshot(projectRoot: string, entry: string, metadataRoot: string): Promise<NavigationSnapshot> {
  const frameFiles = await discoverFrameModules(path.join(projectRoot, 'src'), entry);
  const generatedRoot = path.join(metadataRoot, 'analysis');
  const sourceRoot = path.join(generatedRoot, 'sources');
  await fs.mkdir(sourceRoot, { recursive: true });
  const stub = path.join(sourceRoot, 'switchboard-stub.ts');
  await fs.writeFile(stub, switchboardStubSource(), 'utf8');

  const transformed = await Promise.all([entry, ...frameFiles].map((file, index) =>
    writeTransformedModule(file, path.join(sourceRoot, `module-${index}.ts`), stub)));
  const [transformedEntry, ...transformedFrames] = transformed;
  const sourceFile = path.join(generatedRoot, 'navigation-snapshot.entry.ts');
  const bundleFile = path.join(generatedRoot, 'navigation-snapshot.mjs');
  const imports = transformedFrames.map((file, index) => `import * as frameModule${index} from ${JSON.stringify(asImportPath(file))};`);
  const descriptors = frameFiles.map((file, index) => `{ sourceFile: ${JSON.stringify(file)}, exports: frameModule${index} }`);
  await fs.writeFile(sourceFile, [
    `import * as rootModule from ${JSON.stringify(asImportPath(transformedEntry!))};`,
    ...imports,
    `export default { rootFrames: rootModule.frames, modules: [${descriptors.join(',')}] };`,
  ].join('\n'), 'utf8');

  await build({ entryPoints: [sourceFile], outfile: bundleFile, bundle: true, platform: 'node', format: 'esm', target: 'node22', logLevel: 'silent' });
  const loaded = await import(`${pathToFileURL(bundleFile).href}?t=${Date.now()}`);
  const payload = loaded.default as { rootFrames?: unknown; modules?: readonly {sourceFile?: unknown; exports?: unknown}[] };
  if (!Array.isArray(payload.rootFrames)) throw new Error(`Switchboard entry "${entry}" did not export a NavigationTree named "frames".`);

  const contributions: LoadedContribution[] = [];
  for (const module of payload.modules ?? []) {
    if (typeof module.sourceFile !== 'string' || !module.exports || typeof module.exports !== 'object') continue;
    for (const [exportName, value] of Object.entries(module.exports as Record<string, unknown>)) {
      if (!isContribution(value)) continue;
      contributions.push(Object.freeze({
        definition: Object.freeze({ ...value, id: contributionArtifactKey(projectRoot, module.sourceFile, exportName) }),
        sourceFile: module.sourceFile,
        exportName,
      }));
    }
  }
  return Object.freeze({ rootFrames: Object.freeze([...payload.rootFrames]), contributions: Object.freeze(contributions) });
}

async function discoverFrameModules(sourceRoot: string, entry: string): Promise<readonly string[]> {
  const files: string[] = [];
  async function visit(directory: string): Promise<void> {
    let entries: import('node:fs').Dirent[];
    try { entries = await fs.readdir(directory, { withFileTypes: true }); } catch { return; }
    for (const item of entries) {
      const absolute = path.join(directory, item.name);
      if (item.isDirectory()) { await visit(absolute); continue; }
      if (!item.isFile() || path.resolve(absolute) === path.resolve(entry) || item.name.endsWith('.spec.ts')) continue;
      if (!/\.(?:frames?|routes)\.ts$/i.test(item.name)) continue;
      files.push(path.resolve(absolute));
    }
  }
  await visit(sourceRoot);
  return Object.freeze(files.sort());
}

async function writeTransformedModule(sourcePath: string, outputPath: string, stubFile: string): Promise<string> {
  const sourceText = await fs.readFile(sourcePath, 'utf8');
  const sourceFile = ts.createSourceFile(sourcePath, sourceText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  let cursor = 0, transformed = '';
  for (const statement of sourceFile.statements) {
    if (!ts.isImportDeclaration(statement)) continue;
    transformed += sourceText.slice(cursor, statement.getFullStart());
    transformed += transformImport(statement, outputPath, stubFile);
    cursor = statement.getEnd();
  }
  transformed += sourceText.slice(cursor);
  transformed = transformed.replace(/\bimport\s*\(/g, '__switchboardDynamicImport(');
  const prelude = [
    `const __switchboardStubValue = new Proxy(function () {}, { get() { return __switchboardStubValue; }, apply() { return undefined; }, construct() { return {}; } });`,
    `const __switchboardDynamicImport = async () => ({});`, ''
  ].join('\n');
  await fs.writeFile(outputPath, prelude + transformed, 'utf8');
  return outputPath;
}

function transformImport(statement: ts.ImportDeclaration, outputPath: string, stubFile: string): string {
  const specifier = (statement.moduleSpecifier as ts.StringLiteral).text;
  const clause = statement.importClause;
  if (!clause || clause.isTypeOnly) return '';
  if (specifier === '@epikodelabs/switchboard') return rewriteImport(clause, toRelativeImport(outputPath, stubFile));
  return stubBindings(clause);
}
function rewriteImport(clause: ts.ImportClause, specifier: string): string {
  const parts: string[] = [];
  if (clause.name) parts.push(clause.name.text);
  if (clause.namedBindings && ts.isNamespaceImport(clause.namedBindings)) parts.push(`* as ${clause.namedBindings.name.text}`);
  else if (clause.namedBindings && ts.isNamedImports(clause.namedBindings)) parts.push(`{ ${clause.namedBindings.elements.map(e => e.propertyName ? `${e.propertyName.text} as ${e.name.text}` : e.name.text).join(', ')} }`);
  return parts.length ? `import ${parts.join(', ')} from ${JSON.stringify(asImportPath(specifier))};` : '';
}
function stubBindings(clause: ts.ImportClause): string {
  const out: string[] = [];
  if (clause.name) out.push(`const ${clause.name.text} = __switchboardStubValue;`);
  if (clause.namedBindings && ts.isNamespaceImport(clause.namedBindings)) out.push(`const ${clause.namedBindings.name.text} = __switchboardStubValue;`);
  else if (clause.namedBindings && ts.isNamedImports(clause.namedBindings)) for (const e of clause.namedBindings.elements) out.push(`const ${e.name.text} = __switchboardStubValue;`);
  return out.join('\n');
}
function toRelativeImport(from: string, to: string): string { const r = path.relative(path.dirname(from), to); return r.startsWith('.') ? r : `./${r}`; }
function asImportPath(file: string): string { return file.split(path.sep).join('/'); }

function switchboardStubSource(): string {
  return [
    `function splitView(view) {`,
    `  if (view && typeof view === 'object' && view.kind === 'frame') {`,
    `    return view.component !== undefined ? { component: view.component, frame: view } : { loadComponent: view.loadComponent, frame: view };`,
    `  }`,
    `  return { component: view };`,
    `}`,
    `export function frameSlot(slotId) { return { kind: 'frame-slot', slotId }; }`,
    `let nextContributionIdentity = 1;`,
    `export function framesFor(slotId, children) { return { kind: 'frame-contribution', slotId, id: slotId + '@' + nextContributionIdentity++, children }; }`,
    `export function frame(id, pathOrView, viewOrOptions = {}, maybeOptions = {}) {`,
    `  const hasPath = typeof pathOrView === 'string';`,
    `  const path = hasPath ? pathOrView : undefined;`,
    `  const view = hasPath ? viewOrOptions : pathOrView;`,
    `  const options = hasPath ? maybeOptions : viewOrOptions;`,
    `  return Object.assign({ kind: 'frame', id }, path === undefined ? {} : { path }, splitView(view), options);`,
    `}`,
    `export function redirect(path, target, options = {}) { return Object.assign({ kind: 'redirect-frame', path, targetFrameId: target && target.id }, options); }`,
    `export function layout(path, view, children, options = {}) { return Object.assign({ kind: 'layout', path }, splitView(view), { children }, options); }`,
    `export const s = Object.freeze({ number(options = {}) { return { _type: 'number', ...options }; }, string(value) { return { _type: 'string', default: value }; }, array(value) { return { _type: 'array', default: value }; }, optional(inner) { return { _type: 'optional', inner }; }, boolean(value) { return { _type: 'boolean', default: value }; }, date(value) { return { _type: 'date', default: value }; } });`,
    ''
  ].join('\n');
}
function contributionArtifactKey(projectRoot: string, sourceFile: string, exportName: string): string {
  const relative = path.relative(projectRoot, sourceFile).split(path.sep).join('/').replace(/\.(?:frames?|routes)\.ts$/i, '');
  return `${relative}#${exportName}`;
}
function isContribution(value: unknown): value is {kind:'frame-contribution';slotId:string;id:string;children:readonly unknown[]} {
  if (!value || typeof value !== 'object') return false;
  const c = value as any;
  return c.kind === 'frame-contribution' && typeof c.slotId === 'string' && !!c.slotId.trim() && typeof c.id === 'string' && !!c.id.trim() && Array.isArray(c.children);
}
