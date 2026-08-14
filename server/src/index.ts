import express from 'express';
import cors from 'cors';
import { register, login } from './auth';
import { apiRouter } from './api';

const app = express();
app.use(cors());
app.use(express.json());

app.post('/auth/register', register);
app.post('/auth/login', login);
app.use('/api', apiRouter);

const PORT = process.env.PORT ? Number(process.env.PORT) : 3001;
app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
});
