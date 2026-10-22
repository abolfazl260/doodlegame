/** Four illustrated mountain backdrops based on the supplied landscape references.
 * Self-contained SVG vectors make every scene available offline in web and
 * Android LAN, to both Canvas2D and WebGL; no runtime remote image requests.
 */
export const SCENIC_ARENA_IDS=["alpine-lake","dusk-valley","autumn-valley","ember-river"] as const;
export type ScenicArenaId=(typeof SCENIC_ARENA_IDS)[number];

const pine=(x:number,y:number,h:number,color:string,opacity=1):string=>{
 const w=h*.23;
 return `<g fill="${color}" opacity="${opacity}"><path d="M${x} ${y-h} L${x-w*.8} ${y-h*.55} L${x-w*.43} ${y-h*.55} L${x-w} ${y-h*.17} L${x-w*.44} ${y-h*.17} L${x-w*1.2} ${y-h*.02} H${x+w*1.2} L${x+w*.44} ${y-h*.17} H${x+w} L${x+w*.43} ${y-h*.55} H${x+w*.8} Z"/><rect x="${x-2}" y="${y-h*.12}" width="4" height="${h*.18}"/></g>`;
};
const forest=(start:number,end:number,y:number,step:number,h:number,color:string,offset=0):string=>{
 let trees="";
 for(let x=start,i=0;x<end;x+=step,i++)trees+=pine(x,y+(i%4)*2,h*(.68+(i*7%11)*.045),color,.91);
 return `<g transform="translate(0 ${offset})">${trees}</g>`;
};
const svg=(name:string,content:string):string=>
 `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="675" viewBox="0 0 1200 675" role="img" aria-label="${name} arena scenic background">${content}</svg>`;

/** Snowy blue alpine mountains and a winding pale-blue glacier river. */
const alpineLake=svg("Alpine lake",`
<defs>
 <linearGradient id="a-sky" x2="0" y2="1"><stop stop-color="#c9e3fa"/><stop offset="1" stop-color="#c5dff5"/></linearGradient>
 <linearGradient id="a-water" x2="0" y2="1"><stop stop-color="#a0c6e9"/><stop offset="1" stop-color="#699cc4"/></linearGradient>
</defs>
<path fill="url(#a-sky)" d="M0 0H1200V675H0Z"/>
<path fill="#a2c6e7" d="M0 350 76 250 128 289 212 178 270 267 348 192 441 272 520 156 602 245 740 106 842 251 924 83 1025 207 1113 165 1200 276V510H0Z"/>
<path fill="#e7f5ff" d="m0 348 76-98 20 29 24 1 16 40-44-32-37 9-33-18Zm182-101 30-69 21 27 15-4 34 68-30-26-15 14-22-23Zm151 18 16-73 30 25 25 5 30 47-37-18-31 13-17-22Zm161-44 26-65 34 23 21-5 24 49-46-16-15 12-25-29Zm181-32 65-83 27 40 22-20 51 113-53-39-15 33-26-39-31 20Zm211-36 38-70 37 26 31-15 35 111-44-28-13 24-31-34-25 11Z"/>
<path fill="#80aed4" d="M0 387 76 318 175 345 270 263 366 359 430 292 520 346 624 231 702 308 790 231 891 329 983 225 1100 325 1200 287V530H0Z"/>
<path fill="#eef9ff" opacity=".93" d="m194 331 76-68 30 46 37 20-45-12-25 13-27-31Zm385-47 45-53 32 38 31 4-30 8-25-11-31 32Zm357-3 47-56 26 37 31 22-38-11-16 15-16-25Z"/>
<path fill="#5b84ac" d="M0 436 76 348 146 374 233 326 325 384 388 313 464 349 566 296 679 377 774 316 865 342 974 263 1090 351 1200 288V561H0Z"/>
<path fill="#3c6187" d="M0 458 105 398 181 429 262 362 342 410 412 371 489 425 578 360 684 399 758 370 850 438 947 337 1016 402 1102 355 1200 419V675H0Z"/>
${forest(0,1200,469,22,74,"#284968")}
<path fill="#244565" d="M0 467q118-46 220 4 104 44 206 15 121-56 228-14 143 53 267-7 133-57 279-7v217H0Z"/>
<path fill="url(#a-water)" d="M560 480q132-12 260-2 106 8 202 5 136-9 178-19v211H0q99-43 229-67 126-30 276-62 120-30 55-66Z"/>
<path fill="#c9e4f9" d="M0 675q153-67 291-85 142-23 230-60 48-22 15-36-39-10-107-5 97-22 194-17 80 4 140 15-108-5-173 10-56 18 4 32 79 18 4 49Q472 627 335 645q-139 16-214 30Z"/>
<path d="M95 648q91-16 194-27m56-31q83-8 132-28m-59-65q46-5 88-2m154 8q79 10 162 4m-366 82q76-9 131-28" fill="none" stroke="#8ebae0" stroke-width="9" opacity=".62" stroke-linecap="round"/>
<path fill="#284c70" d="M0 528q89-34 158-25t136 40q-80 25-152 36-85 12-142 25Zm1200-67q-62-10-137 19-95 39-172 70 119 4 182 12 62 1 127-20Z"/>
${forest(0,315,535,34,115,"#244563")}
${forest(952,1200,531,31,109,"#234461")}
`);

