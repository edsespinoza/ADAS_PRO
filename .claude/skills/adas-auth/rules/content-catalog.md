---
name: AUTH — Catálogo de Conteúdo
description: 22 PDFs hard-coded em DEFAULT_CONTENT com accessLevel, downloadLevel e modelos cobertos
---

# Catálogo DEFAULT_CONTENT (22 PDFs)

## Estrutura de um item
```js
{
  id: string,          // ex: 'honda-lkas'
  cat: string,         // categoria (honda, toyota, etc.)
  title: string,
  desc: string,
  type: 'pdf',
  icon: '📄',
  accessLevel: 2|3,    // 2=pro, 3=premium (ver plano)
  downloadLevel: 3|4,  // 3=premium, 4=superadmin
  filePath: null,      // preenchido pelo admin ao fazer upload
  fileSize: string,    // ex: '2.4 MB'
  pages: number,
  version: string,     // ex: 'v3.1'
  updatedAt: string,   // ex: 'Abr/2026'
  models: string[],
  highlights: string[]
}
```

## Índice por categoria
| cat | id | Título | accessLevel | downloadLevel |
|---|---|---|---|---|
| honda | honda-lkas | Honda LKAS Calibration | 2 | 3 |
| honda | honda-avm | Honda AVM 360° | 2 | 3 |
| honda | honda-acc | Honda ACC Radar Frontal | 2 | 3 |
| toyota | toyota-ldw | Toyota LDW/LDA Target 120° | 2 | 3 |
| toyota | toyota-180 | Toyota LDA Target 180° | 2 | 3 |
| toyota | toyota-avm | Toyota & Lexus AVM 360° | 2 | 3 |
| nissan | nissan-lka | Nissan/Infiniti LKA Tipo 1 | 2 | 3 |
| nissan | nissan-propilot | Nissan ProPilot Assist | 2 | 3 |
| nissan | nissan-radar | Hitachi Radar Infiniti/Nissan | 2 | 3 |
| subaru | subaru-type1 | Subaru EyeSight Tipo 1 | 3 | 3 |
| subaru | subaru-type2 | Subaru EyeSight Tipo 2 | 3 | 3 |
| hyundai | hyundai-avm | Hyundai & Kia AVM 360° | 3 | 3 |
| hyundai | hyundai-radar | Genesis/Hyundai SCC/ACC Radar | 3 | 3 |
| vag | audi-lidar | Audi LIDAR ACC VAS6430-12 | 3 | 4 |
| vag | vag-avm | VW/Audi/Seat/Skoda AVM | 3 | 4 |
| mercedes | mercedes-night | Mercedes Night Vision | 3 | 4 |
| mercedes | mercedes-rcw | Mercedes RCW Radar Traseiro | 3 | 4 |
| ford | ford-avm | Ford AVM 360° LH/RH Target | 3 | 4 |
| radar | radar-univ | Universal Radar Plate ACC | 3 | 4 |
| mazda | mazda-avm | Mazda AVM 360° + FSC | 3 | 4 |
| mitsubishi | mitsubishi-lka | Mitsubishi LKA + AVM | 3 | 4 |
| chineses | byd-avm | BYD AVM 4 Variantes | 3 | 4 |
| chineses | mg-chery | MG & Chery / EXEED AVM | 3 | 4 |

## Mapeamento accessLevel → plano
- Level 2 → plano `pro` ou superior
- Level 3 → plano `premium` ou superior
- Level 4 (downloadLevel) → superadmin apenas
