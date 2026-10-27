#!/usr/bin/env node
import { readFile, stat } from 'node:fs/promises';
import { renderMinutes, extractActions } from '../src/index.js';
const help = `Actas comunitarias en Markdown
node bin/cli.js render|actions --input examples/reunion.json [--as-of AAAA-MM-DD]

render escribe un borrador Markdown; actions devuelve acuerdos en JSON.
No modifica el original, no envía documentos y no certifica acuerdos.
`;
try {
  const [command, ...args] = process.argv.slice(2);
  if (!command || command === '--help') process.stdout.write(help);
  else {
    if (!['render', 'actions'].includes(command)) throw new Error('Comando inválido.');
    const values = {};
    for (let i = 0; i < args.length; i += 2) {
      if (!['--input', '--as-of'].includes(args[i]) || Object.hasOwn(values, args[i]) || !args[i + 1] || args[i + 1].startsWith('--')) throw new Error('Opciones inválidas.');
      values[args[i]] = args[i + 1];
    }
    if (!values['--input'] || (await stat(values['--input'])).size > 1024 * 1024) throw new Error('Archivo inválido o demasiado grande.');
    const input = JSON.parse(await readFile(values['--input'], 'utf8'));
    const options = values['--as-of'] ? { asOf: values['--as-of'] } : {};
    process.stdout.write(command === 'render' ? renderMinutes(input, options) : JSON.stringify(extractActions(input, options), null, 2) + '\n');
  }
} catch { console.error('No se pudo generar el borrador. Revisa --help, el archivo y el contrato documentado; no se imprime la entrada.'); process.exitCode = 1; }
