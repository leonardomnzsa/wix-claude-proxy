// api/generate.js - ENDPOINT ASYNC para Claude Opus
// Recebe o pedido, inicia processamento em background, retorna jobId imediatamente
export const maxDuration = 300;

// Armazenamento em memoria (jobs ficam ate 10 minutos)
// Em producao com multiplas instancias, use Redis ou banco de dados
if (!globalThis.jobStore) {
    globalThis.jobStore = {};
}

// Limpar jobs antigos (mais de 10 minutos)
function limparJobsAntigos() {
    const agora = Date.now();
    for (const id in globalThis.jobStore) {
        if (agora - globalThis.jobStore[id].criadoEm > 600000) {
            delete globalThis.jobStore[id];
        }
    }
}

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Metodo nao permitido' });
    }

    try {
        const { apiKey, ...body } = req.body;

        if (!apiKey || !apiKey.startsWith('sk-ant-')) {
            return res.status(400).json({ error: 'API Key invalida' });
        }

        limparJobsAntigos();

        // Gerar ID unico para o job
        const jobId = 'job_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8);

        // Salvar job como "processando"
        globalThis.jobStore[jobId] = {
            status: 'processing',
            criadoEm: Date.now(),
            resultado: null,
            erro: null
        };

        // Retornar jobId IMEDIATAMENTE (sem esperar o Opus)
        res.status(202).json({
            success: true,
            jobId: jobId,
            status: 'processing',
            message: 'Geracao iniciada. Use /api/job-status?id=' + jobId + ' para verificar.'
        });

        // AGORA processar em background (apos responder ao cliente)
        try {
            const claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': apiKey,
                    'anthropic-version': '2023-06-01'
                },
                body: JSON.stringify(body)
            });

            const claudeData = await claudeResponse.json();

            if (claudeResponse.ok) {
                globalThis.jobStore[jobId] = {
                    ...globalThis.jobStore[jobId],
                    status: 'completed',
                    resultado: claudeData,
                    completadoEm: Date.now()
                };
                console.log('[Generate] Job concluido:', jobId);
            } else {
                globalThis.jobStore[jobId] = {
                    ...globalThis.jobStore[jobId],
                    status: 'error',
                    erro: claudeData.error?.message || 'Erro na API Claude',
                    completadoEm: Date.now()
                };
                console.error('[Generate] Erro no job:', jobId, claudeData);
            }
        } catch (bgError) {
            globalThis.jobStore[jobId] = {
                ...globalThis.jobStore[jobId],
                status: 'error',
                erro: bgError.message,
                completadoEm: Date.now()
            };
            console.error('[Generate] Erro background:', jobId, bgError.message);
        }

    } catch (error) {
        console.error('[Generate] Erro:', error);
        return res.status(500).json({ error: error.message });
    }
}
