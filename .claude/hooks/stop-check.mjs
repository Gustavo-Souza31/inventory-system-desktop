// Hook Stop: ao fim de cada resposta do Claude, avisa o usuário se há trabalho
// que só existe neste PC (alteração sem commit, commit sem push, worktree suja).
// Não bloqueia nada. Para não repetir o mesmo aviso a cada resposta, só mostra
// quando o estado muda (guardado em .git/claude-stop-state).
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { git, trackedChanges, unpushedBranches, dirtyWorktrees } from './git-utils.mjs';

const parts = [];
const changes = trackedChanges();
if (changes.length) parts.push(`${changes.length} arquivo(s) sem commit`);
const unpushed = unpushedBranches();
if (unpushed.length) parts.push(`sem push: ${unpushed.join(', ')}`);
const dirty = dirtyWorktrees();
if (dirty.length) parts.push(`worktrees com alterações: ${dirty.join(', ')}`);

const state = parts.join(' | ');
const gitDir = git(['rev-parse', '--absolute-git-dir']);
const stateFile = gitDir ? join(gitDir, 'claude-stop-state') : null;

let previous = '';
try { previous = stateFile ? readFileSync(stateFile, 'utf8') : ''; } catch { /* primeira execução */ }
try { if (stateFile) writeFileSync(stateFile, state); } catch { /* sem permissão: só não deduplica */ }

if (state && state !== previous) {
    process.stdout.write(JSON.stringify({
        systemMessage: `⚠ Trabalho só neste PC: ${state}. Antes de trocar de PC, peça commit e push.`,
    }));
}
