const WHATSAPP_API_URL = 'https://graph.facebook.com/v21.0';

interface SendWhatsAppParams {
  to: string;
  message: string;
}

export async function sendWhatsAppMessage({ to, message }: SendWhatsAppParams) {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID!;
  const token = process.env.WHATSAPP_TOKEN!;

  const response = await fetch(
    `${WHATSAPP_API_URL}/${phoneNumberId}/messages`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to,
        type: 'text',
        text: { body: message },
      }),
    }
  );

  if (!response.ok) {
    const errorData = await response.json();
    console.error('[WhatsApp] Erro:', errorData);
    throw new Error(
      errorData.error?.message || 'Erro ao enviar mensagem no WhatsApp'
    );
  }

  const data = await response.json();
  console.log('[WhatsApp] Mensagem enviada:', data);
  return data;
}