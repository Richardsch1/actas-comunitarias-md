# Actas Comunitarias MD

Generador local de borradores de actas y acuerdos en Markdown. Ayuda a mantener temas, roles responsables, metas internas y estados declarados en un formato revisable. Versión inicial 0.1.0; sin reuniones reales, adopción o impacto verificados.

## Uso

Node 22 o 24, sin claves, servicios remotos o dependencias.

```sh
git clone https://github.com/Richardsch1/actas-comunitarias-md.git
cd actas-comunitarias-md
npm ci --ignore-scripts
node bin/cli.js render --input examples/reunion.json
node bin/cli.js actions --input examples/reunion.json --as-of 2026-11-04
```

La salida se escribe a stdout. Para guardarla puedes redirigirla a un archivo nuevo; el programa no altera el JSON original. `actions` exporta acuerdos en JSON y señala metas superadas respecto de la fecha indicada. Por defecto usa la fecha UTC del dispositivo.

## Contrato

La raíz requiere exactamente `title`, `date` (AAAA-MM-DD), `place` general, `participantRoles`, `agenda` y `agreements`. Consulta [el ejemplo ficticio](examples/reunion.json).

Cada tema contiene `id` y `title`. Cada acuerdo contiene `id`, `agendaId`, `description`, `responsibleRole`, `dueOn` y `status`. El tema y el rol deben existir, los identificadores ser únicos y la meta no ser anterior a la reunión. Estados: `pendiente`, `en-curso`, `completado`. Se admiten hasta treinta roles, veinte temas y cien acuerdos; archivos de hasta un MiB.

Biblioteca: `validateMinutes(input)`, `extractActions(input, {asOf})` y `renderMinutes(input, {asOf})`, exportadas por `src/index.js`. No modifican la entrada. El texto se escapa para Markdown y se rechazan HTML y controles; no debe reinterpretarse como HTML sin un renderizador seguro.

## Límites

El resultado siempre se marca como borrador. No certifica presencia, aprobación, representación, firmas o validez legal. Las fechas son metas internas, no plazos de entidades. Las personas participantes deben revisar hechos y acuerdos antes de usarlo.

Usa roles, no nombres o datos de contacto. El filtro de patrones bloquea algunos correos y números, pero no detecta todos los datos personales. No es un anonimizador. La salida y los archivos locales no están cifrados y pueden contener lo que se haya introducido. No hay grabación, transcripción, IA o envío de actas.

## Pruebas

```sh
npm run check
npm test
```

Incluye referencias entre acuerdos y temas, roles, fechas, metas vencidas, escapado y CLI. CI en Node 22 y 24. [MIT](LICENSE), [contribuir](CONTRIBUTING.md), [seguridad](SECURITY.md). No hay uso validado ni aceptación garantizada en Claude for OSS.
