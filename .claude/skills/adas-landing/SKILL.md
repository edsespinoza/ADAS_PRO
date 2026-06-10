---
name: adas-landing
description: Resumo compactado de index.html — landing page pública ADAS PRO, seções, conteúdo e dependências
---

# ADAS Landing — index.html

## Dependências
- Fonts: Poppins (400–800) + Inter (400–600) via Google Fonts
- CSS: `css/style.css`
- Scripts: `/_vercel/insights/script.js` + `/_vercel/speed-insights/script.js` (defer)
- Sem auth.js na landing — login leva a `login.html`

## Estrutura de seções (ordem)
| ID / âncora | Descrição |
|---|---|
| `#hero` | Hero principal |
| `.brands-section` | Marquee infinito de marcas |
| `.urgency-section` | Crescimento 24%/ano |
| `#quando-recalibrar` | 6 cards de quando recalibrar |
| `#problema` | Seção problema de carreira |
| `#sistemas` | Sistemas ADAS cobertos |
| `#ferramentas` | Ferramentas necessárias |
| `#como-funciona` | Método / como funciona |
| `#servicos` | Planos e serviços |
| `#faq` | Perguntas frequentes |
| `#contato` | CTA final + formulário |

## Navbar (`nav.navbar#navbar`)
Links: Sobre, Sistemas, Quando Recalibrar, Ferramentas, Método, Serviços, FAQ  
CTA: `<a href="login.html" class="btn-nav btn-members">Área de Membros</a>`  
Mobile: `button.hamburger#hamburger`

## Hero (`section.hero#hero`)
- Badge animado: `div.hero-badge` com `span.hero-badge-dot`
- Título: `h1.hero-title` — "Domine / Sistemas ADAS. / Atenda com Autoridade."
  - `.line-accent` = laranja, `.line-tech` = tech
- Typing: `span#heroTyping` + `span.hero-typing-cursor`
- CTAs: `.btn.btn-primary.btn-lg` (quero ser mentorado → #contato) + `.btn.btn-outline.btn-lg` (ver sistemas)
- Stats (counter animado): `[data-target][data-suffix]`
  - 51+ Marcas Cobertas, 350+ Modelos Suportados, 6 Regiões Globais
- **Sem visual ADAS animado no HTML** — apenas JS (radar/câmera definidos em animations.js mas sem elementos HTML correspondentes no hero)

## Brands marquee
26 marcas: Honda, Toyota, Lexus, Nissan, Infiniti, Subaru EyeSight, Hyundai, Kia, Genesis, Audi LIDAR, VW, Mercedes-Benz, Ford, Mazda, Mitsubishi, BYD, Cadillac, Maserati, Alfa Romeo, Volvo Truck, Isuzu, Suzuki, MG, Chery, Daihatsu, Renault

## Urgency section
- 3 badges: 24% crescimento ADAS/ano | 2 em 3 carros novos com ADAS | R$ 800+ por calibração premium
- Counter animado em `.urgency-val[data-dramatic="true"]`

## Quando Recalibrar (6 cards `.recal-card`)
| Situação | Tipo |
|---|---|
| Troca de Parabrisa | ⚠️ Obrigatório |
| Colisão ou Impacto | ⚠️ Obrigatório |
| Alinhamento e Geometria | ⚠️ Obrigatório |
| Troca de Para-choque | ⚠️ Obrigatório |
| Troca de Bateria / Reset | 💡 Recomendado |
| Mudança de Aro ou Pneu | 💡 Recomendado |

CTA inline: `<a href="login.html">Abrir ticket →</a>`

## Padrões CSS globais (css/style.css)
- Cores: `--accent:#FF6B35`, `--tech:#00B4D8`, `--primary:#1B2B4D`
- Reveal animations: classe `.reveal` + `.reveal-delay-1/2/3`
- Contador: `[data-target][data-suffix]` animado por JS
- Classes utilitárias: `.container`, `.section`, `.tag`, `.btn`, `.text-accent`
