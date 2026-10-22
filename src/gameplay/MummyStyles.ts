/** Cosmetic variants of the existing Mummy fighter: one rig, six visual identities. */
export const MUMMY_STYLE_IDS=["classic","royal","cursed","scarab","desert","sentinel"] as const;
export type MummyStyleId=(typeof MUMMY_STYLE_IDS)[number];
export const MUMMY_STYLE_NAMES:Readonly<Record<MummyStyleId,{en:string;fa:string}>>={
 classic:{en:"CLASSIC",fa:"کلاسیک"},
 royal:{en:"ROYAL",fa:"سلطنتی"},
 cursed:{en:"CURSED",fa:"نفرین‌شده"},
 scarab:{en:"SCARAB",fa:"سوسک مقدس"},
 desert:{en:"DESERT",fa:"کویری"},
 sentinel:{en:"SENTINEL",fa:"نگهبان معبد"}
};
export const isMummyStyle=(id:unknown):id is MummyStyleId=>
 typeof id==="string"&&MUMMY_STYLE_IDS.some(style=>style===id);