/** Cold-blue dusk mountains, salmon sky light and a turquoise valley lake. */
const duskValley=svg("Twilight valley",`
<defs><linearGradient id="d-sky" x2="0" y2="1"><stop stop-color="#21618f"/><stop offset=".44" stop-color="#7eb7d3"/><stop offset=".76" stop-color="#ffe19d"/><stop offset="1" stop-color="#ef9f88"/></linearGradient>
<linearGradient id="d-water" x2="0" y2="1"><stop stop-color="#9de7d3"/><stop offset="1" stop-color="#367b96"/></linearGradient></defs>
<path fill="url(#d-sky)" d="M0 0H1200V675H0Z"/>
<circle cx="795" cy="375" r="159" fill="#ffe6a8" opacity=".25"/>
<path fill="#6592ba" opacity=".65" d="M0 247 122 297 252 219 378 275 505 58 642 268 788 227 923 301 1082 183 1200 242V469H0Z"/>
<path fill="#9da5c1" opacity=".57" d="M395 172 505 58 590 212 555 192 538 149 505 174 467 135Z"/>
<path fill="#6488ad" d="M0 314 105 288 232 318 332 246 440 304 537 222 661 311 747 284 845 334 1016 220 1200 321V675H0Z"/>
<path fill="#5583aa" d="M0 309q156 26 264 114 89 53 229 83 92 8 194 90H0Z"/>
<path fill="#8298b8" opacity=".56" d="M1141 256q-176 44-225 122-65 75-161 110l-61 156h506V263Z"/>
<path fill="#87b1bf" opacity=".34" d="M0 420 222 407 452 494 610 531 770 522 947 474 1200 400v275H0Z"/>
<g fill="#6797ae" opacity=".7"><path d="m0 214 165 22 63-19 211 18-84 13-255-12ZM651 259l219 4 90-19 173 25-192 11-121-10Z"/><path d="M430 292q170-5 295 20 133-23 241-10l-168 22-195-3Z"/></g>
<g fill="#ec9eac" opacity=".75"><path d="M500 344q64-10 133-4l78 11-129 13ZM738 325q67-9 115-1l63 17-159-5Zm195 67q80-15 141 7l-101 12Z"/></g>
<path fill="#315e85" d="M0 400q174-34 292 56 111 82 238 102L689 675H0Z"/>
<path fill="#416c90" d="M1200 340q-163 16-253 96-60 50-170 98l-63 141h486Z"/>
${forest(0,575,503,22,74,"#224e70")}
${forest(744,1200,480,21,62,"#315b7d")}
<path fill="#233f66" d="M0 507q147-42 314 37 112 53 266 66L701 675H0Z"/>
<path fill="url(#d-water)" d="M716 511q88-10 152 3 81 18 182 7 89-12 150-13v167H361q112-37 207-74 61-24 126-46 54-21 22-44Z"/>
<path fill="#b4e5c8" opacity=".78" d="M668 550q82-20 159-18 76 3 154 14-134-10-231 14-96 21-215 70l-143 45h-58q111-59 232-91Z"/>
<path fill="#101f3f" d="M0 527q125-24 215 42 54 29 111 106H0Zm1200-46q-107-2-184 54-55 45-80 140h264Z"/>
${forest(0,395,660,37,194,"#182743")}
${forest(1022,1200,655,34,166,"#192846")}
`);

