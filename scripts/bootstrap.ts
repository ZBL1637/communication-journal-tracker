import { runPipeline } from './lib/pipeline.js';

const args = process.argv.slice(2);

const readArg = (name: string) => {
  const raw = args.find((item) => item.startsWith(`--${name}=`));
  return raw?.split('=').slice(1).join('=');
};

const daysBack = Number(readArg('days') || 180);
const limitPerJournal = Number(readArg('limit') || 0) || undefined;
const journalSlugs = readArg('journals')?.split(',').map((item) => item.trim()).filter(Boolean);

const summary = await runPipeline({
  mode: 'bootstrap',
  daysBack,
  limitPerJournal,
  journalSlugs
});

console.log(JSON.stringify(summary, null, 2));
