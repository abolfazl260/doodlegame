import type {ArenaId,GameModeId} from "../gameplay/GameSession";
import type {WeaponId} from "../input/Input";
import type {Storage} from "../storage/Storage";

export type Locale="en"|"fa";

type UpgradeCopy={name:string;description:string};
export type Messages={
 language:{label:string;english:string;persian:string};
 title:string;
 rotateHint:string;
 buttons:{start:string;pause:string;resume:string;restart:string;menu:string;help:string;jump:string;attack:string;fireMissile:string;previousWeapon:string;nextWeapon:string;update:string};
 privacy:{button:string;title:string;web:string;close:string;html:string};
 status:{win:string;lose:string;duel:string;hill:string};
 details:{equipped:string;angle:string;power:string};
 sections:{gameMode:string;arena:string;weapon:string};
 panels:{weaponUpgrades:string;missileControl:string;bowDraw:string;releaseToFire:string};
 upgrade:{points:string;choose:string;earn:string;upgraded:string;upgrade:string;locked:string};
 pvp:{p1:string;p2:string;winner1:string;winner2:string;hint:string};
 run:{title:string;newRun:string;continueRun:string;next:string;retry:string;leave:string;wave:string;boss:string;ready:string;victory:string;defeat:string;complete:string;choose:string;career:string;points:string;medals:Record<"rookie"|"veteran"|"champion",string>;requirements:Record<"rookie"|"veteran"|"champion",string>};
 helpHtml:string;
 arenas:Readonly<Record<ArenaId,string>>;
 modes:Readonly<Record<GameModeId,string>>;
 weapons:Readonly<Record<WeaponId,string>>;
 upgrades:Readonly<Record<WeaponId,UpgradeCopy>>;
};

const STORAGE_KEY="doodlegame.locale";

