# UI/UX Pro Max — Inteligência de Design (PT-BR)

Guia profissional completo para design de interfaces (UI) e experiência do usuário (UX) em aplicações web e mobile.

Inclui:
- 50+ estilos de interface
- 160+ paletas de cores
- 50+ combinações tipográficas
- 100+ diretrizes de UX
- Padrões para múltiplas stacks (React, Next.js, Vue, Flutter, React Native, etc.)

---

# 🎯 Quando utilizar esta Skill

Utilize esta Skill sempre que houver impacto em:
- Estrutura visual
- Experiência do usuário
- Interação
- Percepção de qualidade do produto

### Uso obrigatório
- Criação de telas (landing page, dashboard, app)
- Criação ou refatoração de componentes (botões, formulários, tabelas)
- Definição de cores, tipografia e layout
- Revisão de UX e acessibilidade
- Melhorias de usabilidade

### Não utilizar
- Backend puro
- APIs
- Banco de dados
- DevOps

---

# ⚡ Modo Rápido (Checklist Essencial)

Antes de entregar qualquer UI:

- [ ] Contraste mínimo WCAG atendido
- [ ] Área de toque ≥ 44px
- [ ] Layout responsivo
- [ ] Sem deslocamento de layout (CLS)
- [ ] Feedback visual em ações
- [ ] Tipografia legível (≥16px mobile)

---

# 🧠 Estrutura de Prioridade

| Prioridade | Categoria | Impacto |
|----------|--------|--------|
| 1 | Acessibilidade | Crítico |
| 2 | Interação | Crítico |
| 3 | Performance | Alto |
| 4 | Estilo | Alto |
| 5 | Layout | Alto |
| 6 | Tipografia | Médio |
| 7 | Animação | Médio |
| 8 | Formulários | Médio |
| 9 | Navegação | Alto |
| 10 | Dados/Gráficos | Baixo |

---

# ♿ 1. Acessibilidade (CRÍTICO)

- Contraste mínimo 4.5:1
- Suporte a navegação por teclado
- Labels em todos os inputs
- Texto alternativo em imagens
- Não usar cor como único indicador
- Suporte a leitor de tela

❌ Evitar:
- Botões apenas com ícone sem descrição
- Remover foco visual

---

# 👆 2. Interação (CRÍTICO)

- Área mínima de toque: 44x44px
- Feedback visual ao clicar (≤100ms)
- Botões com estado de carregamento
- Evitar dependência de hover

❌ Evitar:
- Interações invisíveis
- Mudanças instantâneas sem feedback

---

# ⚡ 3. Performance (ALTO)

- Imagens otimizadas (WebP/AVIF)
- Lazy loading
- Evitar layout shift
- Código dividido por rota

❌ Evitar:
- Scripts pesados
- Reflows constantes

---

# 🎨 4. Estilo Visual (ALTO)

- Escolher um estilo consistente
- Usar ícones vetoriais (SVG)
- Manter coerência visual

Estilos comuns:
- Minimalista
- Dark mode
- Glassmorphism
- Flat design

---

# 📐 5. Layout & Responsividade (ALTO)

- Mobile-first
- Sem scroll horizontal
- Grid consistente
- Espaçamento baseado em 8px

---

# 🔤 6. Tipografia & Cor (MÉDIO)

- Fonte base ≥16px
- Line-height: 1.5
- Uso de cores semânticas (primary, error, success)

---

# 🎞️ 7. Animação (MÉDIO)

- Duração: 150–300ms
- Usar transform e opacity
- Animações devem ter propósito

---

# 🧾 8. Formulários (MÉDIO)

- Labels visíveis
- Erros próximos ao campo
- Validação após interação
- Feedback de sucesso/erro

---

# 🧭 9. Navegação (ALTO)

- Navegação previsível
- Máx. 5 itens no menu inferior
- Estado ativo visível
- Suporte a deep link

---

# 📊 10. Dados & Gráficos

- Escolher gráfico correto
- Legendas visíveis
- Acessibilidade de cores

---

# 📱 Contexto Brasil (IMPORTANTE)

- Otimizar para redes 3G/4G
- Priorizar Android intermediário
- Reduzir consumo de dados
- Evitar imagens pesadas

---

# 🧪 Exemplo Prático

Projeto: Dashboard SaaS

Problema:
Interface confusa

Solução:
- Melhorar contraste
- Ajustar hierarquia visual
- Simplificar navegação

Resultado:
Melhora significativa na usabilidade

---

# 🧩 Glossário

- UI: Interface do usuário
- UX: Experiência do usuário
- Componente: Elemento reutilizável
- Layout: Estrutura visual

---

# ⚙️ Uso via CLI (Opcional)

```bash
python3 skills/ui-ux-pro-max/scripts/search.py "dashboard moderno" --design-system
```

---

# 📚 Referências

- Apple Human Interface Guidelines  
https://developer.apple.com/design/human-interface-guidelines/

- Material Design 3  
https://m3.material.io/

- WCAG 2.1  
https://www.w3.org/TR/WCAG21/

---

# 🚀 Conclusão

Esta Skill fornece um padrão profissional para construção de interfaces modernas, acessíveis e performáticas.

Use como checklist obrigatório antes de qualquer entrega de UI.

