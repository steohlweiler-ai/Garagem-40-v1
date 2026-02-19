
import React, { useState, useMemo, useEffect } from 'react';
import {
  X, Check, AlertCircle, Package, Hash, DollarSign,
  Trash2, ChevronRight, Search, Info, SlidersHorizontal,
  Wrench, Edit3, ShoppingCart, ArrowRight, Plus, Loader2,
  ShieldAlert, Clock, Sparkles
} from 'lucide-react';
import { dataProvider } from '../services/dataProvider';
import { InvoiceItemReview, Product, UserAccount, Invoice, StockMovement } from '../types';
import { formatCurrency } from '../utils/helpers';
import { automationService } from '../services/automationService';
import { ocrService } from '../services/ocrService';
import { toast } from 'react-hot-toast';

interface ValidateInvoiceItemsProps {
  onClose: () => void;
  onFinish: () => void;
  invoiceImage?: string;
  user: UserAccount | null;
}

// MOCK_OCR_ITEMS removed - using real Gemini extraction
// 🔍 Fuzzy Matching Utility for Auto-Linking
function fuzzyMatch(str1: string, str2: string): number {
  const s1 = str1.toLowerCase().replace(/[^a-z0-9]/g, '');
  const s2 = str2.toLowerCase().replace(/[^a-z0-9]/g, '');

  // Exact match (normalized)
  if (s1 === s2) return 1.0;

  // Substring match
  if (s1.includes(s2) || s2.includes(s1)) return 0.85;

  // Word overlap score
  const words1 = str1.toLowerCase().split(/\s+/).filter(w => w.length > 2);
  const words2 = str2.toLowerCase().split(/\s+/).filter(w => w.length > 2);
  const overlap = words1.filter(w => words2.includes(w)).length;
  const score = overlap / Math.max(words1.length, words2.length, 1);

  return score;
}