const EN:Messages={
 language:{label:"Language",english:"English",persian:"فارسی"},
 title:"DOODLEGAME DUEL",
 rotateHint:"Rotate your device to landscape to play.",
 buttons:{start:"Start",pause:"Pause",resume:"Resume",restart:"Restart",menu:"MAIN MENU",help:"HOW TO PLAY",jump:"JUMP",attack:"ATTACK",fireMissile:"FIRE MISSILE",previousWeapon:"Previous weapon",nextWeapon:"Next weapon",update:"UPDATE"},
 privacy:{"button":"PRIVACY","title":"YOUR PRIVACY","web":"READ THE WEB POLICY","close":"CLOSE","html":"<p><b>DoodleGame does not collect or share personal data.</b> There are no accounts, ads, analytics or trackers.</p><p><b>What is saved?</b> Your language, sound and camera-shake choices, and any manually downloaded game-balance data are stored on this device. Standard matches and upgrades stay in memory while you play. Optional Run checkpoints, career wins and earned badges are saved locally on this device.</p><p><b>How to delete it:</b> Clear app/browser data or uninstall the game. There is no online account to delete.</p>"},
 status:{win:"YOU WIN",lose:"YOU LOSE",duel:"DUEL",hill:"HILL"},
 details:{equipped:"EQUIPPED",angle:"ANGLE",power:"POWER"},
 sections:{gameMode:"GAME MODE",arena:"ARENA",weapon:"START WEAPON"},
 panels:{weaponUpgrades:"WEAPON UPGRADES",missileControl:"MISSILE CONTROL",bowDraw:"BOW DRAW",releaseToFire:"RELEASE TO FIRE"},
 upgrade:{points:"UPGRADE POINTS",choose:"Choose a weapon upgrade before the next fight.",earn:"Win a duel to earn another point.",upgraded:"UPGRADED",upgrade:"UPGRADE",locked:"LOCKED"},
 pvp:{p1:"P1",p2:"P2",winner1:"PLAYER 1 WINS",winner2:"PLAYER 2 WINS",hint:"LOCAL 2P · P1: A/D, W, Z, Q/E · P2: ←/→, ↑, ENTER, [/] · Mobile: two touch control sets"},
 run:{title:"FOUR-FIGHT RUN",newRun:"NEW RUN",continueRun:"CONTINUE RUN",next:"NEXT FIGHT",retry:"RETRY FIGHT",leave:"BACK TO DUEL",wave:"WAVE",boss:"BOSS",ready:"Your next encounter is ready.",victory:"Victory! +1 upgrade point.",defeat:"Defeat. Retry this encounter with your saved upgrades.",complete:"RUN COMPLETE! Boss defeated.",choose:"Choose one of three upgrades before the next fight.",career:"RUN WINS",points:"UPGRADE POINTS",medals:{rookie:"ROOKIE",veteran:"VETERAN",champion:"CHAMPION"},requirements:{rookie:"1 Run win",veteran:"3 Run wins",champion:"1 completed Run"}},
 helpHtml:"<strong>HOW TO PLAY</strong><br><br><b>MOVE</b> <span dir=\"ltr\">A / D or ← / →</span><br><b>JUMP</b> <span dir=\"ltr\">W / Space / ↑</span><br><b>ATTACK</b> <span dir=\"ltr\">Z / X</span><br><b>PREVIOUS WEAPON</b> <span dir=\"ltr\">Q / O</span><br><b>NEXT WEAPON</b> <span dir=\"ltr\">E / P</span><br><br><b>MOBILE</b><br>Use ‹ / › next to the movement joystick to change weapons. Push the movement joystick upward to jump, including diagonally. Return it toward center and push up again to double-jump. Some modes lock the weapon.<br><br><b>PROGRESSION</b><br>Win a duel to earn 1 Upgrade Point. Spend it between standard fights, or enter the optional four-fight Run to choose from three upgrades after each victory. Run upgrades last only for that Run; earned career badges stay saved on this device.<br><br><b>LOCAL TWO PLAYERS</b><br>Choose TWO PLAYERS (LOCAL) in Game Mode. On keyboard, player 1 uses A/D, W, Z and Q/E; player 2 uses Left/Right, Up, Enter and [ / ]. Both players have dedicated movement, ATTACK and weapon-change controls on mobile. The mode needs no account or internet connection.<br><br><b>WEAPONS</b><br>BLADE · HAMMER · BLASTER<br>UZI · BOOMERANG · BOW · BOMB · MISSILE",
 arenas:{classic:"CLASSIC",towers:"TOWERS",pit:"PIT",steps:"STEPS",zigzag:"ZIGZAG",sky:"SKY",moving:"MOVING",fortress:"FORTRESS",bridge:"BRIDGE",crater:"CRATER",vertical:"VERTICAL",ruins:"RUINS",conveyor:"CONVEYOR",collapse:"COLLAPSE",storm:"STORM",reactor:"REACTOR"},
 modes:{duel:"DUEL","missile-duel":"MISSILE DUEL","melee-only":"MELEE ONLY","random-weapons":"RANDOM WEAPONS","sudden-death":"SUDDEN DEATH","low-gravity":"LOW GRAVITY","king-of-hill":"KING OF THE HILL","local-pvp":"TWO PLAYERS (LOCAL)"},
 weapons:{blade:"BLADE",hammer:"HAMMER",blaster:"BLASTER",uzi:"UZI",boomerang:"BOOMERANG",bow:"BOW",bomb:"BOMB",missile:"MISSILE"},
 upgrades:{
  blade:{name:"TWIN SLASH",description:"Wider strike with heavier follow-through damage."},
  hammer:{name:"GROUND SLAM",description:"Grounded hits create a short-range shockwave."},
  blaster:{name:"BURST BLASTER",description:"Fires a three-shot vertical burst."},
  uzi:{name:"RICOCHET",description:"Bullets bounce twice from arena surfaces."},
  boomerang:{name:"DOUBLE BOOMERANG",description:"Throws two returning blades at once."},
  bow:{name:"TRIPLE ARROW",description:"A charged shot releases a three-arrow spread."},
  bomb:{name:"STICKY BOMB",description:"Bombs stick to the first platform they land on."},
  missile:{name:"CLUSTER MISSILE",description:"The main blast releases four mini missiles."}
 }
};

