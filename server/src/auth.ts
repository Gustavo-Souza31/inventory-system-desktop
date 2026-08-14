import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import type { Request, Response, NextFunction } from 'express';
import { getAccountsDb } from './db';

// Em produção isso precisa vir de uma variável de ambiente de verdade
// (ex: JWT_SECRET no host onde o servidor for publicado).
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-troque-em-producao';

export interface AuthedRequest extends Request {
    userId?: number;
}

interface UserRow {
    id: number;
    passwordHash: string;
}

export function register(req: Request, res: Response) {
    const { email, password } = req.body || {};
    if (!email || !password) {
        return res.status(400).json({ error: 'E-mail e senha são obrigatórios.' });
    }
    if (String(password).length < 6) {
        return res.status(400).json({ error: 'A senha precisa ter pelo menos 6 caracteres.' });
    }

    const db = getAccountsDb();
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existing) {
        return res.status(409).json({ error: 'Já existe uma conta com esse e-mail.' });
    }

    const passwordHash = bcrypt.hashSync(password, 10);
    const info = db.prepare('INSERT INTO users (email, passwordHash) VALUES (?, ?)').run(email, passwordHash);
    const token = jwt.sign({ userId: info.lastInsertRowid }, JWT_SECRET, { expiresIn: '30d' });
    res.json({ token, email });
}

export function login(req: Request, res: Response) {
    const { email, password } = req.body || {};
    if (!email || !password) {
        return res.status(400).json({ error: 'E-mail e senha são obrigatórios.' });
    }

    const db = getAccountsDb();
    const user = db.prepare('SELECT id, passwordHash FROM users WHERE email = ?').get(email) as UserRow | undefined;
    if (!user || !bcrypt.compareSync(password, user.passwordHash)) {
        return res.status(401).json({ error: 'E-mail ou senha incorretos.' });
    }

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '30d' });
    res.json({ token, email });
}

export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Não autenticado.' });
    }
    try {
        const payload = jwt.verify(header.slice(7), JWT_SECRET) as { userId: number };
        req.userId = payload.userId;
        next();
    } catch {
        res.status(401).json({ error: 'Sessão inválida ou expirada.' });
    }
}
