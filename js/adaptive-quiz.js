/* ================================================
   ADAS PRO — Adaptive Quiz System (Phase 2.2)
   ================================================
   Versão:   1.0.0  build 20260825
   Copyright: © 2024-2026 AutoTech Service
   ================================================ */

const ADAPTIVE_QUIZ = (function () {

  const STORE_KEY = 'adaspro_quiz_data';
  const REVIEW_KEY = 'adaspro_quiz_review';

  /* ════════════════════════════════════════════
     QUESTION BANK
  ════════════════════════════════════════════ */
  const DIFFICULTY = { beginner: 1, intermediate: 2, advanced: 3 };
  const LEVEL_LABELS = { 1: 'beginner', 2: 'intermediate', 3: 'advanced' };
  const LEVEL_NAMES = { 1: 'Iniciante', 2: 'Intermediário', 3: 'Avançado' };
  const LEVEL_COLORS = { 1: '#22c55e', 2: '#f59e0b', 3: '#ef4444' };

  const QUESTION_BANK = {
    honda: {
      beginner: [
        { id: 'h-b-01', text: 'Qual é a sigla do sistema de manutenção de faixa da Honda?', options: ['LKAS', 'ACC', 'BSM', 'CMBS'], correct: 0, explanation: 'LKAS = Lane Keeping Assist System. É o sistema que ajuda o motorista a manter o veículo dentro da faixa de trânsito.' },
        { id: 'h-b-02', text: 'Quantos targets são necessários para calibração AVM Honda?', options: ['2', '3', '4', '5'], correct: 2, explanation: 'São 4 targets: Frontal, Traseiro, Lateral Esquerdo e Lateral Direito.' },
        { id: 'h-b-03', text: 'Qual ferramenta de diagnóstico é obrigatória para Honda?', options: ['Techstream', 'HDS', 'ODIS', 'GDS'], correct: 1, explanation: 'HDS (Honda Diagnostic System) é a ferramenta oficial de diagnóstico da Honda.' },
        { id: 'h-b-04', text: 'O target Tipo 1 do LKAS Honda é impresso em quantas folhas A4?', options: ['2', '3', '4', '6'], correct: 2, explanation: 'O target Tipo 1 do LKAS Honda requer impressão em 4 folhas A4.' },
        { id: 'h-b-05', text: 'A distância de calibração LKAS Honda é medida de qual componente?', options: ['Para-choque', 'Câmera frontal', 'Radar frontal', 'Capô'], correct: 1, explanation: 'A distância é medida a partir da câmera frontal montada no para-brisa.' },
        { id: 'h-b-06', text: 'Qual sistema Honda combina ACC e CMBS?', options: ['Honda Sensing', 'Honda Connect', 'Honda Link', 'Honda Watch'], correct: 0, explanation: 'Honda Sensing é o conjunto de tecnologias de assistência ao motorista que inclui ACC e CMBS.' },
        { id: 'h-b-07', text: 'Qual é o tamanho do target AVM Honda em folhas A4?', options: ['18×14 quadrados', '20×15 quadrados', '22×16 quadrados', '15×12 quadrados'], correct: 0, explanation: 'O padrão xadrez do target AVM Honda tem 18×14 quadrados.' },
        { id: 'h-b-08', text: 'A calibração do radar frontal Honda pode ser dinâmica?', options: ['Sempre', 'Nunca', 'Depende do modelo', 'Apenas em pista'], correct: 2, explanation: 'Depende do modelo e geração do Honda Sensing. Alguns modelos permitem calibração dinâmica.' },
        { id: 'h-b-09', text: 'Quantas variantes regionais o LKAS Honda cobre?', options: ['50', '65', '89', '120'], correct: 2, explanation: 'O guia LKAS Honda cobre 89 variantes regionais diferentes.' },
        { id: 'h-b-10', text: 'O target Tipo 2 do LKAS Honda é plotado em qual tamanho?', options: ['60×90cm', '80×120cm', '100×150cm', 'A3'], correct: 1, explanation: 'O target Tipo 2 do LKAS Honda é uma plotagem única de 80×120cm.' },
      ],
      intermediate: [
        { id: 'h-i-01', text: 'Qual código de falha indica problema no ACC radar Honda?', options: ['C1A50', 'B261A', 'P0500', 'U0100'], correct: 0, explanation: 'C1A50 é o código específico de falha do ACC radar Honda que requer recalibração.' },
        { id: 'h-i-02', text: 'O target AVM Honda requer superfície com tolerância de nivelamento de?', options: ['±5mm', '±2mm', '±1mm', '±10mm'], correct: 1, explanation: 'A superfície deve ser nivelada com tolerância de ±2mm para calibração correta.' },
        { id: 'h-i-03', text: 'Qual geração do Honda Sensing usa radar 77GHz?', options: ['1ª geração', '2ª geração', '3ª geração', 'Todas'], correct: 2, explanation: 'A 3ª geração do Honda Sensing utiliza radar de 77GHz para detecção de长距离.' },
        { id: 'h-i-04', text: 'Na calibração AVM Honda, qual é a distância mínima lateral entre targets?', options: ['1.0m', '1.5m', '2.0m', '2.5m'], correct: 2, explanation: 'A distância mínima lateral entre os targets laterais é de 2.0m.' },
        { id: 'h-i-05', text: 'O CMBS Honda detecta pedestres a partir de qual velocidade?', options: ['5 km/h', '10 km/h', '15 km/h', '30 km/h'], correct: 1, explanation: 'O CMBS Honda detecta pedestres a partir de 10 km/h de velocidade.' },
        { id: 'h-i-06', text: 'Qual a altura do centro ótico da câmera Honda para calibração LKAS?', options: ['800mm', '1000mm', '1200mm', 'Varia por modelo'], correct: 3, explanation: 'A altura do centro ótico varia conforme o modelo do veículo Honda.' },
        { id: 'h-i-07', text: 'O ACC Honda funciona em faixas de velocidade de?', options: ['0-80 km/h', '0-100 km/h', '30-180 km/h', '0-180 km/h'], correct: 3, explanation: 'O ACC Honda opera de 0 a 180 km/h com o ACC de velocidade adaptativa.' },
        { id: 'h-i-08', text: 'Qual é o passo OBRIGATÓRIO após calibração AVM Honda?', options: ['Test drive', 'Verificação via HDS', 'Reset do ECU', 'Reprogramação'], correct: 1, explanation: 'Sempre verificar a calibração via HDS após o procedimento para confirmar sucesso.' },
        { id: 'h-i-09', text: 'Quantos radares o Honda Sensing 3ª geração utiliza?', options: ['1', '2', '3', '4'], correct: 1, explanation: 'O Honda Sensing 3ª geração utiliza 2 radares: frontal e lateral traseiro.' },
        { id: 'h-i-10', text: 'O target frontal AVM Honda deve ser posicionado a qual distância da câmera?', options: ['0.5m', '1.0m', '1.5m', '2.0m'], correct: 1, explanation: 'O target frontal deve ser posicionado a 1.0m da câmera frontal.' },
      ],
      advanced: [
        { id: 'h-a-01', text: 'Qual é a tolerância angular máxima aceitável na calibração LKAS Honda?', options: ['±0.1°', '±0.3°', '±0.5°', '±1.0°'], correct: 1, explanation: 'A tolerância angular máxima é de ±0.3° para calibração LKAS Honda dentro das especificações.' },
        { id: 'h-a-02', text: 'No diagnóstico do radar Honda, qual valor de S/N ratio indica substituição necessária?', options: ['< 10 dB', '< 20 dB', '< 30 dB', '< 5 dB'], correct: 1, explanation: 'S/N ratio abaixo de 20dB indica degradação significativa do sinal, requerendo substituição.' },
        { id: 'h-a-03', text: 'Qual protocolo de comunicação o HDS utiliza para calibração avançada?', options: ['CAN 2.0', 'DoIP', 'KLINE', 'LIN'], correct: 1, explanation: 'DoIP (Diagnostics over Internet Protocol) é usado para calibração avançada nos modelos mais recentes.' },
        { id: 'h-a-04', text: 'O offset de calibração do radar ACC Honda é medido em qual unidade?', options: ['mm', 'Pixels', 'Graus', 'ms'], correct: 0, explanation: 'O offset é medido em milímetros (mm) em relação ao eixo central do veículo.' },
        { id: 'h-a-05', text: 'Qual a frequência do radar frontal Honda de 3ª geração?', options: ['24 GHz', '60 GHz', '77 GHz', '94 GHz'], correct: 2, explanation: 'O radar frontal Honda de 3ª geração opera em 77GHz para maior resolução.' },
        { id: 'h-a-06', text: 'Na calibração dinâmica Honda, qual velocidade mínima é exigida?', options: ['20 km/h', '30 km/h', '40 km/h', '60 km/h'], correct: 1, explanation: 'A calibração dinâmica Honda exige velocidade mínima de 30 km/h em pista adequada.' },
        { id: 'h-a-07', text: 'O parâmetro "vehicle width" no HDS deve ser preenchido com?', options: ['Largura com espelhos', 'Largura sem espelhos', 'Distância entre-eixos', 'Altura do veículo'], correct: 1, explanation: 'Vehicle width deve ser a largura do veículo SEM incluir espelhos retrovisores.' },
        { id: 'h-a-08', text: 'Qual é o tempo máximo aceitável para resposta do CMBS Honda?', options: ['100ms', '150ms', '200ms', '300ms'], correct: 2, explanation: 'O tempo máximo de resposta do CMBS é de 200ms para atuação eficaz em emergência.' },
        { id: 'h-a-09', text: 'O error code C1A50 no Honda é classificado como?', options: ['Informacional', 'Warning', 'Critical', 'Pending'], correct: 1, explanation: 'C1A50 é classificado como Warning — indica necessidade de recalibração, não falha catastrófica.' },
        { id: 'h-a-10', text: 'Qual a precisão de medição exigida para o target LKAS Honda Tipo 2?', options: ['±1mm', '±0.5mm', '±0.3mm', '±2mm'], correct: 1, explanation: 'O target Tipo 2 exige precisão de ±0.5mm na impressão para garantir calibração correta.' },
      ],
    },
    toyota: {
      beginner: [
        { id: 't-b-01', text: 'Qual é o nome do sistema de manutenção de faixa da Toyota?', options: ['LKA', 'LDA', 'ACC', 'PCS'], correct: 1, explanation: 'LDA = Lane Departure Alert. É o sistema Toyota para alerta de saída de faixa.' },
        { id: 't-b-02', text: 'Quantos targets o AVM Toyota necessita?', options: ['2', '3', '4', '6'], correct: 2, explanation: 'O AVM Toyota necessita de 4 targets: Frontal, Traseiro, Lateral E e Lateral D.' },
        { id: 't-b-03', text: 'Qual ferramenta de diagnóstico Toyota é obrigatória?', options: ['HDS', 'GDS', 'Techstream', 'IDS'], correct: 2, explanation: 'Techstream é a ferramenta oficial de diagnóstico da Toyota/Lexus.' },
        { id: 't-b-04', text: 'O target 120° Toyota é impresso em quantas folhas A4?', options: ['1', '2', '3', '4'], correct: 2, explanation: 'O target 120° Toyota é impresso em 3 folhas A4 montadas em mosaico.' },
        { id: 't-b-05', text: 'Qual é a altura do centro da câmera para calibração Toyota?', options: ['800mm', '1000mm', '1200mm', '1500mm'], correct: 2, explanation: 'A altura padrão do centro da câmera Toyota é de 1.200mm do solo.' },
        { id: 't-b-06', text: 'O PCS Toyota é o acrônimo de?', options: ['Pre-Collision System', 'Parking Control System', 'Power Control System', 'Post-Collision System'], correct: 0, explanation: 'PCS = Pre-Collision System — sistema de frenagem automática de emergência Toyota.' },
        { id: 't-b-07', text: 'Quantos modelos o guia Toyota LDW cobre?', options: ['50+', '100+', '142', '200+'], correct: 2, explanation: 'O guia Toyota LDW/LDA cobre 142 modelos suportados de 2015 a 2024.' },
        { id: 't-b-08', text: 'Qual código deve ser verificado antes da calibração Toyota LDA?', options: ['C1A50', 'C1A60', 'C1A71', 'B1442'], correct: 0, explanation: 'O código C1A50 deve ser verificado e resolvido antes de iniciar a calibração Toyota.' },
        { id: 't-b-09', text: 'O target AVM Toyota é impresso em papel comum A4?', options: ['Sim, sempre', 'Não, precisa de plotagem', 'Depende do modelo', 'Apenas para frente'], correct: 0, explanation: 'O target AVM Toyota pode ser impresso em papel A4 comum — sem necessidade de plotagem especial.' },
        { id: 't-b-10', text: 'Qual a distância frontal para posicionamento do target Toyota LDA?', options: ['0.5m', '1.0m', '1.5m', '2.0m'], correct: 1, explanation: 'O target Toyota LDA deve ser posicionado a 1.0m da parte frontal do capô.' },
      ],
      intermediate: [
        { id: 't-i-01', text: 'O target 180° Toyota é usado para veículos a partir de qual ano?', options: ['2015', '2017', '2019', '2021'], correct: 2, explanation: 'O target 180° é específico para veículos Toyota/Lexus de 2019 em diante.' },
        { id: 't-i-02', text: 'Qual é a dimensão do target 180° Toyota plotado?', options: ['50×70cm', '60×90cm', '70×100cm', '80×120cm'], correct: 1, explanation: 'O target 180° Toyota é plotado em tamanho 60×90cm.' },
        { id: 't-i-03', text: 'O Techstream mínimo para AVM Toyota é qual versão?', options: ['v12', 'v14', 'v15', 'v18'], correct: 2, explanation: 'A versão mínima do Techstream para procedimento AVM Toyota é a v15.' },
        { id: 't-i-04', text: 'O AVM Toyota exige superfície nivelada com tolerância de?', options: ['±5mm', '±3mm', '±2mm', '±1mm'], correct: 2, explanation: 'A superfície deve ser plana e nivelada com tolerância de ±2mm.' },
        { id: 't-i-05', text: 'Qual sistema Toyota combina câmera estéreo com radar?', options: ['Toyota Safety Sense 1.0', 'Toyota Safety Sense 2.0', 'Toyota Safety Sense 3.0', 'Todas as anteriores'], correct: 2, explanation: 'O Toyota Safety Sense 3.0 combina câmera estéreo com radar de 360° para cobertura completa.' },
        { id: 't-i-06', text: 'Na calibração LDA 180°, qual ajuste é feito além do horizontal?', options: ['Vertical', 'Profundidade', 'Rotação', 'Todos'], correct: 3, explanation: 'O procedimento 180° inclui calibração vertical, horizontal e profundidade.' },
        { id: 't-i-07', text: 'Quantos pontos tem o checklist pós-calibração AVM Toyota?', options: ['8', '10', '12', '15'], correct: 2, explanation: 'O checklist pós-calibração AVM Toyota contém 12 pontos de verificação.' },
        { id: 't-i-08', text: 'O BSM Toyota opera em quais faixas de velocidade?', options: ['0-30 km/h', '10-80 km/h', '25-160 km/h', '0-200 km/h'], correct: 2, explanation: 'O BSM (Blind Spot Monitor) Toyota opera de 25 a 160 km/h.' },
        { id: 't-i-09', text: 'Qual é a resolução da câmera frontal Toyota Safety Sense 2.0?', options: ['VGA', 'HD', 'Full HD', '2K'], correct: 1, explanation: 'A câmera frontal Toyota TSS 2.0 possui resolução HD (1280×720).' },
        { id: 't-i-10', text: 'O LDA Toyota提供 alerta visual E?', options: ['Apenas visual', 'Visual e sonoro', 'Visual e tátil', 'Sonoro e tátil'], correct: 1, explanation: 'O LDA Toyota fornece alerta visual no display e alerta sonoro (bip) ao motorista.' },
      ],
      advanced: [
        { id: 't-a-01', text: 'Qual a precisão angular da câmera Toyota Safety Sense 2.0?', options: ['±0.1°', '±0.2°', '±0.5°', '±1.0°'], correct: 1, explanation: 'A precisão angular da câmera TSS 2.0 é de ±0.2° para detecção de faixa.' },
        { id: 't-a-02', text: 'O radar frontal Toyota opera em qual frequência?', options: ['24 GHz', '60 GHz', '77 GHz', '94 GHz'], correct: 2, explanation: 'O radar frontal Toyota opera em 77GHz para detecção de长距离 e alta resolução.' },
        { id: 't-a-03', text: 'No Techstream, o DTC C1A60 indica?', options: ['Falha de calibração LDA', 'Falha de comunicação', 'Falha do radar', 'Falha da câmera'], correct: 0, explanation: 'DTC C1A60 indica falha na calibração do sistema LDA — requer recalibração.' },
        { id: 't-a-04', text: 'Qual protocolo o Techstream usa para calibração avançada Toyota?', options: ['CAN', 'DoIP', 'MOST', 'FlexRay'], correct: 1, explanation: 'DoIP é usado para calibração avançada nos modelos Toyota mais recentes.' },
        { id: 't-a-05', text: 'O algoritmo de fusão de sensores Toyota combina quantos inputs?', options: ['2', '3', '4', '5'], correct: 2, explanation: 'O algoritmo combina 4 inputs: câmera, radar frontal, radar traseiro e sensores de estabilidade.' },
        { id: 't-a-06', text: 'Qual o campo de visão (FOV) da câmera frontal TSS 2.0?', options: ['80°', '100°', '120°', '150°'], correct: 1, explanation: 'A câmera frontal Toyota TSS 2.0 possui FOV de 100° horizontal.' },
        { id: 't-a-07', text: 'Na calibração dinâmica Toyota LDA, qual a velocidade mínima mantida?', options: ['40 km/h', '50 km/h', '60 km/h', '80 km/h'], correct: 2, explanation: 'A calibração dinâmica Toyota LDA exige velocidade mínima de 60 km/h mantida.' },
        { id: 't-a-08', text: 'O parâmetro "camera height" no Techstream deve ser medido de?', options: ['Solo ao centro da lente', 'Solo ao topo do para-brisa', 'Capô ao centro da lente', 'Chassi ao centro da lente'], correct: 0, explanation: 'Camera height é medido do solo até o centro da lente da câmera frontal.' },
        { id: 't-a-09', text: 'Qual a taxa de atualização do radar Toyota Safety Sense?', options: ['10 Hz', '20 Hz', '30 Hz', '50 Hz'], correct: 1, explanation: 'O radar Toyota TSS atualiza a 20Hz (20 vezes por segundo) para rastreamento preciso.' },
        { id: 't-a-10', text: 'O sistema Road Sign Assist Toyota detecta placas a qual distância máxima?', options: ['30m', '50m', '80m', '120m'], correct: 2, explanation: 'O RSA Toyota detecta placas de trânsito a até 80 metros de distância.' },
      ],
    },
    nissan: {
      beginner: [
        { id: 'n-b-01', text: 'Qual é o nome do sistema de manutenção de faixa Nissan?', options: ['LKA', 'LDA', 'ProPilot', 'Lane Keep'], correct: 0, explanation: 'LKA = Lane Keep Assist — sistema de manutenção de faixa Nissan/Infiniti.' },
        { id: 'n-b-02', text: 'Quantos modelos o guia Nissan LKA cobre?', options: ['150+', '250+', '348+', '500+'], correct: 2, explanation: 'O guia Nissan LKA cobre mais de 348 modelos e variantes de 2013 a 2024.' },
        { id: 'n-b-03', text: 'Qual é o tamanho do target Nissan LKA Tipo 1?', options: ['A4', '58×90cm', '60×90cm', '80×120cm'], correct: 1, explanation: 'O target Nissan LKA Tipo 1 é plotado em tamanho 58×90cm de alta resolução.' },
        { id: 'n-b-04', text: 'O ProPilot Nissan combina quais sensores?', options: ['Câmera + Radar', 'Câmera + LIDAR', 'Radar + Ultrassom', 'LIDAR + Ultrassom'], correct: 0, explanation: 'O ProPilot combina câmera frontal + radar frontal para controle adaptativo.' },
        { id: 'n-b-05', text: 'Qual ferramenta Nissan é necessária para calibração?', options: ['HDS', 'Techstream', 'Consult-III Plus', 'ODIS'], correct: 2, explanation: 'Consult-III Plus é a ferramenta oficial de diagnóstico da Nissan/Infiniti.' },
        { id: 'n-b-06', text: 'As margens de tolerância do target Nissan são de?', options: ['±1.0°', '±0.5°', '±0.3°', '±0.1°'], correct: 1, explanation: 'As margens de tolerância para calibração Nissan são de ±0.5°.' },
        { id: 'n-b-07', text: 'O ProPilot 2.0 Nissan é capaz de?', options: ['Apenas车道保持', 'Controle de velocidade', 'Condução semi-autônoma', 'Estacionamento automático'], correct: 2, explanation: 'O ProPilot 2.0 permite condução semi-autônoma em rodovias com tráfego.' },
        { id: 'n-b-08', text: 'Qual região NÃO é coberta pelo guia Nissan LKA?', options: ['JP', 'US', 'EU', 'AU'], correct: 3, explanation: 'O guia cobre JP (Japão), US (EUA), EU (Europa) e BR (Brasil), mas não AU (Austrália).' },
        { id: 'n-b-09', text: 'O radar Hitachi Nissan opera em qual frequência?', options: ['24 GHz', '60 GHz', '77 GHz', '94 GHz'], correct: 2, explanation: 'O radar Hitachi para Nissan/Infiniti opera em 77GHz.' },
        { id: 'n-b-10', text: 'Quantas folhas A4 compõem o target mosaic do ProPilot?', options: ['4', '5', '7', '9'], correct: 2, explanation: 'O target mosaic do ProPilot Nissan é composto por 7 folhas A4.' },
      ],
      intermediate: [
        { id: 'n-i-01', text: 'O código de falha B261A no Nissan indica?', options: ['Falha de radar', 'Falha de calibração', 'Falha de comunicação', 'Falha de alimentação'], correct: 1, explanation: 'B261A indica necessidade de recalibração do radar Nissan/Infiniti.' },
        { id: 'n-i-02', text: 'Qual a distância de posicionamento do target radar Nissan?', options: ['1.5m', '2.0m', '2.5m', '3.5m'], correct: 3, explanation: 'O target radar Nissan deve ser posicionado a 3.5m do para-choque frontal.' },
        { id: 'n-i-03', text: 'O ProPilot Nissan tem quantas gerações?', options: ['1', '2', '3', '4'], correct: 1, explanation: 'O ProPilot tem 2 gerações: ProPilot 1.0 e ProPilot 2.0.' },
        { id: 'n-i-04', text: 'Qual velocidade de verificação é recomendada pós-calibração ProPilot?', options: ['40-60 km/h', '60-80 km/h', '60-100 km/h', '80-120 km/h'], correct: 2, explanation: 'A verificação pós-calibração deve ser feita entre 60-100 km/h em rodovia adequada.' },
        { id: 'n-i-05', text: 'O radar Hitachi Nissan tem quantas variantes?', options: ['1', '2', '3', '4'], correct: 1, explanation: 'Existem 2 variantes do radar Hitachi Nissan: frontal e lateral.' },
        { id: 'n-i-06', text: 'Qual a distância do target para calibração AEB Nissan?', options: ['1.0m', '2.0m', '3.5m', '5.0m'], correct: 2, explanation: 'O target para calibração AEB Nissan deve ser posicionado a 3.5m do veículo.' },
        { id: 'n-i-07', text: 'O sistema Intelligent Emergency Brake Nissan detecta?', options: ['Apenas veículos', 'Veículos e pedestres', 'Veículos, pedestres e ciclistas', 'Todos os obstáculos'], correct: 2, explanation: 'O IEB Nissan detecta veículos, pedestres e ciclistas em seu campo de visão.' },
        { id: 'n-i-08', text: 'Qual a resolução mínima do target Nissan LKA para impressão?', options: ['150 dpi', '200 dpi', '300 dpi', '600 dpi'], correct: 2, explanation: 'A resolução mínima para impressão do target Nissan LKA é de 300 dpi.' },
        { id: 'n-i-09', text: 'O ProPilot Nissan opera em velocidades de?', options: ['0-60 km/h', '0-100 km/h', '30-130 km/h', '30-160 km/h'], correct: 2, explanation: 'O ProPilot 1.0 opera de 30 a 130 km/h em rodovias.' },
        { id: 'n-i-10', text: 'Qual oCampo de visão (FOV) da câmera ProPilot?', options: ['80°', '100°', '120°', '150°'], correct: 1, explanation: 'A câmera ProPilot Nissan possui FOV de 100° para cobertura adequada da via.' },
      ],
      advanced: [
        { id: 'n-a-01', text: 'Qual protocolo o Consult-III Plus usa para comunicação avançada?', options: ['CAN 2.0B', 'DoIP', 'MOST', 'Ethernet'], correct: 1, explanation: 'DoIP (Diagnostics over IP) é utilizado para comunicação avançada no Consult-III Plus.' },
        { id: 'n-a-02', text: 'O radar Nissan 77GHz tem alcance máximo de detecção de?', options: ['100m', '150m', '200m', '250m'], correct: 2, explanation: 'O radar frontal Nissan 77GHz tem alcance máximo de detecção de 200 metros.' },
        { id: 'n-a-03', text: 'Qual a taxa de atualização do radar Nissan ProPilot 2.0?', options: ['10 Hz', '20 Hz', '30 Hz', '50 Hz'], correct: 1, explanation: 'O radar ProPilot 2.0 Nissan atualiza a 20Hz para rastreamento contínuo.' },
        { id: 'n-a-04', text: 'Na calibração avançada Nissan, qual parâmetro é calibrado via software?', options: ['Altura do target', 'Offset do radar', 'Pressão dos pneus', 'Temperatura ambiente'], correct: 1, explanation: 'O offset do radar é calibrado via software no Consult-III Plus após posicionamento físico.' },
        { id: 'n-a-05', text: 'O campo de visão lateral do radar Nissan BSM é de?', options: ['30°', '60°', '90°', '120°'], correct: 1, explanation: 'O radar BSM Nissan lateral tem campo de visão de 60° para cobertura do ponto cego.' },
        { id: 'n-a-06', text: 'Qual a tolerância de alinhamento angular do radar Nissan?', options: ['±0.5°', '±1.0°', '±1.5°', '±2.0°'], correct: 0, explanation: 'A tolerância de alinhamento angular do radar Nissan é de ±0.5° para funcionamento correto.' },
        { id: 'n-a-07', text: 'O parâmetro "radar height" Nissan é medido de?', options: ['Solo ao centro do radar', 'Chassi ao centro', 'Para-choque ao centro', 'Capô ao centro'], correct: 0, explanation: 'Radar height é medido do solo até o centro do módulo de radar.' },
        { id: 'n-a-08', text: 'Qual a frequência de atualização da tela do Consult-III durante calibração?', options: ['5 Hz', '10 Hz', '15 Hz', '20 Hz'], correct: 1, explanation: 'A tela atualiza a 10Hz durante procedimentos de calibração para feedback em tempo real.' },
        { id: 'n-a-09', text: 'O ProPilot 2.0 Nissan suporta hands-free em qual contexto?', options: ['Sempre', 'Apenas em rodovias', 'Apenas em trânsito lento', 'Nunca'], correct: 1, explanation: 'O ProPilot 2.0 permite hands-free apenas em rodovias com barreira central.' },
        { id: 'n-a-10', text: 'Qual a potência de transmissão do radar Nissan frontal?', options: ['10 dBm', '20 dBm', '30 dBm', '40 dBm'], correct: 1, explanation: 'O radar frontal Nissan transmite com potência de aproximadamente 20 dBm (100 mW).' },
      ],
    },
  };

  /* ════════════════════════════════════════════
     ESTADO INTERNO
  ════════════════════════════════════════════ */
  let _quizState = {};
  let _userPerformance = {};
  let _reviewQueue = {};
  let _learningPaths = {};

  /* ════════════════════════════════════════════
     PERSISTENCE
  ════════════════════════════════════════════ */
  function _save() {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify({
        quizState: _quizState,
        performance: _userPerformance,
        paths: _learningPaths,
      }));
      localStorage.setItem(REVIEW_KEY, JSON.stringify(_reviewQueue));
    } catch (e) { console.warn('[ADAPTIVE_QUIZ] save:', e.message); }
  }

  function _load() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (raw) {
        const d = JSON.parse(raw);
        _quizState = d.quizState || {};
        _userPerformance = d.performance || {};
        _learningPaths = d.paths || {};
      }
    } catch (e) { _quizState = {}; _userPerformance = {}; _learningPaths = {}; }
    try {
      const raw = localStorage.getItem(REVIEW_KEY);
      if (raw) _reviewQueue = JSON.parse(raw);
    } catch (e) { _reviewQueue = {}; }
  }

  /* ════════════════════════════════════════════
     ADAPTIVE DIFFICULTY ENGINE
  ════════════════════════════════════════════ */
  function _getAdaptiveDifficulty(userId, category) {
    const perf = _userPerformance[userId] && _userPerformance[userId][category];
    if (!perf) return 'beginner';

    const recent = perf.recent || [];
    const last5 = recent.slice(-5);
    if (last5.length < 3) return 'beginner';

    const correctRate = last5.filter(r => r.correct).length / last5.length;
    if (correctRate >= 0.8) return 'advanced';
    if (correctRate >= 0.5) return 'intermediate';
    return 'beginner';
  }

  function _calculateLevel(score) {
    if (score >= 80) return 3;
    if (score >= 50) return 2;
    return 1;
  }

  function _pickQuestions(category, difficulty, count) {
    const bank = QUESTION_BANK[category] && QUESTION_BANK[category][difficulty];
    if (!bank || !bank.length) return [];
    const shuffled = [...bank].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, Math.min(count || 10, shuffled.length));
  }

  /* ════════════════════════════════════════════
     DIAGNOSTIC QUIZ
  ════════════════════════════════════════════ */
  function startDiagnostic(userId, category) {
    if (!userId || !category) return { ok: false, msg: 'Parâmetros obrigatórios.' };

    const questions = _pickQuestions(category, 'beginner', 10);
    if (!questions.length) return { ok: false, msg: 'Sem perguntas disponíveis para esta categoria.' };

    const quizId = 'diag_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 6);
    _quizState[quizId] = {
      id: quizId,
      userId,
      category,
      type: 'diagnostic',
      questions,
      answers: {},
      currentIndex: 0,
      startTime: Date.now(),
      paused: false,
      pauseStart: null,
      totalPausedMs: 0,
      status: 'active',
    };

    _save();
    return { ok: true, quiz: _quizState[quizId] };
  }

  function startQuiz(userId, category, difficulty) {
    if (!userId || !category) return { ok: false, msg: 'Parâmetros obrigatórios.' };

    const diff = difficulty || _getAdaptiveDifficulty(userId, category);
    const questions = _pickQuestions(category, diff, 10);
    if (!questions.length) return { ok: false, msg: 'Sem perguntas disponíveis.' };

    const quizId = 'quiz_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 6);
    _quizState[quizId] = {
      id: quizId,
      userId,
      category,
      type: 'adaptive',
      difficulty: diff,
      questions,
      answers: {},
      currentIndex: 0,
      startTime: Date.now(),
      paused: false,
      pauseStart: null,
      totalPausedMs: 0,
      status: 'active',
    };

    _save();
    return { ok: true, quiz: _quizState[quizId] };
  }

  function submitAnswer(quizId, questionId, answerIndex) {
    const quiz = _quizState[quizId];
    if (!quiz || quiz.status !== 'active') return { ok: false, msg: 'Quiz não encontrado ou finalizado.' };

    const q = quiz.questions.find(x => x.id === questionId);
    if (!q) return { ok: false, msg: 'Pergunta não encontrada.' };

    const correct = q.correct === answerIndex;
    quiz.answers[questionId] = { answer: answerIndex, correct, time: Date.now() };
    quiz.currentIndex++;

    if (!quiz.userId || !quiz.category) return { ok: false, msg: 'Estado do quiz corrompido.' };

    if (!_userPerformance[quiz.userId]) _userPerformance[quiz.userId] = {};
    if (!_userPerformance[quiz.userId][quiz.category]) _userPerformance[quiz.userId][quiz.category] = { correct: 0, total: 0, recent: [], byDifficulty: {} };

    const perf = _userPerformance[quiz.userId][quiz.category];
    perf.total++;
    if (correct) perf.correct++;
    perf.recent.push({ questionId, correct, difficulty: quiz.difficulty || 'beginner', time: Date.now() });
    if (perf.recent.length > 50) perf.recent = perf.recent.slice(-50);

    const dKey = quiz.difficulty || 'beginner';
    if (!perf.byDifficulty[dKey]) perf.byDifficulty[dKey] = { correct: 0, total: 0 };
    perf.byDifficulty[dKey].total++;
    if (correct) perf.byDifficulty[dKey].correct++;

    if (!correct) _addToReview(quiz.userId, quiz.category, questionId);

    _save();
    return { ok: true, correct, explanation: q.explanation, nextIndex: quiz.currentIndex, hasMore: quiz.currentIndex < quiz.questions.length };
  }

  function _addToReview(userId, category, questionId) {
    if (!_reviewQueue[userId]) _reviewQueue[userId] = [];
    const exists = _reviewQueue[userId].find(r => r.questionId === questionId);
    if (!exists) {
      _reviewQueue[userId].push({
        questionId,
        category,
        addedAt: Date.now(),
        nextReview: Date.now() + 24 * 60 * 60 * 1000,
        interval: 1,
        repetitions: 0,
      });
    }
  }

  function pauseQuiz(quizId) {
    const quiz = _quizState[quizId];
    if (!quiz || quiz.status !== 'active') return { ok: false };
    quiz.paused = true;
    quiz.pauseStart = Date.now();
    _save();
    return { ok: true };
  }

  function resumeQuiz(quizId) {
    const quiz = _quizState[quizId];
    if (!quiz || !quiz.paused) return { ok: false };
    if (quiz.pauseStart) quiz.totalPausedMs += Date.now() - quiz.pauseStart;
    quiz.paused = false;
    quiz.pauseStart = null;
    _save();
    return { ok: true };
  }

  function getQuizResults(quizId) {
    const quiz = _quizState[quizId];
    if (!quiz) return null;

    const total = quiz.questions.length;
    const answered = Object.keys(quiz.answers).length;
    const correctCount = Object.values(quiz.answers).filter(a => a.correct).length;
    const score = total ? Math.round((correctCount / total) * 100) : 0;
    const elapsed = quiz.paused ? (quiz.pauseStart - quiz.startTime - quiz.totalPausedMs) : (Date.now() - quiz.startTime - quiz.totalPausedMs);

    const byDifficulty = {};
    quiz.questions.forEach(q => {
      const a = quiz.answers[q.id];
      const d = quiz.difficulty || 'beginner';
      if (!byDifficulty[d]) byDifficulty[d] = { total: 0, correct: 0 };
      byDifficulty[d].total++;
      if (a && a.correct) byDifficulty[d].correct++;
    });

    return {
      quizId: quiz.id,
      category: quiz.category,
      type: quiz.type,
      difficulty: quiz.difficulty,
      total,
      answered,
      correct: correctCount,
      score,
      level: _calculateLevel(score),
      levelName: LEVEL_NAMES[_calculateLevel(score)],
      elapsed,
      questions: quiz.questions.map(q => ({
        ...q,
        userAnswer: quiz.answers[q.id]?.answer ?? null,
        isCorrect: quiz.answers[q.id]?.correct ?? false,
      })),
      byDifficulty,
    };
  }

  function completeQuiz(quizId) {
    const quiz = _quizState[quizId];
    if (!quiz) return { ok: false };
    quiz.status = 'completed';
    quiz.endTime = Date.now();
    _save();
    return { ok: true, results: getQuizResults(quizId) };
  }

  /* ════════════════════════════════════════════
     SPACED REPETITION
  ════════════════════════════════════════════ */
  function recordQuizResult(userId, questionId, correct) {
    if (!userId || !questionId) return;
    if (!_userPerformance[userId]) _userPerformance[userId] = {};

    const entry = { questionId, correct, time: Date.now() };

    if (!_userPerformance[userId]._general) _userPerformance[userId]._general = { recent: [] };
    _userPerformance[userId]._general.recent.push(entry);
    if (_userPerformance[userId]._general.recent.length > 100) {
      _userPerformance[userId]._general.recent = _userPerformance[userId]._general.recent.slice(-100);
    }

    if (correct) {
      _reviewQueue[userId] = (_reviewQueue[userId] || []).filter(r => r.questionId !== questionId);
    } else {
      _addToReview(userId, null, questionId);
    }
    _save();
  }

  function getReviewQueue(userId) {
    if (!userId || !_reviewQueue[userId]) return [];

    const now = Date.now();
    return _reviewQueue[userId]
      .filter(r => r.nextReview <= now)
      .sort((a, b) => a.nextReview - b.nextReview)
      .map(r => {
        const q = _findQuestion(r.questionId, r.category);
        return { ...r, question: q || null };
      });
  }

  function _findQuestion(questionId, category) {
    if (category && QUESTION_BANK[category]) {
      for (const diff of Object.keys(QUESTION_BANK[category])) {
        const found = QUESTION_BANK[category][diff].find(q => q.id === questionId);
        if (found) return found;
      }
    }
    for (const cat of Object.keys(QUESTION_BANK)) {
      for (const diff of Object.keys(QUESTION_BANK[cat])) {
        const found = QUESTION_BANK[cat][diff].find(q => q.id === questionId);
        if (found) return found;
      }
    }
    return null;
  }

  function reviewQuestion(userId, questionId, correct) {
    if (!userId || !_reviewQueue[userId]) return;
    const idx = _reviewQueue[userId].findIndex(r => r.questionId === questionId);
    if (idx < 0) return;

    const item = _reviewQueue[userId][idx];
    if (correct) {
      item.repetitions++;
      item.interval = Math.min(item.interval * 2.5, 30 * 24 * 60 * 60 * 1000);
    } else {
      item.repetitions = 0;
      item.interval = 1;
    }
    item.nextReview = Date.now() + item.interval * 24 * 60 * 60 * 1000;

    if (item.repetitions >= 5) {
      _reviewQueue[userId].splice(idx, 1);
    }

    _save();
  }

  /* ════════════════════════════════════════════
     LEARNING PATH GENERATOR
  ════════════════════════════════════════════ */
  function generateLearningPath(userId, category) {
    if (!userId || !category) return { ok: false, msg: 'Parâmetros obrigatórios.' };

    const perf = _userPerformance[userId] && _userPerformance[userId][category];
    const level = perf ? _calculateLevel((perf.correct / Math.max(perf.total, 1)) * 100) : 1;
    const levelName = LEVEL_NAMES[level];

    const steps = [];
    const bank = QUESTION_BANK[category];
    if (!bank) return { ok: false, msg: 'Categoria não encontrada.' };

    if (level === 1) {
      steps.push({ type: 'content', title: `Fundamentos de ${category.charAt(0).toUpperCase() + category.slice(1)}`, description: `Comece com os conceitos básicos. Seu nível atual: ${levelName}.`, difficulty: 'beginner' });
      steps.push({ type: 'quiz', title: `Quiz Básico — ${category.charAt(0).toUpperCase() + category.slice(1)}`, description: 'Teste seu conhecimento dos fundamentos.', difficulty: 'beginner', questionCount: 10 });
      steps.push({ type: 'content', title: `Prática Guiada — ${category.charAt(0).toUpperCase() + category.slice(1)}`, description: 'Exercícios práticos baseados nos materiais da plataforma.', difficulty: 'beginner' });
      steps.push({ type: 'quiz', title: `Quiz Intermediário — ${category.charAt(0).toUpperCase() + category.slice(1)}`, description: 'Avance para conceitos mais complexos.', difficulty: 'intermediate', questionCount: 10 });
    } else if (level === 2) {
      steps.push({ type: 'quiz', title: `Quiz Intermediário — ${category.charAt(0).toUpperCase() + category.slice(1)}`, description: `Você está no nível ${levelName}. Reforce conceitos intermediários.`, difficulty: 'intermediate', questionCount: 10 });
      steps.push({ type: 'content', title: `Técnicas Avançadas — ${category.charAt(0).toUpperCase() + category.slice(1)}`, description: 'Aprofunde em calibração e diagnóstico.', difficulty: 'intermediate' });
      steps.push({ type: 'quiz', title: `Quiz Avançado — ${category.charAt(0).toUpperCase() + category.slice(1)}`, description: 'Desafie-se com perguntas de nível técnico avançado.', difficulty: 'advanced', questionCount: 10 });
    } else {
      steps.push({ type: 'quiz', title: `Quiz Avançado — ${category.charAt(0).toUpperCase() + category.slice(1)}`, description: `Nível ${levelName}. Aprofunde em cenários complexos.`, difficulty: 'advanced', questionCount: 10 });
      steps.push({ type: 'content', title: `Casos Especiais — ${category.charAt(0).toUpperCase() + category.slice(1)}`, description: 'Diagnóstico avançado e resolução de problemas complexos.', difficulty: 'advanced' });
      steps.push({ type: 'review', title: 'Revisão Espaçada', description: 'Revise conceitos que você errou anteriormente.', difficulty: 'mixed' });
    }

    const path = {
      userId,
      category,
      currentLevel: level,
      levelName,
      score: perf ? Math.round((perf.correct / Math.max(perf.total, 1)) * 100) : 0,
      steps,
      currentStep: 0,
      createdAt: Date.now(),
    };

    _learningPaths[userId + '_' + category] = path;
    _save();
    return { ok: true, path };
  }

  function getLearningPath(userId, category) {
    return _learningPaths[userId + '_' + category] || null;
  }

  function advancePath(userId, category) {
    const key = userId + '_' + category;
    const path = _learningPaths[key];
    if (!path) return { ok: false };
    path.currentStep++;
    if (path.currentStep >= path.steps.length) path.status = 'completed';
    _save();
    return { ok: true, path };
  }

  /* ════════════════════════════════════════════
     DIAGNOSTIC COMPLETE
  ════════════════════════════════════════════ */
  function completeDiagnostic(quizId) {
    const quiz = _quizState[quizId];
    if (!quiz || quiz.type !== 'diagnostic') return { ok: false, msg: 'Não é um diagnóstico.' };

    quiz.status = 'completed';
    quiz.endTime = Date.now();

    const results = getQuizResults(quizId);
    const level = results.level;

    const recommendations = [];
    if (level === 1) {
      recommendations.push(`Você está no nível ${results.levelName} em ${quiz.category}. Comece pelo conteúdo básico.`);
      recommendations.push(`Recomendamos o quiz de nível iniciante para巩固 conceitos.`);
    } else if (level === 2) {
      recommendations.push(`Nível ${results.levelName} em ${quiz.category}. Pule o básico e vá direto para o intermediário.`);
      recommendations.push(`Explore técnicas de calibração e diagnóstico avançado.`);
    } else {
      recommendations.push(`Excelente! Nível ${results.levelName} em ${quiz.category}. Você está pronto para conteúdos avançados.`);
      recommendations.push(`Enfrente cenários complexos e revise conceitos pontuais.`);
    }

    _save();
    return { ok: true, results, recommendations };
  }

  /* ════════════════════════════════════════════
     USER PERFORMANCE SUMMARY
  ════════════════════════════════════════════ */
  function getUserPerformance(userId) {
    if (!userId || !_userPerformance[userId]) return null;

    const perf = _userPerformance[userId];
    const summary = {};

    for (const [cat, data] of Object.entries(perf)) {
      if (cat.startsWith('_')) continue;
      const rate = data.total ? Math.round((data.correct / data.total) * 100) : 0;
      summary[cat] = {
        score: rate,
        level: _calculateLevel(rate),
        levelName: LEVEL_NAMES[_calculateLevel(rate)],
        totalAnswered: data.total,
        totalCorrect: data.correct,
        byDifficulty: data.byDifficulty || {},
      };
    }

    return summary;
  }

  function getAvailableCategories() {
    return Object.keys(QUESTION_BANK);
  }

  function getCategoryStats(category) {
    const bank = QUESTION_BANK[category];
    if (!bank) return null;
    let total = 0;
    for (const diff of Object.keys(bank)) total += bank[diff].length;
    return { category, totalQuestions: total, difficulties: Object.keys(bank) };
  }

  /* ════════════════════════════════════════════
     UI RENDERING
  ════════════════════════════════════════════ */
  function renderDiagnostic(containerId, userId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = `
      <div class="aq-diagnostic">
        <div class="aq-diagnostic-header">
          <h3>Diagnóstico de Conhecimento</h3>
          <p>Selecione a categoria para iniciar o diagnóstico:</p>
        </div>
        <div class="aq-category-grid">
          ${Object.entries(QUESTION_BANK).map(([cat]) => `
            <button class="aq-category-btn" data-category="${cat}">
              <span class="aq-cat-name">${cat.charAt(0).toUpperCase() + cat.slice(1)}</span>
              <span class="aq-cat-count">${(QUESTION_BANK[cat].beginner || []).length + (QUESTION_BANK[cat].intermediate || []).length + (QUESTION_BANK[cat].advanced || []).length} perguntas</span>
            </button>
          `).join('')}
        </div>
      </div>
    `;

    container.querySelectorAll('.aq-category-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const cat = btn.dataset.category;
        const result = startDiagnostic(userId, cat);
        if (result.ok) renderQuizInterface(containerId, result.quiz);
      });
    });
  }

  function renderLearningPath(containerId, userId, category) {
    const container = document.getElementById(containerId);
    if (!container) return;

    let path = getLearningPath(userId, category);
    if (!path) {
      const result = generateLearningPath(userId, category);
      if (!result.ok) { container.innerHTML = `<div class="aq-error">${result.msg}</div>`; return; }
      path = result.path;
    }

    container.innerHTML = `
      <div class="aq-learning-path">
        <div class="aq-path-header">
          <h3>Caminho de Aprendizagem — ${category.charAt(0).toUpperCase() + category.slice(1)}</h3>
          <div class="aq-path-level">
            <span class="aq-level-badge" style="background:${LEVEL_COLORS[path.currentLevel]}">${path.levelName}</span>
            <span class="aq-path-score">Pontuação: ${path.score}%</span>
          </div>
        </div>
        <div class="aq-path-steps">
          ${path.steps.map((step, i) => `
            <div class="aq-step ${i < path.currentStep ? 'aq-step-done' : ''} ${i === path.currentStep ? 'aq-step-current' : ''}">
              <div class="aq-step-marker">${i < path.currentStep ? '&#10003;' : i + 1}</div>
              <div class="aq-step-content">
                <h4>${step.title}</h4>
                <p>${step.description}</p>
                ${step.type === 'quiz' ? `<button class="aq-step-action" data-step="${i}" data-difficulty="${step.difficulty}">Iniciar Quiz</button>` : ''}
                ${step.type === 'review' ? `<button class="aq-step-action" data-step="${i}" data-type="review">Revisar</button>` : ''}
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;

    container.querySelectorAll('.aq-step-action').forEach(btn => {
      btn.addEventListener('click', () => {
        const diff = btn.dataset.difficulty;
        const type = btn.dataset.type;
        if (type === 'review') {
          const reviews = getReviewQueue(userId);
          if (reviews.length) renderQuizInterface(containerId, { id: 'review_' + Date.now(), userId, category, type: 'review', questions: reviews.map(r => r.question).filter(Boolean), answers: {}, currentIndex: 0, status: 'active' });
          return;
        }
        const result = startQuiz(userId, category, diff);
        if (result.ok) renderQuizInterface(containerId, result.quiz);
      });
    });
  }

  function renderQuizInterface(containerId, quiz) {
    const container = document.getElementById(containerId);
    if (!container || !quiz) return;

    const questions = quiz.questions || [];
    const current = questions[quiz.currentIndex];
    const answered = Object.keys(quiz.answers || {}).length;
    const total = questions.length;

    if (!current || quiz.currentIndex >= total) {
      if (quiz.status === 'active') completeQuiz(quiz.id);
      const results = getQuizResults(quiz.id);
      _renderResults(container, results);
      return;
    }

    const timeTaken = quiz.totalPausedMs ? Date.now() - quiz.startTime - quiz.totalPausedMs : Date.now() - quiz.startTime;
    const minutes = Math.floor(timeTaken / 60000);
    const seconds = Math.floor((timeTaken % 60000) / 1000);

    container.innerHTML = `
      <div class="aq-quiz">
        <div class="aq-quiz-header">
          <div class="aq-quiz-progress">
            <span>Pergunta ${quiz.currentIndex + 1} de ${total}</span>
            <div class="aq-progress-bar"><div class="aq-progress-fill" style="width:${(answered / total) * 100}%"></div></div>
          </div>
          <div class="aq-quiz-timer">${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}</div>
          <button class="aq-pause-btn" data-quiz="${quiz.id}">${quiz.paused ? 'Continuar' : 'Pausar'}</button>
        </div>
        <div class="aq-question-card">
          <div class="aq-question-category">${(quiz.category || '').toUpperCase()} — ${(quiz.difficulty || 'Básico').toUpperCase()}</div>
          <p class="aq-question-text">${current.text}</p>
          <div class="aq-options">
            ${current.options.map((opt, i) => `
              <button class="aq-option-btn" data-quiz="${quiz.id}" data-question="${current.id}" data-answer="${i}">
                <span class="aq-option-letter">${String.fromCharCode(65 + i)}</span>
                <span class="aq-option-text">${opt}</span>
              </button>
            `).join('')}
          </div>
        </div>
        <div class="aq-explanation" style="display:none"></div>
      </div>
    `;

    container.querySelectorAll('.aq-option-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const qId = btn.dataset.question;
        const answer = parseInt(btn.dataset.answer, 10);
        const result = submitAnswer(btn.dataset.quiz, qId, answer);
        if (!result.ok) return;

        const correct = result.correct;
        btn.classList.add(correct ? 'aq-correct' : 'aq-wrong');
        if (!correct) {
          const correctBtn = container.querySelector(`.aq-option-btn[data-answer="${questions.find(q => q.id === qId)?.correct}"]`);
          if (correctBtn) correctBtn.classList.add('aq-correct');
        }

        container.querySelectorAll('.aq-option-btn').forEach(b => { b.disabled = true; });

        const expl = container.querySelector('.aq-explanation');
        if (expl) {
          expl.style.display = 'block';
          expl.innerHTML = `<strong>${correct ? 'Correto!' : 'Incorreto.'}</strong> ${result.explanation || ''}`;
        }

        setTimeout(() => {
          quiz.currentIndex++;
          renderQuizInterface(containerId, quiz);
        }, 2500);
      });
    });

    const pauseBtn = container.querySelector('.aq-pause-btn');
    if (pauseBtn) {
      pauseBtn.addEventListener('click', () => {
        if (quiz.paused) { resumeQuiz(quiz.id); } else { pauseQuiz(quiz.id); }
        renderQuizInterface(containerId, quiz);
      });
    }
  }

  function _renderResults(container, results) {
    if (!results) { container.innerHTML = '<div class="aq-error">Resultados não disponíveis.</div>'; return; }

    container.innerHTML = `
      <div class="aq-results">
        <div class="aq-results-header">
          <h3>Resultado do Quiz</h3>
          <div class="aq-results-score">
            <div class="aq-score-circle" style="border-color:${LEVEL_COLORS[results.level]}">
              <span class="aq-score-value">${results.score}%</span>
            </div>
            <span class="aq-level-badge" style="background:${LEVEL_COLORS[results.level]}">${results.levelName}</span>
          </div>
        </div>
        <div class="aq-results-stats">
          <div class="aq-stat"><span class="aq-stat-label">Corretas</span><span class="aq-stat-value">${results.correct}/${results.total}</span></div>
          <div class="aq-stat"><span class="aq-stat-label">Tempo</span><span class="aq-stat-value">${Math.floor(results.elapsed / 60000)}m ${Math.floor((results.elapsed % 60000) / 1000)}s</span></div>
          <div class="aq-stat"><span class="aq-stat-label">Categoria</span><span class="aq-stat-value">${results.category}</span></div>
        </div>
        <div class="aq-results-questions">
          <h4>Revisão das Perguntas</h4>
          ${results.questions.map((q, i) => `
            <div class="aq-result-item ${q.isCorrect ? 'aq-correct' : 'aq-wrong'}">
              <span class="aq-result-num">${i + 1}</span>
              <div class="aq-result-body">
                <p class="aq-result-text">${q.text}</p>
                <p class="aq-result-explanation">${q.explanation || ''}</p>
              </div>
              <span class="aq-result-icon">${q.isCorrect ? '&#10003;' : '&#10007;'}</span>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  /* ════════════════════════════════════════════
     INIT & EXPORT
  ════════════════════════════════════════════ */
  function init() {
    _load();
  }

  return {
    init,
    DIFFICULTY, LEVEL_NAMES, LEVEL_COLORS,
    QUESTION_BANK,
    getAvailableCategories,
    getCategoryStats,
    startDiagnostic,
    startQuiz,
    submitAnswer,
    pauseQuiz,
    resumeQuiz,
    getQuizResults,
    completeQuiz,
    completeDiagnostic,
    recordQuizResult,
    getReviewQueue,
    reviewQuestion,
    generateLearningPath,
    getLearningPath,
    advancePath,
    getUserPerformance,
    renderDiagnostic,
    renderLearningPath,
    renderQuizInterface,
  };
})();
