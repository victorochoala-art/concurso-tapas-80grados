/* Objetos de la escena, dibujados en SVG con acabado realista:
   volumen por degradados, brillos difuminados y texturas generadas (madera, miga, piel).
   Luz principal arriba a la izquierda; rebote blanco desde abajo. */
(() => {
  'use strict';

  const blur = (id, d) => `<filter id="${id}" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="${d}"/></filter>`;

  // Textura: ruido teñido que solo se pinta dentro de la silueta
  const texture = (id, freq, octaves, seed, rgb, gain, bias) => `
    <filter id="${id}" x="0" y="0" width="1" height="1" color-interpolation-filters="sRGB">
      <feTurbulence type="fractalNoise" baseFrequency="${freq}" numOctaves="${octaves}" seed="${seed}" result="n"/>
      <feColorMatrix in="n" type="matrix" values="0 0 0 0 ${rgb[0]}  0 0 0 0 ${rgb[1]}  0 0 0 0 ${rgb[2]}  ${gain} 0 0 0 ${bias}" result="t"/>
      <feComposite in="t" in2="SourceAlpha" operator="in" result="tc"/>
      <feMerge><feMergeNode in="SourceGraphic"/><feMergeNode in="tc"/></feMerge>
    </filter>`;

  const stops = (list) => list.map(([o, c, a]) => `<stop offset="${o}" stop-color="${c}"${a != null ? ` stop-opacity="${a}"` : ''}/>`).join('');
  const lin = (id, x1, y1, x2, y2, list) => `<linearGradient id="${id}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}">${stops(list)}</linearGradient>`;
  const rad = (id, cx, cy, r, list, fx, fy) => `<radialGradient id="${id}" cx="${cx}" cy="${cy}" r="${r}"${fx != null ? ` fx="${fx}" fy="${fy}"` : ''}>${stops(list)}</radialGradient>`;

  const BREAD_OUT = 'M10 44C2 20 30 6 56 6s54 14 46 38l-4 42q0 8-8 8H22q-8 0-8-8Z';
  const BREAD_IN = 'M16.500 44.500c-5-18 17.500-32 39.500-32s44.500 14 39.500 32l-3.700 40q0 4.500-4.500 4.500h-62.600q-4.500 0-4.500-4.500Z';
  const BASIL = 'M6 33C10 20 26 6 50 5c20-1 38 9 47 22C86 44 66 57 44 57 26 57 10 46 6 33Z';
  const CHILI = 'M19 15c26-11 73-1 101 35-33-11-68 0-97-14-12-6-14-17-4-21Z';
  const GARLIC = 'M42 3c2 17 34 31 34 57 0 20-16 29-34 29S8 80 8 60C8 34 40 20 42 3Z';
  const BOTTLE = 'M25 28v16C25 56 8 58 8 76v88c0 8 6 13 13 13h22c7 0 13-5 13-13V76c0-18-17-20-17-32V28Z';
  const EGG = 'M39 63c-6-14 6-28 22-25 12-8 30 2 28 19 8 12-3 29-20 26-12 8-32-1-30-20Z';
  const SPAT = 'M9 14c0-7 4-11 11-11h8c7 0 11 4 11 11l1 42c0 7-5 12-12 12h-8c-7 0-12-5-12-12Z';

  const defs = [
    blur('f-b05', .5), blur('f-b1', 1), blur('f-b2', 2), blur('f-b3', 3), blur('f-b5', 5),

    texture('f-wood', '.3 .012', 3, 4, [.36, .2, .08], 1.5, -.5),
    texture('f-crumb', '.24', 3, 7, [.7, .5, .26], 5.5, -3.05),
    texture('f-crust', '.5', 2, 2, [.3, .15, .04], 1.6, -.55),
    texture('f-skin', '.4', 2, 9, [.95, .9, .82], 1.4, -.52),
    texture('f-pan', '1.4', 1, 5, [1, 1, 1], .5, -.17),
    texture('f-pepper', '.5', 2, 11, [.62, .5, .42], 1.3, -.56),

    // Tomate
    rad('rg-tom', .5, .5, .62, [[0, '#ff6044'], [.3, '#e8301f'], [.62, '#c51a12'], [.86, '#98100c'], [1, '#6f0908']], .34, .28),
    lin('lg-sepal', 0, 0, 1, 1, [[0, '#7da544'], [1, '#2c5a1e']]),
    `<clipPath id="c-tom"><circle cx="50" cy="60" r="42"/></clipPath>`,

    // Albahaca
    lin('lg-basil', 0, 0, .9, 1, [[0, '#63a43a'], [.5, '#34802b'], [1, '#1b5521']]),
    `<clipPath id="c-basil"><path d="${BASIL}"/></clipPath>`,

    // Madera
    lin('lg-wood-h', 0, 0, 1, 0, [[0, '#a8713c'], [.3, '#e4bc8a'], [.62, '#d3a46f'], [1, '#8f5f30']]),
    rad('rg-wood-bowl', .38, .3, .85, [[0, '#edc999'], [.6, '#d2a06a'], [1, '#9a6734']]),
    lin('lg-wood-in', .2, 0, .8, 1, [[0, '#8a5a2c'], [.45, '#c4915a'], [1, '#ecc998']]),

    // Espátula
    lin('lg-sil', 0, 0, 1, 1, [[0, '#f7806f'], [.5, '#ea5045'], [1, '#c8362e']]),
    `<clipPath id="c-spat"><path d="${SPAT}"/></clipPath>`,

    // Sartén
    lin('lg-rim', 0, 0, 1, 1, [[0, '#9aa0a8'], [.28, '#3b3e43'], [.55, '#70757d'], [.8, '#232528'], [1, '#50545a']]),
    rad('rg-wall', .5, .5, .5, [[0, '#17181b'], [.8, '#24262a'], [.93, '#34373c'], [1, '#101113']]),
    rad('rg-floor', .4, .35, .75, [[0, '#33363b'], [1, '#1b1d20']]),
    lin('lg-handle', 0, 0, 0, 1, [[0, '#4a4d53'], [.3, '#1e2023'], [.75, '#0c0d0e'], [1, '#232528']]),
    lin('lg-steel', 0, 0, 0, 1, [[0, '#e8ebee'], [.45, '#8d939b'], [.6, '#c8cdd3'], [1, '#6c727a']]),
    rad('rg-yolk', .5, .5, .55, [[0, '#ffd75a'], [.55, '#fbb226'], [.9, '#ea8d12'], [1, '#d67a0c']], .38, .32),
    `<clipPath id="c-egg"><path d="${EGG}"/></clipPath>`,

    // Aceite
    lin('lg-oil', 0, 0, 1, 0, [[0, '#6f5a0c'], [.14, '#b08f1c'], [.42, '#e9cf58'], [.7, '#c2a026'], [.92, '#8a7012'], [1, '#5c4a08']]),
    lin('lg-glass', 0, 0, 1, 0, [[0, '#b9c4b8'], [.2, '#eef3ec'], [.55, '#fbfdfa'], [.85, '#d5ddd3'], [1, '#aab5a9']]),
    lin('lg-cap', 0, 0, 1, 0, [[0, '#070708'], [.25, '#44474d'], [.5, '#1a1b1e'], [.8, '#2b2d31'], [1, '#040405']]),
    lin('lg-label', 0, 0, 1, 0, [[0, '#d2cbb8'], [.3, '#fbf8ef'], [.75, '#f1ecdd'], [1, '#cfc8b4']]),
    `<clipPath id="c-bottle"><path d="${BOTTLE}"/></clipPath>`,

    // Pan
    lin('lg-crust', 0, 0, 0, 1, [[0, '#b97a34'], [.5, '#9a5c22'], [1, '#6f3d12']]),
    rad('rg-crumb', .45, .4, .8, [[0, '#f8ecce'], [.7, '#efdcb2'], [1, '#dcc08a']]),
    `<clipPath id="c-crumb"><path d="${BREAD_IN}"/></clipPath>`,

    // Guindilla
    lin('lg-chili', .2, 0, .5, 1, [[0, '#f0402e'], [.4, '#d21f16'], [.8, '#9b0f0c'], [1, '#6c0807']]),
    lin('lg-stem', 0, 0, 1, 1, [[0, '#86b04c'], [1, '#33651f']]),
    `<clipPath id="c-chili"><path d="${CHILI}"/></clipPath>`,

    // Ajo
    rad('rg-garlic', .36, .42, .8, [[0, '#ffffff'], [.5, '#f3ecdf'], [.85, '#d6cab5'], [1, '#b9ab92']]),
    `<clipPath id="c-garlic"><path d="${GARLIC}"/></clipPath>`,

    // Pimienta
    rad('rg-pepper', .36, .32, .8, [[0, '#6b574a'], [.5, '#33271f'], [1, '#0e0a08']]),
  ].join('');

  /* ---------- Tomate cherry ---------- */
  const sepal = (rot, sx, sy = sx) => `<g transform="rotate(${rot}) scale(${sx} ${sy})"><path d="M0 0C4-3.200 11-3.600 21 .600 12 2.600 5 2.800 0 0Z" fill="url(#lg-sepal)"/><path d="M1.500 0C7-.700 13-.500 19.500 .500" fill="none" stroke="#b7d488" stroke-width=".5" opacity=".75"/></g>`;
  const sepals = [[14, 1, .9], [58, .92], [120, .95], [165, 1, .9], [-38, .6], [-150, .55]];
  const tomato = `<svg viewBox="0 0 100 104">
    <g clip-path="url(#c-tom)">
      <circle cx="50" cy="60" r="42" fill="url(#rg-tom)"/>
      <ellipse cx="52" cy="100" rx="30" ry="9" fill="#ff8a66" opacity=".5" filter="url(#f-b5)"/>
      <ellipse cx="50" cy="22" rx="16" ry="6" fill="#5a0605" opacity=".6" filter="url(#f-b2)"/>
      <ellipse cx="35" cy="44" rx="17" ry="10" fill="#fff" opacity=".26" transform="rotate(-35 35 44)" filter="url(#f-b5)"/>
      <path d="M25.500 45c1-8 6-13.500 13-15.500 1.200 1.800 0 3.200-2 4.200-4 2-6.500 6-7.500 10.500-.800 2.300-3.200 2.500-3.500.800Z" fill="#fff" opacity=".88" filter="url(#f-b05)"/>
      <circle cx="44.500" cy="30.500" r="1.700" fill="#fff" opacity=".75" filter="url(#f-b05)"/>
    </g>
    <g transform="translate(50 25)" fill="#3d0403" opacity=".4" filter="url(#f-b1)">${sepals.map(([r, x, y]) => `<path transform="rotate(${r}) scale(${x} ${y || x})" d="M0 0C4-3.200 11-3.600 21 .600 12 2.600 5 2.800 0 0Z"/>`).join('')}</g>
    <g transform="translate(50 23)">${sepals.map((s) => sepal(...s)).join('')}</g>
    <path d="M50 23.500c0-6 1-11 4-16" fill="none" stroke="#3d6a24" stroke-width="4.600" stroke-linecap="round"/>
    <path d="M49 22.500c0-6 1-10 3.400-14.500" fill="none" stroke="#9cc266" stroke-width="1.200" stroke-linecap="round" opacity=".8"/>
    <ellipse cx="54.300" cy="6.500" rx="2.300" ry="1.300" fill="#c3d195" transform="rotate(-22 54.300 6.500)"/>
  </svg>`;

  /* ---------- Albahaca ---------- */
  const veinsUp = ['M20 32.200C24 24 31 17 39 12', 'M36 31C41 22 49 14 58 9.500', 'M52 30C58 21 66 14 75 11', 'M68 29C73 22 79 17 86 15.500', 'M82 28C86 24 89 22 92.500 21.500'];
  const veinsDown = ['M20 32.200C25 40 32 47 40 51.500', 'M36 31C42 40 50 48 59 52', 'M52 30C58 38 66 45 74 47.500', 'M68 29C73 35 79 40 85 41.500', 'M82 28C86 31.500 89 33.500 92 34.500'];
  const bulges = [[28, 21, -38], [45, 17, -32], [62, 16.500, -26], [77, 19.500, -18], [29, 41, 32], [46, 44.500, 28], [63, 43, 22], [78, 38.500, 14]];
  const basil = `<svg viewBox="0 0 100 62">
    <path d="M7 33C3 34 0 35.500-4 38" fill="none" stroke="#5f9238" stroke-width="2.400" stroke-linecap="round"/>
    <g clip-path="url(#c-basil)">
      <path d="${BASIL}" fill="url(#lg-basil)"/>
      <path d="M6 33C35 31 68 28 97 27 86 44 66 57 44 57 26 57 10 46 6 33Z" fill="#0d3a15" opacity=".3"/>
      <g filter="url(#f-b2)">${bulges.map(([x, y, r]) => `<ellipse cx="${x}" cy="${y}" rx="6.500" ry="3.400" fill="#b4e070" opacity=".5" transform="rotate(${r} ${x} ${y})"/>`).join('')}</g>
      <g fill="none" stroke="#0f3f17" stroke-width="1.300" opacity=".45" filter="url(#f-b05)" transform="translate(.700 1)"><path d="M6 33C35 31 68 28 97 27"/>${[...veinsUp, ...veinsDown].map((d) => `<path d="${d}"/>`).join('')}</g>
      <path d="M6 33C35 31 68 28 97 27" fill="none" stroke="#c4e39a" stroke-width="1.300" stroke-linecap="round" opacity=".9"/>
      <g fill="none" stroke="#b2d98a" stroke-width=".650" stroke-linecap="round" opacity=".75">${[...veinsUp, ...veinsDown].map((d) => `<path d="${d}"/>`).join('')}</g>
      <g fill="#fff" opacity=".42" filter="url(#f-b1)"><ellipse cx="29" cy="18.500" rx="5" ry="1.300" transform="rotate(-38 29 18.500)"/><ellipse cx="46" cy="14" rx="5.500" ry="1.300" transform="rotate(-30 46 14)"/><ellipse cx="63" cy="13.500" rx="5" ry="1.200" transform="rotate(-22 63 13.500)"/></g>
      <path d="${BASIL}" fill="none" stroke="#134a1b" stroke-width="1.400" opacity=".55"/>
    </g>
  </svg>`;

  /* ---------- Cuchara de madera ---------- */
  const spoon = `<svg viewBox="0 0 44 180">
    <g filter="url(#f-wood)">
      <path d="M17.500 48 19.300 170a2.700 2.700 0 0 0 5.400 0L26.500 48Z" fill="url(#lg-wood-h)"/>
      <ellipse cx="22" cy="30" rx="19" ry="27" fill="url(#rg-wood-bowl)"/>
    </g>
    <ellipse cx="22" cy="31" rx="13.800" ry="21" fill="url(#lg-wood-in)"/>
    <ellipse cx="20" cy="22" rx="10" ry="11" fill="#5d3a18" opacity=".35" filter="url(#f-b3)"/>
    <path d="M8.600 27C9 15 15 9.500 22 9.500" fill="none" stroke="#fbe6c4" stroke-width="1.100" stroke-linecap="round" opacity=".85" filter="url(#f-b05)"/>
    <path d="M30 46c3-4 5.500-10 5.500-16" fill="none" stroke="#f6dcb6" stroke-width="1" stroke-linecap="round" opacity=".5" filter="url(#f-b05)"/>
    <path d="M20.300 60 21.500 160" fill="none" stroke="#f8e2bf" stroke-width="1" stroke-linecap="round" opacity=".5" filter="url(#f-b05)"/>
  </svg>`;

  /* ---------- Espátula de silicona ---------- */
  const spatula = `<svg viewBox="0 0 48 184">
    <g filter="url(#f-wood)"><rect x="20" y="60" width="8" height="121" rx="4" fill="url(#lg-wood-h)"/></g>
    <path d="M22 72 22.600 172" fill="none" stroke="#f8e2bf" stroke-width="1" stroke-linecap="round" opacity=".5" filter="url(#f-b05)"/>
    <ellipse cx="24" cy="70" rx="5" ry="3" fill="#3d1a08" opacity=".35" filter="url(#f-b1)"/>
    <g clip-path="url(#c-spat)">
      <path d="${SPAT}" fill="url(#lg-sil)"/>
      <rect x="6" y="0" width="36" height="12" fill="#ffb3a6" opacity=".45" filter="url(#f-b3)"/>
      <ellipse cx="32" cy="58" rx="16" ry="12" fill="#8e1d17" opacity=".4" filter="url(#f-b5)"/>
      <path d="M13.500 16c0-4.500 2.500-7.500 7-8" fill="none" stroke="#fff" stroke-width="2.200" stroke-linecap="round" opacity=".55" filter="url(#f-b1)"/>
      <path d="M13 22 13.800 54" fill="none" stroke="#fff" stroke-width="1.600" stroke-linecap="round" opacity=".3" filter="url(#f-b1)"/>
    </g>
  </svg>`;

  /* ---------- Sartén con huevo ---------- */
  const pan = `<svg viewBox="0 0 250 128">
    <path fill-rule="evenodd" d="M112 55 236 52.500q11.500 0 11.500 11.500T236 75.500L112 73ZM231 64a5 3.600 0 1 0 10 0 5 3.600 0 1 0-10 0Z" fill="url(#lg-handle)"/>
    <path d="M128 57 234 55" fill="none" stroke="#a9aeb6" stroke-width="1.600" stroke-linecap="round" opacity=".5" filter="url(#f-b05)"/>
    <rect x="106" y="54" width="20" height="20" rx="2" fill="url(#lg-steel)"/>
    <circle cx="112" cy="64" r="2" fill="#5d636b"/><circle cx="120" cy="64" r="2" fill="#5d636b"/>
    <circle cx="111.600" cy="63.600" r=".8" fill="#fff" opacity=".7"/><circle cx="119.600" cy="63.600" r=".8" fill="#fff" opacity=".7"/>
    <circle cx="64" cy="64" r="61" fill="url(#lg-rim)"/>
    <circle cx="64" cy="64" r="57.500" fill="url(#rg-wall)"/>
    <g filter="url(#f-pan)"><circle cx="64" cy="64" r="47" fill="url(#rg-floor)"/></g>
    <path d="M14 50C20 26 40 11 62 9.500" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".32" filter="url(#f-b2)"/>
    <path d="M112 84c-7 17-22 28-40 31" fill="none" stroke="#fff" stroke-width="2.400" stroke-linecap="round" opacity=".14" filter="url(#f-b2)"/>
    <path d="${EGG}" fill="#000" opacity=".5" transform="translate(1.500 2.500)" filter="url(#f-b2)"/>
    <path d="${EGG}" fill="#f6efdc" stroke="#c9964c" stroke-width="1.400" stroke-opacity=".7"/>
    <g clip-path="url(#c-egg)">
      <path d="${EGG}" fill="#fdfbf4" transform="translate(64 62) scale(.9) translate(-64 -62)" filter="url(#f-b1)"/>
      <ellipse cx="50" cy="50" rx="13" ry="7" fill="#fff" opacity=".9" transform="rotate(-30 50 50)" filter="url(#f-b3)"/>
      <ellipse cx="78" cy="76" rx="16" ry="9" fill="#cbbf9f" opacity=".45" transform="rotate(-30 78 76)" filter="url(#f-b3)"/>
      <circle cx="66" cy="65" r="14.500" fill="#b79a55" opacity=".45" filter="url(#f-b2)"/>
      <g fill="none" stroke="#d9ceb4" stroke-width=".7" opacity=".9"><circle cx="46" cy="70" r="2.200"/><circle cx="82" cy="52" r="1.600"/><circle cx="74" cy="80" r="1.300"/></g>
    </g>
    <circle cx="64" cy="63" r="12.500" fill="url(#rg-yolk)"/>
    <ellipse cx="60" cy="58.500" rx="5.500" ry="3.400" fill="#fff" opacity=".4" transform="rotate(-32 60 58.500)" filter="url(#f-b1)"/>
    <ellipse cx="58.800" cy="57.500" rx="2.600" ry="1.300" fill="#fff" opacity=".95" transform="rotate(-32 58.800 57.500)" filter="url(#f-b05)"/>
  </svg>`;

  /* ---------- Botella de aceite ---------- */
  const ridges = Array.from({ length: 8 }, (_, i) => `<path d="M${24.500 + i * 2.200} 5v19"/>`).join('');
  const oil = `<svg viewBox="0 0 64 180">
    <g clip-path="url(#c-bottle)">
      <path d="${BOTTLE}" fill="url(#lg-glass)"/>
      <rect x="0" y="52" width="64" height="130" fill="url(#lg-oil)"/>
      <ellipse cx="32" cy="52" rx="11" ry="1.800" fill="#f6e68a" opacity=".9"/>
      <rect x="0" y="164" width="64" height="16" fill="#3f3206" opacity=".55" filter="url(#f-b3)"/>
      <path d="M12 76c0-10 6-14 11-18" fill="none" stroke="#fff" stroke-width="2.600" stroke-linecap="round" opacity=".5" filter="url(#f-b1)"/>
      <rect x="12.500" y="80" width="4.400" height="84" rx="2.200" fill="#fff" opacity=".6" filter="url(#f-b05)"/>
      <rect x="19" y="84" width="1.500" height="70" rx=".75" fill="#fff" opacity=".3"/>
      <rect x="48.500" y="78" width="2.200" height="86" rx="1.100" fill="#fff" opacity=".28" filter="url(#f-b05)"/>
      <rect x="27.500" y="29" width="2.200" height="18" rx="1.100" fill="#fff" opacity=".8" filter="url(#f-b05)"/>
    </g>
    <path d="${BOTTLE}" fill="none" stroke="#4a3d0a" stroke-width=".8" opacity=".35"/>
    <rect x="15" y="97.500" width="34" height="46" rx="2" fill="#2d2406" opacity=".35" filter="url(#f-b1)"/>
    <rect x="14" y="96" width="36" height="46" rx="2" fill="url(#lg-label)"/>
    <circle cx="30" cy="115" r="7" fill="#EF544E"/><circle cx="41" cy="105" r="2.200" fill="#EF544E"/>
    <g stroke="#10294D" stroke-width="1.100" stroke-linecap="round" opacity=".55"><path d="M21 129h22"/><path d="M25 134h14"/></g>
    <rect x="23.500" y="24" width="17" height="5.500" rx="1.200" fill="url(#lg-glass)" stroke="#8d998c" stroke-width=".5"/>
    <rect x="22" y="3" width="20" height="22" rx="2.600" fill="url(#lg-cap)"/>
    <g fill="none" stroke="#000" stroke-width=".5" opacity=".4">${ridges}</g>
    <rect x="22" y="3" width="20" height="3" rx="1.500" fill="#fff" opacity=".18"/>
    <rect x="26" y="5" width="2" height="18" rx="1" fill="#fff" opacity=".3" filter="url(#f-b05)"/>
  </svg>`;

  /* ---------- Rebanada de pan ---------- */
  const bread = `<svg viewBox="0 0 112 100">
    <g filter="url(#f-crust)"><path d="${BREAD_OUT}" fill="url(#lg-crust)"/></g>
    <path d="M12 40C8 22 30 9 56 9s48 13 44 31" fill="none" stroke="#f3dcae" stroke-width="2.200" stroke-linecap="round" opacity=".4" filter="url(#f-b1)"/>
    <g filter="url(#f-crumb)"><path d="${BREAD_IN}" fill="url(#rg-crumb)"/></g>
    <g clip-path="url(#c-crumb)">
      <path d="${BREAD_IN}" fill="none" stroke="#9c6426" stroke-width="5" opacity=".5" filter="url(#f-b2)"/>
      <ellipse cx="42" cy="34" rx="22" ry="10" fill="#fff" opacity=".35" transform="rotate(-14 42 34)" filter="url(#f-b5)"/>
    </g>
  </svg>`;

  /* ---------- Guindilla ---------- */
  const chili = `<svg viewBox="0 0 124 62">
    <g clip-path="url(#c-chili)">
      <path d="${CHILI}" fill="url(#lg-chili)"/>
      <path d="M24 37c29 13 62 3 96 13l2 6-104-4Z" fill="#4d0504" opacity=".45" filter="url(#f-b2)"/>
      <path d="M30 19c24-6 54 2 76 18" fill="none" stroke="#ff9a85" stroke-width="5" stroke-linecap="round" opacity=".45" filter="url(#f-b2)"/>
      <path d="M33 17.500c20-4.500 44 1 63 12.500" fill="none" stroke="#fff" stroke-width="1.700" stroke-linecap="round" opacity=".85" filter="url(#f-b05)"/>
      <path d="M100 33.500c4 2.500 7 5 10 8" fill="none" stroke="#fff" stroke-width="1" stroke-linecap="round" opacity=".5" filter="url(#f-b05)"/>
    </g>
    <path d="M12 21c2-7 9-11 17-9 5 1 8 4 9 8-5-2-9-1-13 1-4 3-9 3-13 0Z" fill="url(#lg-stem)"/>
    <path d="M16 18c3-3 8-4 13-3" fill="none" stroke="#c4de94" stroke-width=".9" stroke-linecap="round" opacity=".7"/>
    <path d="M18 14C13 11 9 7 4 6" fill="none" stroke="#3f7225" stroke-width="4.600" stroke-linecap="round"/>
    <path d="M17 12.500C13 10 9.500 7 5.500 5.500" fill="none" stroke="#a6cc70" stroke-width="1.100" stroke-linecap="round" opacity=".8"/>
    <ellipse cx="3.800" cy="5.800" rx="1.500" ry="2.300" fill="#c9d79b" transform="rotate(-50 3.800 5.800)"/>
  </svg>`;

  /* ---------- Cabeza de ajo ---------- */
  const garlic = `<svg viewBox="0 0 84 92">
    <g filter="url(#f-skin)"><path d="${GARLIC}" fill="url(#rg-garlic)"/></g>
    <g clip-path="url(#c-garlic)">
      <g fill="none" stroke="#9a8b70" stroke-width="2.200" opacity=".5" filter="url(#f-b1)"><path d="M42 8c-7 26-8 54-1 80"/><path d="M41 12C22 38 19 62 27 86"/><path d="M43 12c20 26 23 50 15 74"/></g>
      <g fill="none" stroke="#fff" stroke-width="1.800" opacity=".8" filter="url(#f-b1)"><path d="M38 14C27 34 24 56 30 80"/><path d="M22 44c-5 12-5 24 0 34"/></g>
      <g fill="none" stroke="#9a5f86" stroke-width="1.100" stroke-linecap="round" opacity=".28"><path d="M34 34c-4 12-5 26-2 40"/><path d="M52 32c5 13 6 27 3 41"/><path d="M62 50c3 9 3 18 0 26"/></g>
      <ellipse cx="58" cy="82" rx="22" ry="10" fill="#8f8168" opacity=".4" filter="url(#f-b5)"/>
      <path d="M42 2c1 8 6 15 13 21-9-3-16-3-26 0 7-6 12-13 13-21Z" fill="#c6ad84" opacity=".7" filter="url(#f-b1)"/>
    </g>
    <path d="${GARLIC}" fill="none" stroke="#b9ab92" stroke-width=".8" opacity=".7"/>
    <ellipse cx="42" cy="88.500" rx="7" ry="2.400" fill="#8a7453"/>
    <g fill="none" stroke="#6f5a3c" stroke-width=".7" stroke-linecap="round"><path d="M38 89l-1.500 2.600"/><path d="M41 90v2.600"/><path d="M44 90l.800 2.600"/><path d="M47 89l2 2.400"/></g>
  </svg>`;

  /* ---------- Grano de pimienta ---------- */
  const pepper = `<svg viewBox="0 0 20 20">
    <g filter="url(#f-pepper)"><circle cx="10" cy="10" r="9" fill="url(#rg-pepper)"/></g>
    <ellipse cx="7" cy="6.500" rx="3" ry="1.800" fill="#fff" opacity=".3" transform="rotate(-35 7 6.500)" filter="url(#f-b05)"/>
  </svg>`;

  window.SCENE_ART = { defs, art: { tomato, basil, spoon, spatula, pan, oil, bread, chili, garlic, pepper } };
})();
