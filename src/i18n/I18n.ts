import {GUIDE_EN,GUIDE_FA,type GuideCopy} from "./GameGuide.js";
import type {BuiltInArenaId,GameModeId} from "../gameplay/GameSession";
import type {WeaponId} from "../input/Input";
import type {Storage} from "../storage/Storage";

export type Locale="en"|"fa";

type UpgradeCopy={name:string;description:string};
export type Messages={
 language:{label:string;english:string;persian:string};
 title:string;
 pause:{title:string;subtitle:string;settings:string};
 rotateHint:string;
 buttons:{start:string;pause:string;resume:string;restart:string;menu:string;help:string;jump:string;attack:string;fireMissile:string;previousWeapon:string;nextWeapon:string;update:string};
 privacy:{button:string;title:string;web:string;close:string;html:string};
 status:{win:string;lose:string;duel:string;hill:string};
 details:{equipped:string;angle:string;power:string};
 sections:{gameMode:string;arena:string;weapon:string};
 characterNames:{playerOne:string;playerTwo:string;leftPlayer:string;rightPlayer:string;opponent:string;optional:string;wins:string};
 menu:{kickoff:string;setup:string;players:string;progressOptions:string;selectMode:string;chooseArena:string;mapShortcut:string;selectedArena:string;step:string;nextArena:string;nextAllArenas:string;allArenas:string;back:string;loadout:string;quickDuel:string;quickPvp:string;onlineMode:string;comingSoon:string;ready:string;options:string;modeDescriptions:Readonly<Record<GameModeId,string>>};
 panels:{weaponUpgrades:string;missileControl:string;bowDraw:string;releaseToFire:string};
 upgrade:{points:string;choose:string;earn:string;upgraded:string;upgrade:string;locked:string};
 pvp:{p1:string;p2:string;winner1:string;winner2:string;draw:string;hint:string;series:{bestOfThree:string;round:string;roundComplete:string;champion:string;nextRound:string;rematch:string;changeLoadout:string;countdown:string}};
 run:{title:string;newRun:string;continueRun:string;next:string;retry:string;leave:string;wave:string;boss:string;ready:string;victory:string;defeat:string;complete:string;choose:string;career:string;points:string;medals:Record<"rookie"|"veteran"|"champion",string>;requirements:Record<"rookie"|"veteran"|"champion",string>};
 tutorial:{move:string;jump:string;attack:string;missile:string;double:string;grab:string;kick:string;ready:string;skip:string;replay:string};
 arenaCategories:Readonly<Record<import("../ui/ArenaPreviews").ArenaCategory,string>>;
 landing:{quick:string;defaults:string;custom:string;local:string;localHint:string;arenas:string;progression:string;settings:string;home:string};
 guide:GuideCopy;
 arenas:Readonly<Record<BuiltInArenaId,string>>;
 modes:Readonly<Record<GameModeId,string>>;
 weapons:Readonly<Record<WeaponId,string>>;
 upgrades:Readonly<Record<WeaponId,UpgradeCopy>>;
};

const STORAGE_KEY="doodlegame.locale";

