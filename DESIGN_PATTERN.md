# 🎨 Padrão Visual Elegante - GARAGEM40

## Visão Geral
Este documento define o padrão de design elegante e moderno aplicado ao sistema GARAGEM40. O design prioriza profundidade visual, hierarquia clara, micro-animações e um tema escuro sofisticado.

## 🌈 Paleta de Cores

### Cores Principais
- **Background Escuro**: `bg-[#1e293b]` ou `bg-slate-900`
- **Gradientes Escuros**: `from-slate-900 to-slate-800`
- **Accent Verde**: `bg-green-500` / `bg-green-600`
- **Transparências**: Uso extensivo de `/10`, `/20`, `/30` para glass-morphism

### Códigos de Status
- **Atrasado**: Vermelho - `bg-rose-200`, `text-red-500`
- **Pendente**: Azul - `bg-blue-50`, `text-blue-500`
- **Em Andamento**: Roxo - `bg-purple-50`, `text-purple-600`
- **Lembrete**: Âmbar - `bg-amber-50`, `text-amber-500`
- **Pronto**: Verde - `bg-green-50`, `text-green-500`

## 💎 Componentes de Design

### 1. Headers/Barras Superiores
```tsx
className="bg-[#1e293b] text-white border-b border-white/10 shadow-xl"
```
- Background escuro consistente
- Bordas sutis com transparência
- Textos brancos com hierarquia (títulos brancos, subtítulos com opacity)

### 2. Barras Inferiores/Footers
```tsx
className="bg-[#1e293b] border-t border-white/10 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.3)]"
```
- Mesma cor do header para consistência
- Sombra invertida para profundidade
- Botões com background transparente e bordas

### 3. Cards
```tsx
className="bg-white rounded-[2.5rem] shadow-lg border-2 border-slate-100 hover:shadow-2xl hover:-translate-y-1"
```
**Características:**
- Border-radius grande (2.5rem) para suavidade
- Sombras profundas (`shadow-lg`, `shadow-2xl`)
- Hover com elevação (`-translate-y-1`)
- Transições suaves (`transition-all duration-300`)

### 4. Botões com Ícones
```tsx
// Botões em fundo escuro
className="p-3 bg-blue-500/10 rounded-2xl border-2 border-blue-500/20 text-blue-400 
           hover:text-blue-300 hover:border-blue-400/30 shadow-xl shadow-blue-500/5"

// Botões de ação primária
className="bg-gradient-to-r from-green-600 to-green-500 text-white rounded-2xl 
           shadow-2xl shadow-green-500/30 hover:from-green-700 hover:to-green-600 
           active:scale-95"
```

### 5. Cards de Resumo/Totais
```tsx
className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-[2.5rem] 
           p-8 shadow-2xl border-2 border-slate-700"
```
**Sub-cards internos:**
```tsx
className="bg-gradient-to-br from-purple-500/10 to-purple-600/10 rounded-2xl 
           p-6 border border-purple-400/20 shadow-lg"
```

### 6. Badges e Pills
```tsx
// Badge de status
className="px-3 py-2 rounded-xl border-2 border-slate-100 shadow-sm bg-slate-50"

// Badge ativo/destacado
className="px-3 py-2 rounded-xl border-2 border-green-200 shadow-sm bg-green-50 
           text-green-600 font-black"
```

## 📐 Tipografia

### Hierarquia de Fontes
```tsx
// Títulos principais
className="text-2xl font-black tracking-tighter text-slate-900"

// Subtítulos
className="text-[10px] font-black uppercase tracking-[2px] text-slate-400"

// Labels
className="text-[8px] font-black uppercase tracking-[3px] text-white/40"

// Valores mono (placas, valores)
className="text-xl font-black font-mono tracking-tight"
```

### Padrões de Peso
- **font-black**: Textos principais e labels
- **font-bold**: Textos secundários
- **font-medium**: Textos descritivos

## ✨ Efeitos e Animações

### Hover States
```tsx
hover:shadow-2xl hover:-translate-y-1  // Cards
hover:bg-green-500 hover:text-white    // Ícones circulares
hover:scale-105                         // Botões pequenos
active:scale-95                         // Feedback de clique
```

### Sombras
```tsx
shadow-sm          // Sutil
shadow-lg          // Média
shadow-2xl         // Profunda
shadow-xl shadow-green-500/30  // Colorida
shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.3)]  // Custom
```

### Transições
```tsx
transition-all duration-300  // Padrão
transition-colors            // Apenas cores
animate-pulse               // Indicadores ativos
animate-in fade-in          // Entrada suave
```

## 🎯 Ícones

### Configuração Padrão
```tsx
<Icon size={20} strokeWidth={2.5} />
```
- Stroke mais grosso (2.5) para melhor legibilidade
- Tamanhos consistentes: 12, 16, 20, 24, 32

### Containers de Ícones
```tsx
className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center 
           text-slate-400 border border-slate-100"
```

## 📱 Responsividade

### Breakpoints
- Mobile-first approach
- `sm:` - 640px
- `md:` - 768px
- `lg:` - 1024px

### Padding/Spacing
```tsx
p-4 sm:p-6 lg:p-10      // Seções
gap-3 sm:gap-4 lg:gap-6 // Grids
```

## 🎨 Glass-morphism

### Elementos sobre fundo escuro
```tsx
className="bg-white/10 backdrop-blur-sm border border-white/10"
```

### Transparências
- `/5` - Muito sutil
- `/10` - Sutil
- `/20` - Visível
- `/30` - Pronunciado
- `/40` - Forte

## ✅ Checklist de Implementação

Para aplicar o padrão a um novo componente:

- [ ] Header com `bg-[#1e293b]` e bordas transparentes
- [ ] Footer correspondente ao header
- [ ] Cards com `rounded-[2.5rem]` e sombras profundas
- [ ] Hover states com elevação ou mudança de cor
- [ ] Tipografia hierárquica (font-black para títulos)
- [ ] Ícones com strokeWidth={2.5}
- [ ] Transições suaves em todos elementos interativos
- [ ] Badges e pills com bordas visíveis
- [ ] Uso de gradientes sutis em elementos destacados
- [ ] Micro-animações (pulse, scale) em elementos ativos

## 🚀 Componentes Atualizados

### ✅ Concluídos
1. **ServiceDetail** - Card de totais e barra inferior
2. **ServiceCard** - Elevação, sombras e hover states
3. **NewServiceWizard** - Header e footer elegantes

### 📋 Próximos
- EvaluationSheet
- PrintModal
- FilterModal
- ClientsTab
- Agendamentos
- StatusBadge (refinamento)

## 💡 Princípios de Design

1. **Profundidade Visual**: Usar sombras e elevação generosamente
2. **Consistência**: Headers e footers sempre no mesmo tema escuro
3. **Hierarquia**: Tipografia deve guiar o olhar do usuário
4. **Feedback**: Todo elemento interativo deve responder ao hover/ativo
5. **Suavidade**: Bordas arredondadas (min 1rem, ideal 2.5rem)
6. **Sofisticação**: Preferir gradientes sutis a cores sólidas em destaque

---

**Última atualização**: 2026-01-20
**Versão**: 1.0.0
