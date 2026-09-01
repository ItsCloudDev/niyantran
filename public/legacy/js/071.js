
/*
  Language layer. Two independent things are translated:
   1. Static UI chrome (buttons, placeholders, labels) — the STRINGS dict.
   2. Authored feature copy (feature/bucket/use/money/columns/notes) — a
      parallel FEATURE_DATA_HI table (see feature-data-hi.js), merged onto
      FEATURE_DATA at render time by featuresForTier(). Raw CSV row data
      (real scraped government/market data) is never translated — only the
      app's own authored text is.
*/

let currentLang = localStorage.getItem('niyantranLang') || 'en';

const STRINGS = {
  en: {
    terminalWord: "TERMINAL",
    cmdPlaceholder: "Search",
    cmdPlaceholderBad: "No match found — try a different search term",
    cmdHint: "⏎ GO",
    sidebarFilterPlaceholder: "Filter features…",
    rowFilterPlaceholder: "Filter rows…",
    exportCsv: "Export CSV",
    exportJson: "Export JSON",
    openStudio: "Open in Studio",
    liveData: "LIVE DATA",
    uniqueTag: "UNIQUE TO THIS TIER",
    dataPipelineHeadline: "DATA PIPELINE PENDING",
    dataPipelineDefault: "This feature's data source hasn't been collected yet — see the build roadmap.",
    dataPipelineGeneric: "Data pipeline pending — see build roadmap.",
    pendingAnalysis: "Pending analysis",
    sourceMethodology: "ⓘ Source & methodology",
    billPanel: {
      passageProbability: "PASSAGE PROBABILITY",
      precedent: "PRECEDENT",
      daysInStage: "DAYS IN CURRENT STAGE",
      typical: (n) => `Typical: ~${n}d`,
      sectors: "SECTORS",
      keyTerms: "KEY TERMS",
      stateStance: "STATE / PARTY STANCE",
      methodology: "ⓘ How this is calculated",
      precedentCount: (passed, total) => `${passed} of ${total} similar bills passed`,
      relatedCoverage: "RELATED COVERAGE",
      keyChanges: "KEY CHANGES",
      downloadPdf: "⬇ Download PDF",
    },
    regulatoryPanel: {
      possibleEffects: "POSSIBLE EFFECTS",
    },
    sectorImpactPanel: {
      sectorsAffected: "SECTORS AFFECTED",
      oldVsNew: "KEY CHANGES — OLD LAW vs NEW BILL",
    },
    affidavitPanel: {
      wealthChange: "WEALTH CHANGE (2019 → 2024)",
      criminalCases: "CRIMINAL CASES",
      noCasesDeclared: "No criminal cases declared in this affidavit.",
      casesDeclaredNote: (n) => `${n} case(s) declared in the nomination affidavit. Individual case detail (sections, court, status) isn't published in this source — see the affidavit for full particulars.`,
      noRecontestData: "This candidate didn't contest in 2019, or wasn't matched to a 2019 record.",
      viewComparison: "ⓘ View full comparison on myneta",
    },
    loadingCsv: (csv) => `Loading ${csv}…`,
    renderingRows: (n) => `Rendering ${n.toLocaleString()} rows…`,
    liveCaption: (csv, n) => `${(window.__niyLive && window.__niyLive[csv]) ? '● Live agent feed' : '◦ Snapshot'} · ${csv} — ${n.toLocaleString()} rows`,
    noRowsLoaded: (csv) => `No rows loaded from ${csv} yet.`,
    syncNoteDefault: "Live data — see per-feature sync notes",
    lastSynced: (s) => `Last synced: ${s}`,
    navHint: "↑↓ to navigate · Type a tier code above to switch",
    signalsLabel: "SIGNALS",
    signalLegendTitle: "Green = healthy/on-track. Amber = watch/pending. Red = risk/flagged. Meaning varies by feature type: bill stage, tender deadline proximity, criminal-case/peer-percentile ranking, or fund utilization rate.",
    tabs: { geopolitics: "Global", national: "National", state: "State", local: "Local", judiciary: "Law", finance: "Economics", climate: "Carbon", ndesk: "Home", datastudio: "Studio" },
    tierLabel: { geopolitics: "GLOBAL", national: "NATIONAL", state: "STATE", local: "LOCAL", judiciary: "JUDICIARY", finance: "FINANCE", climate: "CLIMATE", sports: "SPORTS", entertainment: "ENTERTAINMENT" },
  },
  hi: {
    terminalWord: "टर्मिनल",
    cmdPlaceholder: "खोजें",
    cmdPlaceholderBad: "कोई मैच नहीं मिला — कुछ और खोजें",
    cmdHint: "⏎ जाएँ",
    sidebarFilterPlaceholder: "फ़ीचर फ़िल्टर करें…",
    rowFilterPlaceholder: "पंक्तियाँ फ़िल्टर करें…",
    exportCsv: "CSV निर्यात करें",
    exportJson: "JSON निर्यात करें",
    openStudio: "स्टूडियो में खोलें",
    liveData: "लाइव डेटा",
    uniqueTag: "इस स्तर के लिए विशेष",
    dataPipelineHeadline: "डेटा पाइपलाइन लंबित",
    dataPipelineDefault: "इस फ़ीचर का डेटा स्रोत अभी एकत्र नहीं किया गया है — बिल्ड रोडमैप देखें।",
    dataPipelineGeneric: "डेटा पाइपलाइन लंबित — बिल्ड रोडमैप देखें।",
    pendingAnalysis: "विश्लेषण लंबित",
    sourceMethodology: "ⓘ स्रोत व कार्यप्रणाली",
    billPanel: {
      passageProbability: "पारित होने की संभावना",
      precedent: "पूर्ववृत्त",
      daysInStage: "वर्तमान चरण में दिन",
      typical: (n) => `सामान्य: ~${n} दिन`,
      sectors: "सेक्टर",
      keyTerms: "मुख्य शब्द",
      stateStance: "राज्य / पार्टी रुख",
      methodology: "ⓘ यह कैसे गणना होती है",
      precedentCount: (passed, total) => `${total} में से ${passed} समान बिल पारित हुए`,
      relatedCoverage: "संबंधित समाचार कवरेज",
      keyChanges: "मुख्य बदलाव",
      downloadPdf: "⬇ PDF डाउनलोड करें",
    },
    regulatoryPanel: {
      possibleEffects: "संभावित प्रभाव",
    },
    sectorImpactPanel: {
      sectorsAffected: "प्रभावित सेक्टर",
      oldVsNew: "मुख्य बदलाव — पुराना कानून बनाम नया बिल",
    },
    affidavitPanel: {
      wealthChange: "संपत्ति में बदलाव (2019 → 2024)",
      criminalCases: "आपराधिक मामले",
      noCasesDeclared: "इस शपथ-पत्र में कोई आपराधिक मामला घोषित नहीं किया गया।",
      casesDeclaredNote: (n) => `नामांकन शपथ-पत्र में ${n} मामला/मामले घोषित। व्यक्तिगत मामले का विवरण (धाराएँ, अदालत, स्थिति) इस स्रोत में प्रकाशित नहीं है — पूरी जानकारी के लिए शपथ-पत्र देखें।`,
      noRecontestData: "इस उम्मीदवार ने 2019 में चुनाव नहीं लड़ा, या 2019 के रिकॉर्ड से मेल नहीं खाया।",
      viewComparison: "ⓘ myneta पर पूरी तुलना देखें",
    },
    loadingCsv: (csv) => `${csv} लोड हो रहा है…`,
    renderingRows: (n) => `${n.toLocaleString()} पंक्तियाँ रेंडर हो रही हैं…`,
    liveCaption: (csv, n) => `${csv} से लाइव डेटा — ${n.toLocaleString()} पंक्तियाँ`,
    noRowsLoaded: (csv) => `${csv} से अभी तक कोई पंक्ति लोड नहीं हुई।`,
    syncNoteDefault: "लाइव डेटा — प्रति-फ़ीचर सिंक नोट्स देखें",
    lastSynced: (s) => `अंतिम सिंक: ${s}`,
    navHint: "↑↓ नेविगेट करने के लिए · ऊपर टियर कोड टाइप कर बदलें",
    signalsLabel: "संकेत",
    signalLegendTitle: "हरा = स्वस्थ/सही रास्ते पर। पीला = निगरानी/लंबित। लाल = जोखिम/चिन्हित। अर्थ फ़ीचर के प्रकार अनुसार बदलता है: बिल की स्थिति, टेंडर की समय-सीमा, आपराधिक-मामला/सहकर्मी-प्रतिशत रैंकिंग, या फंड उपयोग दर।",
    tabs: { geopolitics: "वैश्विक", national: "राष्ट्रीय", state: "राज्य", local: "स्थानीय", judiciary: "न्यायपालिका", finance: "वित्त", climate: "जलवायु", ndesk: "होम", datastudio: "स्टूडियो" },
    tierLabel: { geopolitics: "वैश्विक", national: "राष्ट्रीय", state: "राज्य", local: "स्थानीय", ndesk: "होम", judiciary: "न्यायपालिका", finance: "वित्त", climate: "जलवायु", sports: "खेल", entertainment: "मनोरंजन" },
  },
};

