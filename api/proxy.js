// api/proxy.js - Proxy para Claude API com suporte a Opus (timeout estendido)
export const maxDuration = 300;

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method === 'GET') {
        return res.status(200).json({ 
            status: 'ok',
            message: 'Proxy funcionando! Use POST.',
            maxDuration: 300
        });
    }

    if (req.method === 'POST') {
        try {
            const { apiKey, ...body } = req.body;

            if (!apiKey || !apiKey.startsWith('sk-ant-')) {
                return res.status(400).json({ 
                    error: 'API Key invalida ou nao fornecida' 
                });
            }

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

            return res.status(claudeResponse.status).json(claudeData);

        } catch (error) {
            console.error('Erro no proxy:', error);
            return res.status(500).json({ 
                error: 'Erro interno',
                details: error.message 
            });
        }
    }

    return res.status(405).json({ error: 'Metodo nao permitido' });
}
