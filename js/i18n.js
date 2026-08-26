/* ================================================
   ADAS PRO — Sistema de Internacionalização (i18n)
   ================================================
   Versão:    1.0.0
   Suporte:   pt-BR (default), es, en
   Chave LS:  adaspro_lang
   ================================================ */

const I18N = (function () {

  const STORAGE_KEY = 'adaspro_lang';
  const DEFAULT_LANG = 'pt-BR';
  const SUPPORTED_LANGS = ['pt-BR', 'es', 'en'];
  const FALLBACK_LANG = 'pt-BR';

  let _currentLang = DEFAULT_LANG;
  let _translations = {};
  let _loadedLangs = new Set();
  let _listeners = [];

  /* ─── Detectar idioma do browser ─── */
  function detectLanguage() {
    const nav = navigator.language || navigator.userLanguage || '';
    const normalized = nav.toLowerCase().replace('_', '-');

    if (normalized.startsWith('pt')) return 'pt-BR';
    if (normalized.startsWith('es')) return 'es';
    if (normalized.startsWith('en')) return 'en';

    return DEFAULT_LANG;
  }

  /* ─── Carregar arquivo de tradução ─── */
  async function loadTranslations(lang) {
    if (_loadedLangs.has(lang)) return;

    try {
      const res = await fetch(`locales/${lang}.json`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      _translations[lang] = await res.json();
      _loadedLangs.add(lang);
    } catch (err) {
      console.warn(`[I18N] Falha ao carregar locale "${lang}":`, err);
      if (lang !== FALLBACK_LANG) {
        await loadTranslations(FALLBACK_LANG);
      }
    }
  }

  /* ─── Buscar valor aninhado por chave (ex: 'auth.login') ─── */
  function getNestedValue(obj, path) {
    return path.split('.').reduce((acc, key) => {
      if (acc && typeof acc === 'object' && key in acc) return acc[key];
      return undefined;
    }, obj);
  }

  /* ─── Interpolação: substitui {{var}} no texto ─── */
  function interpolate(text, params) {
    if (!params || typeof text !== 'string') return text;
    return text.replace(/\{\{(\w+)\}\}/g, (_, key) => {
      return params[key] !== undefined ? String(params[key]) : `{{${key}}}`;
    });
  }

  /* ─── Resolver tradução com fallback ─── */
  function resolve(key, lang) {
    const result = getNestedValue(_translations[lang], key);
    if (result !== undefined) return result;

    if (lang !== FALLBACK_LANG) {
      const fb = getNestedValue(_translations[FALLBACK_LANG], key);
      if (fb !== undefined) return fb;
    }

    return key;
  }

  /* ─── API Pública ─── */

  /**
   * t(key, params?) — traduz uma chave com interpolação opcional
   * Ex: t('gamification.streak_days', { count: 5 }) → "5 dias consecutivos"
   */
  function t(key, params) {
    const value = resolve(key, _currentLang);
    return interpolate(value, params);
  }

  /**
   * setLanguage(lang) — define o idioma atual e recarrega traduções
   */
  async function setLanguage(lang) {
    if (!SUPPORTED_LANGS.includes(lang)) {
      console.warn(`[I18N] Idioma não suportado: "${lang}". Suportados: ${SUPPORTED_LANGS.join(', ')}`);
      return;
    }

    await loadTranslations(lang);
    _currentLang = lang;

    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch { /* localStorage pode não estar disponível */ }

    document.documentElement.lang = lang;

    _listeners.forEach(fn => {
      try { fn(lang); } catch (err) { console.error('[I18N] Listener error:', err); }
    });
  }

  /**
   * getLanguage() — retorna o idioma atual
   */
  function getLanguage() {
    return _currentLang;
  }

  /**
   * getSupportedLanguages() — retorna lista de idiomas suportados
   */
  function getSupportedLanguages() {
    return [...SUPPORTED_LANGS];
  }

  /**
   * getLanguageLabel(lang) — retorna o nome nativo do idioma
   */
  function getLanguageLabel(lang) {
    const labels = { 'pt-BR': 'Português (BR)', 'es': 'Español', 'en': 'English' };
    return labels[lang] || lang;
  }

  /**
   * onLanguageChange(fn) — registra callback quando idioma muda
   */
  function onLanguageChange(fn) {
    if (typeof fn === 'function') _listeners.push(fn);
    return () => { _listeners = _listeners.filter(l => l !== fn); };
  }

  /**
   * init() — inicializa o módulo, detecta e carrega idioma
   */
  async function init() {
    let lang = null;

    try {
      lang = localStorage.getItem(STORAGE_KEY);
    } catch { /* ignore */ }

    if (!lang || !SUPPORTED_LANGS.includes(lang)) {
      lang = detectLanguage();
    }

    await loadTranslations(lang);
    _currentLang = lang;
    document.documentElement.lang = lang;

    return lang;
  }

  /**
   * tExists(key) — verifica se uma chave de tradução existe
   */
  function tExists(key) {
    const val = resolve(key, _currentLang);
    return val !== key;
  }

  /* Expor API */
  return {
    init,
    t,
    setLanguage,
    getLanguage,
    getSupportedLanguages,
    getLanguageLabel,
    detectLanguage,
    onLanguageChange,
    tExists,
    VERSION: '1.0.0',
  };

})();

if (typeof window !== 'undefined') window.I18N = I18N;