function S() { return STRINGS[currentLang] || STRINGS.en; }

function tierLabel(tier) {
  /* V2 PASS 42: State/Local titles come from the live geography scope, never a hardcoded place. */
  try { if ((tier === "state" || tier === "local") && window.NiyScope) { var L = window.NiyScope.label(tier); if (L) return L; } } catch (e) {}
  return S().tierLabel[tier] || TIER_LABEL[tier] || tier;
}

// Merges the Hindi feature-copy table onto FEATURE_DATA for the active
// language, leaving raw CSV rows (fetched separately) untouched. Falls back
// field-by-field to English wherever a Hindi entry is missing, so a
// half-translated tier still renders correctly instead of breaking.
//
// Memoized per base feature object (keyed by the stable FEATURE_DATA[tier][i]
// reference, via WeakMap) so repeated renders return the SAME merged
// dataSource object rather than a fresh one each call — renderDataBlock's
// renderedBlockCache keys its cached table DOM by dataSource identity, and a
// many-thousand-row table (e.g. the question database) would otherwise be
// re-sorted and re-rendered from scratch on every single feature switch.
const hiMergeCache = new WeakMap();

function mergeFeatureHi(f, hi) {
  if (hiMergeCache.has(f)) return hiMergeCache.get(f);
  const merged = {
    ...f,
    feature: hi.feature ?? f.feature,
    bucket: hi.bucket ?? f.bucket,
    use: hi.use ?? f.use,
    money: hi.money ?? f.money,
    columns: hi.columns ?? f.columns,
    dataSource: f.dataSource ? { ...f.dataSource, note: hi.note ?? f.dataSource.note } : f.dataSource,
    extraDataSources: (f.extraDataSources && hi.extraDataSources)
      ? f.extraDataSources.map((block, bi) => {
          const hiBlock = hi.extraDataSources[bi];
          if (!hiBlock) return block;
          return {
            ...block,
            label: hiBlock.label ?? block.label,
            columns: hiBlock.columns ?? block.columns,
            dataSource: block.dataSource ? { ...block.dataSource, note: hiBlock.note ?? block.dataSource.note } : block.dataSource,
          };
        })
      : f.extraDataSources,
  };
  hiMergeCache.set(f, merged);
  return merged;
}