const FA:Messages={
 language:{label:"زبان",english:"English",persian:"فارسی"},
 title:"دوئل دودل‌گیم",
 rotateHint:"برای اجرای بازی دستگاه را افقی بچرخانید.",
 buttons:{start:"شروع",pause:"توقف",resume:"ادامه",restart:"شروع دوباره",menu:"منوی اصلی",help:"راهنمای بازی",jump:"پرش",attack:"حمله",fireMissile:"شلیک موشک",previousWeapon:"سلاح قبلی",nextWeapon:"سلاح بعدی",update:"بروزرسانی"},
 privacy:{"button":"حریم خصوصی","title":"حریم خصوصی شما","web":"مشاهده سیاست در وب","close":"بستن","html":"<p><b>دودل‌گیم اطلاعات شخصی شما را جمع‌آوری نمی‌کند و به دیگران نمی‌دهد.</b> بازی حساب کاربری، تبلیغات و ابزار ردیابی ندارد.</p><p><b>چه چیزی ذخیره می‌شود؟</b> زبان انتخابی، تنظیمات صدا و لرزش دوربین و داده‌های بروزرسانی‌شده بازی روی همین دستگاه ذخیره می‌شوند. مبارزه‌ها و ارتقاهای حالت عادی فقط هنگام بازی در حافظه هستند. مرحله‌های مسیر اختیاری، بردهای مسیر و نشان‌های کسب‌شده به‌صورت محلی روی همین دستگاه ذخیره می‌شوند.</p><p><b>چطور پاکش کنیم؟</b> داده‌های برنامه یا مرورگر را پاک کنید یا بازی را حذف کنید. حساب آنلاینی وجود ندارد که نیاز به حذف داشته باشد.</p>"},
 status:{win:"بردی",lose:"باختی",duel:"دوئل",hill:"تپه"},
 details:{equipped:"سلاح",angle:"زاویه",power:"قدرت"},
 sections:{gameMode:"حالت بازی",arena:"میدان",weapon:"سلاح شروع"},
 panels:{weaponUpgrades:"ارتقای سلاح‌ها",missileControl:"کنترل موشک",bowDraw:"کشش کمان",releaseToFire:"برای شلیک رها کن"},
 upgrade:{points:"امتیاز ارتقا",choose:"قبل از مبارزه بعدی یک ارتقای سلاح انتخاب کن.",earn:"برای گرفتن یک امتیاز دیگر، دوئل را ببر.",upgraded:"ارتقا یافته",upgrade:"ارتقا",locked:"قفل"},
 pvp:{p1:"بازیکن ۱",p2:"بازیکن ۲",winner1:"بازیکن ۱ برنده شد",winner2:"بازیکن ۲ برنده شد",hint:"دو نفره محلی · نفر ۱: A/D، W، Z، Q/E · نفر ۲: ←/→، ↑، Enter، [/] · موبایل: دو دسته کنترل لمسی"},
 run:{title:"مسیر چهار مبارزه‌ای",newRun:"مسیر جدید",continueRun:"ادامه مسیر",next:"مبارزه بعدی",retry:"تلاش دوباره",leave:"بازگشت به دوئل",wave:"مرحله",boss:"رئیس نهایی",ready:"مبارزه بعدی آماده است.",victory:"پیروزی! ۱ امتیاز ارتقا گرفتی.",defeat:"شکست؛ این مرحله را با ارتقاهای ذخیره‌شده دوباره بازی کن.",complete:"مسیر کامل شد! رئیس نهایی شکست خورد.",choose:"برای ادامه یکی از سه ارتقای پیشنهادی را انتخاب کن.",career:"بردهای مسیر",points:"امتیاز ارتقا",medals:{rookie:"تازه‌کار",veteran:"کهنه‌کار",champion:"قهرمان"},requirements:{rookie:"۱ برد در مسیر",veteran:"۳ برد در مسیر",champion:"۱ مسیر کامل"}},
 helpHtml:"<strong>راهنمای بازی</strong><br><br><b>حرکت</b> <span dir=\"ltr\">A / D یا ← / →</span><br><b>پرش</b> <span dir=\"ltr\">W / Space / ↑</span><br><b>حمله</b> <span dir=\"ltr\">Z / X</span><br><b>سلاح قبلی</b> <span dir=\"ltr\">Q / O</span><br><b>سلاح بعدی</b> <span dir=\"ltr\">E / P</span><br><br><b>موبایل</b><br>برای تغییر سلاح از دکمه‌های ‹ و › کنار گوی حرکت استفاده کن. برای پرش گوی حرکت را به بالا ببر (هم‌زمان با حرکت چپ یا راست هم می‌شود). برای پرش دوم کمی به مرکز برگردان و دوباره بالا ببر. در بعضی حالت‌ها تعویض سلاح قفل است.<br><br><b>پیشرفت</b><br>با بردن هر دوئل ۱ امتیاز ارتقا می‌گیری. در مبارزه‌های عادی بین نبردها آن را خرج کن؛ یا مسیر چهار مبارزه‌ای اختیاری را شروع کن و پس از هر برد یکی از سه ارتقا را انتخاب کن. ارتقاهای مسیر فقط برای همان مسیر می‌مانند ولی نشان‌های کسب‌شده روی دستگاه ذخیره می‌شوند.<br><br><b>بازی دو نفره محلی</b><br>حالت «دو نفره (محلی)» را انتخاب کن. نفر اول با A/D، W، Z و Q/E و نفر دوم با جهت‌ها، ↑، Enter و [ / ] بازی می‌کند. در موبایل هر دو نفر دسته حرکت، حمله و تعویض سلاح جداگانه دارند. اینترنت و حساب کاربری لازم نیست.<br><br><b>سلاح‌ها</b><br>تیغه · چکش · بلستر<br>یوزی · بومرنگ · کمان · بمب · موشک",
 arenas:{classic:"کلاسیک",towers:"برج‌ها",pit:"گودال",steps:"پله‌ها",zigzag:"زیگزاگ",sky:"آسمان",moving:"متحرک",fortress:"دژ",bridge:"پل",crater:"دهانه",vertical:"عمودی",ruins:"ویرانه‌ها",conveyor:"نوار نقاله",collapse:"فروریزش",storm:"طوفان",reactor:"راکتور"},
 modes:{duel:"دوئل","missile-duel":"دوئل موشکی","melee-only":"فقط تن‌به‌تن","random-weapons":"سلاح تصادفی","sudden-death":"مرگ ناگهانی","low-gravity":"جاذبه کم","king-of-hill":"پادشاه تپه","local-pvp":"دو نفره (محلی)"},
 weapons:{blade:"تیغه",hammer:"چکش",blaster:"بلستر",uzi:"یوزی",boomerang:"بومرنگ",bow:"کمان",bomb:"بمب",missile:"موشک"},
 upgrades:{
  blade:{name:"ضربه دوقلو",description:"ضربه‌ای عریض‌تر با آسیب بیشتر در ادامه حرکت."},
  hammer:{name:"کوبش زمین",description:"ضربه‌های زمینی یک موج کوتاه‌برد ایجاد می‌کنند."},
  blaster:{name:"بلستر رگباری",description:"سه شلیک عمودی پشت سر هم انجام می‌دهد."},
  uzi:{name:"کمانه",description:"گلوله‌ها دو بار از سطح‌های میدان کمانه می‌کنند."},
  boomerang:{name:"بومرنگ دوتایی",description:"دو تیغه برگشتی را هم‌زمان پرتاب می‌کند."},
  bow:{name:"تیر سه‌گانه",description:"شلیک شارژشده سه تیر را به‌صورت پخش‌شونده رها می‌کند."},
  bomb:{name:"بمب چسبنده",description:"بمب به اولین سکویی که روی آن فرود بیاید می‌چسبد."},
  missile:{name:"موشک خوشه‌ای",description:"انفجار اصلی چهار موشک کوچک آزاد می‌کند."}
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
