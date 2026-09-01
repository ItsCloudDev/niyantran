/* V2 PASS 38 tier icon system */(function(){
  var L={/* V2 PASS 40 */cricket:'<path d="m5 19 8.4-8.4"/><path d="m13.4 4.6 6 6-4.2 4.2-6-6z"/><circle cx="6.6" cy="6.2" r="1.8"/>',football:'<circle cx="12" cy="12" r="8.4"/><path d="m12 8.2 3.4 2.5-1.3 4h-4.2l-1.3-4z"/><path d="M12 3.6v4.6M19.9 9.5l-4.5 1.2M16.9 18.9l-2.8-3.5M7.1 18.9l2.8-3.5M4.1 9.5l4.5 1.2"/>',pennant:'<path d="M6 21V4.4"/><path d="M6 5.2c4-1.8 8 1.8 12 0v8.4c-4 1.8-8-1.8-12 0z"/>',whistle:'<circle cx="9" cy="14.2" r="4.6"/><path d="M13.6 14V9.2h6.8v3.4l-6.9 1.7"/><circle cx="9" cy="14.2" r="1.1"/>',runner:'<circle cx="14.6" cy="5.4" r="2"/><path d="m7.8 21 3-4.8-2.3-3 4-3.6 2.8 2.8 3.5.8"/><path d="m10.7 9.4-3.7.9-2 3"/>',tvset:'<rect x="3.6" y="6.6" width="16.8" height="12" rx="2"/><path d="m9 3.2 3 3 3-3"/>',ticket:'<path d="M3.8 8.6a2.1 2.1 0 0 0 2.1-2.1h12.2a2.1 2.1 0 0 0 2.1 2.1v2.3a2.4 2.4 0 0 0 0 4.6v2.3a2.1 2.1 0 0 0-2.1 2.1H5.9a2.1 2.1 0 0 0-2.1-2.1z"/><path d="M13.8 7v2.2M13.8 11.4v2.2M13.8 15.8V18"/>',clapper:'<path d="M4 10h16v9a1.6 1.6 0 0 1-1.6 1.6H5.6A1.6 1.6 0 0 1 4 19z"/><path d="m4 10-1-3.4L19.4 3l1 3.4z"/><path d="m7.6 9 2.3-3.7M12.4 7.7l2.3-3.7"/>',notes:'<circle cx="7.6" cy="17.8" r="2.7"/><circle cx="17" cy="15.8" r="2.7"/><path d="M10.3 17.8V6l9.4-1.9v11.7"/><path d="M10.3 9.4 19.7 7.5"/>',playCircle:'<circle cx="12" cy="12" r="8.4"/><path d="m10 8.6 5.6 3.4-5.6 3.4z"/>',star:'<path d="m12 3.6 2.5 5.1 5.6.8-4 4 .9 5.6-5-2.6-5 2.6.9-5.6-4-4 5.6-.8z"/>',billProb:'<path d="M6 3.8h9l3 3V20.2H6z"/><path d="m9 14.6 6-6"/><circle cx="9.7" cy="9.1" r="1.2"/><circle cx="14.3" cy="13.9" r="1.2"/>',pipeline:'<path d="M3.6 12h3.8M10.4 12h3.8M17.2 12h2.2"/><circle cx="9" cy="12" r="1.5"/><circle cx="15.8" cy="12" r="1.5"/><path d="m19 9.8 2.2 2.2L19 14.2"/>',question:'<path d="M4.4 5.4h15.2v10.4H9.4L4.4 19.8z"/><path d="M10.1 9.1c0-1.1.9-1.8 1.9-1.8s1.9.7 1.9 1.6c0 1.5-1.9 1.5-1.9 2.9M12 14.2h.01"/>',affidavit:'<path d="M14.4 3.4H7.6a2.2 2.2 0 0 0-2.2 2.2v12.8a2.2 2.2 0 0 0 2.2 2.2h8.8a2.2 2.2 0 0 0 2.2-2.2V7.6z"/><path d="M14.4 3.4v4.2h4.2"/><path d="M9 11.2h6"/><path d="M8.6 15.6c1-.9 1.5.8 2.5 0s1.5.8 2.5 0 1.4.7 1.8.3"/>',quotes:'<path d="M5.2 6.4h5.2v5.2H7c0 2 .9 3.2 2.7 3.8"/><path d="M13.6 6.4h5.2v5.2h-3.4c0 2 .9 3.2 2.7 3.8"/><path d="M12 19.4h.01"/>',progress:'<path d="M20 12a8 8 0 1 1-8-8"/><path d="M15.6 4.9a8 8 0 0 1 3.5 3.3"/><path d="m9.3 12.3 1.9 1.9 3.5-3.7"/>',factory:'<path d="M4 20h16"/><path d="M5.6 20V9.4l4.6 3V9.4l4.6 3V9.4l4.6 3V20"/><path d="M8 16.4h1.6M12.6 16.4h1.6"/>',sunrise:'<path d="M4 17.2h16"/><path d="M8 17.2a4 4 0 0 1 8 0"/><path d="M12 8.2V5.4M6.2 10.6 4.4 8.8M17.8 10.6l1.8-1.8"/>',
    seal:'<circle cx="12" cy="9.2" r="4.6"/><path d="m10.3 9 1.3 1.3 2.3-2.6"/><path d="M9.6 13.2 8.2 20l3.8-1.9L15.8 20l-1.4-6.8"/>',
    assembly:'<circle cx="12" cy="8.2" r="2.6"/><path d="M5.2 19.2c1-3.3 3.7-5.2 6.8-5.2s5.8 1.9 6.8 5.2"/><path d="M4.2 12.2a10 10 0 0 1 2.6-4.4M19.8 12.2a10 10 0 0 0-2.6-4.4"/>',
    barsCheck:'<path d="M4 19.6h16"/><path d="M7 16v-5.6M12 16V8.6M17 16v-3.4"/><path d="m14.6 4.6 1.9 1.9 3-3.2"/>',
    colAlert:'<path d="M4.4 20h15.2M6.4 20V10M10 20V10M14 20V10M17.6 20V10M12 3.6l7.6 4.8H4.4z"/><path d="M12 12.4v3.4M12 18.4h.01"/>',
    ballot:'<rect x="4.6" y="10.6" width="14.8" height="8.8" rx="1.6"/><path d="M8.6 10.6 9.9 5.4h4.2l1.3 5.2"/><path d="M10.2 8h3.6M9.6 14.8h4.8"/>',
    swapPerson:'<circle cx="8.6" cy="8" r="2.7"/><path d="M4.4 19.4c.4-3 2.2-4.8 4.2-4.8"/><path d="M14.4 7h5.6M17.8 5 20 7l-2.2 2.2M20 13h-5.6M16.6 11 14.4 13l2.2 2.2"/>',
    idCard:'<rect x="3.6" y="5.4" width="16.8" height="13.2" rx="1.8"/><circle cx="8.6" cy="10.2" r="1.9"/><path d="M6.2 15.2c.4-1.4 1.3-2.1 2.4-2.1s2 .7 2.4 2.1"/><path d="M14 9.2h4M14 12.2h4M14 15.2h2.6"/>',
    caseSwap:'<rect x="4" y="8" width="16" height="11" rx="1.8"/><path d="M9.4 8V6.4A1.6 1.6 0 0 1 11 4.8h2a1.6 1.6 0 0 1 1.6 1.6V8"/><path d="M8 13.5h8M13.9 11.6l1.9 1.9-1.9 1.9M10.1 11.6 8.2 13.5l1.9 1.9"/>',
    tender:'<path d="M14.4 3.4H7.6a2.2 2.2 0 0 0-2.2 2.2v12.8a2.2 2.2 0 0 0 2.2 2.2h8.8a2.2 2.2 0 0 0 2.2-2.2V7.6z"/><path d="M14.4 3.4v4.2h4.2"/><path d="M9.6 10.4h4.8M9.6 8.2h4.8M11.2 10.4c1.3 0 2-1 2-2.2M10 10.4l3.6 4.6"/>',
    fundFlow:'<path d="M3.6 18.8h6.2M4.8 18.8v-4.6h3.8v4.6M6.7 14.2v-2"/><path d="M14.2 18.8h6.2M15.4 18.8v-4.6h3.8v4.6M17.3 14.2v-2"/><path d="M9 7.6h5.6M12.8 5.6l2 2-2 2"/>',
    cabinet:'<ellipse cx="12" cy="14" rx="7.2" ry="3"/><circle cx="12" cy="6" r="1.5"/><circle cx="5.8" cy="8.4" r="1.5"/><circle cx="18.2" cy="8.4" r="1.5"/>',
    orgTree:'<rect x="9.4" y="3.6" width="5.2" height="3.8" rx="1"/><rect x="3.8" y="16.6" width="5.2" height="3.8" rx="1"/><rect x="15" y="16.6" width="5.2" height="3.8" rx="1"/><path d="M12 7.4v4.2M12 11.6H6.4v5M12 11.6h5.6v5"/>',
    auditGlass:'<rect x="4.2" y="4.4" width="10.8" height="14" rx="1.8"/><path d="M7 8.4h5.2M7 11.4h3.2"/><circle cx="15.8" cy="14.8" r="3.1"/><path d="m18 17 2.6 2.6"/>',
    pie:'<circle cx="12" cy="12" r="8"/><path d="M12 4v8l6.4 4.6"/>',
    vault:'<rect x="4" y="4.6" width="16" height="14.8" rx="2"/><circle cx="12" cy="12" r="4"/><path d="M12 9.4V12l1.8 1.4"/><path d="M6.6 21.2v-1.8M17.4 21.2v-1.8"/>',
    bondPct:'<rect x="4.4" y="5" width="15.2" height="14" rx="1.8"/><path d="m8.8 15.2 6.4-6.4"/><circle cx="9.3" cy="9.3" r="1.4"/><circle cx="14.7" cy="14.7" r="1.4"/>',
    gauge:'<path d="M4.6 17.4a8.2 8.2 0 1 1 14.8 0"/><path d="M12 15.2l3.8-5.2"/><circle cx="12" cy="15.2" r="1.3"/>',
    heartPulse:'<path d="M12 20s-7.6-4.8-7.6-10.2a4.4 4.4 0 0 1 7.6-3 4.4 4.4 0 0 1 7.6 3C19.6 15.2 12 20 12 20z"/><path d="M7.4 11.4h2.6l1-1.8 1.8 3.4 1-1.6h2.8"/>',
    gradCap:'<path d="m12 4.8 8.8 4-8.8 4-8.8-4z"/><path d="M7 10.8v4.4c0 1.2 2.2 2.2 5 2.2s5-1 5-2.2v-4.4"/><path d="M20.8 8.8v4.4"/>',
    wheat:'<path d="M12 20.6V7.6"/><path d="M12 11.6C9.6 11.6 8 10 8 7.6c2.4 0 4 1.6 4 4zM12 11.6c2.4 0 4-1.6 4-4-2.4 0-4 1.6-4 4zM12 15.8c-2.4 0-4-1.6-4-4 2.4 0 4 1.6 4 4zM12 15.8c2.4 0 4-1.6 4-4-2.4 0-4 1.6-4 4z"/>',
    road:'<path d="M8.2 20 10.5 4M15.8 20 13.5 4"/><path d="M12 6.2v2.2M12 11v2.2M12 15.8V18"/>',
    chatAlert:'<path d="M4.4 5.6h15.2v10.2H9.4L4.4 19.8z"/><path d="M12 8.2v3.4M12 13.6h.01"/>',
    shieldCheck:'<path d="M12 3.4 19 6.2v6c0 4-2.9 6.9-7 8.6-4.1-1.7-7-4.6-7-8.6v-6z"/><path d="m9.4 11.8 1.9 1.9 3.5-3.7"/>',
    mirrorBars:'<path d="M4 19.6h16M12 5v14.6"/><path d="M7 16v-5.2M9.6 16V8.2"/><path d="M14.4 16V9.8M17 16v-3.2"/>',
    newspaper:'<rect x="3.8" y="5.2" width="13.2" height="13.4" rx="1.8"/><path d="M17 8h1.6a1.5 1.5 0 0 1 1.5 1.5v7a2 2 0 0 1-2 2H6"/><path d="M6.8 8.8h7.2M6.8 11.8h7.2M6.8 14.8h4.4"/>',
    cycle:'<path d="M19.2 9.6A7.7 7.7 0 0 0 6.2 7.2L4.8 8.8M4.8 14.4a7.7 7.7 0 0 0 13 2.4l1.4-1.6"/><path d="M6.6 4.6 6.2 7.2l2.6.4M17.4 19.4l.4-2.6-2.6-.4"/>',
    calCheck:'<rect x="3.6" y="5" width="16.8" height="15" rx="2"/><path d="M3.6 9.4h16.8M8.4 3.2v3.6M15.6 3.2v3.6"/><path d="m9.4 14.4 2 2 3.4-3.6"/>',
    works:'<path d="m14 4.6 5.4 5.4"/><path d="M15.2 9.2 6.8 17.6a2.2 2.2 0 0 1-3.1-3.1l8.4-8.4"/><path d="m16.4 3.4 4.2 4.2-2.2 2.2-4.2-4.2z"/>',
    people:'<circle cx="9" cy="8.2" r="3"/><path d="M3.4 19.6c.4-3.2 2.7-5.6 5.6-5.6s5.2 2.4 5.6 5.6"/><path d="M15.6 5.8a3 3 0 0 1 0 5.2M17.4 19.6c-.2-2.4-1.2-4.3-2.7-5.3"/>',
    housecoin:'<path d="M3.8 10.8 12 4l8.2 6.8"/><path d="M6 9.4V19h12V9.4"/><circle cx="12" cy="14" r="2.6"/><path d="M12 12.2v3.6"/>',
    glassAlert:'<circle cx="11" cy="11" r="6.6"/><path d="m15.8 15.8 4 4"/><path d="M11 8v3.6M11 14.2h.01"/>',
    clipCheck:'<rect x="5.4" y="4.8" width="13.2" height="15.6" rx="1.8"/><path d="M9.4 4.8V3.4h5.2v1.4"/><path d="m8.8 12.6 2.2 2.2 4.2-4.4"/>',
    assetBox:'<rect x="4" y="7.2" width="16" height="3.8" rx="1"/><path d="M5.6 11v7a1.6 1.6 0 0 0 1.6 1.6h9.6a1.6 1.6 0 0 0 1.6-1.6v-7"/><path d="M10 14.4h4"/>',
    landMap:'<path d="m9 4.6-5 2v12.8l5-2 6 2 5-2V4.6l-5 2z"/><path d="M9 4.6v12.8M15 6.6v12.8"/>',
    permit:'<path d="M5.6 20V5.6A1.6 1.6 0 0 1 7.2 4h5.6a1.6 1.6 0 0 1 1.6 1.6V12"/><path d="M8.4 7.4h2.2M8.4 10.6h2.2M8.4 13.8h2.2"/><path d="m13.6 17.2 2 2 3.8-4"/><path d="M3.6 20h8"/>',
    skyline:'<path d="M3.6 20h16.8"/><path d="M5.4 20V9.8h3.8V20M9.2 20V4.8h5.4V20M14.6 20v-7.6h4V20"/><path d="M11.2 7.4h1.6M11.2 10.4h1.6"/>',
    pinNews:'<path d="M12 21s6.8-6.2 6.8-11a6.8 6.8 0 1 0-13.6 0C5.2 14.8 12 21 12 21z"/><circle cx="12" cy="9.8" r="2.5"/>',
    courthouse:'<path d="M4.4 20h15.2M6.4 20V10M10 20V10M14 20V10M17.6 20V10M12 3.6l7.6 4.8H4.4z"/>',
    gavel:'<path d="m13.6 4.4 6 6-2.6 2.6-6-6z"/><path d="m10.6 7.4-3.8 3.8 6 6 3.8-3.8"/><path d="M3.6 20.4h9M5.4 15l3.6 3.6"/>',
    folder:'<path d="M3.8 6.6a1.8 1.8 0 0 1 1.8-1.8h4l2 2.4h6.8a1.8 1.8 0 0 1 1.8 1.8v8.6a1.8 1.8 0 0 1-1.8 1.8H5.6a1.8 1.8 0 0 1-1.8-1.8z"/>',
    leaf:'<path d="M5.2 19.8c0-7.8 5-12.8 14.2-14.2 0 9.2-5 14.2-14.2 14.2z"/><path d="M5.2 19.8c3.1-5.1 6.2-8.2 10.1-10.3"/>',
    radar:'<circle cx="12" cy="12" r="8.4"/><circle cx="12" cy="12" r="4.2"/><path d="m12 12 5.4-3.8"/>',
    charterBook:'<path d="M12 5.4c-2-1.4-4.5-1.7-7-1.1v14.3c2.5-.6 5-.3 7 1.1 2-1.4 4.5-1.7 7-1.1V4.3c-2.5-.6-5-.3-7 1.1z"/><path d="M12 5.4v14.3"/>',
    docCheck:'<path d="M14.4 3.4H7.6a2.2 2.2 0 0 0-2.2 2.2v12.8a2.2 2.2 0 0 0 2.2 2.2h8.8a2.2 2.2 0 0 0 2.2-2.2V7.6z"/><path d="M14.4 3.4v4.2h4.2"/><path d="m9 13.4 2 2 3.8-4"/>',
    judgeBars:'<circle cx="8.4" cy="7.6" r="2.7"/><path d="M4 19.4c.4-3 2.4-5 4.4-5"/><path d="M13.8 19.4v-4.2M16.8 19.4v-7M19.8 19.4v-2.4"/>',
    hourglass:'<path d="M7 3.6h10M7 20.4h10M8.2 3.6c0 5.8 7.6 5.8 7.6 8.4s-7.6 2.6-7.6 8.4M15.8 3.6c0 5.8-7.6 5.8-7.6 8.4s7.6 2.6 7.6 8.4"/>',
    network:'<circle cx="6.4" cy="6.6" r="2.1"/><circle cx="17.6" cy="8.6" r="2.1"/><circle cx="8.4" cy="17.4" r="2.1"/><circle cx="16.4" cy="16.4" r="2.1"/><path d="m8.5 7 7 1.2M7 8.6l1 6.8M10.5 17.1l3.8-.5M16.9 10.7l-.3 3.6"/>',
    database:'<ellipse cx="12" cy="6.4" rx="7" ry="2.7"/><path d="M5 6.4v11.2c0 1.5 3.1 2.7 7 2.7s7-1.2 7-2.7V6.4"/><path d="M5 12c0 1.5 3.1 2.7 7 2.7s7-1.2 7-2.7"/>',
    globeGavel:'<circle cx="10.6" cy="10.6" r="6.6"/><path d="M4 10.6h13.2M10.6 4c1.9 1.9 1.9 11.3 0 13.2"/><path d="m15.4 15.4 4.2 4.2M17.6 13.6l2.6 2.6-2 2"/>',
    globeScale:'<circle cx="12" cy="9.4" r="5.8"/><path d="M6.2 9.4h11.6M12 3.6c1.7 1.7 1.7 9.9 0 11.6"/><path d="M6.4 20.4h11.2M12 15.2v5.2M8.6 17.8h6.8"/>',
    globeDots:'<circle cx="12" cy="12" r="7.6"/><circle cx="12" cy="4.4" r="1"/><circle cx="19.6" cy="12" r="1"/><circle cx="12" cy="19.6" r="1"/><circle cx="4.4" cy="12" r="1"/><circle cx="17.4" cy="6.6" r="1"/><circle cx="6.6" cy="17.4" r="1"/>',
    bookStar:'<path d="M12 5.4c-2-1.4-4.5-1.7-7-1.1v14.3c2.5-.6 5-.3 7 1.1 2-1.4 4.5-1.7 7-1.1V4.3c-2.5-.6-5-.3-7 1.1z"/><path d="m8.5 9.2.6 1.2 1.3.2-.9.9.2 1.3-1.2-.6-1.2.6.2-1.3-.9-.9 1.3-.2z"/>',
    bookGlobe:'<path d="M12 5.4c-2-1.4-4.5-1.7-7-1.1v14.3c2.5-.6 5-.3 7 1.1 2-1.4 4.5-1.7 7-1.1V4.3c-2.5-.6-5-.3-7 1.1z"/><circle cx="8.4" cy="11" r="2.4"/><path d="M6 11h4.8M8.4 8.6c.8.8.8 4 0 4.8"/>',
    insolvency:'<path d="M4.4 20h15.2M6.4 20V10M17.6 20V10M12 3.6l7.6 4.8H4.4z"/><path d="M12 11.2v5M9.9 14.1 12 16.2l2.1-2.1"/>',
    layers:'<path d="m12 4.4 8 4-8 4-8-4z"/><path d="m4 12.4 8 4 8-4M4 16.4l8 4 8-4"/>',
    calClock:'<rect x="3.6" y="5" width="12.6" height="14" rx="1.8"/><path d="M3.6 9.2h12.6M7.4 3.2v3.6M12.4 3.2v3.6"/><circle cx="17.9" cy="16.2" r="3.5"/><path d="M17.9 14.4v1.8l1.4 1"/>',
    cellBars:'<rect x="4.4" y="4.4" width="15.2" height="15.2" rx="2"/><path d="M9.4 4.4v15.2M14.6 4.4v15.2"/>',
    handshake:'<path d="M7.4 12.5 10 10l2.4 2.3L14.7 10l2.5 2.4-4.8 4.8-2.4-2.3-2.4 2.3z"/><path d="M3.4 9 6.8 5.6l2.3 2.3M20.6 9l-3.4-3.4-2.3 2.3"/>',
    candles:'<path d="M7 4.6v2.8M7 16.2v3.2M17 4.6v4.8M17 17.6v1.8"/><rect x="5" y="7.4" width="4" height="8.8" rx=".8"/><rect x="15" y="9.4" width="4" height="8.2" rx=".8"/>',
    globeBars:'<circle cx="10.2" cy="10.2" r="6.6"/><path d="M3.6 10.2h13.2M10.2 3.6c1.9 1.9 1.9 11.3 0 13.2"/><path d="M15.6 20.4V17M18.3 20.4v-5.4M21 20.4v-2.4"/>',
    globeRupee:'<circle cx="12" cy="12" r="8"/><path d="M4 12h16"/><path d="M9 7.6h6M9 7.6c2.6 0 3.8 1.1 3.8 2.4S11.6 12.4 9 12.4l4.8 4.4M9 10h6"/>',
    sliders:'<path d="M4.4 7h15.2M4.4 12h15.2M4.4 17h15.2"/><circle cx="9.6" cy="7" r="1.9"/><circle cx="15" cy="12" r="1.9"/><circle cx="7.6" cy="17" r="1.9"/>',
    bolt:'<path d="M13.2 3.4 6.2 13.2h4.6L10.8 20.6l7-9.8h-4.6z"/>',
    trophy:'<path d="M8 4.4h8v4.8a4 4 0 0 1-8 0z"/><path d="M8 5.6H5.4a2.7 2.7 0 0 0 2.9 3M16 5.6h2.6a2.7 2.7 0 0 1-2.9 3"/><path d="M12 13.2v2.6M9.4 19.6h5.2M10.2 15.8h3.6v3.8h-3.6z"/>',
    chip:'<rect x="7.4" y="7.4" width="9.2" height="9.2" rx="1.6"/><path d="M10 3.6v3.8M14 3.6v3.8M10 16.6v3.8M14 16.6v3.8M3.6 10h3.8M3.6 14h3.8M16.6 10h3.8M16.6 14h3.8"/>',
    pctCircle:'<circle cx="12" cy="12" r="8.2"/><path d="m9 15 6-6"/><circle cx="9.5" cy="9.5" r="1.2"/><circle cx="14.5" cy="14.5" r="1.2"/>',
    forecast:'<path d="m3.6 16.6 5-5 3.4 3.4 7.4-8"/><path d="M15 7h4.4v4.4"/>',
    cloudBorder:'<path d="M7.2 15.8a3.9 3.9 0 1 1 .5-7.7 4.9 4.9 0 0 1 9.5 1.1 3.3 3.3 0 0 1-.6 6.6z"/><path d="M4 19.6h16"/>',
    tagLeaf:'<path d="m12.6 3.8 7.6 7.6a1.8 1.8 0 0 1 0 2.6l-5.8 5.8a1.8 1.8 0 0 1-2.6 0L4.2 12.2V4.6h7.6z"/><circle cx="8.6" cy="8.6" r="1.4"/>',
    pulse:'<path d="M3.6 12.6h4l2.4-5.8 3.6 10.8 2.4-5h4.4"/>',
    timeline:'<path d="M4 12h16"/><circle cx="7" cy="12" r="1.7"/><circle cx="12" cy="12" r="1.7"/><circle cx="17" cy="12" r="1.7"/><path d="M7 10.3V7.6M12 13.7v2.7M17 10.3V7.6"/>',
    leafCoin:'<circle cx="12" cy="12" r="8.2"/><path d="M8.4 15.6c0-4 2.4-6.4 7.2-7.2 0 4.8-2.4 7.2-7.2 7.2z"/>',
    registry:'<path d="M6 3.8h12a1.6 1.6 0 0 1 1.6 1.6v13.2a1.6 1.6 0 0 1-1.6 1.6H6a1.6 1.6 0 0 1-1.6-1.6V5.4A1.6 1.6 0 0 1 6 3.8z"/><path d="M8.8 3.8v16.4"/><path d="M11.6 8.2h4.8M11.6 11.2h4.8M11.6 14.2h3"/>',
    tower:'<circle cx="12" cy="8.6" r="1.9"/><path d="M12 10.5 9.2 20.6M12 10.5l2.8 10.1M9.9 17.4h4.2"/><path d="M8.2 5a5.4 5.4 0 0 0 0 7.2M15.8 5a5.4 5.4 0 0 1 0 7.2M5.6 2.8a8.6 8.6 0 0 0 0 11.6M18.4 2.8a8.6 8.6 0 0 1 0 11.6"/>',
    dome:'<path d="M4 20h16"/><path d="M6.4 20v-6.2h11.2V20"/><path d="M12 4.8a5.6 5.6 0 0 1 5.6 5.6H6.4A5.6 5.6 0 0 1 12 4.8z"/><path d="M12 2.8v2"/>'
  };
  var F2={
    /*V2PASS38C*/'Cricket Wire':'cricket','Fixtures & Results \u2014 World Leagues':'trophy','Football Wire':'football','ISL Tracker':'pennant','Indian Sports Wire':'newspaper','Sports Governance & Policy':'whistle','Sports Business & Media Rights':'tvset','Athlete Index':'runner','TV & Streaming Tonight':'tvset','Box Office Tracker':'ticket','Entertainment News Wire':'tower','Bollywood & Film Wire':'clapper','Music Charts \u2014 India Top 25':'notes','Music Charts \u2014 Global Top 25':'notes','OTT & Studio Intelligence':'playCircle','Celebrity Influence Index':'star',/* V2 PASS 52 aliases *//*V2PASS52B*//*V2PASS52C geo features*/'Constituency Register':'ballot','Roll Demography':'people','Community Bloc Matrix':'pie','Election Results 2017–2024':'barsCheck','Split-Ticket & Competitiveness':'mirrorBars','SIR Roll Churn':'cycle','Registration Gap':'glassAlert','State Governance Brief':'dome','Booth Register':'ballot','Booth Demography':'people','Booth Bloc Composition':'pie','Booth Political History':'timeline','Swing Booths':'pctCircle','Anchor Booths':'shieldCheck','Booth-level Roll Churn':'cycle','Local Governance Brief':'skyline','District Court Case Tracker':'folder','Sector Tribunals':'layers','Central Projects':'progress','Budget & Schemes':'pie','Industry Updates':'factory','MP Report Cards':'idCard','Manifestos & Promises':'clipCheck','Judge Analytics':'judgeBars','Pendency & Disposal':'hourglass','Citation Network':'network','US Supreme Court':'bookStar','Commonwealth Courts':'bookGlobe','Regional Courts':'globeDots','Insolvency Courts':'insolvency','Hearing Scheduler':'calClock','HC Cause Lists':'calClock','HC Pendency':'hourglass','HC Bench Analytics':'judgeBars','HC PIL Tracker':'docCheck','HC vs State':'fundFlow','District Pendency':'hourglass','Prisons & Undertrials':'cellBars','Legal Aid & Lok Adalats':'handshake','Court Directory':'people','Case-Law Library':'database','Constitution Benches':'charterBook','Key Indicators':'gauge','Country Economies':'globeRupee','Sector Policy':'bolt','Trade & Sanctions':'handshake','Business Leaders':'trophy','Election Forecasts':'forecast','World Exchanges':'globeBars','AI & Tech':'chip','India Top 25':'notes','Global Top 25':'notes','World Fixtures':'trophy','Bill Passage Index':'billProb','Policy Pipeline':'pipeline','Parliamentary Questions':'question','Regulatory Watch':'radar','Candidate Affidavits':'affidavit','Delimitation Simulator':'landMap','Statements & Contradictions':'quotes','Morning Brief':'sunrise','Central Tenders':'tender','IAS/IPS Transfers (AGMUT)':'caseSwap','Bill Passage Probability Index':'billProb','Policy Intelligence Graph':'network','Policy Pipeline Tracker (Draft-to-Gazette)':'pipeline','Parliamentary Question Database':'question','Regulatory Body Watch (RBI/SEBI/TRAI/CCI)':'radar','Candidate Affidavit Database (Structured + API)':'affidavit','Delimitation Impact Simulator':'landMap','LS Manifestos & Promises Tracker':'clipCheck','Statement & Quote Tracker with Contradiction Detection':'quotes','MP Profiles & Performance (MPLAD, attendance, debates)':'idCard','Central Tender Aggregator + Constituency Filter':'tender','Bureaucratic Transfers — AGMUT Cadre':'caseSwap','Centre-sanctioned Projects & Completion Rate':'progress','Budget Utilisation & Schemes':'pie','Industry Updates (Ministry Data)':'factory','National Morning Brief (Auto-digest)':'sunrise','NSE/BSE Delayed Market Feed':'candles','Prediction Market Political Odds':'pctCircle','Election Forecast Aggregator':'forecast','Governor Assent Tracker':'seal','Assembly Proceedings Digest (Vernacular, Translated)':'assembly','Assembly Proceedings':'assembly',
    'Legislative Productivity Comparison':'barsCheck',"Governor Friction & President's Rule Tracker":'colAlert',
    'Booth-level Results Database':'ballot','Booth-Level Results':'ballot','Ward/Panchayat Results':'ballot',
    'MLA Defection & Anti-defection Case Tracker':'swapPerson','Anti-Defection Tracker':'swapPerson',
    'MLA Report Card + Statement Tracker':'idCard','MLA Report Cards':'idCard','Councillor & Pradhan Cards':'idCard','Elected Rep Profiles & Report Cards':'idCard',
    'Bureaucrat Transfer & Posting Tracker (State Cadre)':'caseSwap',
    'State Tender Aggregator (State e-Procurement)':'tender',
    'Centre-State Fund Flow Tracker':'fundFlow',
    /*V2PASS93: the five governance labels below are owned by the pass-84 stamper \u2014 two writers raced on the same nodes*/
    'Party Organisation Map':'orgTree',
    'State Economic Data (GSDP, sectors)':'pie','State Fiscal Deep-Dive':'vault','SDL Auction & Borrowing Tracker':'bondPct',
    'NITI Aayog State Indices':'gauge','District Performance Tracker (Composite)':'gauge','ULB/GP Performance Tracker (Composite)':'gauge',
    'District Health & Nutrition Indicators':'heartPulse','District Education Indicators':'gradCap',
    'District Economic & Livelihood Indicators':'mirrorBars','District Agriculture & Rural Indicators':'wheat',
    'District Infrastructure & Connectivity':'road','District Governance & Grievance Indicators':'chatAlert',
    'District Crime & Safety Indicators':'shieldCheck','Cross-State Comparison Engine':'mirrorBars',
    'District Media Monitor (Vernacular District Editions)':'newspaper','District Media Monitor':'newspaper',
    'Reservation Rotation':'cycle','Local Body Election & Incumbency':'calCheck','MGNREGA Works':'works',
    'Local Officer Directory':'people','GPDP Fund Tracker':'vault','MGNREGA Anomaly & Delay Analytics':'glassAlert',
    'Local Body Finance Tracker':'vault','Municipal Own-Revenue & Solvency Health':'housecoin','GP Finance & GPDP Tracker':'vault',
    'Municipal Finance & Solvency':'vault','Property Tax & Own-Revenue Efficiency':'housecoin',
    'Service-Delivery Scorecards':'clipCheck','Service Delivery Scorecards (Urban)':'clipCheck','GP Service & Asset Tracker':'assetBox',
    'Master Plan & Land Use':'landMap','Building Permissions':'permit','Flagship-City Deep Dashboard':'skyline','Hyperlocal News':'pinNews',
    'Supreme Court Feed':'courthouse','Order Archive':'assetBox','District Court Cases':'folder','Allahabad HC Feed':'gavel',
    'NGT Litigation':'leaf','CAT & NCDRC Watch':'radar','Constitutional Bench Tracker':'charterBook',
    'HC Constitutional & PIL Tracker':'docCheck','HC vs State Government Litigation':'fundFlow',
    'Judge Analytics (Ruling Patterns)':'judgeBars','Case Pendency & Disposal Analytics':'hourglass',
    'Precedent / Citation Network':'network','HC Pendency & Disposal Analytics':'hourglass',
    'HC Judge Profiles & Bench Analytics':'judgeBars','District Court Pendency & Disposal':'hourglass',
    'Professional Case-Law Database':'database','ICC Proceedings':'globeGavel','ICJ Proceedings':'globeScale',
    'WTO Dispute Settlement':'globeDots',"Regional Int'l Courts (ECtHR / CJEU / ITLOS)":'globeDots',
    'Supreme Courts & precedent \u2014 United States':'bookStar','Supreme Courts & precedent \u2014 other common-law jurisdictions':'bookGlobe',
    'NCLT / NCLAT (Insolvency)':'insolvency','Sector Tribunals (ITAT / TDSAT / SAT / DRT)':'layers',
    'Cause-List / Hearing Scheduler':'calClock','HC Case Status & Cause Lists':'calClock','District Court Cause Lists':'calClock',
    'Local Judge & Court Directory':'people','Undertrial & Prison Data':'cellBars','Legal Aid & Lok Adalat Tracker':'handshake',
    'Equity Market Feed':'candles','Live Global Stock Exchanges':'globeBars','Economic Overview of All Countries':'globeRupee',
    'Key Financial Indicators (GDP, CPI, PMI, Emp-to-Pop)':'gauge','Trade Agreements & Economic Sanctions':'handshake',
    'Economic Simulator':'sliders','Sector Policy \u2014 Power/Energy/Green/Critical Minerals':'bolt',
    'Top Financial & Business Players':'trophy','AI & the Tech Industry':'chip',
    'Political Prediction Markets':'pctCircle','Election Forecasts':'forecast',
    'Carbon Border (CBAM) Watch':'cloudBorder','Global Carbon Pricing Tracker':'tagLeaf','Carbon Price Monitor':'pulse',
    'ETS & Tax Adoption Timeline':'timeline','India CCTS & Green Credits':'leafCoin','Carbon Registry Wire':'registry','Climate Newswire':'tower'
  };
  var G2={
    'Scores & Fixtures':'trophy','Football Desk':'football','India Sports Desk':'pennant','Sports Business':'tvset','Screens & Streaming':'tvset','Industry Wire':'tower','Music':'notes','Screen Intelligence':'playCircle','Regulatory & Judicial':'radar','Economy, Finance & Industry':'globeRupee','Macro & Economic Indicators':'globeRupee','Trade & Sanctions':'handshake','Analytical Tools':'sliders','Legislative & Policy Intelligence':'dome','Electoral Data & Analytics':'ballot','Electoral & Political Analytics':'ballot',
    'Representative Intelligence':'idCard','Representative & Media Intelligence':'idCard','Government Operations':'caseSwap',
    'Political Operations Intelligence':'orgTree','Audit & Oversight':'auditGlass','Public Finance':'vault',
    'Development Indicators':'gauge','Comparative Analytics':'mirrorBars','News & Media Monitoring':'newspaper',
    'Service Delivery':'clipCheck','Hyperlocal Intelligence':'pinNews',
    'Judicial Intelligence':'gavel','Judicial Analytics':'judgeBars','International Courts':'globeDots',
    'Comparative Jurisprudence':'charterBook','Tribunals':'layers','Court Operations':'calClock','Justice System Data':'cellBars',
    'Market Intelligence':'candles','Macro, Trade & Economy':'globeRupee','Sector & Industry Intelligence':'pie','Prediction Markets':'pctCircle',
    'Border Mechanisms':'cloudBorder','Carbon Markets':'tagLeaf','India Carbon Market':'leafCoin','Registries & Wire':'registry'
  };
  function stamp(){ try{
    document.querySelectorAll('#sidebar .feat-item').forEach(function(f){
      var lbl=((f.querySelector('.label')||{}).textContent||'').replace(/\s*(AI|BETA)\s*$/,'').trim();
      var k=F2[lbl]; if(!k) return;
      var ic=f.querySelector('.niy-ficon svg');
      if(ic && f.getAttribute('data-niy-i3')!==lbl){ ic.innerHTML=L[k]; f.setAttribute('data-niy-i3',lbl); }
    });
    document.querySelectorAll('#sidebar .sidebar-group-label').forEach(function(l){
      var name=(l.textContent||'').replace(/\d+|[\u25B8\u25BE]/g,'').trim();
      var k=G2[name]; if(!k) return;
      var ic=l.querySelector('.niy-gicon svg');
      if(ic && l.getAttribute('data-niy-i3')!==name){ ic.innerHTML=L[k]; l.setAttribute('data-niy-i3',name); var w=l.querySelector('.niy-gicon'); if(w) w.title=name; }
    });
  }catch(e){} }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',stamp);else stamp();
  setTimeout(stamp,300); setInterval(stamp,700);
  /*V2PASS38D*/ (function(){ var sb=document.getElementById('sidebarList'); var t=null;
  function arm(){ var el=document.getElementById('sidebarList'); if(!el){ setTimeout(arm,500); return; }
    new MutationObserver(function(){ clearTimeout(t); t=setTimeout(stamp,80); }).observe(el,{childList:true,subtree:true}); }
  arm(); })();
})();