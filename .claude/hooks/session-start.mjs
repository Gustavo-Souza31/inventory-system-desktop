// Hook SessionStart: sincroniza com o GitHub ao abrir o Claude Code e passa
// um resumo do estado para o Claude, para retomar de onde o outro PC parou.
//
// Regras de segurança: só faz `git pull --ff-only` quando a pasta não tem
// alterações rastreadas e a branch não tem commits locais sem push.
// Qualquer outra situação é só relatada, nunca resolvida automaticamente.
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { root, git, trackedChanges, unpushedBranches, dirtyWorktrees } from './git-utils.mjs';

const lines = [];
const notice = [];

const fetched = git(['fetch', '--all', '--prune', '--quiet'], { timeout: 30000 }) !== null;
if (!fetched) lines.push('⚠ git fetch falhou (sem internet?). O estado abaixo pode estar desatualizado.');

const branch = git(['branch', '--show-current']) || '(HEAD destacado)';
const upstream = git(['rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{u}']);
const changes = trackedChanges();

let behind = 0;
let ahead = 0;
if (upstream) {
    const counts = git(['rev-list', '--left-right', '--count', `HEAD...${upstream}`]);
    if (counts) [ahead, behind] = counts.split(/\s+/).map(Number);
}

if (upstream && behind > 0) {
    if (changes.length === 0 && ahead === 0) {
        const before = git(['rev-parse', '--short', 'HEAD']);
        if (git(['pull', '--ff-only', '--quiet'], { timeout: 60000 }) !== null) {
            const log = git(['log', '--oneline', `${before}..HEAD`]);
            lines.push(`✔ Atualizado do GitHub: ${behind} commit(s) novo(s) em ${branch}:\n${log}`);
            notice.push(`Atualizado: ${behind} commit(s) novo(s) em ${branch}`);
            behind = 0;
            const lockChanged = git(['diff', '--name-only', `${before}..HEAD`, '--', 'package-lock.json']);
            if (lockChanged) lines.push('ℹ package-lock.json mudou: rode `npm ci` antes de buildar.');
        } else {
            lines.push(`⚠ git pull --ff-only falhou em ${branch}. Verifique antes de trabalhar.`);
        }
    } else {
        lines.push(
            `⚠ ${branch} está ${behind} commit(s) atrás de ${upstream}, mas NÃO atualizei automaticamente ` +
            `(${changes.length} arquivo(s) alterado(s), ${ahead} commit(s) local(is) sem push). ` +
            'Mostre isso ao usuário e pergunte como prosseguir antes de mexer em qualquer coisa.'
        );
        notice.push(`${branch} atrás do GitHub e não atualizada (há trabalho local)`);
    }
}

lines.push(`Branch atual: ${branch}${upstream ? ` (upstream ${upstream}, ${ahead} à frente, ${behind} atrás)` : ' (sem upstream)'}`);
if (changes.length) lines.push(`Arquivos alterados sem commit:\n${changes.join('\n')}`);

const unpushed = unpushedBranches();
if (unpushed.length) lines.push(`Branches locais com trabalho fora do GitHub: ${unpushed.join('; ')}`);

const dirty = dirtyWorktrees();
if (dirty.length) lines.push(`Worktrees dos agentes com alterações: ${dirty.join('; ')}`);

// Lista de tarefas: tasks/README.md da branch atual ou, se não existir, de origin/main.
const readmePath = join(root, 'tasks', 'README.md');
const readme = existsSync(readmePath)
    ? readFileSync(readmePath, 'utf8')
    : git(['show', 'origin/main:tasks/README.md']);
if (readme) {
    const index = readme.split('## Índice')[1];
    const rows = (index || '').split('\n').filter((l) => /^\|\s*\[/.test(l));
    if (rows.length) lines.push(`Tarefas (tasks/README.md):\n${rows.join('\n')}`);
}

const context = `[Sincronização automática — hook SessionStart]\n${lines.join('\n')}`;
process.stdout.write(JSON.stringify({
    hookSpecificOutput: { hookEventName: 'SessionStart', additionalContext: context },
    ...(notice.length ? { systemMessage: notice.join(' · ') } : {}),
}));
