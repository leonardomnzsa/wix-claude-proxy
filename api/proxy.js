export default async function handler(req, res) {
    // Configurar CORS para aceitar requisições do Wix
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    // Responder ao OPTIONS (necessário para CORS)
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    // GET para testar se está funcionando
    if (req.method === 'GET') {
        return res.json({ 
            status: 'online',
            message: 'Proxy funcionando! Use POST para enviar requisições para Claude.'
        });
    }
    
    // Processar apenas POST
    if (req.method === 'POST') {
        try {
            // Pegar a API key do corpo da requisição
            const { apiKey, ...claudeBody } = req.body;
            
            if (!apiKey) {
                return res.status(400).json({ 
                    error: 'API Key não fornecida',
                    help: 'Inclua apiKey no body da requisição'
                });
            }
            
            // Fazer requisição para Claude
            const claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': apiKey,
                    'anthropic-version': '2023-06-01'
                },
                body: JSON.stringify(claudeBody)
            });
            
            const claudeData = await claudeResponse.json();
            
            // Retornar resposta do Claude
            return res.status(claudeResponse.status).json(claudeData);
            
        } catch (error) {
            console.error('Erro:', error);
            return res.status(500).json({ 
                error: 'Erro no proxy',
                details: error.message 
            });
        }
    }
    
    // Outros métodos não permitidos
    return res.status(405).json({ error: 'Método não permitido' });
}
