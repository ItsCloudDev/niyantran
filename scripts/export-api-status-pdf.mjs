#!/usr/bin/env node
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const out = join(dirname(fileURLToPath(import.meta.url)), '..', 'api-status.pdf');

const liveGlobal = [
  ['Transit (air)', '231 aircraft, opensky', 'https://opensky-network.org/api/states/all'],
  ['Transit (ships)', '1033 ships, digitraffic', 'https://meri.digitraffic.fi/api/ais/v1/locations'],
  ['Satellite Infrastructure', '12 upcoming launches', 'https://ll.thespacedevs.com/2.2.0/launch/upcoming/?limit=12&format=json'],
  ['Satellite (CelesTrak)', '12 objects', 'https://celestrak.org/NORAD/elements/gp.php?GROUP=last-30-days&FORMAT=json'],
  ['World Constitutions', '188 in-force', 'https://www.constituteproject.org/service/constitutions?lang=en'],
  ['Growth Indicators', '20 World Bank rows', 'https://api.worldbank.org/v2/country/all/indicator/NY.GDP.MKTP.KD.ZG?format=json&mrnev=1&per_page=500'],
  ['Global Trade', '20 World Bank rows', 'https://api.worldbank.org/v2/country/all/indicator/NE.TRD.GNFS.ZS?format=json&mrnev=1&per_page=500'],
  ['Sanctions overlay', '18 OpenSanctions lists', 'https://data.opensanctions.org/datasets/latest/index.json'],
  ['Global Aid overlay', '20 OCHA FTS plans', 'https://api.hpc.tools/v1/public/fts/flow?year=2026&groupby=plan'],
  ['Chokepoints overlay', '28 PortWatch rows', 'https://services9.arcgis.com/weJ1QsnbMYJlCHdG/arcgis/rest/services/Daily_Chokepoints_Data/FeatureServer/0/query?where=1%3D1&outFields=date,portname,n_total,n_tanker,n_container,n_dry_bulk,n_cargo&orderByFields=date%20DESC&resultRecordCount=60&f=json'],
  ['Infra overlay', '12 World Bank projects', 'https://search.worldbank.org/api/v2/projects?format=json&rows=12&os=0'],
  ['Leaders overlay', '192 Wikidata heads', 'https://query.wikidata.org/sparql'],
];

const liveNational = [
  ['Industry Updates', '26 World Bank WDI rows', 'https://api.worldbank.org/v2/country/IND/indicator/NV.IND.MANF.ZS?format=json&date=2000:2030&per_page=100\nhttps://api.worldbank.org/v2/country/IND/indicator/NV.IND.TOTL.ZS?format=json&date=2000:2030&per_page=100'],
];

const failedArchive = [
  ['Regulatory Body Watch', '121', 'https://www.rbi.org.in/notifications_rss.xml\nhttps://www.rbi.org.in/pressreleases_rss.xml\nhttps://www.sebi.gov.in/sebirss.xml', 'national_regulatory_watch'],
  ['Cabinet Decisions', '6', 'https://pib.gov.in/RssMain.aspx?ModId=6&Lang=1&Regid=3', 'national_cabinet_decisions'],
  ['Central Tenders', '10', 'https://eprocure.gov.in/epublish/app?page=FrontEndTendersByOrganisation&service=page', 'national_tender_aggregator'],
  ['Policy Pipeline', '8', 'https://www.pib.gov.in/ViewRss.aspx?reg=3&lang=1', 'national_policy_pipeline'],
];

const localPack = [
  ['Open Fronts', '88', 'https://api.gdeltproject.org/api/v2/doc/doc', 'HTML dossier pack'],
  ['Conflicts', '14', 'https://api.reliefweb.int/v2/reports?appname=niyantran-terminal&query%5Bvalue%5D=armed%20conflict&limit=250&preset=latest', 'Local conflict dossiers'],
  ['Global Intelligence', '10', 'https://api.gdeltproject.org/api/v2/doc/doc', 'HTML pack'],
  ['Alliances', '46', 'https://api.gdeltproject.org/api/v2/doc/doc', 'Local alliance register'],
  ['Sanctions', '18', 'https://sanctionslistservice.ofac.treas.gov/api/PublicationPreview/exports/SDN.XML', 'Local programme register'],
  ['Global Aid', '16', 'https://api.reliefweb.int/v2/reports', 'Local appeal register'],
  ['Infra', '10', 'https://search.worldbank.org/api/v2/projects', 'Local infra register'],
  ['Nuclear Watch', '112', 'https://api.gdeltproject.org/api/v2/doc/doc', 'Local facility register'],
  ['Maritime Choke-Points', '18', 'https://api.gdeltproject.org/api/v2/doc/doc', 'Local chokepoint register'],
  ['Heads of State', '44', 'https://query.wikidata.org/sparql', 'Local pack (overlay /api/leaders is live)'],
  ['Global Commodities', '24', 'https://thedocs.worldbank.org/en/doc/18675f1d1639c7a34d463f59263ba0a2-0050012025/related/CMO-Historical-Data-Monthly.xlsx', 'Local series'],
  ['Critical Minerals', '10', 'https://api.gdeltproject.org/api/v2/doc/doc', 'USGS-basis register'],
  ['Energy', '14', 'https://api.worldbank.org/v2/country/all/indicator/EG.USE.PCAP.KG.OE?format=json&mrnev=1&per_page=500', 'Local series'],
  ['Bill Passage', '4576', 'https://sansad.in/api_rs/legislation/getBills?page=1&size=100&sortOn=billIntroducedDate&sortBy=desc', 'national_bill_tracker'],
  ['Policy Intelligence Graph', '4576', 'https://sansad.in/api_rs/legislation/getBills?page=1&size=100&sortOn=billIntroducedDate&sortBy=desc', 'national_bill_tracker'],
  ['Parliamentary Questions', '8000', 'https://elibrary.sansad.in/server/api/discover/search/objects?query=question&size=100&page=0', 'archive'],
  ['Candidate Affidavits', '483', 'https://dataverse.harvard.edu/api/datasets/:persistentId/?persistentId=doi:10.7910/DVN/26863', 'MyNeta/ADR file'],
  ['MP Profiles', '782', 'https://sansad.in/api_ls/member?page=1&size=100', 'national_mp_report_card'],
  ['AGMUT transfers', '29', 'https://api.gdeltproject.org/api/v2/doc/doc', 'gazetted register'],
  ['Delimitation', '36', '-', 'internal simulator'],
  ['Manifestos', '10', '-', 'curated Union 2024'],
  ['Central Projects', '8', 'https://search.worldbank.org/api/v2/projects?format=json&countrycode_exact=IN', 'curated flagships'],
  ['Budget & Schemes', '13', 'https://www.indiabudget.gov.in/doc/Budget_at_Glance/budget_at_a_glance.xlsx', 'curated figures'],
];