/** Golden hour over angular snowy peaks and orange, olive autumn woodland. */
const autumnValley=svg("Autumn valley",`
<defs><linearGradient id="f-sky" x2="0" y2="1"><stop stop-color="#dac0b1"/><stop offset=".65" stop-color="#f7d3bc"/><stop offset="1" stop-color="#ffe7bb"/></linearGradient></defs>
<path fill="url(#f-sky)" d="M0 0H1200V675H0Z"/>
<g fill="#fff1d4"><path d="M0 116q46-44 106-14 78-26 136 7h131q48-45 103-20 47-43 96-8 91-25 157 24H1200v81H0Z"/><path d="M0 227q51-28 115 2h83q49-29 107 1h156q43-24 88 3h151q42-31 106 0h394v47H0Z"/></g>
<path fill="#d3bcb1" d="M0 310 124 210 240 333 392 169 483 289 605 120 726 278 844 130 1012 291 1095 231 1200 303V520H0Z"/>
<path fill="#fff4dc" d="m55 274 69-64 46 75-42-31-34 23Zm288-52 49-53 37 68-30-15-23 30Zm202-46 60-56 36 43 30 74-63-36-27 10Zm253-2 46-44 57 104-52-31-29 23Z"/>
<path fill="#a1b5a8" d="M0 374 147 315 283 351 395 286 522 336 605 233 721 349 841 259 987 378 1123 329 1200 370V580H0Z"/>
<path fill="#365c66" d="M605 233 715 348 841 259 864 385 798 466 638 450 527 421Z"/>
<path fill="#d88f67" d="M0 420 149 342 310 378 477 292 522 339 385 413 269 466 111 481Z"/>
<path fill="#ff9b4f" d="M70 419 196 373 311 333 393 293 477 292 430 337 314 397 193 451Z"/>
<path fill="#e8cba2" d="M0 397 108 378 240 408 361 386 441 362 539 410 621 371 711 422 896 382 1032 415 1200 378v249H0Z"/>
<path fill="#496c73" d="M0 454q145-83 322-39 118 27 201 21 100-4 195 47 97-51 217-53 125-18 265 23v222H0Z"/>
<path fill="#9aa850" d="M0 519q216-51 415 4 164 19 296-18 153-15 297 23 94-44 192-32v179H0Z"/>
${forest(0,440,489,22,72,"#234b57")}
${forest(695,1200,475,23,70,"#284c56")}
<path fill="#c4a65b" d="M0 532q146-48 286-22l125 61 167-31 135 18 166-18 155 29 166-43v149H0Z"/>
<path fill="#809f44" d="M0 550q199-29 341 32 147-31 282-12 99-18 241 0 133-20 336-19v124H0Z"/>
<path fill="#4e2e42" d="M0 562 103 514 164 587 288 578 362 633 490 609 537 675H0Zm1200-3-83-33-81 52-94-4-52 101h310Z"/>
${forest(0,140,638,48,185,"#202c3b")}
${forest(1040,1200,641,43,170,"#243244")}
<g fill="#f9934e"><path d="M167 547 176 476 199 450 221 481 222 546Z"/><path d="M908 559 919 487 935 454 959 493 956 555Z"/><path d="M1030 547 1038 490 1060 480 1078 514 1070 548Z"/><path d="M453 532 463 495 481 482 491 516 485 535Z"/></g>
<g fill="#263e47"><path d="M196 481v100m736-87v78m125-80v76m-581-59v57" stroke="#263e47" stroke-width="8"/></g>
<path fill="#30404a" d="M0 666q69-31 156-25 130-44 225-15 120-51 220-7 129-42 210 8 160-58 389-13v61H0Z"/>
<g fill="#3d3348"><path d="m330 619 13-10 14 6-9 11Zm414-20 16-15 17 14-8 10Zm197 39 21-15 18 10-7 15Z"/></g>
<g fill="none" stroke="#40374a" stroke-width="4" stroke-linecap="round"><path d="m240 193 12-5 14 8m-18-8 9-8M835 222l15-4 12 9m-15-8 6-7"/></g>
`);