const EN:Messages={
 landing:{quick:"QUICK PLAY",defaults:"Solo Duel · Classic · Blade",custom:"Customize match",local:"Local 2 Players",localHint:"Two humans · same device",arenas:"Browse arenas",progression:"Run & Upgrades",settings:"Settings & Help",home:"Back to home"},
 guide:GUIDE_EN,
 arenaCategories:{all:"All arenas",balanced:"Balanced",vertical:"Vertical",moving:"Moving platforms",hazards:"Gaps & hazards",special:"Special mechanics"},
 tutorial:{move:"Move: drag the stick left or right.",jump:"Jump: push the stick up.",attack:"Attack: tap ATTACK. Hold and release for Bow.",missile:"Missile: tap ATTACK to fire a fixed arc.",double:"Double jump: center the stick, then push up again in the air.",grab:"Grab: swipe up on ATTACK near your opponent.",kick:"Kick combo: hold the stick down, tap ATTACK, release and tap again.",ready:"You’re ready!",skip:"Skip tutorial",replay:"Replay touch tutorial"},
 language:{label:"Language",english:"English",persian:"فارسی"},
 title:"DOODLEGAME DUEL",
 pause:{title:"GAME PAUSED",subtitle:"Ready to return to the fight?",settings:"Settings & Help"},
 rotateHint:"Rotate your device to landscape to play.",
 buttons:{start:"Start",pause:"Pause",resume:"Resume",restart:"Restart",menu:"MAIN MENU",help:"HOW TO PLAY",jump:"JUMP",attack:"ATTACK",fireMissile:"FIRE MISSILE",previousWeapon:"Previous weapon",nextWeapon:"Next weapon",update:"UPDATE"},
 privacy:{"button":"PRIVACY","title":"YOUR PRIVACY","web":"READ THE WEB POLICY","close":"CLOSE","html":"<p><b>The regular web game and Android app do not need a login.</b> No ads or tracking are used.</p><p><b>What is saved?</b> Language, sound, names and progress are stored locally. If the optional Telegram leaderboard is activated, the Worker verifies your signed Telegram login and stores your Telegram numeric ID, first name with last initial and single-player results to show win rankings.</p><p><b>Local Wi-Fi play:</b> Room tokens, match choices and game state pass directly between two Android phones, without sending names or account identifiers. Room data is discarded on exit. Use trusted Wi-Fi; the local connection is unencrypted.</p><p><b>How to delete it:</b> Clear app/browser data for local storage. To delete online Telegram records, open the leaderboard and tap Delete my records.</p>"},
 status:{win:"YOU WIN",lose:"YOU LOSE",duel:"DUEL",hill:"HILL"},
 details:{equipped:"EQUIPPED",angle:"ANGLE",power:"POWER"},
 sections:{gameMode:"GAME MODE",arena:"ARENA",weapon:"START WEAPON"},
 characterNames:{playerOne:"CHARACTER NAME",playerTwo:"SECOND PLAYER NAME",leftPlayer:"PLAYER 1 · CHARACTER",rightPlayer:"PLAYER 2 · CHARACTER",opponent:"OPPONENT",optional:"Enter name (optional)",wins:"WINS"},
 menu:{
  kickoff:"CHOOSE YOUR FIGHT",setup:"MATCH SETUP",players:"NUMBER OF PLAYERS",progressOptions:"RUN & WEAPON UPGRADES",selectMode:"CHOOSE GAME MODE",chooseArena:"CHOOSE YOUR ARENA",mapShortcut:"CHOOSE ARENA",selectedArena:"SELECTED ARENA",step:"STEP",nextArena:"NEXT · ARENA",nextAllArenas:"NEXT · ALL 20 ARENAS",allArenas:"ALL 20 ARENAS",back:"BACK",loadout:"STARTING WEAPON · OPTIONAL",quickDuel:"SOLO PLAYER",quickPvp:"TWO PLAYERS · LOCAL",onlineMode:"ONLINE",comingSoon:"COMING SOON",
  ready:"YOUR MATCH",options:"SETTINGS & HELP",
  modeDescriptions:{
   duel:"A classic one-on-one fight.",
   "missile-duel":"Missiles only. Position yourself and time each shot.",
   "melee-only":"Blades and hammers only. Close the distance.",
   "random-weapons":"Random weapons assigned at match start.",
   "sudden-death":"One clean hit can decide the match.",
   "low-gravity":"Higher jumps and extra airtime.",
   "king-of-hill":"Control the center of the arena to win.",
   "local-pvp":"Two real players on the same device. Play offline."
  }
 },
 panels:{weaponUpgrades:"WEAPON UPGRADES",missileControl:"MISSILE CONTROL",bowDraw:"BOW DRAW",releaseToFire:"RELEASE TO FIRE"},
 upgrade:{points:"UPGRADE POINTS",choose:"Choose a weapon upgrade before the next fight.",earn:"Win a duel to earn another point.",upgraded:"UPGRADED",upgrade:"UPGRADE",locked:"LOCKED"},
 pvp:{p1:"P1",p2:"P2",winner1:"PLAYER 1 WINS",winner2:"PLAYER 2 WINS",draw:"DRAW — BOTH PLAYERS DOWN",hint:"LOCAL 2P · P1: A/D, W, Z/X · P2: ←/→, ↑, Enter · Weapons locked after setup · Mobile: two touch control sets",series:{bestOfThree:"BEST OF 3",round:"ROUND",roundComplete:"ROUND COMPLETE",champion:"MATCH WINNER",nextRound:"NEXT ROUND",rematch:"REMATCH",changeLoadout:"CHANGE EQUIPMENT",countdown:"STARTING IN"}},
 run:{title:"FOUR-FIGHT RUN",newRun:"NEW RUN",continueRun:"CONTINUE RUN",next:"NEXT FIGHT",retry:"RETRY FIGHT",leave:"BACK TO DUEL",wave:"WAVE",boss:"BOSS",ready:"Your next encounter is ready.",victory:"Victory! +1 upgrade point.",defeat:"Defeat. Retry this encounter with your saved upgrades.",complete:"RUN COMPLETE! Boss defeated.",choose:"Choose one of three upgrades before the next fight.",career:"RUN WINS",points:"UPGRADE POINTS",medals:{rookie:"ROOKIE",veteran:"VETERAN",champion:"CHAMPION"},requirements:{rookie:"1 Run win",veteran:"3 Run wins",champion:"1 completed Run"}},
 arenas:{classic:"CLASSIC",towers:"TOWERS",pit:"PIT",steps:"STEPS",zigzag:"ZIGZAG",sky:"SKY",moving:"MOVING",fortress:"FORTRESS",bridge:"BRIDGE",crater:"CRATER",vertical:"VERTICAL",ruins:"RUINS",conveyor:"CONVEYOR",collapse:"COLLAPSE",storm:"STORM",reactor:"REACTOR","alpine-lake":"ALPINE LAKE","dusk-valley":"TWILIGHT VALLEY","autumn-valley":"AUTUMN VALLEY","ember-river":"EMBER RIVER"},
 modes:{duel:"DUEL","missile-duel":"MISSILE DUEL","melee-only":"MELEE ONLY","random-weapons":"RANDOM WEAPONS","sudden-death":"SUDDEN DEATH","low-gravity":"LOW GRAVITY","king-of-hill":"KING OF THE HILL","local-pvp":"TWO PLAYERS (LOCAL)"},
 weapons:{blade:"BLADE",hammer:"HAMMER",blaster:"BLASTER",uzi:"UZI",boomerang:"BOOMERANG",bow:"BOW",bomb:"BOMB",missile:"MISSILE",spear:"SPEAR",grapple:"GRAPPLE GUN","gravity-gauntlet":"GRAVITY GAUNTLET"},
 upgrades:{
  blade:{name:"TWIN SLASH",description:"Wider strike with heavier follow-through damage."},
  hammer:{name:"GROUND SLAM",description:"Grounded hits create a short-range shockwave."},
  blaster:{name:"BURST BLASTER",description:"Fires a three-shot vertical burst."},
  uzi:{name:"RICOCHET",description:"Bullets bounce twice from arena surfaces."},
  boomerang:{name:"DOUBLE BOOMERANG",description:"Throws two returning blades at once."},
  bow:{name:"TRIPLE ARROW",description:"A charged shot releases a three-arrow spread."},
  bomb:{name:"STICKY BOMB",description:"Bombs stick to the first platform they land on."},
  missile:{name:"CLUSTER MISSILE",description:"The main blast releases four mini missiles."},
  spear:{name:"TWIN SPEAR",description:"Throw two spears in a narrow spread instead of one."},
  grapple:{name:"LONG CABLE",description:"Longer hook reach and faster rope retraction."},
  "gravity-gauntlet":{name:"ORBIT CORE",description:"Mag Pull reaches farther, Perfect Parry lasts longer, and Pulse Punch deals extra damage."}
 }
};

