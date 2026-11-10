const WHATSAPP_API_URL = 'https://graph.facebook.com/v21.0';

interface SendWhatsAppParams {
  to: string;
  message: string;
}

interface SendTemplateParams {
  to: string;
  templateName: string;
  languageCode?: string;
  parameters: string[]; // Array de valores para preencher {{1}}, {{2}}, etc.
}

// Função auxiliar para centralizar o fetch, token e o timeout de 15s
async function executeWhatsAppRequest(payload: any) {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID!;
  const token = process.env.WHATSAPP_TOKEN!;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(
      `${WHATSAPP_API_URL}/${phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      }
    );

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.json();
      console.error('[WhatsApp] Erro na API:', errorData);
      throw new Error(
        errorData.error?.message || 'Erro ao enviar mensagem no WhatsApp'
      );
    }

    const data = await response.json();
    console.log('[WhatsApp] Envio bem-sucedido:', data);
    return data;
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      console.error('[WhatsApp] Erro: Tempo de conexão esgotado (15s).');
    }
    throw error;
  }
}

/**
 * Envia uma mensagem de texto livre.
 * ⚠️ Só funciona se o usuário tiver enviado uma mensagem para a empresa nas últimas 24h.
 */
export async function sendWhatsAppMessage({ to, message }: SendWhatsAppParams) {
  const payload = {
    messaging_product: 'whatsapp',
    to,
    type: 'text',
    text: { body: message },
  };
  
  return executeWhatsAppRequest(payload);
}

/**
 * Envia uma mensagem baseada em um Template pré-aprovado pela Meta.
 * ✅ Funciona a qualquer momento, quebrando a barreira da janela de 24h.
 */
export async function sendWhatsAppTemplate({ 
  to, 
  templateName, 
  languageCode = 'pt_BR', 
  parameters 
}: SendTemplateParams) {
  
  // Monta a estrutura de variáveis do template ({{1}}, {{2}}, etc.)
  const components = [];
  
  if (parameters && parameters.length > 0) {
    components.push({
      type: 'body',
      parameters: parameters.map(param => ({ 
        type: 'text', 
        text: param 
      })),
    });
  }

  const payload = {
    messaging_product: 'whatsapp',
    to,
    type: 'template',
    template: {
      name: templateName,
      language: { code: languageCode },
      components: components.length > 0 ? components : undefined,
    },
  };

  return executeWhatsAppRequest(payload);
}