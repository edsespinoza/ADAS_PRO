/* ================================================
   ADAS PRO — Certificações v1.0
   IIFE exposto como window.CERTIFICATIONS
   ================================================ */

const CERTIFICATIONS = (function () {
  'use strict';

  /* ─── Storage keys ─── */
  const K_USER      = 'adaspro_session';
  const K_CERTS     = 'adaspro_certifications';
  const K_QUIZ_LOG  = 'adaspro_quiz_log';

  /* ─── Levels ─── */
  const LEVELS = {
    1: { name: 'Nível 1 — Básico',      color: '#00B4D8', time: 30, pass: 70 },
    2: { name: 'Nível 2 — Intermediário', color: '#FF6B35', time: 45, pass: 75 },
    3: { name: 'Nível 3 — Avançado',      color: '#F4A261', time: 60, pass: 80 }
  };

  /* ─── Categories (match auth.js) ─── */
  const CATS = ['honda','toyota','nissan','subaru','hyundai','vag','mercedes','ford','BMW','stellantis','byd'];
  const CAT_ICONS = {
    honda:'🚗', toyota:'🚙', nissan:'🛻', subaru:'🏔️', hyundai:'🏎️',
    vag:'🔧', mercedes:'✨', ford:'🏁', BMW:'🏎️', stellantis:'⚡', byd:'🔋'
  };

  /* ─── Certifications catalog ─── */
  const CATALOG = [
    {
      id: 'adas-basics',
      name: 'Fundamentos ADAS',
      description: 'Conhecimentos essenciais sobre sistemas ADAS — princípios, sensores, arquiteturas e terminologia padrão do setor.',
      level: 1,
      category: null,
      icon: '📘',
      requirements: ['Estar logado','Intermediário de português'],
      price: 0
    },
    {
      id: 'honda-sensing',
      name: 'Honda Sensing — Certificação',
      description: 'Domine a linha completa Honda Sensing: CMBS, LKAS, ACC, RDM, BSI, CTBA e TSA. Diagnóstico, calibração e cenários de falha.',
      level: 2,
      category: 'honda',
      icon: '🚗',
      requirements: ['Nível 1 concluído','Acesso à categoria Honda','Vivência com Honda Sensing'],
      price: 0
    },
    {
      id: 'toyota-safety',
      name: 'Toyota Safety Sense — Certificação',
      description: 'TSS 2.0/3.0: PCS, LTA, DRCC, LDA, RSA, PDA. Fluxos de calibração, parâmetros e validação de reparo.',
      level: 2,
      category: 'toyota',
      icon: '🚙',
      requirements: ['Nível 1 concluído','Acesso à categoria Toyota'],
      price: 0
    },
    {
      id: 'calibration-mastery',
      name: 'Mestria em Calibração ADAS',
      description: 'Técnicas avançadas de calibração estática e dinâmica, sobreposição de imagens, alvos e fleet leveling.',
      level: 3,
      category: null,
      icon: '🎯',
      requirements: ['Pelo menos 1 Nível 2 concluído','Acesso ativo à plataforma'],
      price: 0
    }
  ];

  /* ─── Question banks ─── */
  const QUESTIONS = {
    'adas-basics': [
      { q: 'Qual sensor é utilizado pelo sistema <strong>CMBS</strong> (Collision Mitigation Braking System)?', opts: ['Câmera frontal','Radar de onda milimétrica','LiDAR','Sensor de estacionamento'], ans: 1 },
      { q: 'O que significa <strong>LKAS</strong>?', opts: ['Lane Keep Assist System','Light Keep Alarm Sensor','Lane Kill Anti-Skid','Load Kinetic Auto System'], ans: 0 },
      { q: 'Qual é a velocidade mínima típica para ativação do <strong>ACC</strong> (Adaptive Cruise Control)?', opts: ['0 km/h','15–20 km/h','50 km/h','120 km/h'], ans: 1 },
      { q: 'O <strong>BSM</strong> (Blind Spot Monitor) utiliza predominantemente qual tecnologia?', opts: ['Câmera','Radar de onda curta','Ultrasom','GPS'], ans: 1 },
      { q: 'A calibração <strong>estática</strong> de uma câmera frontal requer:', opts: ['Pista de testes','Alvos posicionados em distância e altura específicas','Reprogramação do módulo via OBD','Reinicialização manual'], ans: 1 },
      { q: 'A sigla <strong>ADAS</strong> significa:', opts: ['Advanced Driver Assistance Systems','Automatic Diagnostic and Alert System','Auto Drive Assist Sensor','Advanced Detection Alert Suite'], ans: 0 },
      { q: 'A função do <strong>RDM</strong> (Road Departure Mitigation) é:', opts: ['Monitorar pontos cegos','Evitar que o veículo saia da faixa','Controlar a velocidade em descidas','Ativar o freio em emergência'], ans: 1 },
      { q: 'O radar frontal do ACC geralmente opera na frequência de:', opts: ['2.4 GHz','12 GHz','77 GHz','24 GHz'], ans: 2 },
      { q: 'A <strong>camera calibration</strong> do ADAS pode ser comprometida por:', opts: ['Substituição do para-brisa','Troca de pneus','Limpeza do vidro','Uso de farol LED'], ans: 0 },
      { q: 'O <strong>CTBA</strong> (City Brake Active) é uma versão do CMBS para:', opts: ['Alta velocidade','Estacionamento','Baixa velocidade / cidade','Rota asfáltica'], ans: 2 },
      { q: 'Qual entidade global define padrões de teste para veículos autônomos?', opts: ['W3C','ISO / SAE','ITU','ANSI'], ans: 1 },
      { q: 'O <strong>SRS</strong> (Supplemental Restraint System) é composto por:', opts: ['Freios e suspensão','Airbags e cintos','Aerodinâmica e motor','Câmeras e radar'], ans: 1 },
      { q: 'A classificação de veículos ADAS por <strong>nível SAE</strong> vai de:', opts: ['Nível 0 a 3','Nível 1 a 5','Nível 0 a 5','Nível 0 a 4'], ans: 2 },
      { q: 'A manutenção preventiva de sistemas ADAS inclui:', opts: ['Troca de óleo','Inspeção e calibração dos sensores a cada evento de colisão','Aumento de potência do motor','Troca de bateria do motor'], ans: 1 },
      { q: 'A cena de uso do <strong>AEB</strong> (Autonomous Emergency Braking) é:', opts: ['Frenagem em descida','Frenagem automática em colisão iminente','Estacionamento automático','Manutenção de faixa'], ans: 1 },
      { q: 'Qual é a distância típica de detecção do radar frontal para ACC em alta velocidade?', opts: ['10 metros','50 metros','200 metros','2 km'], ans: 2 },
      { q: 'O <strong>TSA</strong> (Traffic Sign Assist) detecta:', opts: ['Sinais de trânsito via câmera','Presença de pedestres','Temperatura da via','Nível de combustível'], ans: 0 },
      { q: 'A calibração dinâmica requer:', opts: ['Alvos estáticos','Pista de testes com referências','Reprogramação do ECU','Desligamento do motor'], ans: 1 },
      { q: 'A UNECE R151 regulamenta:', opts: ['Emissões veiculares','Sistemas de frenagem autônoma (AEB) para veículos pesados','Iluminação veicular','Segurança estrutural'], ans: 1 },
      { q: 'Qual das seguintes NÃO é uma função de segurança ativa?', opts: ['AEB','Cinto de segurança','ESC','LDW'], ans: 1 }
    ],
    'honda-sensing': [
      { q: 'O <strong>CMBS</strong> opera em qual faixa de velocidade máxima?', opts: ['80 km/h','100 km/h','160 km/h','200 km/h'], ans: 1 },
      { q: 'Qual é o componente principal do <strong>LKAS</strong> da Honda?', opts: ['Radar','Câmera frontal','Ultrasom','LiDAR'], ans: 1 },
      { q: 'O <strong>RDM</strong> pode aplicar <strong>steering torque</strong> para evitar saída de faixa.', opts: ['Verdadeiro','Falso'], ans: 0 },
      { q: 'Onde fica a unidade de controle (ECU) da câmera frontal do Honda Sensing?', opts: ['No para-choque traseiro','No retrovisor interno','No cofre do motor','No painel de instrumentos'], ans: 1 },
      { q: 'O <strong>ACC</strong> da Honda funciona com:', opts: ['Apenas radar','Apenas câmera','Câmera + Radar (sensor fusion)','GPS'], ans: 2 },
      { q: 'A calibração da câmera frontal Honda requer:', opts: ['Pista de testes apenas','Alvo de calibração Honda específico + distância foco','Apenas reiniciar o ECU','Troca de vidro'], ans: 1 },
      { q: 'O <strong>BSI</strong> (Blind Spot Information) alerta via:', opts: ['Som no alto-falante','LED no espelho retrovisor','Vibração no volante','Display no head-up'], ans: 1 },
      { q: 'A substituição do para-brisa exige recalibração:', opts: ['Apenas se o vidro for diferente','Sempre','Apenas em veículos híbridos','Nunca'], ans: 1 },
      { q: 'O <strong>CTBA</strong> entra em ação quando o veículo está abaixo de qual velocidade?', opts: ['30 km/h','40 km/h','50 km/h','70 km/h'], ans: 1 },
      { q: 'A Honda recomenda a calibração da câmera frontal após:', opts: ['Troca de óleo','Qualquer ativação do airbag frontal','Uso de GPS','Remendos no vidro'], ans: 1 },
      { q: 'O sensor de chuva (rain sensor) contribui para o Honda Sensing:', opts: ['Controlando os limpadores — não interfere no ADAS','Ajustando sensibilidade da câmera frontal','Ativando o AEB automaticamente','Desligando o ACC'], ans: 1 },
      { q: 'O <strong>LDW</strong> (Lane Departure Warning) é:', opts: ['Aplicação de freio','Alerta visual + sonoro','Controle de direção','Apenas visual'], ans: 1 },
      { q: 'A diagnose do Honda Sensing pode ser feita via:', opts: ['OBD-II genérico','Scanner Honda HDS / i-HDS apenas','App externo','Não é necessário'], ans: 1 },
      { q: 'O módulo radar do ACC está localizado no:', opts: ['Cofre do motor','Traseira','Teto','Para-choque frontal'], ans: 3 },
      { q: 'A funcionalidade <strong>Traffic Sign Recognition</strong> (TSR) é controlada por:', opts: ['Radar','Câmera frontal','GPS + Mapa','Sensor de roda'], ans: 1 },
      { q: 'Para desativar o alerta de saída de faixa do LKAS no Honda Civic, o condutor deve:', opts: ['Pressionar o botão OFF no volante','Remover o fusível','Desligar o motor','Não há como desativar'], ans: 0 },
      { q: 'O <strong>rear cross traffic monitor</strong> funciona quando:', opts: ['O veículo está em movimento','O veículo está em ré (marcha ré)','O veículo está em neutro','Apenas com o motor desligado'], ans: 1 },
      { q: 'A tolerância de calibração angular da câmera frontal Honda é de:', opts: ['±1.0°','±0.5°','±2.0°','±0.1°'], ans: 1 },
      { q: 'Qual é o primeiro passo antes de iniciar a calibração Honda Sensing?', opts: ['Ligar o motor','Inspecionar alinhamento mecânico e pressão dos pneus','Conectar o scanner','Limpar o para-brisa'], ans: 1 },
      { q: 'O <strong>CMBS</strong> em versões recentes detecta também:', opts: ['Veículos','Pedestres e ciclistas','Apenas veículos','Animais'], ans: 1 }
    ],
    'toyota-safety': [
      { q: 'O <strong>PCS</strong> (Pre-Collision System) da Toyota detecta:', opts: ['Apenas veículos','Veículos, pedestres e ciclistas','Só pedestres','Apenas obstáculos estáticos'], ans: 1 },
      { q: 'O <strong>LTA</strong> (Lane Tracing Assist) substituiu qual sistema anterior?', opts: ['LDA','DRCC','PCS','BSM'], ans: 0 },
      { q: 'O <strong>DRCC</strong> (Dynamic Radar Cruise Control) operacionaliza:', opts: ['Controle de velocidade fixo','Cruzeiro adaptativo','Piloto automático','Frenagem autônoma'], ans: 1 },
      { q: 'A calibração da câmera frontal do TSS requer:', opts: ['Scanner Toyota Techstream','Scanner genérico OBD-II','Não requer scanner','Apenas reinício do ECU'], ans: 0 },
      { q: 'O <strong>RSA</strong> (Road Sign Assist) detecta sinais por:', opts: ['Radar','Câmera frontal + software de reconhecimento','GPS','LiDAR'], ans: 1 },
      { q: 'O TSS 3.0 da Toyota adicionou qual novo recurso?', opts: ['Intersection Turn Assist','Wireless Apple CarPlay','Motor elétrico','Turbo'], ans: 0 },
      { q: 'O alerta de <strong>Driver Attention</strong> é monitorado por:', opts: ['Radar','Câmera infravergelha no painel (camera monitoring system)','Sensor de pulso','GPS'], ans: 1 },
      { q: 'O <strong>PDA</strong> (Pre-Collision System with Pedestrian Detection) entra em ação:', opts: ['Apenas em alta velocidade','Quando detecta colisão iminente','Apenas à noite','Em reversa'], ans: 1 },
      { q: 'Após substituição do para-brisa em veículo Toyota com TSS, é necessário:', opts: ['Recalibração da câmera frontal','Apenas inspeção visual','Nada','Reprogramação do módulo'], ans: 0 },
      { q: 'O <strong>LDA</strong> (Lane Departure Alert) com steering assist aplica:', opts: ['Freio','Torque no volante','Aceleração','Mudança de câmbio'], ans: 1 },
      { q: 'A distância do radar frontal do DRCC pode ser ajustada em:', opts: ['3 níveis','5 níveis','Apenas 1 nível','Não pode ser ajustada'], ans: 0 },
      { q: 'A calibração dinâmica do TSS é feita:', opts: ['Em pista fechada com referências','Em qualquer rua','No estacionamento','Não existe calibração dinâmica Toyota'], ans: 0 },
      { q: 'O <strong>BSM</strong> (Blind Spot Monitor) na Toyota opera com:', opts: ['Câmera','Radar de onda milimétrica','Ultrasom','Sensor capacitivo'], ans: 1 },
      { q: 'AToyota recomenda a verificação do TSS após:', opts: ['Substituição de pneus','Qualquer colisão frontal','Troca de óleo','Uso off-road'], ans: 1 },
      { q: 'O scanner Toyota Techstream é necessário para:', opts: ['Leitura de códigos genéricos','Funções avançadas ADAS e calibração','Apenas leitura de tensão','Troca de bateria'], ans: 1 },
      { q: 'O <strong>Intersection Turn Assist</strong> do TSS 3.0 entra em ação:', opts: ['Em cruzamentos quando há risco de colisão com veículo cruzante','Em qualquer curva','Apenas em rodovias','Em reversa'], ans: 0 },
      { q: 'O sistema de calibração do TSS da Toyota utiliza um:', opts: ['Dispositivo de calibração óptico (target board)','Scanner tablet','Osciloscópio','Cabo OBD apenas'], ans: 0 },
      { q: 'A distância de detecção mínima do PCS é de aproximadamente:', opts: ['5 metros','30 metros','80 metros','200 metros'], ans: 1 },
      { q: 'O <strong>Proactive Driving Assist</strong> (PDA) do TSS 3.0:', opts: ['Apenas alerta','Auxilia na direção proativamente','Substitui o motorista','Só funciona em rodovia'], ans: 1 },
      { q: 'A revisão periódica dos sensores ADAS Toyota deve ser feita a cada:', opts: ['100.000 km','20.000 km ou conforme manual','Apenas em defeito','A cada 5 anos'], ans: 1 }
    ],
    'calibration-mastery': [
      { q: 'A calibração <strong>estática</strong> da câmera ADAS requer que o alvo esteja posicionado a que distância tipicamente?', opts: ['1 metro','3-5 metros','10-20 metros','50 metros'], ans: 2 },
      { q: 'O efeito de <strong>parallax</strong> na calibração é causado por:', opts: ['Temperatura','Desalinhamento angular da câmera em relação ao alvo','Pressão dos pneus','Ruído elétrico'], ans: 1 },
      { q: 'A calibração dinâmica em pista requer velocidade mínima de:', opts: ['10 km/h','30 km/h','60 km/h','90 km/h'], ans: 2 },
      { q: 'O módulo ADAS deve ser recalibrado quando:', opts: ['A cada troca de óleo','Após substituição de componentes estruturais ou de vidro','Apenas em defeito visível','Nunca'], ans: 1 },
      { q: 'A tolerância angular máxima aceitável para câmera frontal ADAS é tipicamente de:', opts: ['±0.5°','±3.0°','±5.0°','±10.0°'], ans: 0 },
      { q: 'O processo de <strong>fleet leveling</strong> é necessário quando:', opts: ['O veículo está emlevello','Há diferença de altura entre eixos','O motor está quente','Está chovendo'], ans: 1 },
      { q: 'O software de calibração ADASToyota é:', opts: ['HDS','Techstream com módulo ADAS','Qualquer scanner','Não existe software'], ans: 1 },
      { q: 'A calibração de radar para ACC requer:', opts: ['Apenas limpeza','Apontamento angular preciso (aiming)','Troca do radar','Reinicialização ECU'], ans: 1 },
      { q: 'A sobreposição de imagem (image overlay) na calibração serve para:', opts: ['Decorar','Visualizar área de cobertura da câmera','Aumentar resolução','Reduzir consumo'], ans: 1 },
      { q: 'Em caso de colisão frontal, o primeiro passo para calibração ADAS é:', opts: ['Conectar o scanner','Verificar danos estruturais e alinhamento de chassi','Trocar o vidro','Ligar o motor'], ans: 1 },
      { q: 'O alvo de calibração (target) deve estar em:', opts: ['Qualquer posição','Altura e distância exatas conforme especificação do fabricante','No teto do carro','Na oficina'], ans: 1 },
      { q: 'A calibração de múltiplos sistemas ADAS deve ser feita em sequência:', opts: ['Aleatória','Câmera → Radar → Ultrasom (ordem definida pelo fabricante)','Não importa','Apenas radar'], ans: 1 },
      { q: 'A calibração do BSM requer:', opts: ['Alvos estáticos nos cantos traseiros','Teste dinâmico em pista','Apenas leitura de códigos','Não requer calibração'], ans: 0 },
      { q: 'O termo <strong>"depth of field"</strong> na calibração ADAS refere-se a:', opts: ['Profundidade de foco da câmera','Distância máxima de detecção','Largura da faixa','Velocidade máxima'], ans: 0 },
      { q: 'A calibração de radar de ângulo estreito (narrow field) é para:', opts: ['BSD','ACC frontal','RCTA','Park assist'], ans: 1 },
      { q: 'O sistema de calibração automática (automated calibration) utiliza:', opts: ['Robôs de posicionamento','Câmeras de referência + software','Teste manual','Apenas GPS'], ans: 1 },
      { q: 'A environmental compensation (compensação ambiental) na calibração considera:', opts: ['Temperatura, luz e condições da pista','Marca do veículo','Ano de fabricação','Cor do veículo'], ans: 0 },
      { q: 'Após reparo estrutural de lona frontal, é necessário recalibrar:', opts: ['Apenas radar','Câmera frontal e radar','Apenas BSM','Nenhum sistema'], ans: 1 },
      { q: 'O <strong>flatness check</strong> na calibração ADAS verifica:', opts: ['Se a superfície de montagem da câmera está plana','Se o vidro está limpo','Se o alvo está centralizado','Se o pneu está calibrado'], ans: 0 },
      { q: 'A calibração de câmera 360° requer alvos posicionados em:', opts: ['1 ponto','4 pontos (frente, trás, esquerda, direita)','8 pontos','Apenas na frente'], ans: 1 }
    ]
  };

  /* ─── State ─── */
  let _currentQuiz  = null;
  let _currentQ     = 0;
  let _answers      = {};
  let _timer        = null;
  let _timerSec     = 0;
  let _timeWarned   = false;
  let _quizCallback = null;

  /* ─── Helpers ─── */
  function _get(key, def) { try { return JSON.parse(localStorage.getItem(key)) || def; } catch { return def; } }
  function _set(key, val) { localStorage.setItem(key, JSON.stringify(val)); }
  function _session() { return _get(K_USER, null); }

  function _getMyCerts() {
    const s = _session();
    if (!s) return {};
    const all = _get(K_CERTS, {});
    return all[s.userId || s.id] || {};
  }

  function _saveMyCert(certId, data) {
    const s = _session();
    if (!s) return;
    const all = _get(K_CERTS, {});
    const uid = s.userId || s.id;
    if (!all[uid]) all[uid] = {};
    all[uid][certId] = data;
    _set(K_CERTS, all);
  }

  function _logQuiz(certId, score, passed) {
    const s = _session();
    if (!s) return;
    const all = _get(K_QUIZ_LOG, []);
    all.push({ userId: s.userId || s.id, certId, score, passed, date: new Date().toISOString() });
    _set(K_QUIZ_LOG, all);
  }

  function _certStatus(certId) {
    const my = _getMyCerts();
    if (my[certId]) return 'active';
    return 'available';
  }

  function _formatDate(d) {
    if (!d) return '—';
    const dt = new Date(d);
    return dt.toLocaleDateString('pt-BR', { day:'2-digit', month:'2-digit', year:'numeric' });
  }

  function _formatTime(sec) {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  }

  function _buildCertId() {
    const ts = Date.now().toString(36).toUpperCase();
    const rnd = Math.random().toString(36).substring(2,6).toUpperCase();
    return `ADAS-${ts}-${rnd}`;
  }

  /* ─── Quiz engine ─── */
  function startQuiz(certId) {
    const cat = CATALOG.find(c => c.id === certId);
    if (!cat) return { ok: false, error: 'Certificação não encontrada' };
    const questions = QUESTIONS[certId];
    if (!questions || !questions.length) return { ok: false, error: 'Banco de perguntas vazio' };
    const levelInfo = LEVELS[cat.level];
    _currentQuiz = cat;
    _currentQ = 0;
    _answers = {};
    _timeWarned = false;
    _timerSec = levelInfo.time * 60;

    _renderQuizOverlay(cat, questions, levelInfo);
    _startTimer(levelInfo);
    return { ok: true };
  }

  function _startTimer(levelInfo) {
    clearInterval(_timer);
    _timer = setInterval(() => {
      _timerSec--;
      const el = document.getElementById('quizTimerTime');
      if (el) el.textContent = _formatTime(_timerSec);
      const wrap = document.querySelector('.quiz-timer');
      if (_timerSec <= 60 * 3 && wrap) { wrap.classList.add('warning'); _timeWarned = true; }
      if (_timerSec <= 0) { clearInterval(_timer); _submitQuiz(); }
    }, 1000);
  }

  function _renderQuizOverlay(cert, questions, levelInfo) {
    let overlay = document.getElementById('certQuizOverlay');
    if (!overlay) { overlay = document.createElement('div'); overlay.id = 'certQuizOverlay'; document.body.appendChild(overlay); }

    overlay.className = 'quiz-overlay';
    overlay.style.display = 'flex';
    overlay.innerHTML = `
      <div class="quiz-box">
        <div class="quiz-header">
          <div class="quiz-header-left">
            <div class="quiz-header-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><path d="m9 14 2 2 4-4"/></svg></div>
            <div class="quiz-header-info">
              <div class="quiz-header-title">${cert.name}</div>
              <div class="quiz-header-sub">Questão <span id="quizQNum">1</span>/${questions.length} · ${levelInfo.pass}% para aprovação</div>
            </div>
          </div>
          <div class="quiz-timer" id="quizTimerWrap">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            <span class="quiz-timer-time" id="quizTimerTime">${_formatTime(_timerSec)}</span>
          </div>
          <button class="quiz-close" onclick="CERTIFICATIONS.closeQuiz()" title="Sair do quiz">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div class="quiz-progress">
          <div class="quiz-progress-bar"><div class="quiz-progress-fill" id="quizProgressFill" style="width:${(1/questions.length)*100}%"></div></div>
          <div class="quiz-progress-info"><span id="quizProgressPct">0%</span><span>${questions.length} questões</span></div>
        </div>
        <div class="quiz-body" id="quizBody"></div>
        <div class="quiz-footer" id="quizFooter">
          <div class="quiz-nav-btns">
            <button class="quiz-btn quiz-btn-prev" id="quizPrevBtn" onclick="CERTIFICATIONS.quizNav(-1)" disabled>← Anterior</button>
            <button class="quiz-btn quiz-btn-next" id="quizNextBtn" onclick="CERTIFICATIONS.quizNav(1)">Próxima →</button>
          </div>
          <button class="quiz-btn quiz-btn-submit" id="quizSubmitBtn" onclick="CERTIFICATIONS._submitQuiz()" style="display:none">Finalizar</button>
        </div>
        <div class="quiz-results" id="quizResults"></div>
      </div>`;

    _renderQuestion(0, questions);
  }

  function _renderQuestion(idx, questions) {
    const body = document.getElementById('quizBody');
    if (!body || !questions) return;
    const q = questions[idx];
    const letters = ['A','B','C','D'];
    const selected = _answers[idx];

    body.innerHTML = `
      <div class="quiz-question-num">Questão ${idx+1}</div>
      <div class="quiz-question-text">${q.q}</div>
      <div class="quiz-options">
        ${q.opts.map((opt, i) => `
          <div class="quiz-option ${selected===i?'selected':''}" onclick="CERTIFICATIONS._selectAnswer(${idx},${i})">
            <div class="quiz-option-letter">${letters[i]}</div>
            <div>${opt}</div>
          </div>`).join('')}
      </div>`;

    document.getElementById('quizQNum').textContent = idx+1;
    document.getElementById('quizProgressFill').style.width = ((idx+1)/questions.length*100)+'%';
    document.getElementById('quizProgressPct').textContent = Math.round((idx+1)/questions.length*100)+'%';

    const prevBtn = document.getElementById('quizPrevBtn');
    const nextBtn = document.getElementById('quizNextBtn');
    const subBtn  = document.getElementById('quizSubmitBtn');
    if (prevBtn) prevBtn.disabled = idx===0;
    if (nextBtn) nextBtn.style.display = idx < questions.length-1 ? '' : 'none';
    if (subBtn)  subBtn.style.display  = idx === questions.length-1 ? '' : 'none';
    if (nextBtn) nextBtn.disabled = _answers[idx]===undefined;
    if (subBtn)  subBtn.disabled  = Object.keys(_answers).length < questions.length;

    body.scrollTop = 0;
  }

  function _selectAnswer(qIdx, optIdx) {
    _answers[qIdx] = optIdx;
    const cat = _currentQuiz;
    if (!cat) return;
    const questions = QUESTIONS[cat.id];
    _renderQuestion(qIdx, questions);
  }

  function quizNav(dir) {
    const cat = _currentQuiz;
    if (!cat) return;
    const questions = QUESTIONS[cat.id];
    const newIdx = _currentQ + dir;
    if (newIdx < 0 || newIdx >= questions.length) return;
    _currentQ = newIdx;
    _renderQuestion(_currentQ, questions);
  }

  function _submitQuiz() {
    clearInterval(_timer);
    const cat = _currentQuiz;
    if (!cat) return;
    const questions = QUESTIONS[cat.id];
    const levelInfo = LEVELS[cat.level];

    let correct = 0;
    questions.forEach((q, i) => { if (_answers[i] === q.ans) correct++; });
    const pct = Math.round((correct / questions.length) * 100);
    const passed = pct >= levelInfo.pass;

    _logQuiz(cat.id, pct, passed);
    if (passed) {
      const certId = _buildCertId();
      _saveMyCert(cat.id, {
        certId,
        score: pct,
        earnedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 365*24*60*60*1000).toISOString(),
        level: cat.level,
        name: cat.name
      });
    }

    _showResults(correct, questions.length, pct, passed, cat, levelInfo);
  }

  function _showResults(correct, total, pct, passed, cert, levelInfo) {
    const body   = document.getElementById('quizBody');
    const footer = document.getElementById('quizFooter');
    const res    = document.getElementById('quizResults');
    if (!body || !res) return;

    body.style.display   = 'none';
    footer.style.display = 'none';
    res.className        = `quiz-results show ${passed?'passed':'failed'}`;
    res.style.display    = 'block';

    res.innerHTML = `
      <div class="quiz-results-icon">${passed?'✅':'❌'}</div>
      <div class="quiz-results-title">${passed?'Parabéns! Você foi aprovado!':'Não atingiu a pontuação mínima'}</div>
      <div class="quiz-results-sub">${passed?`Sua certificação <strong>${cert.name}</strong> foi emitida com validade de 1 ano.`:`Você acertou <strong>${correct} de ${total}</strong> questões. Requer ${levelInfo.pass}% para aprovação. Revise o conteúdo e tente novamente.`}</div>
      <div class="quiz-results-score"><span class="quiz-score-val">${pct}%</span><span class="quiz-score-pct">${correct}/${total}</span></div>
      <div class="quiz-results-actions">
        ${passed?`<button class="quiz-btn quiz-btn-submit" onclick="CERTIFICATIONS.downloadCert('${cert.id}')">Baixar Certificado</button>`:''}
        <button class="quiz-btn quiz-btn-prev" onclick="CERTIFICATIONS.closeQuiz()">Fechar</button>
      </div>`;
  }

  function closeQuiz() {
    clearInterval(_timer);
    _currentQuiz = null;
    _currentQ = 0;
    _answers = {};
    const overlay = document.getElementById('certQuizOverlay');
    if (overlay) overlay.style.display = 'none';
    if (_quizCallback) { _quizCallback(); _quizCallback = null; }
  }

  /* ─── Certificate generation (SVG) ─── */
  function downloadCert(certId) {
    const s = _session();
    if (!s) return;
    const my = _getMyCerts();
    let certData = null;
    let catId = null;
    for (const [k, v] of Object.entries(my)) {
      if (v.certId === certId) { certData = v; catId = k; break; }
    }
    if (!certData) return;
    const cat = CATALOG.find(c => c.id === catId);
    const levelInfo = LEVELS[certData.level || (cat && cat.level) || 1];
    const userName = s.name || s.userName || s.email || 'Profissional ADAS PRO';

    const svg = _buildCertSVG({
      certId,
      userName,
      certName: certData.name || (cat && cat.name) || 'Certificação ADAS',
      levelName: levelInfo.name,
      levelColor: levelInfo.color,
      score: certData.score,
      date: _formatDate(certData.earnedAt),
      expires: _formatDate(certData.expiresAt)
    });

    const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `certificado-${certId}.svg`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function _buildCertSVG(d) {
    const qrData = `https://adaspro.com.br/cert/verify/${d.certId}`;
    const qrSvg  = _qrCodeSVG(qrData, 100, 0, 0, 0, '#1B2B4D');

    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="800" height="560" viewBox="0 0 800 560">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#0B1426"/><stop offset="100%" stop-color="#162447"/></linearGradient>
    <linearGradient id="accent" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="#FF6B35"/><stop offset="100%" stop-color="#F4A261"/></linearGradient>
    <linearGradient id="gold" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#F4A261"/><stop offset="100%" stop-color="#E8A83E"/></linearGradient>
  </defs>
  <rect width="800" height="560" rx="20" fill="url(#bg)"/>
  <rect x="20" y="20" width="760" height="520" rx="14" fill="none" stroke="url(#accent)" stroke-width="2"/>
  <rect x="28" y="28" width="744" height="504" rx="10" fill="none" stroke="rgba(255,107,53,0.12)" stroke-width="1"/>
  <text x="400" y="72" text-anchor="middle" fill="#FF6B35" font-family="Arial,Helvetica,sans-serif" font-size="11" font-weight="700" letter-spacing="4">CERTIFICADO DE CONCLUSÃO</text>
  <line x1="320" y1="84" x2="480" y2="84" stroke="url(#accent)" stroke-width="1.5"/>
  <text x="400" y="130" text-anchor="middle" fill="white" font-family="Georgia,serif" font-size="26" font-weight="700">ADAS PRO</text>
  <text x="400" y="160" text-anchor="middle" fill="rgba(255,255,255,0.45)" font-family="Arial,sans-serif" font-size="11">Plataforma de Capacitação em Sistemas ADAS</text>
  <text x="400" y="215" text-anchor="middle" fill="rgba(255,255,255,0.5)" font-family="Arial,sans-serif" font-size="12">Certificamos que</text>
  <text x="400" y="260" text-anchor="middle" fill="white" font-family="Georgia,serif" font-size="24" font-weight="700">${_escSvg(d.userName)}</text>
  <line x1="180" y1="278" x2="620" y2="278" stroke="rgba(255,107,53,0.25)" stroke-width="0.8"/>
  <text x="400" y="310" text-anchor="middle" fill="rgba(255,255,255,0.5)" font-family="Arial,sans-serif" font-size="12">concluiu com sucesso a certificação</text>
  <text x="400" y="348" text-anchor="middle" fill="${d.levelColor}" font-family="Georgia,serif" font-size="18" font-weight="700">${_escSvg(d.certName)}</text>
  <text x="400" y="374" text-anchor="middle" fill="${d.levelColor}" font-family="Arial,sans-serif" font-size="11" font-weight="700" opacity="0.8">${_escSvg(d.levelName)} · ${d.score}%</text>
  <line x1="280" y1="396" x2="520" y2="396" stroke="rgba(255,255,255,0.1)" stroke-width="0.8"/>
  <text x="400" y="422" text-anchor="middle" fill="rgba(255,255,255,0.4)" font-family="Arial,sans-serif" font-size="10">Emitido em ${d.date} · Válido até ${d.expires}</text>
  <text x="400" y="444" text-anchor="middle" fill="rgba(255,255,255,0.3)" font-family="'Courier New',monospace" font-size="9">ID: ${d.certId}</text>
  <rect x="58" y="452" width="100" height="100" rx="8" fill="white" stroke="rgba(0,0,0,0.08)"/>
  ${qrSvg}
  <text x="108" y="564" text-anchor="middle" fill="rgba(0,0,0,0.3)" font-family="Arial,sans-serif" font-size="7">Escaneie para validar</text>
  <g transform="translate(580,480)">
    <text x="0" y="0" fill="rgba(255,255,255,0.18)" font-family="Arial,sans-serif" font-size="8">ADAS PRO · adaspro.com.br</text>
  </g>
</svg>`;
  }

  function _escSvg(s) {
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  /* ─── Simple QR code SVG generator (visual placeholder + encoded data via canvas-like pattern) ─── */
  function _qrCodeSVG(text, size, x, y, padding, fg) {
    const m = size + padding * 2;
    const cells = 21;
    const cellSize = size / cells;
    let rects = '';
    const hash = _simpleHash(text);
    for (let r = 0; r < cells; r++) {
      for (let c = 0; c < cells; c++) {
        const isFinder = (r < 7 && c < 7) || (r < 7 && c >= cells-7) || (r >= cells-7 && c < 7);
        const isQuiet  = isFinder && (r===0||r===6||c===0||c===6||(r>=cells-7&&c>=cells-7));
        const isBorder = isFinder && !isQuiet && (r===0||r===6||c===0||c===6||(r>=cells-7&&c>=cells-7)||(r>=1&&r<=5&&c>=1&&c<=5)||(r>=cells-6&&r<=cells-2&&c>=1&&c<=5)||(r>=1&&r<=5&&c>=cells-6&&c<=cells-2));
        const isCenter = isFinder && ((r>=2&&r<=4&&c>=2&&c<=4)||(r>=cells-5&&r<=cells-3&&c>=2&&c<=4)||(r>=2&&r<=4&&c>=cells-5&&c<=cells-3));
        let fill = false;
        if (isBorder || isCenter) fill = true;
        else if (!isFinder) fill = ((hash + r * 31 + c * 17) % 7) < 3;
        if (fill) {
          rects += `<rect x="${(x || 0) + c * cellSize}" y="${(y || 0) + r * cellSize}" width="${cellSize}" height="${cellSize}" fill="${fg || '#1B2B4D'}"/>`;
        }
      }
    }
    return `<g>${rects}</g>`;
  }

  function _simpleHash(s) {
    let h = 0;
    for (let i = 0; i < s.length; i++) { h = ((h << 5) - h + s.charCodeAt(i)) | 0; }
    return Math.abs(h);
  }

  /* ─── View certificate overlay ─── */
  function viewCert(certId) {
    const s = _session();
    if (!s) return;
    const my = _getMyCerts();
    let certData = null, catId = null;
    for (const [k, v] of Object.entries(my)) {
      if (v.certId === certId) { certData = v; catId = k; break; }
    }
    if (!certData) return;
    const cat = CATALOG.find(c => c.id === catId);
    const levelInfo = LEVELS[certData.level || (cat && cat.level) || 1];
    const userName = s.name || s.userName || s.email || 'Profissional ADAS PRO';

    const svg = _buildCertSVG({
      certId, userName,
      certName: certData.name || (cat && cat.name) || 'Certificação ADAS',
      levelName: levelInfo.name, levelColor: levelInfo.color,
      score: certData.score,
      date: _formatDate(certData.earnedAt),
      expires: _formatDate(certData.expiresAt)
    });

    let overlay = document.getElementById('certPreviewOverlay');
    if (!overlay) { overlay = document.createElement('div'); overlay.id = 'certPreviewOverlay'; document.body.appendChild(overlay); }
    overlay.className = 'cert-preview-overlay';
    overlay.style.display = 'flex';
    overlay.innerHTML = `
      <div class="cert-preview-box">
        <div class="cert-preview-header">
          <div class="cert-preview-title">Certificado ${certData.certId}</div>
          <button class="quiz-close" onclick="document.getElementById('certPreviewOverlay').style.display='none'">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div class="cert-preview-body"><div class="cert-svg-wrap">${svg}</div></div>
      </div>`;
  }

  /* ─── Public API ─── */
  return {
    CATALOG,
    LEVELS,
    QUESTIONS,
    getCategories()  { return CATS; },
    getCatIcon(cat)  { return CAT_ICONS[cat] || '📦'; },
    getCertStatus,
    getMyCerts,
    getQuizLog()     { return _get(K_QUIZ_LOG, []); },
    formatDate:      _formatDate,
    formatTime:      _formatTime,
    startQuiz,
    quizNav,
    closeQuiz,
    downloadCert,
    viewCert,
    setQuizCallback(fn) { _quizCallback = fn; }
  };
})();