const ValidateInvoiceItems: React.FC<ValidateInvoiceItemsProps> = ({ onClose, onFinish, invoiceImage, user }) => {
  const [items, setItems] = useState<InvoiceItemReview[]>([]);
  const [isProductSelectorOpen, setIsProductSelectorOpen] = useState<string | null>(null);
  const [productSearch, setProductSearch] = useState('');
  const [isConfirmingFinal, setIsConfirmingFinal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [invoiceNumber, setInvoiceNumber] = useState('NF-' + Math.floor(1000 + Math.random() * 9000));
  const [isProcessingOCR, setIsProcessingOCR] = useState(false);
  const [isCreatingProduct, setIsCreatingProduct] = useState<string | null>(null);

  const [catalog, setCatalog] = useState<Product[]>([]);

  // 🤖 GEMINI OCR: Extract items from invoice image
  useEffect(() => {
    const extractAndProcess = async () => {
      if (!invoiceImage) {
        console.warn('⚠️ No invoice image provided');
        return;
      }

      setIsProcessingOCR(true);

      try {
        console.log('🤖 [TABSCANNER] Starting invoice extraction...');

        // Extract items using Tabscanner OCR
        const extractedItems = await ocrService.scanInvoice(invoiceImage);
        console.log(`✅ [TABSCANNER] Extracted ${extractedItems.length} items`);

        // Load product catalog
        const all = await dataProvider.getProducts();
        setCatalog(all);

        // 🔗 AUTO-LINK: Match each item to best catalog product
        const processedItems = extractedItems.map(item => {
          let bestMatch: Product | null = null;
          let bestScore = 0;

          for (const product of all) {
            const score = fuzzyMatch(item.description, product.name);
            if (score > bestScore) {
              bestScore = score;
              bestMatch = product;
            }
          }

          // ✅ HIGH CONFIDENCE (≥75%): Auto-link
          if (bestMatch && bestScore >= 0.75) {
            console.log(`🎯 AUTO-LINKED (HIGH): ${item.description} -> ${bestMatch.name} (${Math.round(bestScore * 100)}%)`);
            return {
              ...item,
              product_id: bestMatch.id,
              unit: bestMatch.unit,
              unit_price: bestMatch.cost,
              matchConfidence: bestScore
            };
          }

          // ⚠️ MEDIUM CONFIDENCE (60-74%): Suggest but don't auto-link
          if (bestMatch && bestScore >= 0.6) {
            console.log(`⚠️ POSSIBLE MATCH (LOW): ${item.description} ~ ${bestMatch.name} (${Math.round(bestScore * 100)}%)`);
            return {
              ...item,
              matchConfidence: bestScore,
              suggestedProduct: bestMatch // Store suggestion
            } as any;
          }

          // ❌ NO MATCH (<60%): Will show "Create New Product"
          console.log(`❌ NO MATCH: ${item.description}`);
          return item;
        });

        setItems(processedItems);
        toast.success(`${processedItems.length} itens extraídos da nota!`);

      } catch (error: any) {
        console.error('❌ [OCR] Extraction failed:', error);

        if (error.message === 'QUOTA_EXCEEDED') {
          toast.error('Limite mensal de leituras excedido (Tabscanner).');
        } else if (error.message === 'RATE_LIMIT') {
          toast.error('Muitas notas de uma vez! Aguarde 1 minuto.');
        } else if (error.message === 'INVALID_API_KEY') {
          toast.error('Chave API de OCR inválida. Verifique o .env');
        } else if (error.message === 'TIMEOUT') {
          toast.error('Tempo limite excedido. Tente novamente.');
        } else {
          toast.error('Erro ao processar nota. Tente novamente.');
        }
      } finally {
        setIsProcessingOCR(false);
      }
    };

    extractAndProcess();
  }, [invoiceImage]);

  const canFinalizeStock = user?.role?.toLowerCase() === 'admin' || user?.role === 'stock_manager';

  const filteredCatalog = useMemo(() => {
    const q = productSearch.toLowerCase();
    return catalog.filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.sku.toLowerCase().includes(q)
    );
  }, [productSearch, catalog]);

  const updateItem = (id: string, updates: Partial<InvoiceItemReview>) => {
    setItems(prev => prev.map(item => item.id === id ? { ...item, ...updates } : item));
  };

  const removeItem = (id: string) => {
    if (window.confirm("Remover este item da conferência?")) {
      setItems(prev => prev.filter(item => item.id !== id));
    }
  };

  const associateProduct = (itemId: string, product: Product) => {
    updateItem(itemId, {
      product_id: product.id,
      unit: product.unit,
      unit_price: product.cost
    });
    setIsProductSelectorOpen(null);
    setProductSearch('');
  };

  // 🆕 Quick Product Creation from Invoice Item
  const handleCreateNewProduct = async (item: InvoiceItemReview) => {
    setIsCreatingProduct(item.id);

    try {
      const newProduct = await dataProvider.createProduct({
        name: item.description,
        sku: `AUTO_${Date.now()}`,
        unit: (item.unit || 'un') as any,
        cost: item.unit_price,
        price: item.unit_price * 1.3, // 30% markup
        current_stock: 0,
        min_stock: 5
      });

      if (newProduct) {
        associateProduct(item.id, newProduct);
        setCatalog(prev => [...prev, newProduct]);
        toast.success(`Produto "${newProduct.name}" cadastrado!`);
      } else {
        toast.error('Erro ao cadastrar produto');
      }
    } catch (error) {
      console.error('Error creating product:', error);
      toast.error('Erro ao cadastrar produto');
    } finally {
      setIsCreatingProduct(null);
    }
  };

  const totalInvoice = useMemo(() => {
    return items.reduce((acc, item) => acc + (item.qty * item.unit_price), 0);
  }, [items]);

  const handleConfirmEntry = () => {
    const unlinkedCount = items.filter(i => !i.product_id).length;
    if (unlinkedCount > 0) {
      if (!window.confirm(`Você ainda possui ${unlinkedCount} itens não vinculados ao catálogo. Eles serão ignorados. Continuar?`)) {
        return;
      }
    }
    setIsConfirmingFinal(true);
  };

  const handleFinalSave = async () => {
    setIsSaving(true);
    await new Promise(resolve => setTimeout(resolve, 1500));

    if (canFinalizeStock) {
      /* 
         ATOMIC UPDATE REPLACEMENT 
         Using RPC to guarantee data integrity
      */

      // Prepare full invoice object
      const invoiceObj: Invoice = {
        id: '', // Generated by DB
        supplier_id: 'sup_1',
        number: invoiceNumber,
        date: new Date().toISOString(),
        total: totalInvoice,
        imageBase64: invoiceImage || '',
        status: 'processed'
      };

      const result = await dataProvider.processInvoiceAtomic(invoiceObj, items.filter(i => i.product_id));

      if (!result.success) {
        alert("Erro ao processar entrada: " + (result.error || "Erro desconhecido"));
        setIsSaving(false);
        return;
      }

      // If needed for local update, we can reload catalog here, or assume DB is truth
      const invoice = invoiceObj; // Just to satisfy downstream code if any exists

      /**
       * PONTO DE INTEGRAÇÃO: WEBHOOK N8N
       * Dispara o evento de entrada concluída para o n8n processar automações externas.
       */
      if (invoice) {
        try {
          await automationService.sendStockEntryToN8n(invoice, items.filter(i => i.product_id));
        } catch (e) {
          console.error("Erro ao disparar webhook n8n:", e);
        }
      }

    } else {
      console.log("Usuário sem permissão para finalizar. Salvando rascunho pendente...");
      // TODO: No n8n real, isso poderia enviar uma notificação de aprovação pendente para o Telegram/Slack do gerente.
    }

    setIsSaving(false);
    onFinish();
  };

  return (
    <div className="fixed inset-0 z-[190] bg-[#f8fafc] flex flex-col animate-in slide-in-from-right-5 font-['Arial']">

      {/* Header */}
      <div className="p-5 pt-8 border-b flex justify-between items-center bg-slate-900 text-white shrink-0">
        <button onClick={onClose} className="p-4 bg-white/10 rounded-full active:scale-90 touch-target">
          <X size={20} />
        </button>
        <div className="text-center">
          <h2 className="text-base font-black uppercase tracking-tighter">Validação de Itens</h2>
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Revisão Humana do OCR</p>
        </div>
        <div className="w-12" />
      </div>

      {/* Resumo da Nota */}
      <div className="bg-white p-6 border-b shadow-sm flex items-center justify-between shrink-0">
        <div className="flex-1">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Fornecedor / Nº Nota</p>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">Distribuidora Automotiva S/A</h3>
            <span className="text-[10px] font-mono bg-slate-100 px-2 py-0.5 rounded text-slate-500">{invoiceNumber}</span>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Total Calculado</p>
          <h3 className="text-lg font-black text-green-600 font-mono leading-none">{formatCurrency(totalInvoice)}</h3>
        </div>
      </div>

      {!canFinalizeStock && (
        <div className="m-4 p-4 bg-orange-50 border-2 border-orange-100 rounded-2xl flex gap-3 animate-in slide-in-from-top-2">
          <ShieldAlert className="text-orange-500 shrink-0" size={20} />
          <div>
            <p className="text-[10px] font-black uppercase text-orange-800 leading-tight">Perfil: {user?.role.toUpperCase()}</p>
            <p className="text-[9px] font-medium text-orange-600 mt-1 leading-relaxed">
              Você pode conferir os itens, mas a entrada oficial no estoque requer revisão de um Administrador ou Gerente de Estoque.
            </p>
          </div>
        </div>
      )}

      {/* Lista de Itens */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[3px] ml-2">Itens da Nota ({items.length})</h4>

        {items.map((item, idx) => {
          const associatedProduct = catalog.find(p => p.id === item.product_id);

          return (
            <div key={item.id} className={`bg-white rounded-[2rem] border-2 shadow-sm transition-all overflow-hidden ${item.product_id ? 'border-slate-50' : 'border-orange-100 ring-2 ring-orange-50'}`}>
              <div className="p-5 space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase leading-none mb-1">Descrição na Nota</p>
                    <h5 className="text-xs font-black text-slate-800 uppercase leading-relaxed">{item.description}</h5>
                  </div>
                  <button onClick={() => removeItem(item.id)} className="p-2 text-slate-200 hover:text-red-500 transition-colors">
                    <Trash2 size={16} />
                  </button>
                </div>

                {/* Associação com Catálogo */}
                <div className="space-y-2">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Vincular ao Produto do Estoque</p>
                  {associatedProduct ? (
                    <button
                      onClick={() => setIsProductSelectorOpen(item.id)}
                      className="w-full p-4 bg-green-50 border border-green-100 rounded-2xl flex items-center justify-between group active:scale-[0.99] transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-green-600 text-white rounded-xl flex items-center justify-center shadow-lg">
                          <Package size={18} />
                        </div>
                        <div className="text-left">
                          <p className="text-[10px] font-black text-green-800 uppercase">{associatedProduct.name}</p>
                          <div className="flex gap-2 items-center">
                            <p className="text-[8px] font-bold text-green-600 uppercase">SKU: {associatedProduct.sku}</p>
                            {item.matchConfidence && (
                              <span className="text-[7px] font-black text-green-700 bg-green-100 px-1.5 py-0.5 rounded border border-green-200">
                                {Math.round(item.matchConfidence * 100)}% auto
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <Edit3 size={14} className="text-green-400" />
                    </button>
                  ) : (
                    <button
                      onClick={() => setIsProductSelectorOpen(item.id)}
                      className="w-full p-4 bg-slate-50 border-2 border-dashed border-orange-200 rounded-2xl flex items-center justify-center gap-3 text-[10px] font-black uppercase text-orange-600 active:bg-orange-50 transition-all"
                    >
                      <AlertCircle size={16} /> Vincular Item ao Catálogo
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-[8px] font-black text-slate-400 uppercase ml-1">QTD</label>
                    <input
                      type="number"
                      value={item.qty}
                      onChange={e => updateItem(item.id, { qty: Math.max(0, parseFloat(e.target.value) || 0) })}
                      className="w-full p-3 bg-slate-50 border rounded-xl text-xs font-black outline-none focus:border-slate-800 transition-all"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[8px] font-black text-slate-400 uppercase ml-1">UN</label>
                    <select
                      value={item.unit}
                      onChange={e => updateItem(item.id, { unit: e.target.value })}
                      className="w-full p-3 bg-slate-50 border rounded-xl text-[10px] font-black uppercase outline-none focus:border-slate-800"
                    >
                      <option value="un">un</option>
                      <option value="lt">lt</option>
                      <option value="kg">kg</option>
                      <option value="par">par</option>
                      <option value="cj">cj</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[8px] font-black text-slate-400 uppercase ml-1">V. UNIT (R$)</label>
                    <input
                      type="number"
                      value={item.unit_price}
                      onChange={e => updateItem(item.id, { unit_price: Math.max(0, parseFloat(e.target.value) || 0) })}
                      className="w-full p-3 bg-slate-50 border rounded-xl text-xs font-black outline-none focus:border-slate-800 transition-all"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Subtotal: <span className="text-slate-800 font-mono">{formatCurrency(item.qty * item.unit_price)}</span></p>
                </div>
              </div>
            </div>
          );
        })}

        <div className="p-8 text-center border-2 border-dashed border-slate-100 rounded-[2.5rem]">
          <Info className="text-slate-200 mx-auto mb-2" size={24} />
          <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest leading-relaxed px-10">
            Confira se todos os itens da nota física batem com as quantidades extraídas digitalmente.
          </p>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="p-6 border-t bg-white safe-bottom flex gap-3 shadow-[0_-10px_20px_rgba(0,0,0,0.02)]">
        <button
          onClick={handleConfirmEntry}
          className={`w-full py-5 rounded-2xl font-black uppercase text-[11px] tracking-[2px] shadow-xl flex items-center justify-center gap-3 active:scale-95 transition-all ${canFinalizeStock ? 'bg-slate-900 text-white' : 'bg-orange-500 text-white shadow-orange-100'
            }`}
        >
          {canFinalizeStock ? (
            <>Confirmar Entrada no Estoque <ShoppingCart size={18} /></>
          ) : (
            <>Salvar para Revisão do Gerente <Clock size={18} /></>
          )}
        </button>
      </div>

      {/* Modal: Seletor de Produto do Catálogo */}
      {isProductSelectorOpen && (
        <div className="fixed inset-0 z-[200] bg-slate-900/60 backdrop-blur-md flex items-end justify-center animate-in fade-in">
          <div className="bg-white w-full max-w-2xl rounded-t-[3.5rem] p-8 space-y-6 animate-in slide-in-from-bottom-20 max-h-[85vh] flex flex-col font-['Arial']">
            <div className="flex justify-between items-center shrink-0">
              <div>
                <h3 className="text-xl font-black uppercase text-slate-800 tracking-tight leading-none">Vincular Produto</h3>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-2">Selecione o item no seu catálogo</p>
              </div>
              <button onClick={() => setIsProductSelectorOpen(null)} className="p-4 bg-slate-100 rounded-full text-slate-400 active:scale-90"><X size={20} /></button>
            </div>

            <div className="relative shrink-0">
              <input
                type="text"
                autoFocus
                placeholder="Buscar por nome ou SKU..."
                value={productSearch}
                onChange={e => setProductSearch(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-slate-100 border-2 border-transparent focus:border-green-500 rounded-2xl text-sm font-bold outline-none"
              />
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar pr-2">
              {filteredCatalog.map(product => (
                <button
                  key={product.id}
                  onClick={() => associateProduct(isProductSelectorOpen, product)}
                  className="w-full p-5 bg-white border-2 border-slate-50 rounded-[1.75rem] flex items-center justify-between group active:border-green-500 transition-all hover:shadow-md"
                >
                  <div className="flex items-center gap-4 text-left">
                    <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-300 group-active:bg-green-600 group-active:text-white transition-all">
                      <Package size={20} />
                    </div>
                    <div>
                      <p className="text-xs font-black uppercase text-slate-800 tracking-tight">{product.name}</p>
                      <div className="flex gap-3 mt-1">
                        <span className="text-[8px] font-black uppercase text-slate-400">SKU: {product.sku}</span>
                        <span className="text-[8px] font-black uppercase text-green-600">Custo: {formatCurrency(product.cost)}</span>
                        {product.current_stock <= (product.min_stock || 5) && (
                          <span className="text-[8px] font-black uppercase text-red-500 bg-red-50 px-1.5 py-0.5 rounded-md border border-red-100">
                            Estoque Baixo: {product.current_stock}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <ChevronRight size={18} className="text-slate-200 group-active:text-green-600" />
                </button>
              ))}

              <button className="w-full py-5 border-2 border-dashed border-slate-200 rounded-[1.75rem] flex items-center justify-center gap-3 text-[10px] font-black uppercase text-slate-400 active:bg-slate-50">
                <Plus size={16} /> Cadastrar Novo Produto
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Resumo Final e Confirmação de Gravação */}
      {isConfirmingFinal && (
        <div className="fixed inset-0 z-[210] bg-slate-900/80 backdrop-blur-xl flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-sm rounded-[3rem] p-10 space-y-8 shadow-2xl animate-in zoom-in-95">
            <div className="text-center space-y-4">
              <div className={`w-20 h-20 rounded-3xl flex items-center justify-center mx-auto shadow-lg rotate-3 ${canFinalizeStock ? 'bg-green-50 text-green-600' : 'bg-orange-50 text-orange-600'
                }`}>
                {canFinalizeStock ? <ShoppingCart size={40} /> : <Clock size={40} />}
              </div>
              <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">
                {canFinalizeStock ? 'Confirmar Entrada' : 'Salvar Rascunho'}
              </h3>
              <p className="text-xs text-slate-500 font-medium leading-relaxed">
                {canFinalizeStock
                  ? 'Você está prestes a realizar a entrada real de mercadorias no estoque.'
                  : 'Este registro ficará aguardando a aprovação final de um gestor.'}
              </p>
            </div>

            <div className="bg-slate-50 p-6 rounded-[2rem] space-y-4 border border-slate-100">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nº Nota Fiscal</span>
                <span className="text-xs font-black text-slate-700 font-mono">{invoiceNumber}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total de Itens</span>
                <span className="text-xs font-black text-slate-700">{items.filter(i => i.product_id).length} vinculados</span>
              </div>
              <div className="pt-3 border-t border-slate-200 flex justify-between items-center">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">VALOR TOTAL</span>
                <span className="text-lg font-black text-green-600 font-mono">{formatCurrency(totalInvoice)}</span>
              </div>
            </div>

            <div className="space-y-3">
              <button
                onClick={handleFinalSave}
                disabled={isSaving}
                className={`w-full py-5 rounded-2xl font-black uppercase text-[11px] tracking-[2px] shadow-xl flex items-center justify-center gap-3 active:scale-95 transition-all ${canFinalizeStock ? 'bg-slate-900 text-white' : 'bg-orange-600 text-white shadow-orange-100'
                  }`}
              >
                {isSaving ? <Loader2 className="animate-spin" size={20} /> : (
                  <>
                    {canFinalizeStock ? 'Efetivar Entrada' : 'Salvar Conferência'}
                    <Check size={20} strokeWidth={4} />
                  </>
                )}
              </button>
              <button
                onClick={() => setIsConfirmingFinal(false)}
                disabled={isSaving}
                className="w-full py-4 text-[10px] font-black text-slate-300 uppercase tracking-widest hover:text-red-500 transition-colors"
              >
                Voltar e Corrigir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ValidateInvoiceItems;
