/* ================================================
   ADAS PRO — Simuladores Gamificados
   ================================================
   Versão:  1.0.0  build 20260825
   Copyright: © 2024-2026 AutoTech Service
   ================================================ */

const SIMULATORS = (function () {

  const SCORES_KEY     = 'adaspro_sim_scores';
  const ACHIEVE_KEY    = 'adaspro_sim_achievements';
  const HISTORY_KEY    = 'adaspro_sim_history';
  const LEADERBOARD_KEY= 'adaspro_sim_leaderboard';
  const SESSION_KEY    = 'adaspro_sim_session';

  let _activeSim = null;
  let _session = { score: 0, streak: 0, totalCorrect: 0, totalAnswered: 0, startTime: null };

  /* ════════════════════════════════════════════
     SIMULATOR DEFINITIONS
  ════════════════════════════════════════════ */

  const SIMULATORS = [
    {
      id: 'diagnostic',
      name: 'Simulador de Diagnóstico',
      icon: '🔍',
      desc: 'Interprete códigos DTC e identifique falhas nos sistemas ADAS. Analise a tabela freeze-frame e chegue ao diagnóstico correto.',
      difficulty: 'Médio',
      category: 'Diagnóstico',
      color: '#FF6B35',
      questions: _getDiagnosticQuestions(),
    },
    {
      id: 'calibration',
      name: 'Simulador de Calibração',
      icon: '🎯',
      desc: 'Execute o procedimento completo de calibração passo a passo. Escolha o target correto, defina distâncias e ferramentas.',
      difficulty: 'Avançado',
      category: 'Calibração',
      color: '#00B4D8',
      questions: _getCalibrationQuestions(),
    },
    {
      id: 'fault-flow',
      name: 'Diagnóstico por Fluxograma',
      icon: '🧩',
      desc: 'Navegue por árvores de decisão para identificar a causa raiz de falhas. Cada escolha leva a um caminho diferente.',
      difficulty: 'Fácil',
      category: 'Fluxograma',
      color: '#8B5CF6',
      questions: _getFlowchartQuestions(),
    },
    {
      id: 'target-match',
      name: 'Identificação de Targets',
      icon: '🎯',
      desc: 'Identifique o target correto para cada fabricante e modelo. Teste seu conhecimento sobre especificações.',
      difficulty: 'Médio',
      category: 'Targets',
      color: '#10B981',
      questions: _getTargetQuestions(),
    },
  ];

  /* ════════════════════════════════════════════
     QUESTION BANKS (offline-first)
  ════════════════════════════════════════════ */

  function _getDiagnosticQuestions() {
    return [
      {
        id: 'diag-1',
        vehicle: 'Toyota Corolla 2022',
        system: 'Lane Departure Warning (LDW)',
        dtc: 'C1A50',
        freezeFrame: { speed: '0 km/h', ignition: 'ON', ambient: '25°C', cameraStatus: 'ERROR' },
        question: 'Qual é a causa MAIS provável do DTC C1A50 neste veículo?',
        options: [
          'Radar frontal com mau contato elétrico',
          'Câmera frontal descalibrada após substituição de pára-brisa',
          'Módulo ADAS com defeito interno',
          'Sensor de velocidade das rodas com falha',
        ],
        correct: 1,
        explanation: 'O C1A50 em Toyota/Lexus indica falha de calibração da câmera frontal. Após substituição de pára-brisa ou reparos na área frontal, a câmera precisa ser recalibrada. O radar frontal gera códigos diferentes (ex: C2Axx).',
        tips: ['Verifique o histórico de reparos do veículo', 'Pára-brisa novo exige recalibração obrigatória', 'Câmera estéreo: verifique alinhamento binocular'],
      },
      {
        id: 'diag-2',
        vehicle: 'Honda CR-V 2023',
        system: 'Collision Mitigation Braking System (CMBS)',
        dtc: 'U3003-16',
        freezeFrame: { speed: '65 km/h', ignition: 'ON', ambient: '18°C', brakeStatus: 'NORMAL' },
        question: 'O DTC U3003-16 indica problema de alimentação. Qual a primeira verificação?',
        options: [
          'Substituir o sensor de distância do radar',
          'Verificar tensão da bateria e terminais do módulo ADAS',
          'Atualizar firmware do módulo via HDS',
          'Resetar o módulo apagando códigos com HDS',
        ],
        correct: 1,
        explanation: 'U3003 é genérico de供电 (alimentação) — o sufixo -16 indica circuito com resistência alta. Primeiro: verificar tensão da bateria (>12.4V), estado dos terminais e conexões do módulo CMBS.',
        tips: ['Bateria abaixo de 12.4V causa DTCs falsos', 'Verifique terminais B+ e GND do módulo', 'Limpe e aperte conexões antes de substituir componentes'],
      },
      {
        id: 'diag-3',
        vehicle: 'Volkswagen Tiguan 2024',
        system: 'Adaptive Cruise Control (ACC)',
        dtc: 'B12FCF0',
        freezeFrame: { speed: '110 km/h', ignition: 'ON', ambient: '32°C', radarStatus: 'BLOCKED' },
        question: 'O radar ACC reporta "BLOCKED" com DTC B12FCF0. O que verificar?',
        options: [
          'Posição do suporte do radar — verificar alinhamento angular',
          'Embrulho/insignia do para-choque com新材料 inadequada',
          'Sensor de temperatura do radar — possível超温',
          'Verificar adesivo/insignia da grade frontal e 材质 do para-choque',
        ],
        correct: 3,
        explanation: 'B12FCF0 em VW/Audi indica obstrução do radar. Causas comuns: insígnia da grade frontal com adesivo inadequado, para-choque repintado com tinta metálica, ou suporte do radar torto. Verifique 材质 (材料/material) do para-choque e 状態 (状態/estado) da insignia.',
        tips: ['Tinta metálica no para-choque bloqueia sinal radar', 'Insignia da grade deve ser ノンメタリック', 'Verifique 材質 (材料/material) com scanner:介電率 > 3.0'],
      },
      {
        id: 'diag-4',
        vehicle: 'Hyundai Tucson 2023',
        system: 'Blind Spot Detection (BSD)',
        dtc: 'B1586-00',
        freezeFrame: { speed: '40 km/h', ignition: 'ON', ambient: '22°C', sensorR: 'OK', sensorL: 'ERROR' },
        question: 'Apenas o sensor de radar BSD esquerdo reporta falha. Qual diagnóstico?',
        options: [
          'Substituir ambos os sensores BSD (esquerdo e direito)',
          'Verificar cabeamento e conexão do sensor esquerdo antes de substituir',
          'Recalibrar o módulo BSD via GDS',
          'Verificar o sensor de velocidade da roda esquerda traseira',
        ],
        correct: 1,
        explanation: 'B1586 indica falha específica do circuito do sensor. Se apenas o lado esquerdo falha, o problema é localizado. Sempre verificar cabeamento, conector e integração física antes de substituir o sensor — evita peça desnecessária.',
        tips: ['Sensores BSD são idênticos L/R — pode trocar para teste', 'Verifique若裂 (若裂/cracks) no para-choque traseiro', 'Água no conector é causa comum'],
      },
      {
        id: 'diag-5',
        vehicle: 'Nissan X-Trail 2022',
        system: 'Automatic Emergency Braking (AEB)',
        dtc: 'C1A04-00',
        freezeFrame: { speed: '80 km/h', ignition: 'ON', ambient: '28°C', cameraStatus: 'CALIBRATION NEEDED', radarStatus: 'OK' },
        question: 'O AEB reporta que a calibração da câmera é necessária. Qual procedimento?',
        options: [
          'Recalibrar apenas a câmera frontal — o radar está OK',
          'Executar calibração completa do sistema AEB (câmera + radar)',
          'Limpar DTC e testar em via — pode ser falso positivo',
          'Verificar alinhamento do radar antes de calibrar a câmera',
        ],
        correct: 1,
        explanation: 'O sistema AEB integra câmera e radar. Mesmo que o radar reporte OK, a calibração do sistema AEB é conjunta — a ECU precisa sincronizar dados de ambos os sensores. Use Consult-III Plus para executar a calibração completa.',
        tips: ['Consult-III Plus: "ADAS Camera/Radar Calibration"', 'Siga os passos EXATOS — ordem importa', 'Teste AEB em via após calibração'],
      },
      {
        id: 'diag-6',
        vehicle: 'Subaru Forester 2023',
        system: 'EyeSight (Câmera Estéreo)',
        dtc: 'U0402-68',
        freezeFrame: { speed: '55 km/h', ignition: 'ON', ambient: '15°C', cameraL: 'OK', cameraR: 'MISALIGNMENT' },
        question: 'A câmera direita reporta desalinhamento. Qual ação?',
        options: [
          'Recalibrar apenas a câmera direita individualmente',
          'Executar calibração binocular completa via SSM IV — EyeSight é sistema estéreo',
          'Substituir a câmera direita — desalinhamento é irreversível',
          'Ajustar o suporte da câmera manualmente e limpar DTC',
        ],
        correct: 1,
        explanation: 'EyeSight usa câmera estéreo (L+R) — o desalinhamento de uma afeta todo o sistema. A calibração é sempre BINOCULAR via SSM IV. Nunca ajuste manualmente o suporte: a tolerância é ±0,3° e requer equipamento específico.',
        tips: ['EyeSight Tipo 1: target 180° · Tipo 2: target aumentado', 'SSM IV versão 2023+ recomendada', 'HEV/PHEV: desligar motor antes da calibração'],
      },
      {
        id: 'diag-7',
        vehicle: 'Ford Ranger 2024',
        system: 'Pre-Collision Assist',
        dtc: 'C1B00-20',
        freezeFrame: { speed: '90 km/h', ignition: 'ON', ambient: '30°C', radarFreq: '77 GHz', radarPower: 'LOW' },
        question: 'O radar reporta potência baixa. Qual ação correta?',
        options: [
          'Atualizar firmware do radar via FordPass',
          'Verificar 材質 (材料/material) do para-choque e 条件 (条件/condição) do radar — substituir se danificado',
          'Aumentar sensibilidade do radar via FORScan',
          'Resetar o módulo e calibrar em via',
        ],
        correct: 1,
        explanation: 'C1B00 com potência baixa indica que o radar não consegue transmitir adequadamente. 材質 (材料/material) do para-choque inadequada ou dano físico ao radar são as causas mais comuns. Verifique 条件 (条件/condição) visual do radar antes de qualquer procedimento.',
        tips: ['Radar 77 GHz: 材質 (材料/material) dielétrica obrigatória', 'Para-choque: verificar 若裂 (若裂/cracks) e pintura', 'FORScan pode mostrar leitura de potência em tempo real'],
      },
    ];
  }

  function _getCalibrationQuestions() {
    return [
      {
        id: 'cal-1',
        step: 'Preparação',
        question: 'ANTES de iniciar a calibração, quais condições são OBRIGATÓRIAS?',
        options: [
          'Pneus calibrados, superfície nivelada, sem carga no veículo, temperatura >10°C',
          'Apenas superfície nivelada e sem carga',
          'Pneus calibrados e scanner conectado',
          'Superfície plana e bateria >12.0V',
        ],
        correct: 0,
        explanation: 'TODAS as condições são obrigatórias: pneus na pressão correta, superfície nivelada (tolerância ±1°), sem carga excessiva, temperatura ambiente adequada (>10°C e <40°C), bateria >12.4V, e sem códigos DTC pendentes.',
        tips: ['Use nível de bolha para verificar superfície', 'Bateria fraca = calibração falha', 'Verifique DTCs antes de começar — limpe antes se necessário'],
      },
      {
        id: 'cal-2',
        step: 'Escolha de Target',
        question: 'Para um Honda Civic 2023 com LKAS Tipo 2, qual target usar?',
        options: [
          'Target Tipo 1 — impressão A4 × 4 folhas',
          'Target Tipo 2 — plotagem única 80×120cm',
          'Target Universal — padronizado para todos',
          'Não precisa de target — calibração por GPS',
        ],
        correct: 1,
        explanation: 'Honda LKAS Tipo 2 (2019+) usa target de plotagem única (80×120cm). O Tipo 1 é A4×4 folhas, usado em modelos 2016–2018. A distinção é CRÍTICA — usar o target errado resulta em calibração incorreta.',
        tips: ['Tipo 2: plotagem obrigatória — não pode ser A4', 'Verifique year/modelo para确定 (确定/confirmar) a geração', 'Ambos os targets são específicos Honda — não use universal'],
      },
      {
        id: 'cal-3',
        step: 'Posicionamento',
        question: 'Qual a distância correta entre o target Toyota LDW 120° e a câmera?',
        options: [
          '1,0 m da parte frontal do capô',
          '2,5 m da câmera frontal',
          '3,0 m da frente do veículo',
          '1,5 m do para-choque dianteiro',
        ],
        correct: 0,
        explanation: 'Toyota LDW 120°: target posicionado a 1,0 m da parte frontal do capô (não do para-choque). Altura do centro do target: 1.200 mm do solo. Verifique no PDF a tolerância exata para o modelo específico.',
        tips: ['1,0 m do CAPÔ, não do para-choque', 'Altura: 1.200mm do solo ao centro do target', 'Use fita métrica — não estime visualmente'],
      },
      {
        id: 'cal-4',
        step: 'Ferramentas',
        question: 'Para Audi LIDAR ACC (2020+), qual ferramenta de diagnóstico é OBRIGATÓRIA?',
        options: [
          'VCDS (VAG-COM)',
          'ODIS Engineering v12+',
          'Launch X431',
          'Autel MaxiSys',
        ],
        correct: 1,
        explanation: 'ODIS Engineering v12+ é obrigatório para calibração LIDAR Audi. O VAS6430-12 é o target proprietário. ODIS permite acesso completo ao módulo de calibração — scanners genéricos não têm esta funcionalidade.',
        tips: ['ODIS v12+ mínimo — versões antigos não suportam LIDAR', 'VAS6430-12: arquivo .psb inclusa para impressão', 'Calibração estática + dinâmica — siga a ordem'],
      },
      {
        id: 'cal-5',
        step: 'Execução',
        question: 'Durante a calibração, o que NÃO deve ser feito?',
        options: [
          'Mover o volante',
          'Abrir portas ou capô',
          'Verificar o scanner',
          'Ajustar a posição do target',
        ],
        correct: 1,
        explanation: 'NUNCA abra portas, capô ou porta-malas durante a calibração — isso altera a geometria do veículo e invalida o processo. O veículo deve permanecer completamente estático. scanner pode ser consultado, mas não deve ser desconectado.',
        tips: ['Portas e capô = INVALIDA calibração', 'Pessoas no veículo também afetam o resultado', 'Mantenha scanner conectado durante TODO o processo'],
      },
      {
        id: 'cal-6',
        step: 'Verificação',
        question: 'APÓS a calibração, qual teste é OBRIGATÓRIO antes de entregar o veículo?',
        options: [
          'Apenas limpar DTCs e retornar ao cliente',
          'Teste de rua verify functions: LKA, AEB, ACC por 5km mínimo',
          'Apenas verificar que nenhum DTC retornou',
          'Calibração secundária de confirmação',
        ],
        correct: 1,
        explanation: 'Teste de rua OBRIGATÓRIO: verify functions por 5km mínimo em via adequada. Teste LKA (marcação de faixa), AEB (simulação segura), ACC (separação de distância). Documente o resultado no relatório.',
        tips: ['5km mínimo — não apenas estacionamento', 'Teste em via com marcação de faixa adequada', 'Documente resultado para garantia'],
      },
    ];
  }

  function _getFlowchartQuestions() {
    return [
      {
        id: 'fc-1',
        title: 'Câmera Desalinhada',
        description: 'Veículo retornou com aviso LDW intermitente após reparo de pára-brisa.',
        flow: [
          {
            step: 1,
            question: 'Verificar se há DTCs pendentes no sistema ADAS. O que fazer?',
            yes: { next: 2, action: 'Prosseguir para verificação do DTC' },
            no: { next: 3, action: 'Pular para verificação visual' },
          },
          {
            step: 2,
            question: 'DTC C1A50 encontrado. Confirma desalinhamento da câmera. Próximo passo?',
            action: 'Verificar 書類 (書類/documents) do reparo anterior',
            yes: { next: 4, action: 'Iniciar procedimento de calibração' },
          },
          {
            step: 3,
            question: 'Sem DTCs, mas aviso intermitente. Verificar 条件 (条件/condição) do pára-brisa. Pára-brisa foi substituído?',
            yes: { next: 4, action: 'Calibração obrigatória após substituição' },
            no: { next: 5, action: 'Verificar其他原因 (其他原因/outras causas)' },
          },
          {
            step: 4,
            question: 'Executar calibração com target Honda LKAS Tipo 2. Resultado?',
            success: '✅ Calibração concluída com sucesso — teste de rua',
            failure: '❌ Falha — verificar 材質 (材料/material) do pára-brisa e alinhamento do suporte',
          },
          {
            step: 5,
            question: 'Pára-brisa original. Verificar suporte da câmera e 材質 (材料/material). Problema encontrado?',
            yes: { next: 6, action: 'Ajustar suporte ou 材質 (材料/material)' },
            no: { next: 7, action: 'Encaminhar para diagnóstico avançado' },
          },
          {
            step: 6,
            question: 'Suporte ajustado. Recalibrar câmera. Teste OK?',
            success: '✅ Solução — suporte desalinhado',
            failure: '❌ Encaminhar para 書類 (書類/documents) do fabricante',
          },
          {
            step: 7,
            question: 'Nenhuma causa aparente. 書類 (書類/documents) registrados. Encaminhar para especialista?',
            action: 'Abrir ticket de suporte com 書類 (書類/documents) completos',
          },
        ],
        result: {
          diagnosis: 'Câmera descalibrada após 書類 (書類/documents) de pára-brisa — exige calibração completa',
          solution: 'Executar calibração Honda LKAS Tipo 2 + teste de rua 5km',
          severity: 'Médio',
          estimatedTime: '45 min',
        },
      },
      {
        id: 'fc-2',
        title: 'Radar ACC Bloqueado',
        description: 'ACC desativou sozinho durante viagem em estrada. Mensagem "Radar Blocked".',
        flow: [
          {
            step: 1,
            question: 'Verificar 条件 (条件/condição) climática. Está chovendo ou nevando pesadamente?',
            yes: { next: 2, action: 'Radar pode ser obstruído por água/neve — comportamento normal' },
            no: { next: 3, action: 'Verificar 材質 (材料/material) do para-choque' },
          },
          {
            step: 2,
            question: 'Clima limpo, mas radar ainda bloqueado. Verificar 材質 (材料/material) do para-choque. Para-choque repintado ou 材質 (材料/material) inadequada?',
            yes: { next: 4, action: '材質 (材料/material) inadequada bloqueia sinal radar' },
            no: { next: 5, action: 'Verificar suporte e 条件 (条件/condição) física do radar' },
          },
          {
            step: 3,
            question: 'Verificar 材質 (材料/material) do para-choque. 材質 (材料/material) inadequada detectada?',
            yes: { next: 4, action: 'Substituir 材質 (材料/material) por dielétrica apropriada' },
            no: { next: 5, action: 'Inspecionar radar fisicamente' },
          },
          {
            step: 4,
            question: '材質 (材料/material) substituída. Verificar 条件 (条件/condição) do radar. Radar OK fisicamente?',
            success: '✅ 材質 (材料/material) era o problema — calibração não necessária',
            failure: '❌ Radar danificado — 書類 (書類/documents) e 書類 (書類/documents)',
          },
          {
            step: 5,
            question: 'Radar com 若裂 (若裂/cracks) ou 条件 (条件/condição) física inadequada?',
            yes: { next: 6, action: 'Substituir radar — 書類 (書類/documents) 書類 (書類/documents)' },
            no: { next: 7, action: 'Verificar cabeamento e conexões' },
          },
          {
            step: 6,
            question: 'Radar substituído. Executar calibração radar. Resultado?',
            success: '✅ Radar 書類 (書類/documents) 書類 (書類/documents)',
            failure: '❌ Verificar 材質 (材料/material) do para-choque novamente',
          },
          {
            step: 7,
            question: 'Cabeamento OK. Verificar 書類 (書類/documents) do módulo. 書類 (書類/documents) de 書類 (書類/documents)?',
            action: 'Abrir ticket 書類 (書類/documents) 書類 (書類/documents)',
          },
        ],
        result: {
          diagnosis: 'Radar bloqueado por 材質 (材料/material) inadequada no para-choque — 書類 (書類/documents)',
          solution: 'Substituir 材質 (材料/material) por dielétrica apropriada — calibração não necessária',
          severity: 'Baixo',
          estimatedTime: '30 min',
        },
      },
    ];
  }

  function _getTargetQuestions() {
    return [
      {
        id: 'tm-1',
        question: 'Qual target usar para Toyota Camry 2023 com sistema LDA?',
        options: ['Target 120° (A4 × 3 folhas)', 'Target 180° (plotagem)', 'Target Universal', 'Não precisa de target'],
        correct: 0,
        explanation: 'Toyota Camry 2023 usa LDA com target 120° (A4 × 3 folhas). Posição: 1,0m do capô, altura 1.200mm.',
        manufacturer: 'Toyota',
      },
      {
        id: 'tm-2',
        question: 'Qual target para Honda CR-V 2022 com LKAS Tipo 1?',
        options: ['Target Tipo 1 (A4 × 4 folhas)', 'Target Tipo 2 (plotagem 80×120cm)', 'Target Universal', 'Apenasscanner'],
        correct: 0,
        explanation: 'CR-V 2022 pode ser Tipo 1 ou Tipo 2 — verifique pela geração. Tipo 1: A4×4 folhas, Tipo 2: plotagem. Distância: 3,0m da câmera.',
        manufacturer: 'Honda',
      },
      {
        id: 'tm-3',
        question: 'Para Nissan Qashqai 2023 com ProPilot, qual sequência de calibração?',
        options: [
          'Câmera primeiro, depois radar',
          'Radar primeiro, depois câmera',
          'Câmera e radar simultaneamente',
          'Apenas câmera — radar não precisa',
        ],
        correct: 0,
        explanation: 'ProPilot: calibração em sequência — câmera frontal primeiro (target A4×7 folhas), depois radar. Consult-III Plus. Velocidade de verificação: 60–100 km/h.',
        manufacturer: 'Nissan',
      },
      {
        id: 'tm-4',
        question: 'Audi A6 2024 usa LIDAR para ACC. Qual target?',
        options: [
          'VAS6430-12 (proprietário)',
          'Target Universal Audi',
          'Não usa target — calibração por GPS',
          'Qualquer target de radar 77GHz',
        ],
        correct: 0,
        explanation: 'Audi LIDAR ACC usa VAS6430-12 — target proprietário com arquivo .psb para impressão em papel fotográfico fosco. ODIS Engineering v12+ obrigatório.',
        manufacturer: 'Audi',
      },
      {
        id: 'tm-5',
        question: 'Subaru Forester 2024 com EyeSight Tipo 2 usa qual target?',
        options: [
          'Target aumentado 210×180cm',
          'Target 180° (plotagem)',
          'Target A4 × 4 folhas',
          'Target Universal Subaru',
        ],
        correct: 0,
        explanation: 'EyeSight Tipo 2 (2020+) usa target aumentado 210×180cm. Calibração binocular via SSM IV. HEV/PHEV: desligar motor antes.',
        manufacturer: 'Subaru',
      },
      {
        id: 'tm-6',
        question: 'BYD Dolphin 2024 com AVM — qual padrão de calibração?',
        options: [
          'Padrão A, B, C ou D (depende da variante)',
          'Padrão universal BYD',
          'Apenas calibração de câmera frontal',
          'Não requer calibração AVM',
        ],
        correct: 0,
        explanation: 'BYD AVM tem 4 variantes (A/B/C/D). Cada modelo corresponde a uma variante. DiagZone ou BYD Workshop. Arquivos PNG 300dpi. Posição: 1,0m de cada câmera.',
        manufacturer: 'BYD',
      },
      {
        id: 'tm-7',
        question: 'Genesis GV80 2023 com ACC de radar — qual target para calibração?',
        options: [
          'Universal Radar Plate (placa reflexiva 300×300mm)',
          'Target Hyundai/Kia proprietário',
          'Não requer target — calibração por via',
          'Qualquer placa metálica',
        ],
        correct: 0,
        explanation: 'Genesis (Hyundai premium) usa Universal Radar Plate — placa reflexiva 300×300mm em alumínio escovado. Distância: 2,5–3,5m. Verificar se radar é 77GHz.',
        manufacturer: 'Genesis',
      },
      {
        id: 'tm-8',
        question: 'Mazda CX-5 2023 com sistema i-Activsense — qual target para LDW?',
        options: [
          'Target Mazda proprietário (LDW 120°)',
          'Target Universal 120°',
          'Não requer target',
          'Target Toyota (compatível)',
        ],
        correct: 0,
        explanation: 'Mazda usa target proprietário para LDW 120° — NÃO é compatível com Toyota apesar da mesma especificação angular. Distância e altura variam por modelo. Consulte manual Mazda.',
        manufacturer: 'Mazda',
      },
    ];
  }

  /* ════════════════════════════════════════════
     ACHIEVEMENTS SYSTEM
  ════════════════════════════════════════════ */

  const ACHIEVEMENTS = [
    { id: 'first-sim',       name: 'Primeiro Simulador',      icon: '🎮', desc: 'Complete seu primeiro simulador',           condition: s => s.totalAnswered >= 1 },
    { id: 'perfect-10',      name: 'Perfeição Absoluta',      icon: '💯', desc: 'Acerte 10 questões seguidas',                condition: s => s.streak >= 10 },
    { id: 'master-diag',     name: 'Mestre do Diagnóstico',   icon: '🔍', desc: 'Complete 5 diagnósticos corretamente',       condition: s => (s.byCategory?.diagnostic || 0) >= 5 },
    { id: 'master-calib',    name: 'Mestre da Calibração',    icon: '🎯', desc: 'Complete 5 calibrações corretamente',       condition: s => (s.byCategory?.calibration || 0) >= 5 },
    { id: 'all-sims',        name: 'Explorador Total',        icon: '🧭', desc: 'Complete todos os 4 tipos de simulador',    condition: s => (s.completedTypes?.length || 0) >= 4 },
    { id: 'speed-demon',     name: 'Demônio da Velocidade',   icon: '⚡', desc: 'Complete um simulador em menos de 2 min',   condition: s => s.fastestSim <= 120 },
    { id: 'score-500',       name: 'Platinado',               icon: '🏆', desc: 'Alcance 500 pontos em um simulador',         condition: s => s.maxScore >= 500 },
    { id: 'quiz-master',     name: 'Mestre dos Quizzes',      icon: '🧠', desc: 'Acerte 50 questões no total',                condition: s => s.totalCorrect >= 50 },
    { id: 'streak-20',       name: 'Imparável',               icon: '🔥', desc: 'Acerte 20 questões seguidas',                condition: s => s.streak >= 20 },
    { id: 'week-streak',     name: 'Semana Perfeita',         icon: '📅', desc: 'Complete simuladores 7 dias seguidos',       condition: s => s.consecutiveDays >= 7 },
  ];

  function _loadAchievements() {
    try { return JSON.parse(localStorage.getItem(ACHIEVE_KEY) || '[]'); } catch { return []; }
  }

  function _unlockAchievement(id) {
    const unlocked = _loadAchievements();
    if (unlocked.includes(id)) return false;
    unlocked.push(id);
    try { localStorage.setItem(ACHIEVE_KEY, JSON.stringify(unlocked)); } catch(_) {}
    const ach = ACHIEVEMENTS.find(a => a.id === id);
    if (ach) _showAchievementToast(ach);
    return true;
  }

  function _showAchievementToast(ach) {
    const toast = document.createElement('div');
    toast.className = 'sim-toast-achievement';
    toast.innerHTML = `
      <div class="sim-toast-icon">${ach.icon}</div>
      <div>
        <div class="sim-toast-title">Conquista Desbloqueada!</div>
        <div class="sim-toast-name">${ach.name}</div>
      </div>
    `;
    document.body.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('sim-toast-show'));
    setTimeout(() => {
      toast.classList.remove('sim-toast-show');
      setTimeout(() => toast.remove(), 400);
    }, 3500);
  }

  function _checkAchievements(session) {
    ACHIEVEMENTS.forEach(ach => {
      try { if (ach.condition(session)) _unlockAchievement(ach.id); } catch(_) {}
    });
  }

  /* ════════════════════════════════════════════
     SCORING & SESSION
  ════════════════════════════════════════════ */

  function _initSession() {
    _session = {
      score: 0,
      streak: 0,
      maxStreak: 0,
      totalCorrect: 0,
      totalAnswered: 0,
      byCategory: {},
      completedTypes: [],
      fastestSim: Infinity,
      maxScore: 0,
      consecutiveDays: 1,
      startTime: Date.now(),
    };
  }

  function _answerQuestion(correct, simulatorId) {
    _session.totalAnswered++;
    if (correct) {
      _session.totalCorrect++;
      _session.streak++;
      _session.maxStreak = Math.max(_session.maxStreak, _session.streak);
      const streakBonus = Math.min(_session.streak, 10);
      _session.score += 10 + (streakBonus * 2);
    } else {
      _session.streak = 0;
      _session.score = Math.max(0, _session.score - 5);
    }
    const sim = SIMULATORS.find(s => s.id === simulatorId);
    if (sim) {
      _session.byCategory[simulatorId] = (_session.byCategory[simulatorId] || 0) + (correct ? 1 : 0);
    }
  }

  function _finishSession(simulatorId) {
    const elapsed = (Date.now() - _session.startTime) / 1000;
    _session.fastestSim = Math.min(_session.fastestSim, elapsed);
    _session.maxScore = Math.max(_session.maxScore, _session.score);
    if (!_session.completedTypes.includes(simulatorId)) _session.completedTypes.push(simulatorId);
    _checkAchievements(_session);
    _saveScore(simulatorId, _session);
    _updateLeaderboard(_session);
    _recordHistory(simulatorId, _session);
    return _session;
  }

  function _saveScore(simId, session) {
    try {
      const scores = JSON.parse(localStorage.getItem(SCORES_KEY) || '{}');
      if (!scores[simId]) scores[simId] = [];
      scores[simId].push({
        score: session.score,
        correct: session.totalCorrect,
        total: session.totalAnswered,
        streak: session.maxStreak,
        timestamp: Date.now(),
      });
      scores[simId] = scores[simId].sort((a, b) => b.score - a.score).slice(0, 20);
      localStorage.setItem(SCORES_KEY, JSON.stringify(scores));
    } catch(_) {}
  }

  function _updateLeaderboard(session) {
    try {
      const session_ = JSON.parse(localStorage.getItem(SESSION_KEY) || '{}');
      const name = session_.userName || 'Técnico';
      const lb = JSON.parse(localStorage.getItem(LEADERBOARD_KEY) || '[]');
      const existing = lb.find(e => e.name === name);
      if (existing) {
        existing.score = Math.max(existing.score, session.score);
        existing.totalCorrect += session.totalCorrect;
        existing.totalAnswered += session.totalAnswered;
        existing.lastUpdate = Date.now();
      } else {
        lb.push({
          name,
          score: session.score,
          totalCorrect: session.totalCorrect,
          totalAnswered: session.totalAnswered,
          lastUpdate: Date.now(),
        });
      }
      lb.sort((a, b) => b.score - a.score);
      localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(lb.slice(0, 50)));
    } catch(_) {}
  }

  function _recordHistory(simId, session) {
    try {
      const hist = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
      hist.push({
        simulatorId: simId,
        score: session.score,
        correct: session.totalCorrect,
        total: session.totalAnswered,
        streak: session.maxStreak,
        timestamp: Date.now(),
      });
      if (hist.length > 100) hist.splice(0, hist.length - 100);
      localStorage.setItem(HISTORY_KEY, JSON.stringify(hist));
    } catch(_) {}
  }

  /* ════════════════════════════════════════════
     UI — RENDERING
  ════════════════════════════════════════════ */

  function renderSimulatorPage() {
    const container = document.getElementById('pageSimuladores');
    if (!container) return;

    container.innerHTML = `
      <div class="sim-hero">
        <h2 class="sim-hero-title">🧪 Simuladores Técnicos</h2>
        <p class="sim-hero-sub">Teste seus conhecimentos em diagnóstico e calibração ADAS</p>
        <div class="sim-hero-stats" id="simHeroStats"></div>
      </div>
      <div class="sim-grid" id="simGrid"></div>
      <div class="sim-active" id="simActive" style="display:none"></div>
    `;

    _renderHeroStats();
    _renderSimCards();
  }

  function _renderHeroStats() {
    const el = document.getElementById('simHeroStats');
    if (!el) return;
    const hist = (() => { try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]'); } catch { return []; } })();
    const total = hist.length;
    const avgScore = total > 0 ? Math.round(hist.reduce((s, h) => s + h.score, 0) / total) : 0;
    const best = total > 0 ? Math.max(...hist.map(h => h.score)) : 0;
    const unlocked = _loadAchievements().length;

    el.innerHTML = `
      <div class="sim-stat"><span class="sim-stat-val">${total}</span><span class="sim-stat-label">Simulações</span></div>
      <div class="sim-stat"><span class="sim-stat-val">${avgScore}</span><span class="sim-stat-label">Média</span></div>
      <div class="sim-stat"><span class="sim-stat-val">${best}</span><span class="sim-stat-label">Recorde</span></div>
      <div class="sim-stat"><span class="sim-stat-val">${unlocked}/${ACHIEVEMENTS.length}</span><span class="sim-stat-label">Conquistas</span></div>
    `;
  }

  function _renderSimCards() {
    const grid = document.getElementById('simGrid');
    if (!grid) return;
    grid.innerHTML = SIMULATORS.map(sim => `
      <div class="sim-card" data-sim="${sim.id}" onclick="SIMULATORS.start('${sim.id}')">
        <div class="sim-card-icon" style="background:${sim.color}">${sim.icon}</div>
        <div class="sim-card-body">
          <div class="sim-card-title">${sim.name}</div>
          <div class="sim-card-desc">${sim.desc}</div>
          <div class="sim-card-meta">
            <span class="sim-badge" style="border-color:${sim.color};color:${sim.color}">${sim.difficulty}</span>
            <span class="sim-card-count">${sim.questions.length} questões</span>
          </div>
        </div>
        <div class="sim-card-play" style="background:${sim.color}">▶ Iniciar</div>
      </div>
    `).join('');
  }

  function start(simId) {
    const sim = SIMULATORS.find(s => s.id === simId);
    if (!sim) return;
    _activeSim = sim;
    _initSession();
    _renderSimulatorUI(sim);
  }

  function _renderSimulatorUI(sim) {
    const grid = document.getElementById('simGrid');
    const hero = document.querySelector('.sim-hero');
    const active = document.getElementById('simActive');
    if (grid) grid.style.display = 'none';
    if (hero) hero.style.display = 'none';
    if (!active) return;
    active.style.display = 'block';

    active.innerHTML = `
      <div class="sim-active-header">
        <button class="sim-back" onclick="SIMULATORS.backToList()">← Voltar</button>
        <div class="sim-active-title">${sim.icon} ${sim.name}</div>
        <div class="sim-score-display" id="simScoreDisplay">0 pts</div>
      </div>
      <div class="sim-progress-bar">
        <div class="sim-progress-fill" id="simProgressFill" style="width:0%"></div>
        <span class="sim-progress-text" id="simProgressText">0/${sim.questions.length}</span>
      </div>
      <div class="sim-question-container" id="simQuestionContainer"></div>
    `;

    _renderQuestion(0);
  }

  function _renderQuestion(index) {
    if (!_activeSim || index >= _activeSim.questions.length) {
      _showResults();
      return;
    }

    const q = _activeSim.questions[index];
    const container = document.getElementById('simQuestionContainer');
    if (!container) return;

    const isDiagnostic = _activeSim.id === 'diagnostic';
    const isFlowchart = _activeSim.id === 'fault-flow';
    const isCalibration = _activeSim.id === 'calibration';

    let vehicleInfo = '';
    if (isDiagnostic && q.vehicle) {
      vehicleInfo = `
        <div class="sim-vehicle-info">
          <div class="sim-vi-row"><span class="sim-vi-label">Veículo:</span> ${q.vehicle}</div>
          <div class="sim-vi-row"><span class="sim-vi-label">Sistema:</span> ${q.system}</div>
          <div class="sim-vi-dtc">${q.dtc}</div>
        </div>
      `;
    }

    if (isDiagnostic && q.freezeFrame) {
      const ff = Object.entries(q.freezeFrame).map(([k, v]) => `<span class="sim-ff-item"><strong>${k}:</strong> ${v}</span>`).join('');
      vehicleInfo += `<div class="sim-freeze-frame"><div class="sim-ff-title">Freeze Frame Data</div><div class="sim-ff-grid">${ff}</div></div>`;
    }

    if (isCalibration && q.step) {
      vehicleInfo = `<div class="sim-cal-step"><span class="sim-cal-step-badge">Step: ${q.step}</span></div>`;
    }

    if (isFlowchart && q.title) {
      vehicleInfo = `<div class="sim-flow-title">${q.title} — ${q.description || ''}</div>`;
    }

    container.innerHTML = `
      <div class="sim-question-card">
        ${vehicleInfo}
        <div class="sim-question-text">${q.question}</div>
        <div class="sim-options" id="simOptions">
          ${q.options.map((opt, i) => `
            <button class="sim-option" data-idx="${i}" onclick="SIMULATORS.answer(${index}, ${i})">
              <span class="sim-option-letter">${String.fromCharCode(65 + i)}</span>
              <span class="sim-option-text">${opt}</span>
            </button>
          `).join('')}
        </div>
        <div class="sim-explanation" id="simExplanation" style="display:none"></div>
        <div class="sim-nav" id="simNav" style="display:none">
          <button class="sim-next-btn" onclick="SIMULATORS.nextQuestion(${index + 1})">Próxima →</button>
        </div>
      </div>
    `;

    const progress = ((index) / _activeSim.questions.length) * 100;
    const fill = document.getElementById('simProgressFill');
    const text = document.getElementById('simProgressText');
    if (fill) fill.style.width = progress + '%';
    if (text) text.textContent = `${index}/${_activeSim.questions.length}`;
  }

  function answer(qIndex, optIndex) {
    if (!_activeSim) return;
    const q = _activeSim.questions[qIndex];
    const correct = q.correct === optIndex;
    _answerQuestion(correct, _activeSim.id);

    const scoreEl = document.getElementById('simScoreDisplay');
    if (scoreEl) scoreEl.textContent = _session.score + ' pts';

    document.querySelectorAll('.sim-option').forEach(btn => {
      btn.disabled = true;
      btn.classList.add('sim-option-disabled');
      const idx = parseInt(btn.dataset.idx);
      if (idx === q.correct) btn.classList.add('sim-option-correct');
      else if (idx === optIndex && !correct) btn.classList.add('sim-option-wrong');
    });

    const expEl = document.getElementById('simExplanation');
    if (expEl) {
      expEl.style.display = 'block';
      expEl.innerHTML = `
        <div class="sim-exp-icon">${correct ? '✅' : '❌'}</div>
        <div class="sim-exp-text">${q.explanation}</div>
        ${q.tips ? `<div class="sim-tips"><strong>Dicas:</strong><ul>${q.tips.map(t => `<li>${t}</li>`).join('')}</ul></div>` : ''}
      `;
    }

    const navEl = document.getElementById('simNav');
    if (navEl) navEl.style.display = 'flex';
  }

  function nextQuestion(nextIndex) {
    _renderQuestion(nextIndex);
  }

  function _showResults() {
    const session = _finishSession(_activeSim.id);
    const container = document.getElementById('simQuestionContainer');
    if (!container) return;
    const accuracy = session.totalAnswered > 0 ? Math.round((session.totalCorrect / session.totalAnswered) * 100) : 0;
    const elapsed = Math.round((Date.now() - session.startTime) / 1000);
    const mins = Math.floor(elapsed / 60);
    const secs = elapsed % 60;
    const grade = accuracy >= 90 ? 'S' : accuracy >= 75 ? 'A' : accuracy >= 60 ? 'B' : accuracy >= 40 ? 'C' : 'D';
    const gradeColor = { S: '#FFD700', A: '#4ade80', B: '#00B4D8', C: '#FF6B35', D: '#ef4444' }[grade] || '#fff';

    container.innerHTML = `
      <div class="sim-results">
        <div class="sim-results-grade" style="color:${gradeColor}">${grade}</div>
        <h3 class="sim-results-title">Simulador Concluído!</h3>
        <div class="sim-results-grid">
          <div class="sim-res-stat"><span class="sim-res-val">${session.score}</span><span class="sim-res-lbl">Pontos</span></div>
          <div class="sim-res-stat"><span class="sim-res-val">${accuracy}%</span><span class="sim-res-lbl">Precisão</span></div>
          <div class="sim-res-stat"><span class="sim-res-val">${session.totalCorrect}/${session.totalAnswered}</span><span class="sim-res-lbl">Acertos</span></div>
          <div class="sim-res-stat"><span class="sim-res-val">${mins}:${secs.toString().padStart(2, '0')}</span><span class="sim-res-lbl">Tempo</span></div>
          <div class="sim-res-stat"><span class="sim-res-val">${session.maxStreak}</span><span class="sim-res-lbl">Melhor Sequência</span></div>
        </div>
        <div class="sim-results-achievements" id="simResultsAchievements"></div>
        <div class="sim-results-actions">
          <button class="sim-btn-retry" onclick="SIMULATORS.start('${_activeSim.id}')">🔄 Tentar Novamente</button>
          <button class="sim-btn-back" onclick="SIMULATORS.backToList()">← Outros Simuladores</button>
        </div>
      </div>
    `;

    const fill = document.getElementById('simProgressFill');
    if (fill) fill.style.width = '100%';
  }

  function backToList() {
    _activeSim = null;
    const grid = document.getElementById('simGrid');
    const hero = document.querySelector('.sim-hero');
    const active = document.getElementById('simActive');
    if (grid) grid.style.display = 'grid';
    if (hero) hero.style.display = 'block';
    if (active) active.style.display = 'none';
    _renderHeroStats();
    _renderSimCards();
  }

  /* ════════════════════════════════════════════
     ACHIEVEMENTS PAGE
  ════════════════════════════════════════════ */

  function renderAchievements() {
    const unlocked = _loadAchievements();
    return ACHIEVEMENTS.map(a => ({
      ...a,
      unlocked: unlocked.includes(a.id),
    }));
  }

  /* ════════════════════════════════════════════
     LEADERBOARD
  ════════════════════════════════════════════ */

  function getLeaderboard() {
    try { return JSON.parse(localStorage.getItem(LEADERBOARD_KEY) || '[]'); } catch { return []; }
  }

  function getSimulatorList() {
    return SIMULATORS.map(s => ({
      id: s.id,
      name: s.name,
      icon: s.icon,
      difficulty: s.difficulty,
      category: s.category,
      questionCount: s.questions.length,
    }));
  }

  function getSimHistory(simId) {
    try {
      const hist = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
      return simId ? hist.filter(h => h.simulatorId === simId) : hist;
    } catch { return []; }
  }

  /* ════════════════════════════════════════════
     INIT
  ════════════════════════════════════════════ */

  function init() {
    renderSimulatorPage();
    console.info('[SIMULATORS] v1.0 initialized ✓');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  return {
    init, start, answer, nextQuestion, backToList,
    renderSimulatorPage, renderAchievements, getLeaderboard,
    getSimulatorList, getSimHistory,
  };

})();
