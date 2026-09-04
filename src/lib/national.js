export function isBillPassageFeature(name) {
  return /bill passage/i.test(String(name || ''));
}

export function isPolicyGraphFeature(name) {
  return /policy intelligence graph/i.test(String(name || ''));
}

export function isMpCardsFeature(name) {
  return /mp profiles|mp report cards/i.test(String(name || ''));
}

export function isDelimitationFeature(name) {
  return /delimitation/i.test(String(name || ''));
}

export function isManifestosFeature(name) {
  return /manifestos/i.test(String(name || ''));
}

export function isBudgetFeature(name) {
  return /budget utilisation|budget & schemes/i.test(String(name || ''));
}

export function isProjectsFeature(name) {
  return /centre-sanctioned|central projects/i.test(String(name || ''));
}

export function isMorningBriefFeature(name) {
  return /morning brief/i.test(String(name || ''));
}

export function isStatementsFeature(name) {
  return /statement & quote|statements & contradictions/i.test(String(name || ''));
}

export function isIndustryFeature(name) {
  return /industry updates/i.test(String(name || ''));
}

export function isImpactRecordFeature(name) {
  return /bill passage|policy pipeline|parliamentary question|regulatory (body )?watch|candidate affidavit|delimitation|manifestos/i.test(
    String(name || ''),
  );
}

export function isNationalFullscreen(name) {
  return isPolicyGraphFeature(name);
}

export function isNationalTable(name) {
  const n = String(name || '');
  return (
    isBillPassageFeature(n) ||
    isMpCardsFeature(n) ||
    isDelimitationFeature(n) ||
    isManifestosFeature(n) ||
    isBudgetFeature(n) ||
    isProjectsFeature(n) ||
    isMorningBriefFeature(n) ||
    isStatementsFeature(n) ||
    /policy pipeline|parliamentary question|regulatory body watch|candidate affidavit|central tender|agmut|bureaucratic transfers|cabinet decisions|industry updates/i.test(
      n,
    )
  );
}

export function featureMenuLabel(mod) {
  const raw = String(mod?.workbookFunctions || mod?.htmlFeature || '').trim();
  if (!raw) return '';
  return raw.replace(/[A-Za-z]+/g, (w) => {
    if (/^(IAS|IPS|AGMUT|MP|MLA|PIB|RBI|SEBI|TRAI|CCI|LS|SIR|CAG|GPDP|MGNREGA|BDO|SDO|SDM|EO)$/i.test(w)) return w.toUpperCase();
    return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
  });
}
