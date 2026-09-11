import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

const angularPackage = require.resolve('@angular/build/package.json');
const angularRoot = path.dirname(angularPackage);
const angularSchemaPath = path.join(
  angularRoot,
  'src',
  'builders',
  'application',
  'schema.json',
);

const outputPath = path.resolve(
  import.meta.dirname,
  '../src/switchboard-build/schema.json',
);

const angularSchema = JSON.parse(
  await fs.readFile(angularSchemaPath, 'utf8'),
);

const switchboardProperty = {
  type: 'object',
  description: 'Switchboard privilege-aware build options.',
  additionalProperties: false,
  default: {},
  properties: {
    entry: {
      type: 'string',
      default: 'src/app/app.frames.ts',
      description:
        'Switchboard frame graph entry relative to the Angular project root.',
    },
    buildManifest: {
      type: 'boolean',
      default: true,
      description:
        'Emit the optional Switchboard build/inspection manifest.',
    },
  },
};

const schema = {
  ...angularSchema,
  title: 'Switchboard Angular application build',
  description:
    'Angular application builder options extended with Switchboard privilege-aware partitioning.',
  properties: {
    ...(angularSchema.properties ?? {}),
    switchboard: switchboardProperty,
  },
};

await fs.mkdir(path.dirname(outputPath), {
  recursive: true,
});

await fs.writeFile(
  outputPath,
  `${JSON.stringify(schema, null, 2)}\n`,
  'utf8',
);

console.log(
  `Generated ${path.relative(process.cwd(), outputPath)} from ${path.relative(process.cwd(), angularSchemaPath)}`,
);