/** Fiery mountain sunset, layered burgundy ridges and turquoise meandering river. */
const emberRiver=svg("Ember river",`
<defs><linearGradient id="e-sky" x2="0" y2="1"><stop stop-color="#ae4b28"/><stop offset=".7" stop-color="#ec9852"/><stop offset="1" stop-color="#ffb16b"/></linearGradient>
<linearGradient id="e-river" x2="0" y2="1"><stop stop-color="#4fb0a2"/><stop offset="1" stop-color="#277f83"/></linearGradient></defs>
<path fill="url(#e-sky)" d="M0 0H1200V675H0Z"/>
<circle cx="825" cy="183" r="143" fill="#ff8528"/><circle cx="825" cy="183" r="88" fill="#ffb047"/>
<g fill="#eda05c"><path d="M0 186q69-66 152-4 74-27 133 17 85-51 175 3h84v22H0Z"/><path d="M677 267q59-55 127 2 54-24 114 7 91-45 176-2h106v35H677Z"/></g>
<g fill="#f9cf86"><path d="M0 337q66-73 143-18 70-36 127 30 89-19 132 18H0Z"/><path d="M873 361q63-47 110 4 87-53 156 7 39-18 61 0v66H873Z"/></g>
<path fill="#8b2a28" d="M0 483 134 352 272 453 399 286 505 419 596 194 725 336 810 423 956 329 1100 461 1200 389V675H0Z"/>
<path fill="#fff1c6" d="m540 280 56-86 62 86-29-22-17 23-23-42-16 20Z"/>
<path fill="#d3462b" d="m385 317 14-31 106 133 49 111-98-74-84 40-97-60Z"/>
<path fill="#b8442c" d="M596 194 725 336 810 423 761 490 649 387 575 477 531 420Z"/>
<path fill="#f7a545" d="m596 194 39 66 57 48 33 28-60-17-22-28-21-5-47-47Z"/>
<path fill="#2d1c25" d="M0 464 127 395 243 482 328 431 447 537 501 675H0Z"/>
<path fill="#542a2b" d="M1200 460 1104 402 1003 467 889 437 799 566 789 675h411Z"/>
${forest(0,318,566,38,154,"#0d1e2a")}
${forest(873,1200,546,43,140,"#0d1e2a")}
<path fill="#3a3237" d="M0 567q115-30 237 24 128-13 263 28 133-33 263-9 165-32 258-43 84-25 179-34v142H0Z"/>
<path fill="url(#e-river)" d="M625 524q91-23 190-13 85 6 154-9 92-29 231-35v208H365q62-38 164-65 105-37 142-55 39-21-46-31Z"/>
<path fill="#76cebc" opacity=".65" d="M709 531q151-1 247-20 63-16 110-20-63 31-165 43-134 22-192 45-112 29-181 65l-63 31h-40q116-74 212-102 83-28 72-42Z"/>
<path fill="#192b34" d="M0 575q117-34 230 44 67 40 123 56H0Zm1200-85q-125-2-209 58-54 46-86 127h295Z"/>
${forest(0,215,634,51,207,"#071925")}
${forest(1010,1200,635,49,203,"#071925")}
<g fill="none" stroke="#f4dca1" stroke-width="5" stroke-linecap="round" opacity=".87"><path d="m530 644 61-19m89-39 38-11m100-19 27-4m92-24 16-3"/></g>
`);

export const SCENIC_ARENA_SCENES:Readonly<Record<ScenicArenaId,string>>={
 "alpine-lake":alpineLake,
 "dusk-valley":duskValley,
 "autumn-valley":autumnValley,
 "ember-river":emberRiver
};