const FA:Messages={
 landing:{quick:"شروع سریع",defaults:"دوئل یک‌نفره · کلاسیک · تیغه",custom:"تنظیم مسابقه",local:"دو بازیکن محلی",localHint:"دو انسان · یک دستگاه",arenas:"انتخاب زمین",progression:"مسیر و ارتقاها",settings:"تنظیمات و راهنما",home:"بازگشت به خانه"},
 guide:GUIDE_FA,
 arenaCategories:{all:"همه زمین‌ها",balanced:"متعادل",vertical:"عمودی",moving:"سکوهای متحرک",hazards:"شکاف و خطر",special:"مکانیک ویژه"},
 tutorial:{move:"حرکت: گوی را به چپ یا راست بکش.",jump:"پرش: گوی را به بالا ببر.",attack:"حمله: حمله را بزن. برای کمان نگه دار و رها کن.",missile:"موشک: برای شلیک با مسیر ثابت، حمله را بزن.",double:"پرش دوم: در هوا گوی را به مرکز و دوباره بالا ببر.",grab:"گرفتن: نزدیک حریف، روی حمله به بالا بکش.",kick:"ترکیب لگد: گوی پایین؛ حمله بزن، رها کن و دوباره بزن.",ready:"آماده‌ای!",skip:"رد کردن آموزش",replay:"تکرار آموزش لمسی"},
 language:{label:"زبان",english:"English",persian:"فارسی"},
 title:"دوئل دودل‌گیم",
 pause:{title:"بازی متوقف شد",subtitle:"آمادهٔ ادامهٔ نبرد هستی؟",settings:"تنظیمات و راهنما"},
 rotateHint:"برای اجرای بازی دستگاه را افقی بچرخانید.",
 buttons:{start:"شروع",pause:"توقف",resume:"ادامه",restart:"شروع دوباره",menu:"منوی اصلی",help:"راهنمای بازی",jump:"پرش",attack:"حمله",fireMissile:"شلیک موشک",previousWeapon:"سلاح قبلی",nextWeapon:"سلاح بعدی",update:"بروزرسانی"},
 privacy:{"button":"حریم خصوصی","title":"حریم خصوصی شما","web":"مشاهده سیاست در وب","close":"بستن","html":"<p><b>نسخه عادی وب و اندروید به ورود با حساب نیاز ندارد.</b> تبلیغات و ردیابی وجود ندارد.</p><p><b>چه چیزی ذخیره می‌شود؟</b> نام کاراکتر، زبان، صدا و پیشرفت بازی روی دستگاه ذخیره می‌شوند. در صورت فعال بودن جدول رکورد اختیاری تلگرام، سرور داده امضاشده ورود را اعتبارسنجی و شناسه عددی تلگرام، نام کوچک با حرف اول نام خانوادگی و نتایج تک‌نفره را برای جدول بردها ذخیره می‌کند.</p><p><b>بازی با Wi-Fi محلی:</b> توکن اتاق، انتخاب‌های مسابقه و وضعیت بازی مستقیم بین دو گوشی اندرویدی منتقل می‌شوند؛ نام و شناسه حساب فرستاده نمی‌شود. داده اتاق هنگام خروج پاک می‌شود. اتصال محلی رمزگذاری‌شده نیست؛ از Wi-Fi مورداعتماد استفاده کنید.</p><p><b>چطور پاکش کنیم؟</b> برای داده‌های محلی حافظه برنامه را پاک کنید. برای حذف رکورد آنلاین از جدول تلگرام گزینه حذف رکورد من را بزنید.</p>"},
 status:{win:"بردی",lose:"باختی",duel:"دوئل",hill:"تپه"},
 details:{equipped:"سلاح",angle:"زاویه",power:"قدرت"},
 sections:{gameMode:"حالت بازی",arena:"میدان",weapon:"سلاح شروع"},
 characterNames:{playerOne:"نام کاراکتر",playerTwo:"نام بازیکن دوم",leftPlayer:"شخصیت بازیکن ۱",rightPlayer:"شخصیت بازیکن ۲",opponent:"حریف",optional:"نام دلخواه (اختیاری)",wins:"برنده شد"},
 menu:{
  kickoff:"نوع بازی را انتخاب کن",setup:"تنظیم مسابقه",players:"تعداد بازیکنان",progressOptions:"مسیر چهار مبارزه‌ای و ارتقاها",selectMode:"انتخاب حالت بازی",chooseArena:"زمین بازی را انتخاب کن",mapShortcut:"انتخاب زمین",selectedArena:"زمین انتخاب‌شده",step:"مرحله",nextArena:"بعدی · زمین",nextAllArenas:"بعدی · ۲۰ زمین",allArenas:"انتخاب از ۲۰ نقشه",back:"بازگشت",loadout:"سلاح شروع · اختیاری",quickDuel:"یک نفره",quickPvp:"دو نفره · محلی",onlineMode:"بازی آنلاین",comingSoon:"به‌زودی",
  ready:"مسابقه شما",options:"تنظیمات و راهنما",
  modeDescriptions:{
   duel:"مبارزهٔ کلاسیک یک‌به‌یک.",
   "missile-duel":"فقط موشک؛ جای‌گیری و زمان‌بندی شلیک مهم است.",
   "melee-only":"فقط تیغه و چکش؛ مبارزه از فاصله نزدیک.",
   "random-weapons":"سلاح تصادفی ابتدای مسابقه تعیین می‌شود.",
   "sudden-death":"یک ضربه دقیق می‌تواند سرنوشت مسابقه را تعیین کند.",
   "low-gravity":"پرش‌های بلندتر و زمان بیشتر در هوا.",
   "king-of-hill":"برای پیروزی، مرکز میدان را در اختیار بگیر.",
   "local-pvp":"دو بازیکن واقعی روی یک دستگاه، بدون نیاز به اینترنت."
  }
 },
 panels:{weaponUpgrades:"ارتقای سلاح‌ها",missileControl:"کنترل موشک",bowDraw:"کشش کمان",releaseToFire:"برای شلیک رها کن"},
 upgrade:{points:"امتیاز ارتقا",choose:"قبل از مبارزه بعدی یک ارتقای سلاح انتخاب کن.",earn:"برای گرفتن یک امتیاز دیگر، دوئل را ببر.",upgraded:"ارتقا یافته",upgrade:"ارتقا",locked:"قفل"},
 pvp:{p1:"بازیکن ۱",p2:"بازیکن ۲",winner1:"بازیکن ۱ برنده شد",winner2:"بازیکن ۲ برنده شد",draw:"مساوی — هر دو بازیکن شکست خوردند",hint:"دو نفره محلی · نفر ۱: A/D، W، Z/X · نفر ۲: ←/→، ↑، Enter · سلاح پس از شروع قفل است · موبایل: دو دسته کنترل لمسی",series:{bestOfThree:"بهترین از ۳",round:"راند",roundComplete:"پایان راند",champion:"برنده نهایی",nextRound:"راند بعد",rematch:"مسابقه مجدد",changeLoadout:"تغییر تجهیزات",countdown:"شروع تا"}},
 run:{title:"مسیر چهار مبارزه‌ای",newRun:"مسیر جدید",continueRun:"ادامه مسیر",next:"مبارزه بعدی",retry:"تلاش دوباره",leave:"بازگشت به دوئل",wave:"مرحله",boss:"رئیس نهایی",ready:"مبارزه بعدی آماده است.",victory:"پیروزی! ۱ امتیاز ارتقا گرفتی.",defeat:"شکست؛ این مرحله را با ارتقاهای ذخیره‌شده دوباره بازی کن.",complete:"مسیر کامل شد! رئیس نهایی شکست خورد.",choose:"برای ادامه یکی از سه ارتقای پیشنهادی را انتخاب کن.",career:"بردهای مسیر",points:"امتیاز ارتقا",medals:{rookie:"تازه‌کار",veteran:"کهنه‌کار",champion:"قهرمان"},requirements:{rookie:"۱ برد در مسیر",veteran:"۳ برد در مسیر",champion:"۱ مسیر کامل"}},
 arenas:{classic:"کلاسیک",towers:"برج‌ها",pit:"گودال",steps:"پله‌ها",zigzag:"زیگزاگ",sky:"آسمان",moving:"متحرک",fortress:"دژ",bridge:"پل",crater:"دهانه",vertical:"عمودی",ruins:"ویرانه‌ها",conveyor:"نوار نقاله",collapse:"فروریزش",storm:"طوفان",reactor:"راکتور","alpine-lake":"دریاچه یخی","dusk-valley":"دره گرگ‌ومیش","autumn-valley":"دره پاییزی","ember-river":"رودخانه آتشین"},
 modes:{duel:"دوئل","missile-duel":"دوئل موشکی","melee-only":"فقط تن‌به‌تن","random-weapons":"سلاح تصادفی","sudden-death":"مرگ ناگهانی","low-gravity":"جاذبه کم","king-of-hill":"پادشاه تپه","local-pvp":"دو نفره (محلی)"},
 weapons:{blade:"تیغه",hammer:"چکش",blaster:"بلستر",uzi:"یوزی",boomerang:"بومرنگ",bow:"کمان",bomb:"بمب",missile:"موشک",spear:"نیزه",grapple:"تفنگ قلاب‌دار","gravity-gauntlet":"دستکش گرانشی"},
 upgrades:{
  blade:{name:"ضربه دوقلو",description:"ضربه‌ای عریض‌تر با آسیب بیشتر در ادامه حرکت."},
  hammer:{name:"کوبش زمین",description:"ضربه‌های زمینی یک موج کوتاه‌برد ایجاد می‌کنند."},
  blaster:{name:"بلستر رگباری",description:"سه شلیک عمودی پشت سر هم انجام می‌دهد."},
  uzi:{name:"کمانه",description:"گلوله‌ها دو بار از سطح‌های میدان کمانه می‌کنند."},
  boomerang:{name:"بومرنگ دوتایی",description:"دو تیغه برگشتی را هم‌زمان پرتاب می‌کند."},
  bow:{name:"تیر سه‌گانه",description:"شلیک شارژشده سه تیر را به‌صورت پخش‌شونده رها می‌کند."},
  bomb:{name:"بمب چسبنده",description:"بمب به اولین سکویی که روی آن فرود بیاید می‌چسبد."},
  missile:{name:"موشک خوشه‌ای",description:"انفجار اصلی چهار موشک کوچک آزاد می‌کند."},
  spear:{name:"نیزهٔ دوتایی",description:"به‌جای یک نیزه، دو نیزه با زاویهٔ کمی متفاوت پرتاب می‌شود."},
  grapple:{name:"طناب بلند",description:"برد بیشتر قلاب و جمع‌شدن سریع‌تر طناب."},
  "gravity-gauntlet":{name:"هسته مداری",description:"برد کشش مغناطیسی بیشتر، پنجره دفع بلندتر و ضربه مشت قوی‌تر می‌شود."}
 }
};

