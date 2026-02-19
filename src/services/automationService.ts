
/**
 * SERVIÇO DE AUTOMAÇÃO (PREPARAÇÃO N8N)
 * Este arquivo centraliza as chamadas externas que serão implementadas futuramente.
 * O objetivo é manter o código dos componentes limpo e "n8n-ready".
 */

import { Invoice, InvoiceItemReview } from '../types';

export class AutomationService {
  /**
   * Envia uma imagem de Nota Fiscal para processamento via OCR (futuro Gemini API ou serviço dedicado).
   * @param base64Image String base64 da imagem
   * @returns Promessa com os itens extraídos
   */
  async processInvoiceOCR(base64Image: string): Promise<InvoiceItemReview[]> {
    console.log("[AUTOMATION] Iniciando processamento OCR via serviço externo...");

    // TODO: Implementar chamada para n8n Webhook ou Gemini API diretamente aqui.
    // Exemplo:
    // const response = await fetch(process.env.N8N_OCR_WEBHOOK_URL, { method: 'POST', body: JSON.stringify({ image: base64Image }) });
    // return response.json();

    // TODO: Replace with real OCR call when n8n node is ready
    return new Promise((resolve) => {
      setTimeout(() => {
        console.log("[AUTOMATION] OCR Mock concluído.");
        resolve([]); // Retorna vazio no mock, os componentes já lidam com fallback
      }, 2000);
    });
  }

  /**
   * Dispara um evento de estoque para o n8n.
   * Útil para sincronizar com ERPs externos, planilhas ou disparar avisos de compras.
   * @param invoice Dados da nota fiscal processada
   * @param items Itens vinculados e confirmados
   */
  async sendStockEntryToN8n(invoice: Partial<Invoice>, items: InvoiceItemReview[]): Promise<boolean> {
    console.log("[AUTOMATION] Enviando entrada de estoque para o n8n...");

    const payload = {
      event: 'stock_entry',
      timestamp: new Date().toISOString(),
      invoice,
      items
    };

    // TODO: Implementar chamada POST para o webhook do n8n configurado nas definições.
    // try {
    //   await fetch(db.getIntegrations().n8nWebhookUrl, { method: 'POST', body: JSON.stringify(payload) });
    //   return true;
    // } catch (e) { return false; }

    return true;
  }

  /**
   * Notifica o n8n sobre uma OS que entrou em atraso ou mudou de status crítico.
   */
  async triggerStatusAlert(serviceId: string, status: string): Promise<void> {
    console.log(`[AUTOMATION] Trigger n8n: OS ${serviceId} mudou para ${status}`);
    // Futura implementação de Webhook
  }
}

export const automationService = new AutomationService();
