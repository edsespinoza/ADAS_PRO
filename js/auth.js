/* ================================================
   ADAS PRO — Sistema de Autenticação e Dados
   ================================================
   Empresa:     AutoTech Service
   Produto:     ADAS PRO Platform
   Versão:      4.0.1  build 20260507
   Modos:       1) Supabase Auth + PostgreSQL
                2) localStorage (demo/local fallback)
   Copyright:   © 2024-2026 AutoTech Service
   ================================================ */

const AUTH = (function () {

  const VERSION = {
    major:4,minor:0,patch:1,build:'20260507',codename:'Supabase',
    company:'AutoTech Service',product:'ADAS PRO Platform',full:'v4.0.1',
    display:'v4.0.1 build 20260507',stamp:'v4.0.1-20260507',
  };

  /* ─── Chaves localStorage ─── */
  const STORE_KEY    = 'adaspro_users';
  const TICKETS_KEY  = 'adaspro_tickets';
  const NOTIF_KEY    = 'adaspro_notifications';
  const SESSION_KEY  = 'adaspro_session';
  const SETTINGS_KEY = 'adaspro_settings';
  const CONTENT_KEY  = 'adaspro_content';
  const ARTICLES_KEY  = 'adaspro_articles';
  const BULLETINS_KEY = 'adaspro_bulletins';

  /* ─── Categorias ─── */
  const CATEGORIES = [
    { id:'honda',      label:'Honda & Acura',        icon:'🔵' },
    { id:'toyota',     label:'Toyota & Lexus',        icon:'🔴' },
    { id:'nissan',     label:'Nissan & Infiniti',     icon:'🟡' },
    { id:'subaru',     label:'Subaru EyeSight',       icon:'🟢' },
    { id:'hyundai',    label:'Hyundai & Kia',         icon:'🔷' },
    { id:'vag',        label:'VAG (Audi/VW/Seat)',    icon:'🟣' },
    { id:'mercedes',   label:'Mercedes-Benz',         icon:'⭕' },
    { id:'ford',       label:'Ford & Lincoln',        icon:'🔸' },
    { id:'radar',      label:'Radar Universal',       icon:'📡' },
    { id:'mazda',      label:'Mazda AVM 360°',        icon:'🔶' },
    { id:'mitsubishi', label:'Mitsubishi',            icon:'🔹' },
    { id:'chineses',   label:'BYD / Chery / MG',      icon:'🇨🇳' },
  ];

  /* ─── Conteúdo padrão ─── */
  const DEFAULT_CONTENT = [
    { id:'honda-lkas',     cat:'honda',     title:'Honda LKAS Calibration',          desc:'Guia completo de calibração do sistema LKAS para Honda e Acura. Inclui targets Tipo 1 e Tipo 2, medições e lista de modelos suportados 2016–2024.',             type:'pdf',icon:'📄',accessLevel:2,downloadLevel:3,filePath:null,fileSize:'2.4 MB',pages:18,version:'v3.1',updatedAt:'Abr/2026',models:['Civic','CR-V','HR-V','Accord','Fit','Pilot','Acura RDX','Acura MDX'],highlights:['Target Tipo 1: impressão A4 × 4 folhas','Target Tipo 2: plotagem única 80×120cm','Distância de calibração: 3,0 m da câmera','Altura do centro ótico: verificar por modelo','Compatível com 89 variantes regionais'] },
    { id:'honda-avm',      cat:'honda',     title:'Honda AVM 360° — Around View',    desc:'Padrão de calibração AVM para câmeras de visão panorâmica Honda e Acura. 4 targets (F/R/L/D). Inclui medições de posicionamento e checklist de verificação.',type:'pdf',icon:'📄',accessLevel:2,downloadLevel:3,filePath:null,fileSize:'1.8 MB',pages:12,version:'v2.4',updatedAt:'Mar/2026',models:['CR-V 2017+','Odyssey','Pilot','Passport','Ridgeline','Acura RDX','Acura MDX'],highlights:['4 targets: Frontal, Traseiro, L, D','Checkerboard 18×14 quadrados','Espaçamento de piso: ver tabela por modelo','Ferramenta de diagnóstico: HDS obrigatório'] },
    { id:'honda-acc',      cat:'honda',     title:'Honda ACC Radar Frontal',         desc:'Calibração do sensor de radar frontal para ACC e CMBS. Honda Sensing de 2nd e 3rd geração. Guia de alinhamento e reset via HDS.',                            type:'pdf',icon:'📄',accessLevel:2,downloadLevel:3,filePath:null,fileSize:'1.5 MB',pages:10,version:'v2.0',updatedAt:'Jan/2026',models:['Civic 2022+','CR-V 2023+','Accord 2023+','HR-V 2023+'],highlights:['Reset via HDS — menu CMBS','Posição fixa em superfície nivelada','Sem target físico — calibração dinâmica','Exige velocidade mínima: 30 km/h'] },
    { id:'toyota-ldw',     cat:'toyota',    title:'Toyota LDW/LDA — Target 120°',    desc:'Sistema Lane Departure Warning para veículos Toyota/Lexus. Target de calibração 120°. Inclui lista completa de 142 modelos suportados e procedimento passo a passo.',type:'pdf',icon:'📄',accessLevel:2,downloadLevel:3,filePath:null,fileSize:'3.1 MB',pages:22,version:'v4.2',updatedAt:'Abr/2026',models:['Corolla','Camry','RAV4','Hilux','Yaris','Lexus UX','Lexus NX','Lexus RX'],highlights:['Target 120° — impressão A4 × 3 folhas','Altura do centro da câmera: 1.200 mm do solo','Distância: 1,0 m da parte frontal do capô','Verificar código C1A50 antes do procedimento','142 modelos: 2015–2024'] },
    { id:'toyota-180',     cat:'toyota',    title:'Toyota LDA — Target 180°',        desc:'Target de calibração 180° para câmeras frontais Toyota/Lexus 2019+. Resolução para modelos com câmera dupla (stereo) e suporte ao sistema PCS.',              type:'pdf',icon:'📄',accessLevel:2,downloadLevel:3,filePath:null,fileSize:'2.9 MB',pages:20,version:'v3.8',updatedAt:'Mar/2026',models:['RAV4 2019+','Camry 2019+','Corolla 2019+','Lexus ES','Lexus UX 200/250h'],highlights:['Target 180° — plotagem 60×90cm','Compatível com câmera estéreo','Procedimento inclui calibração vertical e horizontal','Requer Techstream para confirmação'] },
    { id:'toyota-avm',     cat:'toyota',    title:'Toyota & Lexus AVM 360°',         desc:'Calibração Around View Monitor para Toyota e Lexus. Targets frontal, traseiro, lateral E e D. Medições exatas por modelo. Checklist de 12 pontos.',           type:'pdf',icon:'📄',accessLevel:2,downloadLevel:3,filePath:null,fileSize:'2.2 MB',pages:14,version:'v2.9',updatedAt:'Fev/2026',models:['Corolla Cross','RAV4','Fortuner','Land Cruiser','Lexus LX','Lexus GX'],highlights:['4 targets padrão xadrez','Papel A4 — sem necessidade de plotagem','Exige superfície plana e nivelada ±2mm','Ferramenta: Techstream v15+'] },
    { id:'nissan-lka',     cat:'nissan',    title:'Nissan/Infiniti LKA — Tipo 1',    desc:'348+ modelos suportados. Cobertura 2013–2024. Múltiplas regiões geográficas (JP, US, EU, BR). Target único de alta resolução.',                                type:'pdf',icon:'📄',accessLevel:2,downloadLevel:3,filePath:null,fileSize:'4.7 MB',pages:28,version:'v5.1',updatedAt:'Abr/2026',models:['Sentra','Frontier','X-Trail','Kicks','Murano','Infiniti Q50','Infiniti QX60','Infiniti QX80'],highlights:['348 modelos cobertos','Target único — plotagem 58×90cm','Margens de tolerância: ±0,5°','Requer Consult-III Plus para confirmação','Cobre regiões: JP/US/EU/MEA/BR'] },
    { id:'nissan-propilot',cat:'nissan',    title:'Nissan ProPilot Assist',          desc:'Manual técnico de calibração do sistema ProPilot 1.0 e 2.0. Padrão para impressão A4 × 7 folhas. Câmera frontal + radar frontal.',                           type:'pdf',icon:'📄',accessLevel:2,downloadLevel:3,filePath:null,fileSize:'3.3 MB',pages:24,version:'v3.0',updatedAt:'Mar/2026',models:['Kicks 2021+','Frontier 2022+','Sentra 2021+','Leaf 2020+','Ariya'],highlights:['ProPilot 1.0 e 2.0','Target A4 × 7 folhas (mosaico)','Calibração câmera + radar em sequência','Velocidade de verificação: 60–100 km/h'] },
    { id:'nissan-radar',   cat:'nissan',    title:'Hitachi Radar — Infiniti/Nissan', desc:'Targets de radar Hitachi para ACC e AEB. Infiniti QX50/QX55/QX60/QX80. Procedimento de alinhamento e diagnóstico de falha B261A.',                          type:'pdf',icon:'📄',accessLevel:2,downloadLevel:3,filePath:null,fileSize:'2.1 MB',pages:16,version:'v2.2',updatedAt:'Jan/2026',models:['Infiniti QX50','Infiniti QX55','Infiniti QX60','Infiniti QX80'],highlights:['Radar Hitachi 77 GHz','Falha B261A — procedimento de reset','Target reflexivo — dimensões exatas','Distância: 3,5 m do para-choque frontal'] },
    { id:'subaru-type1',   cat:'subaru',    title:'Subaru EyeSight — Tipo 1',        desc:'Calibração EyeSight geração 1 e 2. 350+ entradas. Ascent, Forester, Outback, Legacy e mais. Sistema estéreo — exige calibração binocular.',                   type:'pdf',icon:'📄',accessLevel:3,downloadLevel:3,filePath:null,fileSize:'5.2 MB',pages:32,version:'v4.5',updatedAt:'Abr/2026',models:['Forester 2015–2019','Outback 2015–2019','Legacy 2015–2019','Ascent 2018–2019','Impreza'],highlights:['Câmera estéreo — calibração binocular','Target único 180° — plotagem obrigatória','Alinhamento X/Y com tolerância ±0,3°','Subaru Select Monitor obrigatório','350+ modelos e variantes'] },
    { id:'subaru-type2',   cat:'subaru',    title:'Subaru EyeSight — Tipo 2',        desc:'Nova geração EyeSight 2020+. HEV e EV compatível. Crosstrek, Legacy 2020, WRX, XV. Câmera estéreo de nova geração com maior alcance.',                      type:'pdf',icon:'📄',accessLevel:3,downloadLevel:3,filePath:null,fileSize:'4.8 MB',pages:30,version:'v3.6',updatedAt:'Mar/2026',models:['Crosstrek 2020+','Legacy 2020+','Outback 2020+','WRX 2022+','Forester 2020+'],highlights:['EyeSight 2a geração — câmera wide-angle','Target tamanho aumentado 210×180cm','HEV/PHEV: desligar motor antes da calibração','SSM IV versão 2023+ recomendada'] },
    { id:'hyundai-avm',    cat:'hyundai',   title:'Hyundai & Kia AVM 360°',         desc:'Padrões de calibração AVM. 4 câmeras. Suporte a modelos 2017–2024, múltiplas regiões. Inclui procedimento SCC e BSD combinado.',                             type:'pdf',icon:'📄',accessLevel:3,downloadLevel:3,filePath:null,fileSize:'2.6 MB',pages:18,version:'v3.3',updatedAt:'Mar/2026',models:['Tucson','Santa Fe','Sorento','Sportage','Staria','Ioniq 5','EV6'],highlights:['Calibração simultânea 4 câmeras','Padrão xadrez 550×400mm','Altura do piso: verificar tabela','GDS/KDS obrigatório','Inclui BSD e RCCW combinados'] },
    { id:'hyundai-radar',  cat:'hyundai',   title:'Genesis/Hyundai — SCC/ACC Radar', desc:'Sistema SCC/ACC/AEB/FCA/LFA. Smart Cruise Control e Autonomous Emergency Braking. Target reflexivo para radar 77 GHz.',                                        type:'pdf',icon:'📄',accessLevel:3,downloadLevel:3,filePath:null,fileSize:'3.0 MB',pages:20,version:'v2.8',updatedAt:'Fev/2026',models:['Genesis G80','Genesis GV80','Sonata 2020+','Palisade','K5','Carnival'],highlights:['Radar 77 GHz — target reflexivo alumínio','Altura de posicionamento: 500mm do solo','Distância: 2,5 m do para-choque','Reset obrigatório via GDS mobile'] },
    { id:'audi-lidar',     cat:'vag',       title:'Audi LIDAR ACC — VAS6430-12',    desc:'Target proprietário VAS6430-12 para calibração LIDAR do ACC Audi. Arquivo Photoshop incluso. Procedimento com ODIS Engineering.',                            type:'pdf',icon:'📄',accessLevel:3,downloadLevel:4,filePath:null,fileSize:'6.1 MB',pages:38,version:'v5.0',updatedAt:'Abr/2026',models:['A4 2016+','A6 2019+','A7','A8','Q5 2017+','Q7 2016+','Q8','e-tron'],highlights:['Target VAS6430-12 — arquivo PS incluso','Impressão em papel fotográfico fosco','Calibração estática + dinâmica','ODIS Engineering v12+ obrigatório','Código de falha 00526 — procedimento de reset'] },
    { id:'vag-avm',        cat:'vag',       title:'VW/Audi/Seat/Skoda AVM',         desc:'Calibração AVM para todo grupo VAG. Tipos 1 e 2 disponíveis. Inclui Tiguan, Passat, Golf, Touareg e modelos Seat/Skoda.',                                   type:'pdf',icon:'📄',accessLevel:3,downloadLevel:4,filePath:null,fileSize:'2.8 MB',pages:22,version:'v3.4',updatedAt:'Mar/2026',models:['Tiguan','Passat','Touareg','Golf','Seat Tarraco','Skoda Kodiaq','Seat Ateca'],highlights:['Tipo 1: padrão xadrez A3 × 4','Tipo 2: target cinza uniforme','ODIS S obrigatório para ativação','Verificação pós-calibração: tolerância ±0,5°'] },
    { id:'mercedes-night', cat:'mercedes',  title:'Mercedes Night Vision',          desc:'Calibração de câmera infravermelha de visão noturna Mercedes-Benz. Classe S, E, GLE. Target térmico passivo + procedimento XENTRY.',                         type:'pdf',icon:'📄',accessLevel:3,downloadLevel:4,filePath:null,fileSize:'3.5 MB',pages:26,version:'v3.1',updatedAt:'Fev/2026',models:['Classe S W222','Classe S W223','Classe E W213','GLE W167','GLS W167'],highlights:['Câmera IR passiva — sem laser','Target térmico 40×40cm — papel alumínio','Distância: 4,0 m do para-choque','XENTRY Diagnostics DAS obrigatório','Falha B1B0000 — diagnóstico incluído'] },
    { id:'mercedes-rcw',   cat:'mercedes',  title:'Mercedes RCW — Radar Traseiro',  desc:'Rear Cross-traffic Warning e Active Blind Spot Assist. Guia de impressão e medições. Radar 77 GHz traseiro E/D.',                                            type:'pdf',icon:'📄',accessLevel:3,downloadLevel:4,filePath:null,fileSize:'2.4 MB',pages:16,version:'v2.5',updatedAt:'Jan/2026',models:['Classe C W206','Classe E W213','GLC X254','GLE W167','Classe A W177'],highlights:['2 radares traseiros (E e D)','Target reflexivo 300×300mm','Posicionamento em relação ao plano do para-choque','Verificação via XENTRY — Test Plan'] },
    { id:'ford-avm',       cat:'ford',      title:'Ford AVM 360° — LH/RH Target',  desc:'Target LH (esquerdo) e RH (direito) para calibração AVM Ford. Inclui arquivo Photoshop (.psb). Ranger, Bronco Sport, Edge, Explorer.',                       type:'pdf',icon:'📄',accessLevel:3,downloadLevel:4,filePath:null,fileSize:'4.2 MB',pages:28,version:'v3.7',updatedAt:'Mar/2026',models:['Ranger 2022+','Bronco Sport','Edge','Explorer 2020+','F-150','Lincoln Nautilus'],highlights:['2 targets: LH e RH (laterais)','Arquivo .psb Photoshop incluso','Impressão em papel fosco 90g ou superior','IDS/FDRS obrigatório — versão 119+'] },
    { id:'radar-univ',     cat:'radar',     title:'Universal Radar Plate — ACC',    desc:'Solução universal de target para ACC/SCC/AEB/FCA/FR. Compatível com Genesis, Hyundai, Kia, Nissan, Toyota, Mazda e mais. Placa reflexiva 300×300mm.',         type:'pdf',icon:'📄',accessLevel:3,downloadLevel:4,filePath:null,fileSize:'1.9 MB',pages:12,version:'v2.1',updatedAt:'Abr/2026',models:['Genesis G70/G80/G90','Hyundai Sonata','Kia Sorento','Nissan Sentra','Toyota Camry'],highlights:['Placa reflexiva 300×300mm alumínio escovado','Distância: 2,5–3,5m conforme fabricante','Verificar frequência do radar: 77 GHz','Medição de altura: centro do radar ±5mm'] },
    { id:'mazda-avm',      cat:'mazda',     title:'Mazda AVM 360° + FSC',           desc:'Front Side Camera target, calibração multi-ângulo. Guias de impressão A4 inclusos. CX-5, CX-50, CX-90. Suporte ao i-Activsense.',                            type:'pdf',icon:'📄',accessLevel:3,downloadLevel:4,filePath:null,fileSize:'3.7 MB',pages:24,version:'v2.6',updatedAt:'Mar/2026',models:['CX-5 2021+','CX-50','CX-90','Mazda3 2019+','Mazda6','CX-30'],highlights:['FSC: Front Side Camera lateral','Target A4 × 2 folhas por câmera','i-Activsense — MRCC e LAS integrados','MAZDA Modular Diagnostic System obrigatório'] },
    { id:'mitsubishi-lka', cat:'mitsubishi',title:'Mitsubishi LKA + AVM',           desc:'Eclipse Cross, Outlander, EK-models. Tipos 1 e 2 com câmera LH/RH. Mi-Pilot e Forward Collision Mitigation.',                                                type:'pdf',icon:'📄',accessLevel:3,downloadLevel:4,filePath:null,fileSize:'2.5 MB',pages:18,version:'v2.3',updatedAt:'Fev/2026',models:['Eclipse Cross 2018+','Outlander 2022+','ASX 2023+','Pajero Sport'],highlights:['LKA Tipo 1 e Tipo 2','Target LH e RH para AVM','Mi-Pilot: calibração dinâmica complementar','MUT-III ou MELCO Diagnostic Tool'] },
    { id:'byd-avm',        cat:'chineses',  title:'BYD AVM — 4 Variantes',          desc:'Padrão de calibração AVM para veículos BYD. 4 variantes (Tipo A/B/C/D) em PNG alta resolução + PDF guiado. BYD Dolphin, Seal, Han, Atto 3.',                type:'pdf',icon:'📄',accessLevel:3,downloadLevel:4,filePath:null,fileSize:'2.3 MB',pages:16,version:'v1.8',updatedAt:'Abr/2026',models:['BYD Dolphin','BYD Seal','BYD Atto 3','BYD Han','BYD Tang','BYD Song Plus'],highlights:['4 variantes: A, B, C e D','Arquivos PNG 300dpi + PDF guia','Posição: 1,0m de cada câmera','DiagZone ou BYD Workshop obrigatório'] },
    { id:'mg-chery',       cat:'chineses',  title:'MG & Chery / EXEED AVM',         desc:'Padrões de calibração AVM para MG, Chery e EXEED. Múltiplos tipos. ZS EV, Tiggo 8 Pro, EXEED VX. Crescente no mercado brasileiro.',                        type:'pdf',icon:'📄',accessLevel:3,downloadLevel:4,filePath:null,fileSize:'2.1 MB',pages:14,version:'v1.6',updatedAt:'Mar/2026',models:['MG ZS','MG HS','MG5 EV','Chery Tiggo 8 Pro','EXEED VX','EXEED LX'],highlights:['Padrão xadrez 550×400mm','Altura padrão ±5mm do gabarito','CDAS Chery Diagnostic obrigatório','Inclui tabela de offsets por modelo'] },
  ];

  /* ─── Planos ─── */
  const PLANS = [
    { id:'free',   name:'Gratuito', badge:'FREE',    price:0,   period:null,  color:'#9CA3AF',modules:[],                         features:['Dashboard','Materiais demo','Suporte básico'] },
    { id:'modulo', name:'Módulo',   badge:'MÓDULO',  price:47,  period:'mês', color:'#00B4D8',modules:'custom',                   features:['1 categoria à sua escolha','Todos os materiais','Atualizações inclusas'] },
    { id:'pro',    name:'Pro',      badge:'PRO',     price:97,  period:'mês', color:'#FF6B35',modules:['honda','toyota','nissan'],features:['Honda & Acura','Toyota & Lexus','Nissan & Infiniti','Suporte prioritário'],popular:true },
    { id:'premium',name:'Premium',  badge:'PREMIUM', price:197, period:'mês', color:'#F4A261',modules:'all',                      features:['Todas as 12 categorias','Suporte urgente 4h','Novidades em primeira mão','Consultoria individual'] },
  ];

  /* ─── Configurações padrão ─── */
  const DEFAULT_SETTINGS = {
    general:{ siteName:'ADAS PRO',tagline:'Mentoria técnica em Sistemas ADAS',contactEmail:'',whatsapp:'',welcomeMessage:'Bem-vindo à plataforma ADAS PRO! Acesse os materiais técnicos disponíveis no menu lateral.',membershipNote:'Para solicitar acesso a novas categorias, abra um ticket de suporte.' },
    plans:[
      { id:'starter', name:'Consulta Pontual', price:'Consulte',period:'por sessão',defaultCategories:[],active:true },
      { id:'pro',     name:'Mentoria Mensal',  price:'Consulte',period:'por mês',   defaultCategories:['honda','toyota','nissan'],active:true },
      { id:'premium', name:'Suporte Premium',  price:'Consulte',period:'por mês',   defaultCategories:['honda','toyota','nissan','subaru','hyundai','vag','mercedes','ford','radar','mazda','mitsubishi','chineses'],active:true },
    ],
    appearance:{ accentColor:'#FF6B35',logoText:'ADAS PRO' },
    notifications:{ newUserAlert:true,newTicketAlert:true },
  };

  /* ════════════════════════════════════════════
     ESTADO INTERNO
  ════════════════════════════════════════════ */
  let _sb           = null;    // Supabase client
  let _mode         = 'local'; // 'supabase' | 'local'
  let _demo         = false;
  let _sbConfigured = false;   // true se Supabase foi detectado (impede fallback localStorage)
  let _offlineMode  = false;   // true quando Supabase foi configurado mas está inacessível

  let _users         = {};
  let _tickets       = {};
  let _notifications = [];
  let _currentSession = null;
  let _pendingMfaUser = null; // usuário aguardando MFA
  let _pendingMfaUid  = null; // UUID Supabase do usuário aguardando MFA

  /* ════════════════════════════════════════════
     SUPABASE — Operações de banco
  ════════════════════════════════════════════ */

  async function _sbLoadAll() {
    try {
      const [u, t, n] = await Promise.all([
        _sb.from('users').select('*'),
        _sb.from('tickets').select('*').order('updatedAt', { ascending: false }),
        _sb.from('notifications').select('*').order('createdAt', { ascending: false }).limit(50),
      ]);
      if (!u.error && u.data) _users         = Object.fromEntries(u.data.map(x => [x.id, x]));
      if (!t.error && t.data) _tickets       = Object.fromEntries(t.data.map(x => [x.id, x]));
      if (!n.error && n.data) _notifications = n.data;
    } catch(e) { console.warn('[AUTH] _sbLoadAll:', e.message); }
  }

  async function _sbLoadUser(id) {
    try {
      const { data, error } = await _sb.from('users').select('*').eq('id', id).single();
      if (!error && data) { _users[data.id] = data; return data; }
    } catch(e) { console.warn('[AUTH] _sbLoadUser:', e.message); }
    return null;
  }

  async function _sbLoadMemberData(userId) {
    try {
      const [t, n] = await Promise.all([
        _sb.from('tickets').select('*').eq('userId', userId).order('updatedAt', { ascending: false }),
        _sb.from('notifications').select('*').eq('userId', userId).order('createdAt', { ascending: false }).limit(50),
      ]);
      if (!t.error && t.data) t.data.forEach(tk => _tickets[tk.id] = tk);
      if (!n.error && n.data) _notifications = n.data;
    } catch(e) { console.warn('[AUTH] _sbLoadMemberData:', e.message); }
  }

  function _sbUpsertUser(user) {
    if (_mode !== 'supabase' || _demo) { _saveUsersLocal(); return; }
    _sb.from('users').upsert(user).then(({ error }) => {
      if (error) console.error('[AUTH] upsertUser:', error.message);
    });
  }

  function _sbUpsertTicket(ticket) {
    if (_mode !== 'supabase' || _demo) { _saveTicketsLocal(); return; }
    _sb.from('tickets').upsert(ticket).then(({ error }) => {
      if (error) console.error('[AUTH] upsertTicket:', error.message);
    });
  }

  async function _sbInsertNotif(notif) {
    if (_mode !== 'supabase' || _demo) { _saveNotifsLocal(); return; }
    const { error } = await _sb.from('notifications').insert(notif);
    if (error) console.error('[AUTH] insertNotif:', error.message);
  }

  function _sbDeleteUser(id) {
    if (_mode !== 'supabase' || _demo) { _saveUsersLocal(); return; }
    _sb.from('users').delete().eq('id', id).then(({ error }) => {
      if (error) console.error('[AUTH] deleteUser:', error.message);
    });
  }

  function _sbDeleteTicket(id) {
    if (_mode !== 'supabase' || _demo) { _saveTicketsLocal(); return; }
    _sb.from('tickets').delete().eq('id', id).then(({ error }) => {
      if (error) console.error('[AUTH] deleteTicket:', error.message);
    });
  }

  /* ════════════════════════════════════════════
     LOCAL STORAGE — Fallback
  ════════════════════════════════════════════ */

  function _saveUsersLocal()  { localStorage.setItem(STORE_KEY,   JSON.stringify(_users));   }
  function _saveTicketsLocal(){ localStorage.setItem(TICKETS_KEY, JSON.stringify(_tickets)); }
  function _saveNotifsLocal() { localStorage.setItem(NOTIF_KEY,   JSON.stringify(_notifications.slice(0,50))); }

  function _loadFromLocalStorage() {
    try { const u=localStorage.getItem(STORE_KEY);   const p=u?JSON.parse(u):{};   _users         = (p&&typeof p==='object'&&!Array.isArray(p))?p:{}; }
    catch { _users={}; }
    try { const t=localStorage.getItem(TICKETS_KEY); const p=t?JSON.parse(t):{};   _tickets       = (p&&typeof p==='object'&&!Array.isArray(p))?p:{}; }
    catch { _tickets={}; }
    try { const n=localStorage.getItem(NOTIF_KEY);   const p=n?JSON.parse(n):[];   _notifications = Array.isArray(p)?p:[]; }
    catch { _notifications=[]; }
  }

  /* Senhas do seed LOCAL — uso exclusivo do fallback offline/dev.
     DEVEM ser diferentes das senhas reais de produção no Supabase Auth.
     Em produção, o Supabase sempre é acessível e este fallback nunca é atingido. */
  const _DEMO_SA_PASS = 'ADAS_OFFLINE_SA_2026';
  const _DEMO_AD_PASS = 'ADAS_OFFLINE_AD_2026';

  async function _seedDefaultUsersLocal() {
    const _SA_EMAIL = 'superadmin@adaspro.com.br';
    const _AD_EMAIL = 'admin@adaspro.com.br';
    let dirty = false;
    if (!_users['superadmin']) {
      _users['superadmin'] = { id:'superadmin',name:'AutoTech Service',email:_SA_EMAIL,passwordHash: await hashPassword(_DEMO_SA_PASS),role:'superadmin',status:'active',permissions:CATEGORIES.map(c=>c.id),plan:'premium',accessType:'full',accessExpires:null,boughtModules:[],createdAt:Date.now(),approvedAt:Date.now(),approvedBy:'system' };
      dirty = true;
    } else {
      const sa = _users['superadmin'];
      if (sa.email !== _SA_EMAIL) { sa.email = _SA_EMAIL; dirty = true; }
      if (sa.status !== 'active') { sa.status = 'active'; dirty = true; }
      // Recalcula se ausente, corrompido OU se a senha mudou (hash não bate com a senha atual)
      if (!sa.passwordHash?.startsWith('$pbk$') || !(await checkHash(_DEMO_SA_PASS, sa.passwordHash))) {
        sa.passwordHash = await hashPassword(_DEMO_SA_PASS); dirty = true;
      }
    }
    if (!_users['admin']) {
      _users['admin'] = { id:'admin',name:'Administrador',email:_AD_EMAIL,passwordHash: await hashPassword(_DEMO_AD_PASS),role:'admin',status:'active',permissions:CATEGORIES.map(c=>c.id),plan:'premium',accessType:'full',accessExpires:null,boughtModules:[],createdAt:Date.now(),approvedAt:Date.now(),approvedBy:'superadmin' };
      dirty = true;
    } else {
      const ad = _users['admin'];
      if (ad.email !== _AD_EMAIL) { ad.email = _AD_EMAIL; dirty = true; }
      if (ad.status !== 'active') { ad.status = 'active'; dirty = true; }
      // Recalcula se ausente, corrompido OU se a senha mudou
      if (!ad.passwordHash?.startsWith('$pbk$') || !(await checkHash(_DEMO_AD_PASS, ad.passwordHash))) {
        ad.passwordHash = await hashPassword(_DEMO_AD_PASS); dirty = true;
      }
    }
    if (dirty) _saveUsersLocal();
  }

  /* ─── Hash (fallback local) ─── */
  function _genSalt() {
    const b = crypto.getRandomValues(new Uint8Array(16));
    return Array.from(b, x => x.toString(16).padStart(2,'0')).join('');
  }
  async function hashPassword(str, salt) {
    const s = salt || _genSalt();
    const enc = new TextEncoder();
    const keyMat = await crypto.subtle.importKey('raw', enc.encode(str), 'PBKDF2', false, ['deriveBits']);
    const bits = await crypto.subtle.deriveBits(
      { name: 'PBKDF2', salt: enc.encode(s), iterations: 100000, hash: 'SHA-256' },
      keyMat, 256
    );
    const digest = Array.from(new Uint8Array(bits), x => x.toString(16).padStart(2,'0')).join('');
    return `$pbk$${s}$${digest}`;
  }
  // Mantido para verificar hashes $2a$ já armazenados no localStorage
  function hashSimple(str, salt) {
    const s   = salt || _genSalt();
    const raw = s + str;
    let h1 = 0x811c9dc5, h2 = 5381;
    for (let i = 0; i < raw.length; i++) {
      const c = raw.charCodeAt(i);
      h1 = Math.imul(h1 ^ c, 0x01000193);
      h2 = ((h2 << 5) + h2) ^ c;
    }
    for (let r = 0; r < 500; r++) {
      h1 = Math.imul(h1 ^ (h2 & 0xff), 0x01000193);
      h2 = Math.imul((h2 << 5) ^ h1, 0x9e3779b9) | 0;
    }
    const digest = (Math.abs(h1) >>> 0).toString(16).padStart(8,'0')
                 + (Math.abs(h2) >>> 0).toString(16).padStart(8,'0');
    return `$2a$${s}$${digest}`;
  }
  async function checkHash(plain, hashed) {
    if (!hashed) return false;
    if (hashed.startsWith('$pbk$')) {
      const salt = hashed.split('$')[2];
      return (await hashPassword(plain.trim(), salt)) === hashed;
    }
    if (hashed.startsWith('$2a$')) {
      const salt = hashed.split('$')[2];
      return hashSimple(plain.trim(), salt) === hashed;
    }
    try { return btoa(plain+'_'+_legacyDjb2(plain)) === hashed; } catch { return false; }
  }
  function _legacyDjb2(str) {
    let h = 0;
    for (let i = 0; i < str.length; i++) { const c = str.charCodeAt(i); h = ((h<<5)-h)+c; h=h&h; }
    return Math.abs(h).toString(36);
  }
  function _secureToken() {
    const b = crypto.getRandomValues(new Uint8Array(32));
    return Array.from(b, x => x.toString(16).padStart(2,'0')).join('');
  }

  /* ─── Rate limiting — persistente em localStorage ─── */
  const RATE_WINDOW = 10 * 60 * 1000; // 10 minutos
  const RATE_MAX    = 5;

  function _checkRateLimit(email) {
    const key = 'adaspro_rl_' + email.toLowerCase().trim();
    try {
      const d = JSON.parse(localStorage.getItem(key));
      if (d && (Date.now() - d.since) < RATE_WINDOW) return d;
      if (d) localStorage.removeItem(key);
    } catch {}
    return { count: 0, since: Date.now(), blocked: false };
  }

  function _hitRateLimit(email, rate) {
    rate.count++;
    if (rate.count >= RATE_MAX) rate.blocked = true;
    try { localStorage.setItem('adaspro_rl_' + email.toLowerCase().trim(), JSON.stringify(rate)); } catch {}
  }

  function _clearRateLimit(email) {
    try { localStorage.removeItem('adaspro_rl_' + email.toLowerCase().trim()); } catch {}
  }

  /* ════════════════════════════════════════════
     INIT
  ════════════════════════════════════════════ */
  let _initPromise = null;

  async function _doInit() {
    // Sessão demo persiste entre redirects via flag no localStorage
    if (localStorage.getItem('adaspro_demo') === '1') {
      _demo  = true;
      _mode  = 'local';
      _users = {}; _tickets = {}; _notifications = [];
      await _seedDefaultUsersLocal();
      await seedDemoData();
      _currentSession = _readSessionCache();
      if (!_currentSession) { localStorage.removeItem('adaspro_demo'); }
      console.info('[AUTH] v4 — Demo Mode ✓');
      return;
    }

    const hasSb  = typeof supabase !== 'undefined';
    const hasCfg = typeof SUPABASE_CONFIG !== 'undefined'
      && SUPABASE_CONFIG.url     && !SUPABASE_CONFIG.url.includes('SEU-PROJETO')
      && SUPABASE_CONFIG.anonKey && !SUPABASE_CONFIG.anonKey.includes('SUA-CHAVE');

    if (hasSb && hasCfg) {
      _sbConfigured = true;
      try {
        _sb = supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey, {
          auth: { persistSession: true, autoRefreshToken: true, storageKey: SESSION_KEY },
        });
        _mode = 'supabase';

        // Envolve TODA a sequência Supabase num único timeout de 5s.
        // getSession() pode retornar rápido, mas _sbLoadUser() e _sbLoadAll()
        // fazem queries no banco — sem timeout travam indefinidamente quando offline.
        // _cancelled impede que a IIFE sobrescreva estado após o timeout disparar.
        let _cancelled = false;
        const _sbTimeout = new Promise((_, rej) =>
          setTimeout(() => { _cancelled = true; rej(new Error('supabase_timeout')); }, 5000)
        );

        await Promise.race([
          (async () => {
            const { data: { session } } = await _sb.auth.getSession();
            if (_cancelled) return;
            if (session) {
              const user = await _sbLoadUser(session.user.id);
              if (_cancelled) return;
              if (user && user.status === 'active') {
                if (_isAccessExpired(user)) {
                  // Acesso expirado — bloqueia automaticamente
                  await _sbDirectUpdate('users', user.id, { status: 'blocked' });
                  if (_users[user.id]) _users[user.id].status = 'blocked';
                  await logAudit('auto_block_expired', user.id, { accessExpires: user.accessExpires });
                  if (_cancelled) return;
                  await _sb.auth.signOut();
                  localStorage.removeItem(SESSION_KEY);
                } else {
                  if (['admin','gestor','superadmin'].includes(user.role)) {
                    await _sbLoadAll();
                  } else {
                    await _sbLoadMemberData(session.user.id);
                  }
                  if (_cancelled) return;
                  _currentSession = _buildSession(user, session.user.id, session.access_token, session.expires_at * 1000);
                }
              } else {
                if (_cancelled) return;
                await _sb.auth.signOut();
                localStorage.removeItem(SESSION_KEY);
              }
            }
          })(),
          _sbTimeout,
        ]);

        console.info('[AUTH] v4 — Supabase Auth + PostgreSQL ✓');
        return;
      } catch(e) {
        const isTimeout = e.message === 'supabase_timeout';
        console.warn('[AUTH] Supabase init falhou' + (isTimeout ? ' (offline/timeout)' : '') + ':', e.message, '— modo local.');
        _mode         = 'local';
        _sbConfigured = true; // permanece true: Supabase foi configurado, apenas offline temporariamente
        _offlineMode  = true;
        _loadFromLocalStorage();
        await _seedDefaultUsersLocal();
        // Em modo offline permite restaurar qualquer sessão cacheada — dados locais são seed,
        // não produção, então o risco de forge é irrelevante. Sem isso admin fica em loop redirect.
        const _cached = _readSessionCache();
        if (_cached) { _currentSession = _cached; }
        return;
      }
    }

    _mode = 'local';
    _loadFromLocalStorage();
    await _seedDefaultUsersLocal();
    _currentSession = _readSessionCache(); // Apenas em modo local puro (sem Supabase)
    console.info('[AUTH] v4 — localStorage (local) ✓');
  }

  function init() {
    if (!_initPromise) _initPromise = _doInit();
    return _initPromise;
  }

  function _buildSession(user, uid, token, expiresAt) {
    return {
      userId:    uid || user.id,
      role:      user.role,
      name:      user.name,
      email:     user.email,
      token:     token || _secureToken(),
      issuedAt:  Date.now(),
      expiresAt: expiresAt || Date.now() + 4*60*60*1000,
    };
  }

  function _readSessionCache() {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (!raw) return null;
      const s = JSON.parse(raw);
      if (!s||!s.userId||!s.role||!s.token||!s.expiresAt) return null;
      if (Date.now() > s.expiresAt) { localStorage.removeItem(SESSION_KEY); return null; }
      return s;
    } catch { return null; }
  }

  /* ════════════════════════════════════════════
     LOGIN
  ════════════════════════════════════════════ */
  async function login(email, password) {
    const emailClean = (email||'').toLowerCase().trim();
    const passClean  = (password||'').trim();
    if (!emailClean||!passClean) return { ok:false, msg:'Preencha todos os campos.' };

    const rate = _checkRateLimit(emailClean);
    if (rate.blocked) return { ok:false, msg:'Muitas tentativas. Aguarde 10 minutos.' };

    // Se demo mode ativo mas Supabase disponível, limpa o flag para tentar login real
    if (_demo && _sbConfigured && _sb) {
      _demo = false;
      _mode = 'supabase';
      localStorage.removeItem('adaspro_demo');
    }

    if (_mode === 'supabase' && _sb && !_demo) {
      try {
        const { data, error } = await _sb.auth.signInWithPassword({ email: emailClean, password: passClean });

        if (error) {
          // Quando Supabase está configurado, roles privilegiados não recebem fallback local.
          // Impede bypass via seed offline se a rede/Supabase estiver comprometido.
          // Distingue erro de credenciais (400/401) de falha de conectividade para mensagem correta.
          const isCredentialError = error.status === 400 || error.status === 401 ||
            /invalid.*login|invalid.*credential|email.*not.*confirm/i.test(error.message || '');
          _loadFromLocalStorage();
          _seedDefaultUsersLocal();
          const localUser = Object.values(_users).find(u => u.email.toLowerCase() === emailClean);
          if (localUser && ['superadmin','admin','gestor'].includes(localUser.role)) {
            _hitRateLimit(emailClean, rate);
            return { ok:false, msg: isCredentialError
              ? 'E-mail ou senha incorretos.'
              : 'Sistema de autenticação temporariamente indisponível. Tente novamente em instantes.' };
          }
          if (localUser && checkHash(passClean, localUser.passwordHash)) {
            _clearRateLimit(emailClean);
            const localSession = _buildSession(localUser, localUser.id);
            _currentSession = localSession;
            localStorage.setItem(SESSION_KEY, JSON.stringify(localSession));
            return { ok:true, user:localUser, session:localSession };
          }
          _hitRateLimit(emailClean, rate);
          return { ok:false, msg:'E-mail ou senha incorretos.' };
        }

        let user = await _sbLoadUser(data.user.id);

        // Supabase Auth aceitou mas public.users não tem registro —
        // para admin/superadmin/gestor cria o registro automaticamente a partir do seed local.
        if (!user) {
          _loadFromLocalStorage();
          _seedDefaultUsersLocal();
          const seedUser = Object.values(_users).find(u => u.email.toLowerCase() === emailClean);
          if (seedUser && ['superadmin','admin','gestor'].includes(seedUser.role)) {
            // Upsert com o UUID real do Supabase Auth
            const syncedUser = { ...seedUser, id: data.user.id };
            delete syncedUser.passwordHash; // nunca persiste hash local no Supabase
            const { error: upsertErr } = await _sb.from('users').upsert(syncedUser);
            if (upsertErr) {
              console.warn('[AUTH] public.users upsert bloqueado (RLS?):', upsertErr.message);
            }
            // Usa em memória independente de o upsert ter persistido ou não
            _users[data.user.id] = syncedUser;
            user = syncedUser;
            console.info('[AUTH] public.users auto-sync para', emailClean, upsertErr ? '(somente memória)' : '(persistido)');
          }
        }

        if (!user) {
          await _sb.auth.signOut();
          _hitRateLimit(emailClean, rate);
          return { ok:false, msg:'Conta não encontrada. Contate o administrador.' };
        }

        if (user.status === 'pending') {
          await _sb.auth.signOut();
          return { ok:false, msg:'pending', user };
        }
        if (user.status === 'blocked') {
          await _sb.auth.signOut();
          return { ok:false, msg:'Sua conta foi bloqueada. Entre em contato com o suporte.' };
        }

        _clearRateLimit(emailClean);

        // Verificar se MFA é necessário (AAL2)
        try {
          const { data: aalData } = await _sb.auth.mfa.getAuthenticatorAssuranceLevel();
          if (aalData?.nextLevel === 'aal2' && aalData?.currentLevel !== 'aal2') {
            // Sessão parcial (aal1) — usuário precisa completar MFA
            _pendingMfaUser = user;
            _pendingMfaUid  = data.user.id;
            // Persiste uid no sessionStorage para mfa-verify.html recuperar após redirect
            try { sessionStorage.setItem('adaspro_mfa_uid', data.user.id); } catch(_) {}
            return { ok:false, msg:'mfa_required', role: user.role };
          }
        } catch(_) { /* MFA não configurado — continua normalmente */ }

        if (['admin','gestor','superadmin'].includes(user.role)) {
          await _sbLoadAll();
        } else {
          await _sbLoadMemberData(data.user.id);
        }

        const session = _buildSession(user, data.user.id, data.session.access_token, data.session.expires_at * 1000);
        _currentSession = session;
        return { ok:true, user, session };

      } catch(e) {
        console.warn('[AUTH] login error:', e.message);
        _hitRateLimit(emailClean, rate);
        return { ok:false, msg:'Erro ao conectar. Tente novamente.' };
      }
    }

    return _localLogin(emailClean, passClean, rate);
  }

  async function _localLogin(emailClean, passClean, rate) {
    const user = Object.values(_users).find(u => u.email.toLowerCase() === emailClean);
    if (!user || !(await checkHash(passClean, user.passwordHash))) {
      _hitRateLimit(emailClean, rate);
      return { ok:false, msg:'E-mail ou senha incorretos.' };
    }
    _clearRateLimit(emailClean);
    if (user.status === 'pending') return { ok:false, msg:'pending', user };
    if (user.status === 'blocked') return { ok:false, msg:'Sua conta foi bloqueada. Entre em contato com o suporte.' };
    const session = _buildSession(user, user.id);
    _currentSession = session;
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    return { ok:true, user, session };
  }

  /* ════════════════════════════════════════════
     REGISTER
  ════════════════════════════════════════════ */
  async function register(data) {
    const VALID_LEVELS = ['tecnico','oficina','autocenter','parabrisa','gestor','outro'];
    const nameSafe   = ((data.name||'').trim()).replace(/[<>"'&]/g,'');
    const emailClean = (data.email||'').toLowerCase().trim();
    const passClean  = (data.password||'').trim();
    const level      = VALID_LEVELS.includes(data.level) ? data.level : 'tecnico';

    if (!nameSafe||!emailClean||!passClean)      return { ok:false, msg:'Preencha todos os campos obrigatórios.' };
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(emailClean)) return { ok:false, msg:'E-mail inválido.' };
    if (passClean.length < 8)                    return { ok:false, msg:'A senha deve ter no mínimo 8 caracteres.' };
    if (!/[A-Z]/.test(passClean))                return { ok:false, msg:'A senha deve conter ao menos uma letra maiúscula.' };
    if (!/[0-9]/.test(passClean))                return { ok:false, msg:'A senha deve conter ao menos um número.' };
    if (nameSafe.length < 2)                     return { ok:false, msg:'Nome inválido.' };

    if (_mode === 'supabase' && _sb && !_demo) {
      try {
        const { data: authData, error: signUpError } = await _sb.auth.signUp({
          email: emailClean,
          password: passClean,
          options: { data: { name: nameSafe } },
        });

        if (signUpError) {
          if (signUpError.message.toLowerCase().includes('already registered')) return { ok:false, msg:'Se este e-mail não estiver cadastrado, você receberá uma confirmação em breve.' };
          return { ok:false, msg:'Erro ao cadastrar. Tente novamente.' };
        }

        const userId = authData.user.id;
        const user = {
          id: userId, name: nameSafe, email: emailClean,
          role: 'membro', status: 'pending', level,
          permissions: [], plan: 'free', accessType: 'trial',
          accessExpires: null, boughtModules: [],
          createdAt: Date.now(), approvedAt: null, approvedBy: null, downloads: [],
        };

        const { error: insertError } = await _sb.from('users').insert(user);
        if (insertError) {
          console.error('[AUTH] insert user:', insertError.message);
          await _sb.auth.signOut();
          return { ok:false, msg:'Erro ao salvar cadastro. Tente novamente.' };
        }
        _users[userId] = user;

        // Insere notificação ANTES do signOut (RLS exige usuário autenticado)
        const notif = { id:'n_'+Date.now(), type:'new_user', userId, userName:nameSafe, message:`Novo cadastro aguardando aprovação: ${nameSafe}`, createdAt:Date.now(), read:false };
        _notifications.unshift(notif);
        await _sbInsertNotif(notif);

        await _sb.auth.signOut();

        return { ok:true, msg:'Cadastro realizado! Aguarde aprovação do administrador.' };
      } catch(e) {
        console.warn('[AUTH] register error:', e.message);
        return { ok:false, msg:'Erro ao cadastrar. Tente novamente.' };
      }
    }

    return _localRegister({ name:nameSafe, email:emailClean, password:passClean, level });
  }

  function _localRegister({ name, email, password, level }) {
    if (Object.values(_users).find(u => u.email.toLowerCase() === email)) return { ok:false, msg:'Se este e-mail não estiver cadastrado, você receberá uma confirmação em breve.' };
    const id   = 'user_' + _secureToken().slice(0,12);
    const user = { id, name, email, passwordHash:hashSimple(password), role:'membro', status:'pending', level:level||'tecnico', permissions:[], plan:'free', accessType:'trial', accessExpires:null, boughtModules:[], createdAt:Date.now(), approvedAt:null, approvedBy:null };
    _users[id] = user;
    _saveUsersLocal();
    addNotification({ type:'new_user', userId:id, userName:name, message:`Novo cadastro aguardando aprovação: ${name}` });
    return { ok:true, msg:'Cadastro realizado! Aguarde aprovação do administrador.' };
  }

  /* ════════════════════════════════════════════
     SESSÃO
  ════════════════════════════════════════════ */
  function getSession() {
    if (!_initPromise) console.warn('[AUTH] getSession() chamado antes de init() — sessão pode ser null incorretamente.');
    if (_currentSession) {
      if (Date.now() > _currentSession.expiresAt) { logout(); return null; }
      const u = _users[_currentSession.userId];
      if (u && u.status === 'blocked') { logout(); return null; }
      return _currentSession;
    }
    // Supabase configurado: nunca aceitar sessão do localStorage (evita bypass de role)
    if (_mode === 'supabase' || (_sbConfigured && !_demo)) return null;
    const s = _readSessionCache();
    if (!s) return null;
    const u = _users[s.userId];
    if (u && u.status === 'blocked') { logout(); return null; }
    _currentSession = s;
    return s;
  }

  function logout() {
    _currentSession = null;
    _users = {}; _tickets = {}; _notifications = [];
    localStorage.removeItem('adaspro_demo');
    if (_mode === 'supabase' && _sb && !_demo) {
      _sb.auth.signOut().catch(() => {});
    } else {
      localStorage.removeItem(SESSION_KEY);
    }
  }

  function requireAuth(role) {
    const s = getSession();
    if (!s) { window.location.href = 'login.html'; return null; }
    if (role && !hasRole(s.role, role)) { window.location.href = 'login.html'; return null; }
    return s;
  }

  function hasRole(userRole, req) {
    if (!userRole) return false;
    const h = { superadmin:4, admin:3, gestor:2, membro:1 };
    return (h[userRole]||0) >= (h[req]||0);
  }

  /* ════════════════════════════════════════════
     DEMO MODE (sempre local)
  ════════════════════════════════════════════ */
  async function enterDemoMode(role) {
    _demo  = true;
    _mode  = 'local';
    // Reseta estado local para garantir hashes frescos independente do localStorage
    _users         = {};
    _tickets       = {};
    _notifications = [];
    await _seedDefaultUsersLocal();
    seedDemoData();
    const email = role === 'admin' ? 'admin@adaspro.com.br' : 'fernanda@autocenter.com';
    const pass  = role === 'admin' ? _DEMO_AD_PASS          : 'Demo@123';
    _clearRateLimit(email); // garante que tentativas anteriores não bloqueiem o demo
    const result = await _localLogin(email, pass, _checkRateLimit(email));
    if (result.ok) localStorage.setItem('adaspro_demo', '1');
    return result;
  }

  /* ════════════════════════════════════════════
     SEED DEMO DATA
  ════════════════════════════════════════════ */
  function seedDemoData() {
    const now = Date.now();
    if (!_users['demo_pending'])  _users['demo_pending']  = { id:'demo_pending', name:'Carlos Eduardo Silva',email:'carlos.silva@oficina.com.br',passwordHash:hashSimple('Demo@123'),role:'membro',status:'pending',level:'tecnico',permissions:[],plan:'free',accessType:'trial',accessExpires:null,boughtModules:[],createdAt:now-3600000,approvedAt:null,approvedBy:null };
    if (!_users['demo_pending2']) _users['demo_pending2'] = { id:'demo_pending2',name:'André Luiz Costa',    email:'andre.costa@multimarcas.com.br',passwordHash:hashSimple('Demo@123'),role:'membro',status:'pending',level:'autocenter',permissions:[],plan:'free',accessType:'trial',accessExpires:null,boughtModules:[],createdAt:now-900000,approvedAt:null,approvedBy:null };
    if (!_users['demo_pro'])      _users['demo_pro']      = { id:'demo_pro',     name:'Fernanda Oliveira',   email:'fernanda@autocenter.com',passwordHash:hashSimple('Demo@123'),role:'membro',status:'active',level:'autocenter',permissions:['honda','toyota','nissan'],plan:'pro',accessType:'subscription',accessExpires:null,boughtModules:[],createdAt:now-86400000*5,approvedAt:now-86400000*4,approvedBy:'admin' };
    if (!_users['demo_modulo'])   _users['demo_modulo']   = { id:'demo_modulo',  name:'Roberto Mendes',      email:'roberto@parabrisa.com',passwordHash:hashSimple('Demo@123'),role:'membro',status:'active',level:'parabrisa',permissions:['toyota'],plan:'modulo',accessType:'subscription',accessExpires:null,boughtModules:['toyota'],createdAt:now-86400000*10,approvedAt:now-86400000*9,approvedBy:'admin' };
    if (!_users['demo_premium'])  _users['demo_premium']  = { id:'demo_premium', name:'Marcelo Teixeira',    email:'marcelo@premiumauto.com.br',passwordHash:hashSimple('Demo@123'),role:'membro',status:'active',level:'gestor',permissions:CATEGORIES.map(c=>c.id),plan:'premium',accessType:'subscription',accessExpires:null,boughtModules:[],createdAt:now-86400000*30,approvedAt:now-86400000*29,approvedBy:'admin' };

    const tkt1='demo_tkt_1';
    if (!_tickets[tkt1]) _tickets[tkt1] = { id:tkt1,userId:'demo_pro',userName:'Fernanda Oliveira',userEmail:'fernanda@autocenter.com',title:'Calibração AVM 360° Toyota RAV4 2022 — câmera traseira descalibrada',category:'duvida-tecnica',priority:'high',status:'in-progress',messages:[{id:'msg_d1',authorId:'demo_pro',authorName:'Fernanda Oliveira',role:'member',message:'Olá! Estou com dificuldade na calibração da câmera traseira do Toyota RAV4 2022. Após troca de para-choque, o sistema AVM 360° continua apresentando linhas desalinhadas. Já tentei o procedimento pelo scanner mas sem sucesso. O erro exibido é C1A87.',createdAt:now-7200000},{id:'msg_d2',authorId:'admin',authorName:'Administrador ADAS PRO',role:'admin',message:'Olá Fernanda! Para o RAV4 2022, o target correto é o Toyota AVM de 180°. Certifique-se que o piso está perfeitamente nivelado (tolerância ±2mm) e que os 4 targets estão posicionados a exatamente 1,5m dos centros das rodas. O erro C1A87 indica desalinhamento lateral — verifique se o target traseiro não está rotacionado. Qual scanner está utilizando?',createdAt:now-5400000},{id:'msg_d3',authorId:'demo_pro',authorName:'Fernanda Oliveira',role:'member',message:'Estou usando o Autel MaxiSys Ultra. Vou verificar novamente o posicionamento dos targets com o nível e refazer o procedimento.',createdAt:now-3600000},{id:'msg_d4',authorId:'admin',authorName:'Administrador ADAS PRO',role:'admin',message:'Perfeito! Com o Autel, acesse: ADAS → Toyota → AVM → Camera Calibration → Rear. Confirme que o veículo está com pneus calibrados e sem carga no porta-malas. Aguardamos o resultado!',createdAt:now-1800000}],createdAt:now-7200000,updatedAt:now-1800000,resolvedAt:null };
    const tkt2='demo_tkt_2';
    if (!_tickets[tkt2]) _tickets[tkt2] = { id:tkt2,userId:'demo_modulo',userName:'Roberto Mendes',userEmail:'roberto@parabrisa.com',title:'Solicitação de upgrade — Módulo Toyota para Plano Pro',category:'upgrade-plano',priority:'medium',status:'open',messages:[{id:'msg_d5',authorId:'demo_modulo',authorName:'Roberto Mendes',role:'member',message:'Olá, gostaria de fazer upgrade do meu plano atual (Módulo Toyota) para o Plano Pro, para ter acesso também a Honda e Nissan.',createdAt:now-1800000}],createdAt:now-1800000,updatedAt:now-1800000,resolvedAt:null };
    const tkt3='demo_tkt_3';
    if (!_tickets[tkt3]) _tickets[tkt3] = { id:tkt3,userId:'demo_premium',userName:'Marcelo Teixeira',userEmail:'marcelo@premiumauto.com.br',title:'Audi Q7 2020 — LIDAR ACC com falha 00526 após troca de para-choque',category:'duvida-tecnica',priority:'urgent',status:'resolved',messages:[{id:'msg_d6',authorId:'demo_premium',authorName:'Marcelo Teixeira',role:'member',message:'Audi Q7 2020 com falha 00526 — ACC distance sensor front.',createdAt:now-10800000},{id:'msg_d7',authorId:'admin',authorName:'Administrador ADAS PRO',role:'admin',message:'Para o Q7 2020 o target é o VAS6430-12. Disponível na sua biblioteca.',createdAt:now-9000000},{id:'msg_d8',authorId:'demo_premium',authorName:'Marcelo Teixeira',role:'member',message:'Calibração concluída com sucesso! Muito obrigado!',createdAt:now-7200000}],createdAt:now-10800000,updatedAt:now-6000000,resolvedAt:now-6000000 };

    if (!_notifications.find(n => n.id === 'demo_n1')) {
      _notifications.unshift({ id:'demo_n3',type:'new_ticket',ticketId:tkt2,userId:'demo_modulo',userName:'Roberto Mendes',message:'Novo ticket: Solicitação de upgrade',createdAt:now-1800000,read:false });
      _notifications.unshift({ id:'demo_n2',type:'new_user',userId:'demo_pending2',userName:'André Luiz Costa',message:'Novo cadastro aguardando aprovação: André Luiz Costa',createdAt:now-900000,read:false });
      _notifications.unshift({ id:'demo_n1',type:'new_user',userId:'demo_pending',userName:'Carlos Eduardo Silva',message:'Novo cadastro aguardando aprovação: Carlos Eduardo Silva',createdAt:now-3600000,read:false });
    }
    _saveUsersLocal(); _saveTicketsLocal(); _saveNotifsLocal();
    console.info('[AUTH] Dados demo carregados ✓');
  }

  /* ════════════════════════════════════════════
     API PÚBLICA — Usuários
  ════════════════════════════════════════════ */
  function getAllUsers()       { return Object.values(_users); }
  function getUserById(id)    { return _users[id] || null; }
  function getUserByEmail(em) { return Object.values(_users).find(u => u.email.toLowerCase() === em.toLowerCase()) || null; }

  async function _sbDirectUpdate(table, id, updates) {
    const { error } = await _sb.from(table).update(updates).eq('id', id);
    if (error) { console.error('[AUTH] _sbDirectUpdate:', error.message); return false; }
    return true;
  }

  async function approveUser(userId, approverId) {
    if (_mode === 'supabase' && _sb && !_demo) {
      const updates = { status:'active', approvedAt:Date.now(), approvedBy:approverId };
      const r = await callEdgeFunction('approve-user', { action:'approve', targetId:userId });
      if (!r.ok) { console.error('[AUTH] approveUser Edge Function falhou:', r.msg); return false; }
      if (_users[userId]) Object.assign(_users[userId], updates);
      await logAudit('approve_user', userId, { approvedBy: approverId });
      return true;
    }
    if (!_users[userId]) return false;
    _users[userId].status='active'; _users[userId].approvedAt=Date.now(); _users[userId].approvedBy=approverId;
    if (!(_users[userId].permissions||[]).length) { const s=getSettings(); _users[userId].permissions=s.plans[0]?.defaultCategories||['honda','toyota']; }
    _sbUpsertUser(_users[userId]); return true;
  }

  async function blockUser(id) {
    if (_mode === 'supabase' && _sb && !_demo) {
      const r = await callEdgeFunction('approve-user', { action:'block', targetId:id });
      if (!r.ok) { console.error('[AUTH] blockUser Edge Function falhou:', r.msg); return false; }
      if (_users[id]) _users[id].status='blocked';
      await logAudit('block_user', id);
      return true;
    }
    if (!_users[id]) return false;
    _users[id].status='blocked'; _sbUpsertUser(_users[id]); return true;
  }

  async function unblockUser(id) {
    if (_mode === 'supabase' && _sb && !_demo) {
      const r = await callEdgeFunction('approve-user', { action:'unblock', targetId:id });
      if (!r.ok) { console.error('[AUTH] unblockUser Edge Function falhou:', r.msg); return false; }
      if (_users[id]) _users[id].status='active';
      await logAudit('unblock_user', id);
      return true;
    }
    if (!_users[id]) return false;
    _users[id].status='active'; _sbUpsertUser(_users[id]); return true;
  }

  async function updateUserPermissions(id, perms) {
    if (_mode === 'supabase' && _sb && !_demo) {
      const r = await callEdgeFunction('approve-user', { action:'update', targetId:id, updates:{ permissions:perms } });
      if (!r.ok) {
        const ok = await _sbDirectUpdate('users', id, { permissions:perms });
        if (!ok) return false;
      }
      if (_users[id]) _users[id].permissions=perms;
      await logAudit('update_permissions', id, { permissions: perms });
      return true;
    }
    if (!_users[id]) return false;
    _users[id].permissions=perms; _sbUpsertUser(_users[id]); return true;
  }

  async function updateUserRole(id, role) {
    if (_mode === 'supabase' && _sb && !_demo) {
      const r = await callEdgeFunction('approve-user', { action:'update', targetId:id, updates:{ role } });
      if (!r.ok) { console.error('[AUTH] updateUserRole Edge Function falhou:', r.msg); return false; }
      if (_users[id]) _users[id].role=role;
      await logAudit('update_role', id, { role });
      return true;
    }
    if (!_users[id]) return false;
    _users[id].role=role; _sbUpsertUser(_users[id]); return true;
  }

  function _isAccessExpired(user) {
    return user.accessExpires != null && Date.now() > new Date(user.accessExpires).getTime();
  }

  async function setAccessExpiry(userId, expiresAt) {
    const val = expiresAt || null;
    if (_mode === 'supabase' && _sb && !_demo) {
      const r = await callEdgeFunction('approve-user', { action:'update', targetId:userId, updates:{ accessExpires: val } });
      if (!r.ok) {
        const ok = await _sbDirectUpdate('users', userId, { accessExpires: val });
        if (!ok) return false;
      }
      if (_users[userId]) _users[userId].accessExpires = val;
      await logAudit('set_access_expiry', userId, { accessExpires: val });
      return true;
    }
    if (!_users[userId]) return false;
    _users[userId].accessExpires = val; _sbUpsertUser(_users[userId]); return true;
  }

  async function deleteUser(id) {
    if (!_users[id] || _users[id].role==='admin' || _users[id].role==='superadmin') return false;
    if (_mode === 'supabase' && _sb && !_demo) {
      const r = await callEdgeFunction('approve-user', { action:'delete', targetId:id });
      if (!r.ok) { console.error('[AUTH] deleteUser:', r.msg); return false; }
      await logAudit('delete_user', id, { email: _users[id]?.email });
    } else {
      _sbDeleteUser(id);
    }
    delete _users[id]; return true;
  }

  /* Cria usuário diretamente com role/status/permissions (uso exclusivo do superadmin) */
  async function createUserDirect(data) {
    const { name, email, password, role = 'membro', status = 'active', permissions = [], plan = 'free', level = 'tecnico' } = data;
    if (!name || !email || !password) return { ok:false, msg:'Nome, e-mail e senha são obrigatórios.' };
    if (password.length < 8) return { ok:false, msg:'A senha deve ter no mínimo 8 caracteres.' };
    const VALID_ROLES = ['superadmin','admin','gestor','membro'];
    const safeRole = VALID_ROLES.includes(role) ? role : 'membro';

    if (_mode === 'supabase' && _sb && !_demo) {
      try {
        // Cria no Supabase Auth via Admin API (requer service_role — usa Edge Function)
        const r = await callEdgeFunction('approve-user', {
          action: 'create',
          email: email.trim().toLowerCase(),
          password,
          name,
          role: safeRole,
          status,
          permissions,
          plan,
          level,
        });
        if (!r.ok) return { ok:false, msg: r.msg || 'Erro ao criar usuário no Supabase.' };
        await logAudit('create_user_direct', r.data?.userId || email, { name, email, role: safeRole });
        await _sbLoadAll();
        return { ok:true };
      } catch(e) { return { ok:false, msg: e.message }; }
    }

    // Modo local
    const emailLc = email.trim().toLowerCase();
    if (Object.values(_users).find(u => u.email === emailLc)) return { ok:false, msg:'E-mail já cadastrado.' };
    const id = 'usr_' + Date.now().toString(36) + Math.random().toString(36).slice(2,6);
    _users[id] = {
      id, name: name.trim(), email: emailLc,
      passwordHash: hashSimple(password),
      role: safeRole, status, permissions, plan, level,
      accessType: plan === 'free' ? 'trial' : 'subscription',
      accessExpires: null, boughtModules: [],
      createdAt: Date.now(), approvedAt: Date.now(), approvedBy: getSession()?.userId || 'superadmin',
    };
    _saveUsersLocal();
    return { ok:true };
  }

  async function applyPlanToUser(userId, planId) {
    const s=getSettings(); const plan=s.plans.find(p=>p.id===planId);
    if(!plan) return false;
    return updateUserPermissions(userId, plan.defaultCategories);
  }
  function getPendingCount() { return getAllUsers().filter(u => u.status==='pending').length; }

  /* ─── Conteúdo (localStorage — estático) ─── */
  function getContent()   { const r=localStorage.getItem(CONTENT_KEY); return r?JSON.parse(r):[...DEFAULT_CONTENT]; }
  function saveContent(c) { localStorage.setItem(CONTENT_KEY, JSON.stringify(c)); }
  function getContentForUser(userId) {
    const u = _users[userId]; if (!u) return [];
    const c = getContent();
    if (u.role==='superadmin'||u.role==='admin'||u.role==='gestor') return c;
    return c.map(item => ({ ...item, locked: !(u.permissions||[]).includes(item.cat) }));
  }
  function addContent(item)        { const c=getContent(); const id='cnt_'+Date.now().toString(36); c.push({icon:'📄',...item,id}); saveContent(c); return id; }
  function editContent(id, updates){ const c=getContent(); const i=c.findIndex(x=>x.id===id); if(i<0)return false; c[i]={...c[i],...updates}; saveContent(c); return true; }
  function deleteContent(id)       { saveContent(getContent().filter(c=>c.id!==id)); return true; }

  /* ─── Artigos Editoriais ─── */
  function _getItems(key)       { try { const r=localStorage.getItem(key); return r?JSON.parse(r):[]; } catch { return []; } }
  function _saveItems(key,list) { localStorage.setItem(key, JSON.stringify(list)); }

  function getArticles(filters = {}) {
    let items = _getItems(ARTICLES_KEY);
    if (filters.status)   items = items.filter(a => a.status === filters.status);
    if (filters.cat)      items = items.filter(a => a.cat    === filters.cat);
    if (filters.authorId) items = items.filter(a => a.authorId === filters.authorId);
    return items.sort((a,b) => b.updatedAt - a.updatedAt);
  }
  function getArticleById(id) { return _getItems(ARTICLES_KEY).find(a => a.id === id) || null; }
  function addArticle(item) {
    const sess = getSession();
    const id = 'art_' + Date.now().toString(36);
    const article = {
      icon:'📝', accessLevel:1, tags:[], cat:'',
      ...item,
      id, type:'article',
      author: item.author || sess?.name || 'Admin',
      authorId: item.authorId || sess?.userId || '',
      status: item.status || 'draft',
      publishedAt: null,
      createdAt: Date.now(), updatedAt: Date.now(),
    };
    const list = _getItems(ARTICLES_KEY); list.unshift(article); _saveItems(ARTICLES_KEY, list);
    return id;
  }
  function editArticle(id, updates) {
    const list = _getItems(ARTICLES_KEY); const i = list.findIndex(a => a.id === id);
    if (i < 0) return false;
    list[i] = { ...list[i], ...updates, updatedAt: Date.now() };
    _saveItems(ARTICLES_KEY, list); return true;
  }
  function publishArticle(id) { return editArticle(id, { status:'published', publishedAt: Date.now() }); }
  function archiveArticle(id) { return editArticle(id, { status:'archived' }); }
  function deleteArticle(id) {
    const item = getArticleById(id);
    if (item && item.status !== 'archived') return false; // deve arquivar antes
    _saveItems(ARTICLES_KEY, _getItems(ARTICLES_KEY).filter(a => a.id !== id)); return true;
  }

  /* ─── Boletins Técnicos ─── */
  let _bulletinSeq = null;
  function _nextBulletinNumber() {
    if (_bulletinSeq === null) {
      const existing = _getItems(BULLETINS_KEY);
      _bulletinSeq = existing.length > 0
        ? Math.max(...existing.map(b => parseInt((b.bulletinNumber||'BT-2026-000').split('-')[2]||0))) + 1
        : 1;
    } else { _bulletinSeq++; }
    return `BT-${new Date().getFullYear()}-${String(_bulletinSeq).padStart(3,'0')}`;
  }
  function getBulletins(filters = {}) {
    let items = _getItems(BULLETINS_KEY);
    if (filters.status)   items = items.filter(b => b.status   === filters.status);
    if (filters.cat)      items = items.filter(b => b.cat      === filters.cat);
    if (filters.severity) items = items.filter(b => b.severity === filters.severity);
    return items.sort((a,b) => b.updatedAt - a.updatedAt);
  }
  function getBulletinById(id) { return _getItems(BULLETINS_KEY).find(b => b.id === id) || null; }
  function addBulletin(item) {
    const sess = getSession();
    const id = 'blt_' + Date.now().toString(36);
    const bulletin = {
      icon:'📋', accessLevel:1, tags:[], cat:'', severity:'info',
      vehicleModels:[], systemsAffected:[], expiresAt:null,
      ...item,
      id, type:'bulletin',
      bulletinNumber: item.bulletinNumber || _nextBulletinNumber(),
      author: item.author || sess?.name || 'Admin',
      authorId: item.authorId || sess?.userId || '',
      status: item.status || 'draft',
      publishedAt: null, version:'v1.0',
      createdAt: Date.now(), updatedAt: Date.now(),
    };
    const list = _getItems(BULLETINS_KEY); list.unshift(bulletin); _saveItems(BULLETINS_KEY, list);
    return id;
  }
  function editBulletin(id, updates) {
    const list = _getItems(BULLETINS_KEY); const i = list.findIndex(b => b.id === id);
    if (i < 0) return false;
    list[i] = { ...list[i], ...updates, updatedAt: Date.now() };
    _saveItems(BULLETINS_KEY, list); return true;
  }
  function publishBulletin(id) { return editBulletin(id, { status:'published', publishedAt: Date.now() }); }
  function archiveBulletin(id) { return editBulletin(id, { status:'archived' }); }
  function deleteBulletin(id) {
    const item = getBulletinById(id);
    if (item && item.status !== 'archived') return false;
    _saveItems(BULLETINS_KEY, _getItems(BULLETINS_KEY).filter(b => b.id !== id)); return true;
  }

  /* ─── Tickets ─── */
  function createTicket(userId, data) {
    const user = _users[userId];
    const id   = 'tkt_' + Date.now().toString(36);
    const ticket = {
      id, userId, userName:user?.name||'Usuário', userEmail:user?.email||'',
      title:data.title, category:data.category||'duvida-tecnica', priority:data.priority||'medium', status:'open',
      messages:[{ id:'msg_'+Date.now().toString(36), authorId:userId, authorName:user?.name||'Usuário', role:'member', message:data.message, createdAt:Date.now() }],
      createdAt:Date.now(), updatedAt:Date.now(), resolvedAt:null,
    };
    _tickets[id] = ticket; _sbUpsertTicket(ticket);
    addNotification({ type:'new_ticket', ticketId:id, userId, userName:user?.name, message:`Novo ticket: ${data.title}` });
    return { ok:true, id };
  }
  function getAllTickets()         { return Object.values(_tickets).sort((a,b) => b.updatedAt - a.updatedAt); }
  function getUserTickets(userId)  { return getAllTickets().filter(t => t.userId === userId); }
  function getTicketById(id)      { return _tickets[id] || null; }
  function replyTicket(ticketId, authorId, message) {
    const user = _users[authorId]; const session = getSession();
    if (!_tickets[ticketId]) return false;
    _tickets[ticketId].messages.push({ id:'msg_'+Date.now().toString(36), authorId, authorName:user?.name||session?.name||'Usuário', role:(user?.role||session?.role)==='membro'?'member':'admin', message, createdAt:Date.now() });
    _tickets[ticketId].updatedAt = Date.now();
    if (['admin','gestor'].includes(user?.role||session?.role) && _tickets[ticketId].status==='open') _tickets[ticketId].status = 'in-progress';
    _sbUpsertTicket(_tickets[ticketId]); return true;
  }
  function updateTicketStatus(ticketId, status) {
    if (!_tickets[ticketId]) return false;
    _tickets[ticketId].status = status; _tickets[ticketId].updatedAt = Date.now();
    if (status==='resolved'||status==='closed') _tickets[ticketId].resolvedAt = Date.now();
    _sbUpsertTicket(_tickets[ticketId]); return true;
  }
  function deleteTicket(id) { delete _tickets[id]; _sbDeleteTicket(id); return true; }
  function getOpenTicketsCount() { return getAllTickets().filter(t => t.status==='open'||t.status==='in-progress').length; }

  /* ─── Configurações ─── */
  function getSettings()   { const r=localStorage.getItem(SETTINGS_KEY); return r?JSON.parse(r):{...DEFAULT_SETTINGS}; }
  function saveSettings(s) { localStorage.setItem(SETTINGS_KEY, JSON.stringify(s)); return true; }

  /* ─── Notificações ─── */
  function getNotifications() { return [..._notifications]; }
  function addNotification(n) {
    const notif = { id:'n_'+Date.now(), ...n, createdAt:Date.now(), read:false };
    _notifications.unshift(notif); _notifications = _notifications.slice(0,50);
    _sbInsertNotif(notif);
  }
  function markNotifRead(id) {
    const n = _notifications.find(x => x.id === id); if (n) n.read = true;
    if (_mode==='supabase' && _sb && !_demo) {
      _sb.from('notifications').update({ read:true }).eq('id', id).then(({ error }) => {
        if (error) console.error('[AUTH] markNotifRead:', error.message);
      });
    } else { _saveNotifsLocal(); }
  }
  function getUnreadCount() { return _notifications.filter(n => !n.read).length; }
  function clearAllNotifs() {
    _notifications = [];
    if (_mode==='supabase' && _sb && !_demo) {
      _sb.from('notifications').delete().eq('user_id', _session?.userId).then(() => {});
    } else { _saveNotifsLocal(); }
  }

  /* ─── Estatísticas ─── */
  function getStats() {
    const u=getAllUsers(); const t=getAllTickets(); const c=getContent();
    return { totalUsers:u.length, activeUsers:u.filter(x=>x.status==='active').length, pendingUsers:u.filter(x=>x.status==='pending').length, blockedUsers:u.filter(x=>x.status==='blocked').length, totalContent:c.length, totalTickets:t.length, openTickets:t.filter(x=>x.status==='open').length, inProgressTickets:t.filter(x=>x.status==='in-progress').length, resolvedTickets:t.filter(x=>x.status==='resolved'||x.status==='closed').length, totalCategories:CATEGORIES.length };
  }

  /* ─── Planos ─── */
  function getUserPlan(userId) { const u=getUserById(userId); if(!u)return PLANS[0]; return PLANS.find(p=>p.id===(u.plan||'free'))||PLANS[0]; }
  function isAccessValid(userId) { const u=getUserById(userId); if(!u)return false; if(u.role==='admin'||u.role==='gestor')return true; if(u.accessExpires&&Date.now()>u.accessExpires)return false; return true; }
  function setUserPlan(userId, planId, expiresAt, boughtModules) {
    if (!_users[userId]) return false;
    _users[userId].plan=planId; _users[userId].accessType=planId==='free'?'trial':'subscription';
    _users[userId].accessExpires=expiresAt||null; _users[userId].boughtModules=boughtModules||[];
    const plan = PLANS.find(p=>p.id===planId);
    if (plan) {
      if (plan.modules==='all')    _users[userId].permissions = CATEGORIES.map(c=>c.id);
      else if (plan.modules==='custom') _users[userId].permissions = boughtModules||[];
      else _users[userId].permissions = plan.modules;
    }
    _sbUpsertUser(_users[userId]); return true;
  }

  /* ─── Acesso a conteúdo ─── */
  function getUserAccessLevel(userId) { const u=getUserById(userId); if(!u)return 0; if(u.role==='superadmin'||u.role==='admin'||u.role==='gestor')return 4; return {free:1,modulo:2,pro:3,premium:4}[u.plan||'free']||(u.accessLevel||1); }
  function canViewContent(userId, contentId) { const l=getUserAccessLevel(userId); if(l>=4)return true; const u=getUserById(userId); const item=getContent().find(c=>c.id===contentId); if(!item)return false; if(u&&u.permissions&&u.permissions.includes(item.cat))return true; return l>=(item.accessLevel||1); }
  function canDownloadContent(userId, contentId) { const l=getUserAccessLevel(userId); if(l>=4)return true; const item=getContent().find(c=>c.id===contentId); if(!item)return false; return l>=(item.downloadLevel||2); }
  function trackDownload(userId, contentId) {
    if (!_users[userId]) return;
    if (!_users[userId].downloads) _users[userId].downloads = [];
    _users[userId].downloads.push({ contentId, at:Date.now() });
    _sbUpsertUser(_users[userId]);
    const c=getContent(); const i=c.findIndex(x=>x.id===contentId);
    if (i>=0) { c[i].downloadCount=(c[i].downloadCount||0)+1; saveContent(c); }
  }

  /* ─── Export / Import ─── */
  function exportData() {
    const data = { users:Object.fromEntries(Object.entries(_users)), content:getContent(), tickets:Object.fromEntries(Object.entries(_tickets)), settings:getSettings(), exported:new Date().toISOString() };
    const blob = new Blob([JSON.stringify(data,null,2)], { type:'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = Object.assign(document.createElement('a'), { href:url, download:'adaspro-backup.json' });
    a.click(); URL.revokeObjectURL(url);
  }
  function importData(json) {
    try {
      const d = JSON.parse(json);
      if (d.users)    { _users=d.users;     Object.values(d.users).forEach(u=>_sbUpsertUser(u)); }
      if (d.content)  saveContent(d.content);
      if (d.tickets)  { _tickets=d.tickets; Object.values(d.tickets).forEach(t=>_sbUpsertTicket(t)); }
      if (d.settings) saveSettings(d.settings);
      return { ok:true };
    } catch(e) { return { ok:false, msg:'Arquivo inválido: '+e.message }; }
  }
  function resetToDefaults() {
    localStorage.setItem(CONTENT_KEY,  JSON.stringify(DEFAULT_CONTENT));
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(DEFAULT_SETTINGS));
  }

  /* ════════════════════════════════════════════
     MFA — TOTP via Supabase Auth
  ════════════════════════════════════════════ */
  async function verifyMFA(code) {
    if (_mode !== 'supabase' || !_sb) return { ok:false, msg:'Supabase não disponível.' };
    try {
      const { data: factors } = await _sb.auth.mfa.listFactors();
      const totp = factors?.totp?.[0];
      if (!totp) return { ok:false, msg:'2FA não configurado para esta conta.' };
      const { data: challengeData } = await _sb.auth.mfa.challenge({ factorId: totp.id });
      if (!challengeData) return { ok:false, msg:'Falha ao iniciar desafio MFA.' };
      const { data, error } = await _sb.auth.mfa.verify({ factorId: totp.id, challengeId: challengeData.id, code });
      if (error) return { ok:false, msg:'Código inválido ou expirado.' };

      const sbSession = data?.session;
      const sbUid     = sbSession?.user?.id;

      // Tenta carregar usuário do DB (fonte de verdade para role)
      // Fallback: _pendingMfaUser definido pelo fluxo legítimo de login (não sessionStorage — evita XSS injection)
      let user = _pendingMfaUser || null;
      const fallbackUid = sbUid || (_pendingMfaUser?.id) || null;
      if (!user && fallbackUid) user = await _sbLoadUser(fallbackUid);
      try { sessionStorage.removeItem('adaspro_mfa_uid'); } catch(_) {}
      if (!user) return { ok:false, msg:'Usuário não encontrado após verificação MFA.' };

      if (['admin','gestor','superadmin'].includes(user.role)) {
        await _sbLoadAll();
      } else if (sbUid) {
        await _sbLoadMemberData(sbUid);
      }

      const session = _buildSession(user, sbUid || user.id, sbSession?.access_token, sbSession?.expires_at ? sbSession.expires_at * 1000 : null);
      _currentSession = session;
      _pendingMfaUser = null;
      _pendingMfaUid  = null;
      return { ok:true, user, session };
    } catch(e) { return { ok:false, msg:'Erro na verificação MFA.' }; }
  }

  /* ════════════════════════════════════════════
     AUDITORIA
  ════════════════════════════════════════════ */
  async function logAudit(action, targetId, details) {
    if (_mode !== 'supabase' || !_sb) return;
    const sess = getSession();
    try {
      await _sb.from('audit_logs').insert({
        action, actor_id: sess?.userId || null, target_id: String(targetId || ''),
        details: details || null, created_at: new Date().toISOString(),
      });
    } catch (e) { console.error('[AUTH] logAudit falhou:', action, e.message); }
  }

  async function getUserDownloads(userId, limit = 20) {
    if (_mode !== 'supabase' || !_sb) return { ok:false, data:[], msg:'Supabase não disponível.' };
    try {
      const { data, error } = await _sb.from('audit_logs')
        .select('id,target_id,details,created_at')
        .eq('actor_id', userId)
        .eq('action', 'download_content')
        .order('created_at', { ascending: false })
        .limit(limit);
      if (error) return { ok:false, data:[], msg: error.message };
      return { ok:true, data: data || [] };
    } catch(e) { return { ok:false, data:[], msg: e.message }; }
  }

  async function getAuditLogs(actionFilter, limit = 100) {
    if (_mode !== 'supabase' || !_sb) return { ok:false, data:[], msg:'Supabase não disponível.' };
    try {
      let q = _sb.from('audit_logs')
        .select('id,action,actor_id,target_id,details,created_at')
        .order('created_at', { ascending: false })
        .limit(limit);
      if (actionFilter) q = q.eq('action', actionFilter);
      const { data, error } = await q;
      if (error) return { ok:false, data:[], msg: error.message };
      return { ok:true, data: data || [] };
    } catch(e) { return { ok:false, data:[], msg: e.message }; }
  }

  /* ════════════════════════════════════════════
     RECUPERAÇÃO DE SENHA
  ════════════════════════════════════════════ */
  async function resetPassword(email) {
    if (_mode !== 'supabase' || !_sb) return { ok:false, msg:'Supabase não disponível.' };
    const redirectTo = (window.SUPABASE_CONFIG?.siteUrl || window.location.origin) + '/reset-password.html';
    const { error } = await _sb.auth.resetPasswordForEmail(email.trim().toLowerCase(), { redirectTo });
    if (error) return { ok:false, msg:'Erro ao enviar email de recuperação.' };
    const target = getUserByEmail(email.trim().toLowerCase());
    await logAudit('reset_password_requested', target?.id || null, { email: email.trim().toLowerCase() });
    return { ok:true };
  }

  async function getRecentResets(hours = 24) {
    if (_mode !== 'supabase' || !_sb) return new Set();
    try {
      const since = new Date(Date.now() - hours * 3600000).toISOString();
      const { data } = await _sb.from('audit_logs')
        .select('target_id')
        .eq('action', 'reset_password_requested')
        .gte('created_at', since)
        .not('target_id', 'is', null);
      return new Set((data || []).map(r => r.target_id));
    } catch { return new Set(); }
  }

  async function updatePassword(newPassword) {
    if (_mode !== 'supabase' || !_sb) return { ok:false, msg:'Supabase não disponível.' };
    if (!newPassword || newPassword.length < 8) return { ok:false, msg:'A senha deve ter no mínimo 8 caracteres.' };
    const { error } = await _sb.auth.updateUser({ password: newPassword });
    if (error) return { ok:false, msg:'Erro ao atualizar a senha: ' + error.message };
    return { ok:true };
  }

  /* ════════════════════════════════════════════
     STORAGE — Upload e URL assinada
  ════════════════════════════════════════════ */
  async function uploadFile(file, storagePath) {
    if (_mode !== 'supabase' || !_sb) return { ok:false, msg:'Supabase não disponível.' };
    const { error } = await _sb.storage.from('materiais').upload(storagePath, file, { upsert: true, contentType: file.type });
    if (error) return { ok:false, msg:error.message };
    return { ok:true, path: storagePath };
  }

  async function getSignedUrl(storagePath, expiresIn = 3600) {
    if (_mode !== 'supabase' || !_sb) return null;
    const { data, error } = await _sb.storage.from('materiais').createSignedUrl(storagePath, expiresIn);
    if (error || !data) return null;
    return data.signedUrl;
  }

  /* ════════════════════════════════════════════
     EDGE FUNCTIONS helper
  ════════════════════════════════════════════ */
  async function callEdgeFunction(name, payload) {
    if (_mode !== 'supabase' || !_sb) return { ok:false, msg:'Supabase não disponível.' };
    try {
      const { data, error } = await _sb.functions.invoke(name, { body: payload });
      if (error) return { ok:false, msg: error.message };
      return { ok:true, data };
    } catch(e) { return { ok:false, msg: e.message }; }
  }

  /* ─── Export público ─── */
  return {
    init, seedDemoData, enterDemoMode, VERSION, CATEGORIES, PLANS, DEFAULT_SETTINGS,
    login, register, logout, getSession, requireAuth, hasRole,
    getAllUsers, getUserById, getUserByEmail, approveUser, blockUser, unblockUser,
    updateUserPermissions, updateUserRole, deleteUser, createUserDirect, applyPlanToUser, getPendingCount,
    getContent, addContent, editContent, deleteContent, getContentForUser,
    getArticles, getArticleById, addArticle, editArticle, deleteArticle, publishArticle, archiveArticle,
    getBulletins, getBulletinById, addBulletin, editBulletin, deleteBulletin, publishBulletin, archiveBulletin,
    createTicket, getAllTickets, getUserTickets, getTicketById,
    replyTicket, updateTicketStatus, deleteTicket, getOpenTicketsCount,
    getSettings, saveSettings,
    getNotifications, addNotification, markNotifRead, getUnreadCount, clearAllNotifs,
    exportData, importData, resetToDefaults, getStats,
    getUserPlan, isAccessValid, setUserPlan,
    getUserAccessLevel, canViewContent, canDownloadContent, trackDownload,
    setAccessExpiry, getUserDownloads, getRecentResets,
    verifyMFA, logAudit, getAuditLogs, resetPassword, updatePassword,
    uploadFile, getSignedUrl, callEdgeFunction,
    onAuthStateChange: (cb) => { if (_sb) _sb.auth.onAuthStateChange(cb); },
    isOfflineMode: () => _offlineMode,
    reset: () => { _initPromise = null; },
    getVersion: () => ({ ...VERSION }),
    getMfaLevel: async () => {
      if (_mode !== 'supabase' || !_sb) return null;
      try { const { data } = await _sb.auth.mfa.getAuthenticatorAssuranceLevel(); return data || null; }
      catch(_) { return null; }
    },
  };
})();