const noArchive = [
  ['Geopolitics News Wire', 'GDELT empty; 1 status row', 'https://api.gdeltproject.org/api/v2/doc/doc'],
  ['Statement & Quote Tracker', '0 rows; /api/rss HTTP 502', 'https://api.gdeltproject.org/api/v2/doc/doc'],
  ['National Morning Brief', '0 rows; PIB + GDELT HTTP 502', 'https://pib.gov.in/RssMain.aspx?ModId=6&Lang=1&Regid=3\nhttps://api.gdeltproject.org/api/v2/doc/doc'],
];

const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
const pageW = doc.internal.pageSize.getWidth();
const margin = 12;
let y = 14;

const ink = [28, 28, 28];
const line = [180, 180, 180];
const headFill = [36, 36, 36];
const zebra = [247, 247, 247];

function heading(text) {
  if (y > 180) {
    doc.addPage();
    y = 14;
  }
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...ink);
  doc.text(text, margin, y);
  y += 2;
  doc.setDrawColor(...ink);
  doc.setLineWidth(0.35);
  doc.line(margin, y, pageW - margin, y);
  y += 4;
}

function subhead(text) {
  if (y > 185) {
    doc.addPage();
    y = 14;
  }
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...ink);
  doc.text(text, margin, y);
  y += 5;
}

function table(head, body, widths) {
  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin, bottom: 12 },
    head: [head],
    body,
    theme: 'plain',
    styles: {
      font: 'helvetica',
      fontSize: 7.5,
      textColor: ink,
      cellPadding: { top: 1.6, bottom: 1.6, left: 2, right: 2 },
      overflow: 'linebreak',
      valign: 'top',
      lineColor: line,
      lineWidth: 0.15,
    },
    headStyles: {
      fillColor: headFill,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 7.5,
      cellPadding: { top: 2, bottom: 2, left: 2, right: 2 },
    },
    alternateRowStyles: { fillColor: zebra },
    columnStyles: widths,
    didDrawPage() {
      const n = doc.internal.getNumberOfPages();
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(120, 120, 120);
      doc.text(String(n), pageW - margin, doc.internal.pageSize.getHeight() - 6, { align: 'right' });
    },
  });
  y = doc.lastAutoTable.finalY + 8;
}

doc.setFont('helvetica', 'bold');
doc.setFontSize(12);
doc.setTextColor(...ink);
doc.text('API status  -  Global / National  -  1 Sep 2026', margin, y);
y += 8;

heading('Live');
subhead('Global');
table(
  ['Desk', 'Result', 'API'],
  liveGlobal,
  { 0: { cellWidth: 48 }, 1: { cellWidth: 48 }, 2: { cellWidth: 177 } },
);
subhead('National');
table(
  ['Desk', 'Result', 'API'],
  liveNational,
  { 0: { cellWidth: 48 }, 1: { cellWidth: 48 }, 2: { cellWidth: 177 } },
);

heading('Live failed - archive shown');
table(
  ['Desk', 'Rows', 'API', 'Archive'],
  failedArchive,
  { 0: { cellWidth: 42 }, 1: { cellWidth: 16 }, 2: { cellWidth: 155 }, 3: { cellWidth: 60 } },
);

heading('Live URL not used - local pack');
table(
  ['Desk', 'Rows', 'API', 'Shown'],
  localPack,
  { 0: { cellWidth: 48 }, 1: { cellWidth: 16 }, 2: { cellWidth: 145 }, 3: { cellWidth: 64 } },
);

heading('No archive');
table(
  ['Desk', 'Result', 'API'],
  noArchive,
  { 0: { cellWidth: 52 }, 1: { cellWidth: 52 }, 2: { cellWidth: 169 } },
);

writeFileSync(out, Buffer.from(doc.output('arraybuffer')));
console.log(out);
