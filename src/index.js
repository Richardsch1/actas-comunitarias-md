function exact(value, fields) { return value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length === fields.length && fields.every(key => Object.hasOwn(value, key)); }
function text(value, max = 500) {
  if (typeof value !== 'string' || !value.trim() || value !== value.trim() || value.length > max || /[<>\u0000-\u001f\u007f\u202a-\u202e\u2066-\u2069]/u.test(value) || /[\w.+-]+@[\w.-]+\.[a-z]{2,}|(?:\d[ .()-]*){7,}|https?:\/\//iu.test(value)) throw new Error('Texto inválido o con patrones sensibles. Usa roles y zonas generales.');
  return value;
}
function date(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/u.test(value) || !Number.isFinite(Date.parse(value)) || new Date(value).toISOString().slice(0, 10) !== value) throw new Error('Fecha inválida; utiliza AAAA-MM-DD.');
  return value;
}
function identifier(value) { if (typeof value !== 'string' || !/^[a-z][a-z0-9-]{1,39}$/u.test(value)) throw new Error('Identificador inválido.'); }
function unique(values) { return new Set(values).size === values.length; }
const statuses = ['pendiente', 'en-curso', 'completado'];
export function validateMinutes(input) {
  if (!exact(input, ['title', 'date', 'place', 'participantRoles', 'agenda', 'agreements'])) throw new Error('Campos del acta inválidos.');
  text(input.title, 120); date(input.date); text(input.place, 100);
  if (!Array.isArray(input.participantRoles) || input.participantRoles.length < 1 || input.participantRoles.length > 30 || !unique(input.participantRoles)) throw new Error('Define entre uno y treinta roles sin duplicados.');
  input.participantRoles.forEach(role => text(role, 80));
  if (!Array.isArray(input.agenda) || input.agenda.length < 1 || input.agenda.length > 20 || !unique(input.agenda.map(item => item?.id))) throw new Error('Agenda inválida.');
  for (const item of input.agenda) {
    if (!exact(item, ['id', 'title'])) throw new Error('Tema inválido.');
    identifier(item.id); text(item.title, 200);
  }
  if (!Array.isArray(input.agreements) || input.agreements.length > 100 || !unique(input.agreements.map(item => item?.id))) throw new Error('Acuerdos inválidos.');
  for (const agreement of input.agreements) {
    if (!exact(agreement, ['id', 'agendaId', 'description', 'responsibleRole', 'dueOn', 'status'])) throw new Error('Campos del acuerdo inválidos.');
    identifier(agreement.id); text(agreement.description);
    if (!input.agenda.some(item => item.id === agreement.agendaId) || !input.participantRoles.includes(agreement.responsibleRole)) throw new Error('Cada acuerdo necesita un tema y un rol participante existentes.');
    date(agreement.dueOn);
    if (agreement.dueOn < input.date || !statuses.includes(agreement.status)) throw new Error('Fecha interna o estado del acuerdo inválidos.');
  }
  return structuredClone(input);
}

export function extractActions(input, { asOf = new Date().toISOString().slice(0, 10) } = {}) {
  const minutes = validateMinutes(input); date(asOf);
  return minutes.agreements.map(agreement => ({ ...agreement, overdue: agreement.status !== 'completado' && agreement.dueOn < asOf }));
}

export function escapeMarkdown(value) { return value.replace(/[\\`*_{}\[\]()#+.!|>-]/gu, '\\$&'); }
export function renderMinutes(input, options = {}) {
  const minutes = validateMinutes(input);
  const actions = extractActions(minutes, options);
  const lines = [
    `# ${escapeMarkdown(minutes.title)}`, '',
    '> BORRADOR PARA REVISIÓN. Los hechos y acuerdos provienen de la entrada; no se verificaron de forma independiente.', '',
    `Fecha declarada: ${minutes.date}`, `Lugar general: ${escapeMarkdown(minutes.place)}`, '',
    '## Roles participantes', ...minutes.participantRoles.map(role => `- ${escapeMarkdown(role)}`), '',
    '## Temas tratados', ...minutes.agenda.map(item => `- **${item.id}**: ${escapeMarkdown(item.title)}`), '',
    '## Acuerdos y seguimiento interno', '',
  ];
  if (actions.length === 0) lines.push('No se registraron acuerdos en esta entrada.');
  else {
    lines.push('| ID | Tema | Acuerdo | Rol responsable | Fecha interna | Estado declarado | Revisión |', '| --- | --- | --- | --- | --- | --- | --- |');
    for (const action of actions) lines.push(`| ${action.id} | ${action.agendaId} | ${escapeMarkdown(action.description)} | ${escapeMarkdown(action.responsibleRole)} | ${action.dueOn} | ${action.status} | ${action.overdue ? 'Fecha superada: revisar' : 'Sin alerta de fecha'} |`);
  }
  lines.push('', '## Revisión pendiente', '', '- Confirmar hechos, acuerdos, roles y fechas con las personas participantes.', '- No añadir nombres, firmas ni datos sensibles a una publicación pública.', '- Este documento no certifica asistencia, aprobación, representación o validez legal.', '- Las fechas son metas internas, no plazos legales ni compromisos de una entidad.', '');
  return lines.join('\n');
}
