import fs from 'node:fs/promises';
import path from 'node:path';
import ts from 'typescript';
import type { Plugin } from 'esbuild';

export const SWITCHBOARD_HOST_RUNTIME_GLOBAL_KEY =
  '__SWITCHBOARD_SERVER_NAVIGATION_HOST_RUNTIME_V1__';

export type HostModuleExportIndex =
  ReadonlyMap<string, ReadonlySet<string>>;

export function isDefaultHostModule(
  specifier: string,
): boolean {
  return specifier === '@epikodelabs/switchboard'
    || specifier.startsWith('@angular/');
}

/**
 * Reads full-AOT JavaScript and records the host exports referenced by the
 * protected artifacts. These imports are replaced with the browser host runtime
 * bridge rather than bundling second Angular/Switchboard identities.
 */
export async function collectHostModuleExports(
  root: string,
): Promise<HostModuleExportIndex> {
  const result = new Map<string, Set<string>>();

  for (const file of await listJavaScriptFiles(root)) {
    collectFromSource(
      await fs.readFile(file, 'utf8'),
      file,
      result,
    );
  }

  return new Map(
    [...result.entries()]
      .sort(([left], [right]) =>
        left.localeCompare(right))
      .map(([specifier, names]) => [
        specifier,
        new Set([...names].sort()),
      ]),
  );
}

export function createHostRuntimePlugin(
  exportsByModule: HostModuleExportIndex,
): Plugin {
  return {
    name: 'switchboard-host-runtime',

    setup(build) {
      build.onResolve(
        { filter: /.*/ },
        args => {
          if (!exportsByModule.has(args.path)) {
            return undefined;
          }

          return {
            path: args.path,
            namespace: 'switchboard-host-runtime',
          };
        },
      );

      build.onLoad(
        {
          filter: /.*/,
          namespace: 'switchboard-host-runtime',
        },
        args => ({
          contents: hostModuleSource(
            args.path,
            exportsByModule.get(args.path)
              ?? new Set(),
          ),
          loader: 'js',
        }),
      );
    },
  };
}

function hostModuleSource(
  specifier: string,
  exportNames: ReadonlySet<string>,
): string {
  const lines = [
    `const runtime = globalThis[${JSON.stringify(
      SWITCHBOARD_HOST_RUNTIME_GLOBAL_KEY,
    )}];`,
    `const module = runtime?.modules?.get(${JSON.stringify(
      specifier,
    )});`,
    `if (!module) throw new Error(${JSON.stringify(
      `Switchboard artifact requires host module "${specifier}". Ensure the generated Switchboard host runtime bootstrap is included in the application build.`,
    )});`,
  ];

  for (const name of [...exportNames].sort()) {
    if (name === 'default') {
      lines.push(
        'export default module["default"];',
      );
      continue;
    }

    if (!isIdentifier(name)) {
      throw new Error(
        `Cannot bridge non-identifier export ${JSON.stringify(
          name,
        )} from ${JSON.stringify(specifier)}.`,
      );
    }

    lines.push(
      `export const ${name} = module[${JSON.stringify(
        name,
      )}];`,
    );
  }

  return `${lines.join('\n')}\n`;
}

function collectFromSource(
  text: string,
  fileName: string,
  result: Map<string, Set<string>>,
): void {
  const source = ts.createSourceFile(
    fileName,
    text,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.JS,
  );

  const namespaceImports =
    new Map<
      string,
      {
        specifier: string;
        names: Set<string>;
      }
    >();

  for (const statement of source.statements) {
    if (
      ts.isImportDeclaration(statement)
      && ts.isStringLiteral(
        statement.moduleSpecifier,
      )
    ) {
      const specifier =
        statement.moduleSpecifier.text;

      if (!isDefaultHostModule(specifier)) {
        continue;
      }

      const names =
        requireSet(result, specifier);

      const clause = statement.importClause;
      if (!clause) continue;

      if (clause.name) {
        names.add('default');
      }

      const bindings = clause.namedBindings;

      if (
        bindings
        && ts.isNamedImports(bindings)
      ) {
        for (const item of bindings.elements) {
          names.add(
            (item.propertyName ?? item.name).text,
          );
        }
      } else if (
        bindings
        && ts.isNamespaceImport(bindings)
      ) {
        namespaceImports.set(
          bindings.name.text,
          {
            specifier,
            names,
          },
        );
      }

      continue;
    }

    if (
      ts.isExportDeclaration(statement)
      && statement.moduleSpecifier
      && ts.isStringLiteral(
        statement.moduleSpecifier,
      )
      && isDefaultHostModule(
        statement.moduleSpecifier.text,
      )
    ) {
      const specifier =
        statement.moduleSpecifier.text;

      const names =
        requireSet(result, specifier);

      if (
        !statement.exportClause
        || !ts.isNamedExports(
          statement.exportClause,
        )
      ) {
        throw new Error(
          `Host-shared export * is not supported in ${JSON.stringify(
            fileName,
          )}.`,
        );
      }

      for (
        const item
        of statement.exportClause.elements
      ) {
        names.add(
          (item.propertyName ?? item.name).text,
        );
      }
    }
  }

  if (namespaceImports.size === 0) {
    return;
  }

  const visit = (node: ts.Node): void => {
    if (
      ts.isPropertyAccessExpression(node)
      && ts.isIdentifier(node.expression)
    ) {
      namespaceImports
        .get(node.expression.text)
        ?.names.add(node.name.text);
    } else if (
      ts.isElementAccessExpression(node)
      && ts.isIdentifier(node.expression)
      && node.argumentExpression
      && ts.isStringLiteral(
        node.argumentExpression,
      )
    ) {
      namespaceImports
        .get(node.expression.text)
        ?.names.add(
          node.argumentExpression.text,
        );
    }

    ts.forEachChild(node, visit);
  };

  visit(source);
}

function requireSet(
  result: Map<string, Set<string>>,
  specifier: string,
): Set<string> {
  const existing = result.get(specifier);
  if (existing) return existing;

  const created = new Set<string>();
  result.set(specifier, created);
  return created;
}

async function listJavaScriptFiles(
  root: string,
): Promise<readonly string[]> {
  const result: string[] = [];

  async function visit(
    directory: string,
  ): Promise<void> {
    for (
      const entry
      of await fs.readdir(
        directory,
        { withFileTypes: true },
      )
    ) {
      const target =
        path.join(directory, entry.name);

      if (entry.isDirectory()) {
        await visit(target);
      } else if (
        entry.isFile()
        && /\.(?:mjs|cjs|js)$/.test(
          entry.name,
        )
      ) {
        result.push(target);
      }
    }
  }

  await visit(root);
  return result.sort();
}

function isIdentifier(
  value: string,
): boolean {
  if (!value) return false;

  const scanner = ts.createScanner(
    ts.ScriptTarget.Latest,
    false,
    ts.LanguageVariant.Standard,
    value,
  );

  return scanner.scan()
      === ts.SyntaxKind.Identifier
    && scanner.getTokenText() === value
    && scanner.scan()
      === ts.SyntaxKind.EndOfFileToken;
}