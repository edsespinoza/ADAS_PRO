/* ================================================
   ADAS PRO — Content Marketplace
   ================================================
   Empresa:     AutoTech Service
   Produto:     ADAS PRO Platform
   Versão:      1.0.0  build 20260825
   Copyright:   © 2024-2026 AutoTech Service
   ================================================ */

const MARKETPLACE = (function () {

  const STORE_KEY = 'adaspro_marketplace';
  const PURCHASES_KEY = 'adaspro_purchases';
  const REVENUE_KEY = 'adaspro_revenue';
  const PARTNERS_KEY = 'adaspro_partners';

  /* ─── Commission rates ─── */
  const COMMISSION_MIN = 0.15;
  const COMMISSION_MAX = 0.20;

  /* ─── Seed data — Parceiros ─── */
  const DEFAULT_PARTNERS = [
    { id:'pt_001', name:'Carlos Mendes', company:'Mendes ADAS Tech', specialty:'Honda & Acura — Calibração avançada', rating:4.9, verified:true, bio:'Especialista em Honda Sensing com 12 anos de experiência. Autor de guias técnicos para redes concessionárias.', contentCount:5, totalSales:340, joinedAt:'2025-06-15' },
    { id:'pt_002', name:'Ana Beatriz Souza', company:'ADAS Brasil Consultoria', specialty:'Toyota & Lexus — LDW/LDA/AVM', rating:4.7, verified:true, bio:'Engenheira automotiva, consultora ADAS para montadoras e oficinas multimarca.', contentCount:3, totalSales:210, joinedAt:'2025-09-22' },
    { id:'pt_003', name:'Ricardo Tanaka', company:'Tanaka Calibration Lab', specialty:'Nissan/Infiniti & Subaru EyeSight', rating:4.8, verified:true, bio:'Laboratório independente de calibração ADAS. Produz targets de alta precisão.', contentCount:4, totalSales:180, joinedAt:'2026-01-10' },
    { id:'pt_004', name:'Marina Costa', company:'Costa ADAS Workshop', specialty:'VAG — ODIS/Calibração multimarca', rating:4.5, verified:false, bio:'Técnica especializada em grupo VAG e marcas chinesas. Conteúdo prático de oficina.', contentCount:2, totalSales:95, joinedAt:'2026-04-05' },
  ];

  /* ─── Seed data — Conteúdo do marketplace ─── */
  const DEFAULT_CONTENT = [
    { id:'mp_001', partnerId:'pt_001', title:'Honda Sensing — Diagnóstico Completo', description:'Guia avançado de diagnóstico Honda Sensing com códigos de falha, procedimentos de reset e tabela de offsets por modelo. 35 páginas.', category:'honda', price:49.90, originalPrice:79.90, type:'pdf', tags:['honda','sensing','diagnóstico','códigos-de-falha'], previewImages:['honda-sensing-preview-1.jpg'], pages:35, fileSize:'5.8 MB', purchaseType:'one-time', status:'published', downloads:142, rating:4.8, ratingCount:38, createdAt:'2026-02-10', updatedAt:'2026-07-15', featured:true },
    { id:'mp_002', partnerId:'pt_001', title:'Honda AVM 360° — Padrões Avançados', description:'Padrões alternativos de calibração AVM Honda para situações especiais. Inclui procedimento de emergência sem target original.', category:'honda', price:39.90, type:'pdf', tags:['honda','avm','360','avançado'], previewImages:[], pages:22, fileSize:'3.2 MB', purchaseType:'one-time', status:'published', downloads:87, rating:4.6, ratingCount:21, createdAt:'2026-03-20', updatedAt:'2026-06-10', featured:false },
    { id:'mp_003', partnerId:'pt_002', title:'Toyota TSS 2.0 — Master Class PDF', description:'Compilação completa do sistema Toyota Safety Sense 2.0. Calibração câmera + radar frontal. 48 páginas com ilustrações.', category:'toyota', price:69.90, type:'pdf', tags:['toyota','tss','safety-sense','master-class'], previewImages:['tss20-preview.jpg'], pages:48, fileSize:'8.1 MB', purchaseType:'one-time', status:'published', downloads:203, rating:4.9, ratingCount:52, createdAt:'2026-01-05', updatedAt:'2026-08-01', featured:true },
    { id:'mp_004', partnerId:'pt_002', title:'Toyota & Lexus AVM — Vídeo Tutorial', description:'Vídeo tutorial completo de calibração AVM Toyota/Lexus. 45 minutos de procedimento prático passo a passo.', category:'toyota', price:89.90, type:'video', tags:['toyota','lexus','avm','vídeo','tutorial'], previewImages:[], duration:'45min', fileSize:'420 MB', purchaseType:'one-time', status:'published', downloads:95, rating:4.7, ratingCount:28, createdAt:'2026-04-12', updatedAt:'2026-04-12', featured:false },
    { id:'mp_005', partnerId:'pt_003', title:'Nissan ProPilot — Targets de Alta Precisão', description:'Arquivos de target ProPilot em alta resolução (600 DPI). Impressão em plotter. 6 variantes regionais.', category:'nissan', price:59.90, type:'pdf', tags:['nissan','propilot','targets','alta-precisão'], previewImages:['propilot-targets.jpg'], pages:14, fileSize:'12.4 MB', purchaseType:'one-time', status:'published', downloads:178, rating:4.8, ratingCount:44, createdAt:'2026-02-28', updatedAt:'2026-05-20', featured:true },
    { id:'mp_006', partnerId:'pt_003', title:'Subaru EyeSight — Bundle Completo', description:'Todos os guias Subaru EyeSight (Gen 1 + Gen 2 + Target Pack). Economize 30% comprando o bundle.', category:'subaru', price:119.90, originalPrice:179.90, type:'bundle', tags:['subaru','eyesight','bundle','gen1','gen2'], previewImages:['eyesight-bundle.jpg'], pages:80, fileSize:'15.2 MB', purchaseType:'bundle', status:'published', downloads:62, rating:4.9, ratingCount:18, createdAt:'2026-05-01', updatedAt:'2026-05-01', featured:true },
    { id:'mp_007', partnerId:'pt_004', title:'VAG ODIS — Avançado multimarca', description:'Procedimentos avançados ODIS para Audi, VW, Seat e Skoda. Calibração LIDAR, AVM e radar 77GHz.', category:'vag', price:79.90, type:'pdf', tags:['vag','odis','audi','vw','avanzado'], previewImages:[], pages:42, fileSize:'7.6 MB', purchaseType:'one-time', status:'published', downloads:54, rating:4.5, ratingCount:12, createdAt:'2026-06-15', updatedAt:'2026-06-15', featured:false },
    { id:'mp_008', partnerId:'pt_004', title:'BYD / Chery / MG — Padrões AVM Atualizados', description:'Padrões AVM atualizados 2026 para marcas chinesas. Inclui BYD Dolphin, Seal, Chery Tiggo 8 Pro, MG ZS EV.', category:'chineses', price:44.90, type:'pdf', tags:['byd','chery','mg','avm','2026'], previewImages:[], pages:28, fileSize:'4.5 MB', purchaseType:'one-time', status:'published', downloads:38, rating:4.3, ratingCount:9, createdAt:'2026-07-20', updatedAt:'2026-07-20', featured:false },
    { id:'mp_009', partnerId:'pt_001', title:'ADAS PRO — Assinatura Mensal Premium', description:'Acesso ilimitado a todo conteúdo do marketplace. Atualizações semanais. Suporte prioritário via WhatsApp.', category:'premium', price:197.00, type:'subscription', tags:['premium','assinatura','acesso-total'], previewImages:['premium-badge.png'], purchaseType:'subscription', status:'published', downloads:28, rating:4.9, ratingCount:28, createdAt:'2026-03-01', updatedAt:'2026-08-01', featured:true },
    { id:'mp_010', partnerId:'pt_003', title:'Radar 77GHz — Guia Universal', description:'Guia definitivo de calibração de radares 77GHz. Cobertura: Hyundai, Kia, Genesis, Toyota, Nissan. Target reflexivo specifications.', category:'radar', price:54.90, type:'pdf', tags:['radar','77ghz','universal','reflexivo'], previewImages:['radar77-preview.jpg'], pages:30, fileSize:'5.0 MB', purchaseType:'one-time', status:'published', downloads:110, rating:4.7, ratingCount:25, createdAt:'2026-04-08', updatedAt:'2026-07-28', featured:false },
  ];

  /* ════════════════════════════════════════════
     ESTADO INTERNO
  ════════════════════════════════════════════ */
  let _content  = [];
  let _partners = {};
  let _purchases = {};

  /* ─── LocalStorage ─── */
  function _load() {
    try { const c = localStorage.getItem(STORE_KEY);   _content  = c ? JSON.parse(c) : [...DEFAULT_CONTENT]; } catch { _content = [...DEFAULT_CONTENT]; }
    try { const p = localStorage.getItem(PARTNERS_KEY); _partners = p ? JSON.parse(p) : Object.fromEntries(DEFAULT_PARTNERS.map(x => [x.id, x])); } catch { _partners = Object.fromEntries(DEFAULT_PARTNERS.map(x => [x.id, x])); }
    try { const u = localStorage.getItem(PURCHASES_KEY); _purchases = u ? JSON.parse(u) : {}; } catch { _purchases = {}; }
  }
  function _saveContent()  { localStorage.setItem(STORE_KEY, JSON.stringify(_content)); }
  function _savePartners() { localStorage.setItem(PARTNERS_KEY, JSON.stringify(_partners)); }
  function _savePurchases(){ localStorage.setItem(PURCHASES_KEY, JSON.stringify(_purchases)); }

  function _init() { if (!_content.length) _load(); }

  /* ════════════════════════════════════════════
     BROWSE & SEARCH
  ════════════════════════════════════════════ */

  function browseContent(category, filters) {
    _init();
    let results = _content.filter(c => c.status === 'published');
    if (category && category !== 'all') results = results.filter(c => c.category === category);
    if (filters) {
      if (filters.minPrice != null) results = results.filter(c => c.price >= filters.minPrice);
      if (filters.maxPrice != null) results = results.filter(c => c.price <= filters.maxPrice);
      if (filters.type)   results = results.filter(c => c.type === filters.type);
      if (filters.rating) results = results.filter(c => c.rating >= filters.rating);
      if (filters.sortBy) {
        const dir = filters.sortDir === 'asc' ? 1 : -1;
        results.sort((a, b) => {
          if (filters.sortBy === 'price')    return (a.price - b.price) * dir;
          if (filters.sortBy === 'rating')   return (a.rating - b.rating) * dir;
          if (filters.sortBy === 'downloads') return (a.downloads - b.downloads) * dir;
          if (filters.sortBy === 'newest')   return (new Date(a.createdAt) - new Date(b.createdAt)) * dir;
          return 0;
        });
      }
      if (filters.search) {
        const q = filters.search.toLowerCase();
        results = results.filter(c =>
          c.title.toLowerCase().includes(q) ||
          c.description.toLowerCase().includes(q) ||
          (c.tags || []).some(t => t.toLowerCase().includes(q))
        );
      }
    }
    return results;
  }

  function getContentDetails(contentId) {
    _init();
    const item = _content.find(c => c.id === contentId);
    if (!item) return null;
    const partner = _partners[item.partnerId] || null;
    return { ...item, partner };
  }

  function searchContent(query) {
    _init();
    if (!query) return _content.filter(c => c.status === 'published');
    const q = query.toLowerCase();
    return _content.filter(c =>
      c.status === 'published' && (
        c.title.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q) ||
        (c.tags || []).some(t => t.toLowerCase().includes(q)) ||
        c.category.toLowerCase().includes(q)
      )
    );
  }

  function getPopularContent(limit) {
    _init();
    return _content
      .filter(c => c.status === 'published')
      .sort((a, b) => b.downloads - a.downloads)
      .slice(0, limit || 10);
  }

  function getNewContent(limit) {
    _init();
    return _content
      .filter(c => c.status === 'published')
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, limit || 10);
  }

  function getFeaturedContent(limit) {
    _init();
    return _content
      .filter(c => c.status === 'published' && c.featured)
      .slice(0, limit || 6);
  }

  /* ════════════════════════════════════════════
     PURCHASE
  ════════════════════════════════════════════ */

  function purchaseContent(contentId, userId) {
    _init();
    const item = _content.find(c => c.id === contentId);
    if (!item) return { ok: false, error: 'Conteúdo não encontrado.' };
    if (item.status !== 'published') return { ok: false, error: 'Conteúdo não disponível.' };

    const purchaseId = 'purch_' + Date.now().toString(36);
    const commission = COMMISSION_MIN + Math.random() * (COMMISSION_MAX - COMMISSION_MIN);
    const commissionRate = Math.round(commission * 100) / 100;
    const platformFee = Math.round(item.price * commissionRate * 100) / 100;
    const partnerEarning = Math.round((item.price - platformFee) * 100) / 100;

    const purchase = {
      id: purchaseId, contentId, userId, partnerId: item.partnerId,
      amount: item.price, platformFee, partnerEarning, commissionRate,
      purchaseType: item.purchaseType, status: 'completed',
      createdAt: Date.now(),
    };

    if (!_purchases[userId]) _purchases[userId] = [];
    _purchases[userId].push(purchase);

    item.downloads = (item.downloads || 0) + 1;
    _saveContent();
    _savePurchases();

    /* Register revenue */
    _registerRevenue(purchase);

    /* Update partner stats */
    const partner = _partners[item.partnerId];
    if (partner) {
      partner.totalSales = (partner.totalSales || 0) + 1;
      _savePartners();
    }

    return { ok: true, purchaseId, amount: item.price, platformFee, partnerEarning };
  }

  function hasPurchased(contentId, userId) {
    _init();
    const userPurchases = _purchases[userId] || [];
    return userPurchases.some(p => p.contentId === contentId && p.status === 'completed');
  }

  function getUserPurchases(userId) {
    _init();
    return (_purchases[userId] || []).sort((a, b) => b.createdAt - a.createdAt);
  }

  /* ════════════════════════════════════════════
     RATINGS & REVIEWS
  ════════════════════════════════════════════ */

  function rateContent(contentId, userId, rating, review) {
    _init();
    if (rating < 1 || rating > 5) return { ok: false, error: 'Nota deve ser entre 1 e 5.' };
    const item = _content.find(c => c.id === contentId);
    if (!item) return { ok: false, error: 'Conteúdo não encontrado.' };

    if (!item._ratings) item._ratings = [];
    const existing = item._ratings.findIndex(r => r.userId === userId);
    const entry = { userId, rating, review: review || '', createdAt: Date.now() };

    if (existing >= 0) {
      item._ratings[existing] = entry;
    } else {
      item._ratings.push(entry);
    }

    /* Recalculate average */
    const sum = item._ratings.reduce((acc, r) => acc + r.rating, 0);
    item.rating = Math.round((sum / item._ratings.length) * 10) / 10;
    item.ratingCount = item._ratings.length;

    _saveContent();
    return { ok: true, newRating: item.rating, ratingCount: item.ratingCount };
  }

  function getContentRatings(contentId) {
    _init();
    const item = _content.find(c => c.id === contentId);
    return item ? (item._ratings || []) : [];
  }

  /* ════════════════════════════════════════════
     PARTNER PROFILE
  ════════════════════════════════════════════ */

  function getPartnerProfile(partnerId) {
    _init();
    return _partners[partnerId] || null;
  }

  function getPartnerContent(partnerId) {
    _init();
    return _content.filter(c => c.partnerId === partnerId && c.status === 'published');
  }

  function getAllPartners() {
    _init();
    return Object.values(_partners).sort((a, b) => b.rating - a.rating);
  }

  /* ════════════════════════════════════════════
     CONTENT UPLOAD (PARCEIROS)
  ════════════════════════════════════════════ */

  function submitContent(partnerId, data) {
    _init();
    const partner = _partners[partnerId];
    if (!partner) return { ok: false, error: 'Parceiro não encontrado.' };

    if (!data.title || !data.description || !data.category || data.price == null) {
      return { ok: false, error: 'Campos obrigatórios: título, descrição, categoria, preço.' };
    }
    if (data.price < 0) return { ok: false, error: 'Preço não pode ser negativo.' };

    const id = 'mp_' + Date.now().toString(36);
    const item = {
      id, partnerId,
      title: data.title,
      description: data.description,
      category: data.category,
      price: parseFloat(data.price),
      originalPrice: data.originalPrice ? parseFloat(data.originalPrice) : undefined,
      type: data.type || 'pdf',
      tags: data.tags || [],
      previewImages: data.previewImages || [],
      pages: data.pages || null,
      fileSize: data.fileSize || null,
      duration: data.duration || null,
      purchaseType: data.purchaseType || 'one-time',
      status: 'pending',
      downloads: 0, rating: 0, ratingCount: 0,
      createdAt: new Date().toISOString().split('T')[0],
      updatedAt: new Date().toISOString().split('T')[0],
      featured: false,
    };

    _content.push(item);
    _saveContent();

    return { ok: true, id, message: 'Conteúdo enviado para aprovação.' };
  }

  function approveContent(contentId) {
    _init();
    const item = _content.find(c => c.id === contentId);
    if (!item) return { ok: false, error: 'Conteúdo não encontrado.' };
    item.status = 'published';
    item.updatedAt = new Date().toISOString().split('T')[0];
    _saveContent();
    return { ok: true };
  }

  function rejectContent(contentId) {
    _init();
    const item = _content.find(c => c.id === contentId);
    if (!item) return { ok: false, error: 'Conteúdo não encontrado.' };
    item.status = 'rejected';
    _saveContent();
    return { ok: true };
  }

  function getPendingContent() {
    _init();
    return _content.filter(c => c.status === 'pending');
  }

  function validateUploadFile(file) {
    const allowedTypes = ['application/pdf', 'video/mp4', 'image/jpeg', 'image/png', 'image/webp'];
    const maxSize = 500 * 1024 * 1024; /* 500 MB */
    if (!allowedTypes.includes(file.type)) {
      return { ok: false, error: 'Tipo de arquivo não suportado. Use PDF, MP4, JPG, PNG ou WebP.' };
    }
    if (file.size > maxSize) {
      return { ok: false, error: 'Arquivo excede 500 MB.' };
    }
    return { ok: true };
  }

  /* ════════════════════════════════════════════
     REVENUE DASHBOARD
  ════════════════════════════════════════════ */

  let _revenueLog = [];
  function _loadRevenue() {
    try { const r = localStorage.getItem(REVENUE_KEY); _revenueLog = r ? JSON.parse(r) : []; } catch { _revenueLog = []; }
  }
  function _saveRevenue() { localStorage.setItem(REVENUE_KEY, JSON.stringify(_revenueLog.slice(0, 500))); }
  function _registerRevenue(purchase) {
    _loadRevenue();
    _revenueLog.unshift({
      id: 'rev_' + Date.now().toString(36),
      purchaseId: purchase.id,
      contentId: purchase.contentId,
      partnerId: purchase.partnerId,
      amount: purchase.amount,
      platformFee: purchase.platformFee,
      partnerEarning: purchase.partnerEarning,
      commissionRate: purchase.commissionRate,
      createdAt: purchase.createdAt,
    });
    _saveRevenue();
  }

  function getRevenueSummary(partnerId) {
    _loadRevenue();
    let entries = _revenueLog;
    if (partnerId) entries = entries.filter(e => e.partnerId === partnerId);

    const totalRevenue    = entries.reduce((s, e) => s + e.amount, 0);
    const totalPlatform   = entries.reduce((s, e) => s + e.platformFee, 0);
    const totalPartner    = entries.reduce((s, e) => s + e.partnerEarning, 0);
    const totalPurchases  = entries.length;
    const avgCommission   = entries.length ? entries.reduce((s, e) => s + e.commissionRate, 0) / entries.length : 0;

    return {
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      totalPlatform: Math.round(totalPlatform * 100) / 100,
      totalPartner: Math.round(totalPartner * 100) / 100,
      totalPurchases,
      avgCommission: Math.round(avgCommission * 10000) / 100,
    };
  }

  function getRevenueByContent(partnerId) {
    _loadRevenue();
    let entries = _revenueLog;
    if (partnerId) entries = entries.filter(e => e.partnerId === partnerId);

    const byContent = {};
    entries.forEach(e => {
      if (!byContent[e.contentId]) byContent[e.contentId] = { contentId: e.contentId, totalSales: 0, totalRevenue: 0, totalPlatform: 0 };
      byContent[e.contentId].totalSales++;
      byContent[e.contentId].totalRevenue += e.amount;
      byContent[e.contentId].totalPlatform += e.platformFee;
    });

    return Object.values(byContent)
      .map(c => ({
        ...c,
        totalRevenue: Math.round(c.totalRevenue * 100) / 100,
        totalPlatform: Math.round(c.totalPlatform * 100) / 100,
        title: (_content.find(x => x.id === c.contentId) || {}).title || c.contentId,
      }))
      .sort((a, b) => b.totalRevenue - a.totalRevenue);
  }

  function getPayoutHistory(partnerId) {
    _loadRevenue();
    let entries = _revenueLog;
    if (partnerId) entries = entries.filter(e => e.partnerId === partnerId);
    return entries.map(e => ({
      id: e.id, purchaseId: e.purchaseId, amount: e.partnerEarning,
      date: e.createdAt, status: 'paid',
    }));
  }

  /* ════════════════════════════════════════════
     STATS
  ════════════════════════════════════════════ */

  function getMarketplaceStats() {
    _init();
    const published = _content.filter(c => c.status === 'published');
    const pending   = _content.filter(c => c.status === 'pending');
    return {
      totalContent: published.length,
      pendingContent: pending.length,
      totalPartners: Object.keys(_partners).length,
      totalDownloads: published.reduce((s, c) => s + (c.downloads || 0), 0),
    };
  }

  /* ─── Init ─── */
  _load();

  /* ─── Public API ─── */
  return {
    browseContent, getContentDetails, searchContent,
    getPopularContent, getNewContent, getFeaturedContent,
    purchaseContent, hasPurchased, getUserPurchases,
    rateContent, getContentRatings,
    getPartnerProfile, getPartnerContent, getAllPartners,
    submitContent, approveContent, rejectContent, getPendingContent, validateUploadFile,
    getRevenueSummary, getRevenueByContent, getPayoutHistory,
    getMarketplaceStats,
    DEFAULT_CONTENT, DEFAULT_PARTNERS,
    COMMISSION_MIN, COMMISSION_MAX,
  };
})();