const MESSAGES:Readonly<Record<Locale,Messages>>={en:EN,fa:FA};
const isLocale=(value:unknown):value is Locale=>value==="en"||value==="fa";

export class I18n{
 private current:Locale;
 private readonly listeners=new Set<(locale:Locale)=>void>();

 constructor(private readonly storage:Storage){
  this.current=this.readInitialLocale();
  this.applyDocumentLanguage();
 }

 get locale(){return this.current;}
 get messages(){return MESSAGES[this.current];}

 setLocale(locale:Locale){
  if(locale===this.current)return;
  this.current=locale;
  try{this.storage.set(STORAGE_KEY,locale);}catch(error){console.warn("Could not persist language preference.",error);}
  this.applyDocumentLanguage();
  for(const listener of this.listeners)listener(locale);
 }

 subscribe(listener:(locale:Locale)=>void){this.listeners.add(listener);return()=>this.listeners.delete(listener);}

 private readInitialLocale():Locale{
  try{
   const stored=this.storage.get<unknown>(STORAGE_KEY);
   if(isLocale(stored))return stored;
  }catch(error){console.warn("Could not read language preference.",error);}
  // Honor an explicitly saved choice; otherwise default to Persian on every device.
  return "fa";
 }

 private applyDocumentLanguage(){
  document.documentElement.lang=this.current;
  document.documentElement.dir=this.current==="fa"?"rtl":"ltr";
 }
}
