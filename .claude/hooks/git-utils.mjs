// Funções compartilhadas pelos hooks do Claude Code (SessionStart e Stop).
// Só leem o estado do git; quem altera algo é o session-start (pull --ff-only).
import { execFileSync } from 'node:child_process';

export const root = process.env.CLAUDE_PROJECT_DIR || process.cwd();

export function git(args, { cwd = root, timeout = 20000 } = {}) {
    try {
        return execFileSync('git', args, { cwd, timeout, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
    } catch {
        return null;
    }
}

// Arquivos rastreados com alteração (não conta arquivo novo não rastreado,
// que não atrapalha o pull e costuma ser rascunho/saída de build).
export function trackedChanges(cwd = root) {
    const out = git(['status', '--porcelain', '--untracked-files=no'], { cwd });
    return out ? out.split('\n').filter(Boolean) : [];
}

// Branches locais com commits que ainda não foram para o GitHub.
// Branch sem upstream conta como "não enviada" se tiver commits fora de origin/main.
export function unpushedBranches() {
    const out = git(['for-each-ref', '--format=%(refname:short)|%(upstream:short)|%(upstream:track)', 'refs/heads']);
    if (!out) return [];
    const result = [];
    for (const line of out.split('\n')) {
        const [name, upstream, track] = line.split('|');
        if (upstream) {
            const ahead = /ahead (\d+)/.exec(track || '');
            if (ahead) result.push(`${name} (${ahead[1]} commit(s) sem push)`);
        } else {
            const count = git(['rev-list', '--count', `origin/main..${name}`]);
            if (count && count !== '0') result.push(`${name} (sem branch no GitHub, ${count} commit(s))`);
        }
    }
    return result;
}

// Worktrees dos agentes com alterações não commitadas.
export function dirtyWorktrees() {
    const out = git(['worktree', 'list', '--porcelain']);
    if (!out) return [];
    const paths = out.split('\n').filter((l) => l.startsWith('worktree ')).map((l) => l.slice(9));
    return paths
        .filter((p) => p.replace(/\\/g, '/').toLowerCase() !== root.replace(/\\/g, '/').toLowerCase())
        .map((p) => ({ path: p, changes: trackedChanges(p).length }))
        .filter((w) => w.changes > 0)
        .map((w) => `${w.path} (${w.changes} arquivo(s) alterado(s))`);
}
