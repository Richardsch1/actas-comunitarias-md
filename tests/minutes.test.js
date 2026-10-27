import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { validateMinutes, extractActions, renderMinutes } from '../src/index.js';
const example = () => JSON.parse(readFileSync(new URL('../examples/reunion.json', import.meta.url), 'utf8'));

test('genera un borrador con roles, temas y acuerdos verificables en la entrada', () => {
  const output = renderMinutes(example(), { asOf: '2026-10-27' });
  assert.match(output, /BORRADOR PARA REVISIÓN/);
  assert.match(output, /Equipo de coordinación/);
  assert.match(output, /acuerdo-uno/);
  assert.match(output, /no certifica asistencia/);
});
test('identifica metas internas vencidas sin marcar tareas completadas', () => {
  assert.equal(extractActions(example(), { asOf: '2026-11-04' })[0].overdue, true);
  const done = example(); done.agreements[0].status = 'completado';
  assert.equal(extractActions(done, { asOf: '2026-11-04' })[0].overdue, false);
  assert.equal(extractActions(example(), { asOf: '2026-11-03' })[0].overdue, false);
});
test('acuerdos requieren un tema y un rol existentes', () => {
  for (const field of ['agendaId', 'responsibleRole']) {
    const input = example(); input.agreements[0][field] = 'inexistente'; assert.throws(() => validateMinutes(input));
  }
});
test('rechaza fechas imposibles y metas anteriores a la reunión', () => {
  for (const dueOn of ['2026-02-30', '2026-10-26', 'mañana']) {
    const input = example(); input.agreements[0].dueOn = dueOn; assert.throws(() => validateMinutes(input));
  }
});
test('rechaza campos adicionales y estados no definidos', () => {
  assert.throws(() => validateMinutes({ ...example(), dni: '00000000' }));
  const input = example(); input.agreements[0].status = 'aprobado-legalmente'; assert.throws(() => validateMinutes(input));
});
test('rechaza roles e identificadores duplicados', () => {
  const input = example(); input.participantRoles.push(input.participantRoles[0]); assert.throws(() => validateMinutes(input));
  const duplicate = example(); duplicate.agreements.push(structuredClone(duplicate.agreements[0])); assert.throws(() => validateMinutes(duplicate));
});
test('escapa sintaxis Markdown de contenido introducido', () => {
  const input = example(); input.agreements[0].description = 'Texto [de prueba] | **sin formato**';
  const output = renderMinutes(input);
  assert.ok(output.includes('Texto \\[de prueba\\] \\| \\*\\*sin formato\\*\\*'));
});
test('bloquea saltos, HTML y patrones sensibles en texto', () => {
  for (const title of ['# Inyección\n## Encabezado', '<script>ejemplo</script>', 'DNI 00000000', 'persona@example.invalid']) assert.throws(() => validateMinutes({ ...example(), title }));
});
test('admite reunión sin acuerdos y explica el vacío', () => {
  const input = example(); input.agreements = [];
  assert.match(renderMinutes(input), /No se registraron acuerdos/);
});
test('no modifica la entrada y rechaza fecha de auditoría inválida', () => {
  const input = example(); const before = JSON.stringify(input); renderMinutes(input);
  assert.equal(JSON.stringify(input), before);
  assert.throws(() => extractActions(input, { asOf: 'invalida' }));
});
const cli = fileURLToPath(new URL('../bin/cli.js', import.meta.url));
const file = fileURLToPath(new URL('../examples/reunion.json', import.meta.url));
test('CLI genera Markdown y acciones JSON desde el ejemplo ficticio', () => {
  const result = spawnSync(process.execPath, [cli, 'render', '--input', file], { encoding: 'utf8' });
  assert.equal(result.status, 0); assert.match(result.stdout, /BORRADOR/);
  const actions = spawnSync(process.execPath, [cli, 'actions', '--input', file, '--as-of', '2026-11-04'], { encoding: 'utf8' });
  assert.equal(actions.status, 0); assert.equal(JSON.parse(actions.stdout)[0].overdue, true);
});
test('CLI rechaza argumentos incompletos o desconocidos', () => {
  for (const args of [['render'], ['render', '--input'], ['render', '--unknown', 'dato'], ['inventado']]) assert.equal(spawnSync(process.execPath, [cli, ...args]).status, 1);
});