function featuresForTier(tier) {
  const base = FEATURE_DATA[tier] || [];
  if (currentLang !== 'hi') return base;
  const hiList = (typeof FEATURE_DATA_HI !== 'undefined' && FEATURE_DATA_HI[tier]) || [];
  return base.map((f, i) => {
    const hi = hiList[i];
    return hi ? mergeFeatureHi(f, hi) : f;
  });
}

function setLang(lang) {
  currentLang = lang;
  localStorage.setItem('niyantranLang', lang);
  document.querySelectorAll('.lang-btn').forEach(b => b.classList.toggle('active', b.dataset.lang === lang));
  document.documentElement.lang = lang;
  applyChromeStrings();
  renderAll();
}

// Chrome elements that are static HTML (not rebuilt on every renderAll) and
// so need to be pushed the current language explicitly, on load and toggle.
function applyChromeStrings() {
  const s = S();
  const wordmarkSpan = document.querySelector('.brand .wordmark span');
  if (wordmarkSpan) wordmarkSpan.textContent = s.terminalWord;
  const cmdInputEl = document.getElementById('cmdInput');
  if (cmdInputEl) cmdInputEl.placeholder = s.cmdPlaceholder;
  const cmdHintEl = document.getElementById('cmdHint');
  if (cmdHintEl) cmdHintEl.textContent = s.cmdHint;
  const sidebarFilterEl = document.getElementById('sidebarFilter');
  if (sidebarFilterEl) sidebarFilterEl.placeholder = s.sidebarFilterPlaceholder;
  const navHintEl = document.getElementById('navHint');
  if (navHintEl) navHintEl.textContent = s.navHint;
  const signalsLabelEl = document.getElementById('signalsLabel');
  if (signalsLabelEl) signalsLabelEl.textContent = s.signalsLabel;
  const signalLegendEl = document.getElementById('signalLegend');
  if (signalLegendEl) signalLegendEl.title = s.signalLegendTitle;
  document.querySelectorAll('.tab').forEach(t => {
    const label = t.querySelector('.tab-label');
    if (label) label.textContent = s.tabs[t.dataset.tier] || t.dataset.tier;
  });
  updateSyncNoteText();
}

