// api/job-status.js - ENDPOINT para verificar status de um job
// O Wix chama este endpoint a cada 5 segundos para ver se o Opus terminou

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Metodo nao permitido' });
    }

    const jobId = req.query.id;

    if (!jobId) {
        return res.status(400).json({ error: 'ID do job nao fornecido' });
    }

    // Buscar job no store
    const job = globalThis.jobStore?.[jobId];

    if (!job) {
        return res.status(404).json({
            status: 'not_found',
            error: 'Job nao encontrado. Pode ter expirado (limite de 10 minutos).'
        });
    }

    if (job.status === 'processing') {
        const tempoDecorrido = Math.round((Date.now() - job.criadoEm) / 1000);
        return res.status(200).json({
            status: 'processing',
            tempoDecorrido: tempoDecorrido,
            message: `Processando ha ${tempoDecorrido} segundos...`
        });
    }

    if (job.status === 'completed') {
        // Retornar resultado e limpar o job
        const resultado = job.resultado;
        delete globalThis.jobStore[jobId];

        return res.status(200).json({
            status: 'completed',
            resultado: resultado
        });
    }

    if (job.status === 'error') {
        const erro = job.erro;
        delete globalThis.jobStore[jobId];

        return res.status(200).json({
            status: 'error',
            error: erro
        });
    }

    return res.status(200).json({ status: job.status });
}
