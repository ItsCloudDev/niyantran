/* V2 PASS 54 rename ledger — old names keep working in search, tooltips say "Formerly:" */(function () {
  'use strict';
  /* current displayed label -> every name it has carried before */
  var LEDGER = {
    'Transit': ['TRANSIT \u2014 Live Ships & Aircraft', 'SEABORNE', 'Live Ships & Aircraft', 'ship tracker'],
    'Open Fronts': ['War & Conflict Wire', 'Global War & Conflict Tracker'],
    'Conflicts': ['Conflicts \u2014 Global Intelligence', 'Global Conflict Intelligence'],
    'Global Intelligence': ['Defence Procurement', 'Defense Modernization & Procurement Watch'],
    'Alliances': ['Alliances & Diplomacy', 'Strategic Alliances Watch'],
    'Sanctions': ['Sanctions Intelligence', 'Sanctions (reference)'],
    'Heads of State': ['World Leaders', 'Heads of State (reference)'],
    'Infra': ['Strategic Infrastructure', 'Major Infrastructure & Strategic Projects Tracker'],
    'Maritime Choke-Points': ['Maritime Chokepoints'],
    'Growth Indicators': ['Global Development Indicators'],
    'Geopolitics News Wire': ['Geopolitics Newswire', 'Global Geopolitics News Monitor'],
    'Energy': ['Energy & Critical Minerals'],
    'Bill Passage Index': ['Bill Passage Probability Index'],
    'Parliamentary Questions': ['Parliamentary Question Database'],
    'Candidate Affidavits': ['Candidate Affidavit Database (Structured + API)'],
    'Central Tenders': ['Central Tender Aggregator + Constituency Filter'],
    'Regulatory Watch': ['Regulatory Body Watch (RBI/SEBI/TRAI/CCI)'],
    'Policy Pipeline': ['Policy Pipeline Tracker (Draft-to-Gazette)'],
    'IAS/IPS Transfers (AGMUT)': ['Bureaucratic Transfers \u2014 AGMUT Cadre'],
    'MLA Report Cards': ['MLA Report Card + Statement Tracker'],
    'Statements & Contradictions': ['Statement & Quote Tracker with Contradiction Detection'],
    'Morning Brief': ['National Morning Brief (Auto-digest)'],
    'Delimitation Simulator': ['Delimitation Impact Simulator'],
    'MP Report Cards': ['MP Profiles & Performance (MPLAD, attendance, debates)'],
    'Manifestos & Promises': ['LS Manifestos & Promises Tracker'],
    'Central Projects': ['Centre-sanctioned Projects & Completion Rate'],
    'Budget & Schemes': ['Budget Utilisation & Schemes'],
    'Industry Updates': ['Industry Updates (Ministry Data)'],
    'Supreme Court Feed': ['Supreme Court Order & Judgment Feed'],
    'Allahabad HC Feed': ['UP High Court (Allahabad) Order Feed'],
    'Order Archive': ['Order Archive by Topic (Cross-Court)'],
    'NGT Litigation': ['NGT Environmental Litigation Tracker'],
    'CAT & NCDRC Watch': ['CAT & Consumer Disputes (NCDRC) Watch'],
    'District Court Case Tracker': ['Bijnor District Court Case Tracker'],
    'Judge Analytics': ['Judge Analytics (Ruling Patterns)'],
    'Pendency & Disposal': ['Case Pendency & Disposal Analytics'],
    'Citation Network': ['Precedent / Citation Network'],
    'US Supreme Court': ['Supreme Courts & precedent \u2014 United States'],
    'Commonwealth Courts': ['Supreme Courts & precedent \u2014 other common-law jurisdictions'],
    'Regional Courts': ["Regional Int'l Courts (ECtHR / CJEU / ITLOS)"],
    'Insolvency Courts': ['NCLT / NCLAT (Insolvency)'],
    'Sector Tribunals': ['Sector Tribunals (ITAT / TDSAT / SAT / DRT)'],
    'Hearing Scheduler': ['Cause-List / Hearing Scheduler'],
    'HC Cause Lists': ['HC Case Status & Cause Lists'],
    'HC Pendency': ['HC Pendency & Disposal Analytics'],
    'HC Bench Analytics': ['HC Judge Profiles & Bench Analytics'],
    'HC PIL Tracker': ['HC Constitutional & PIL Tracker'],
    'HC vs State': ['HC vs State Government Litigation'],
    'District Pendency': ['District Court Pendency & Disposal'],
    'Prisons & Undertrials': ['Undertrial & Prison Data'],
    'Legal Aid & Lok Adalats': ['Legal Aid & Lok Adalat Tracker'],
    'Court Directory': ['Local Judge & Court Directory'],
    'Case-Law Library': ['Professional Case-Law Database'],
    'Constitution Benches': ['Constitutional Bench Tracker'],
    'Equity Market Feed': ['NSE/BSE Delayed Market Feed'],
    'World Exchanges': ['Live Global Stock Exchanges'],
    'Country Economies': ['Economic Overview of All Countries'],
    'Key Indicators': ['Key Financial Indicators (GDP, CPI, PMI, Emp-to-Pop)'],
    'Trade & Sanctions': ['Trade Agreements & Economic Sanctions'],
    'Business Leaders': ['Top Financial & Business Players'],
    'Election Forecasts': ['Election Forecast Aggregator'],
    'AI & Tech': ['AI & the Tech Industry'],
    'Sector Policy': ['Sector Policy \u2014 Power/Energy/Green/Critical Minerals'],
    'Political Prediction Markets': ['Prediction Market Political Odds'],
    'India Top 25': ['Music Charts \u2014 India Top 25'],
    'Global Top 25': ['Music Charts \u2014 Global Top 25'],
    'World Fixtures': ['Fixtures & Results \u2014 World Leagues'],
    'State Cadre Transfers': ['Bureaucrat Transfer & Posting Tracker (State Cadre)'],
    'District Media Monitor': ['District Media Monitor (Vernacular District Editions)'],
    'Centre\u2013State Fund Flows': ['Centre-State Fund Flow Tracker']
  };
  function stamp() { try {
    document.querySelectorAll('#sidebar .feat-item').forEach(function (b) {
      if (b.getAttribute('data-niy-alias')) return;
      var lbl = ((b.querySelector('.label') || {}).textContent || '').replace(/\s*(AI|BETA)\s*$/, '').trim();
      var olds = LEDGER[lbl]; if (!olds) return;
      b.setAttribute('data-niy-alias', '1');
      var s = document.createElement('span');
      s.className = 'niy-alias'; s.setAttribute('aria-hidden', 'true');
      s.style.display = 'none'; s.textContent = ' ' + olds.join(' ');
      b.appendChild(s);
      b.title = lbl + ' \u2014 formerly: ' + olds[0];
    });
  } catch (e) {} }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', stamp); else stamp();
  setTimeout(stamp, 800); setInterval(stamp, 1500);
})();