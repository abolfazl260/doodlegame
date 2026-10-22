import type {GameModeId} from "../gameplay/GameSession";
import type {WeaponId} from "../input/Input";
export const GUIDE_SECTION_IDS=["controls","advanced","weapons","modes","progression","local"] as const;
export type GuideSectionId=typeof GUIDE_SECTION_IDS[number];
export type GuideEntry={title:string;body:string;keys?:string};
export type GuideCopy={sections:Readonly<Record<GuideSectionId,string>>;controls:readonly GuideEntry[];advanced:readonly GuideEntry[];weapons:Readonly<Record<WeaponId,string>>;modes:Readonly<Record<GameModeId,string>>;progression:readonly GuideEntry[];local:readonly GuideEntry[];upgradeLabel:string};
export const GUIDE_EN:GuideCopy={
 sections:{controls:"Basic controls",advanced:"Advanced moves",weapons:"Weapons & upgrades",modes:"Game modes",progression:"Progression & arenas",local:"Local 2 players"},upgradeLabel:"Upgrade",
 controls:[
  {title:"Move",body:"Mobile: drag the joystick left or right. Solo keyboard also accepts arrow keys.",keys:"P1: A / D · Solo: ← / →"},
  {title:"Jump",body:"Push the joystick upward, including diagonally while moving. A grounded jump starts the aerial sequence.",keys:"P1: W / Space · Solo: ↑"},
  {title:"Attack",body:"Tap ATTACK or click the battlefield. UZI supports held fire; Bow charges while held and fires on release. Missile fires a fixed arc with a tap; dragging never adjusts its angle or power.",keys:"P1: Z / X · Mouse: click / hold / release"},
  {title:"Choose fighter & weapon",body:"Before the match, complete Mode, Arena, then mandatory Character and Weapon. Both local players choose independently. The selected weapon is locked throughout the match; there are no switch controls. Missile Duel requires Missile; Melee Only offers Blade/Hammer; Random Weapons requires a random-weapon confirmation.",keys:"Selection: before the match only"},
  {title:"Weapon direction",body:"Drag the ⊕ pad for ranged weapons except Missile. Keyboard rotation works for non-Missile weapons. Missile always follows facing with a fixed arc.",keys:"P1: R / F · P2: PageUp / PageDown"},
  {title:"Pause / Resume",body:"Hold the Pause control for two seconds on mobile or with a pointer, then choose Resume. Keyboard on the Pause control: hold Enter or Space. The menu also offers Main Menu and restart where available."}
 ],
 advanced:[
  {title:"Double jump",body:"After a valid jump, return the joystick toward center and push upward again while airborne. One extra jump is available until landing or a valid wall jump. Holding up does not repeat jumps.",keys:"Jump: W / Space (solo also ↑)"},
  {title:"Wall jump",body:"Touch the side of a solid platform/obstacle and jump when the wall-jump cooldown allows. You push away from the wall and regain the extra aerial jump."},
  {title:"Dash",body:"Keyboard only: dash in your facing direction. Ground cooldown and the single available air dash limit repetition. There is no dedicated mobile dash button.",keys:"P1: Shift · P2: Numpad5"},
  {title:"Grab & Throw",body:"Mobile: quickly swipe upward from ATTACK. The opponent must be close, in front and not protected by cover/immunity; the accepted attempt can miss. A successful grab throws automatically after its short windup.",keys:"P1: C · P2: Numpad1"},
  {title:"Straight Kick → Spinning Kick",body:"While grounded, hold the stick down and tap ATTACK for a straight kick. Release ATTACK and tap again just after the first kick, inside its follow-up window, for a spinning kick. Holding ATTACK never repeats the combo.",keys:"P1: S + Z/X · P2: ↓ + Enter"},
  {title:"Airborne Ground Slam",body:"Down + ATTACK in the air commits a downward slam; impact deals damage near landing. It needs an available slam, no active stun/action and a legal mode; Missile Duel disallows it. This differs from a normal aerial weapon attack and the Hammer upgrade.",keys:"P1: S + Z/X · P2: ↓ + Enter"}
 ],
 weapons:{
  blade:"Close-range slash in front of you. Tap at striking distance and face the target; pressure opponents near ledges.",
  hammer:"Heavy close-range impact with strong knockback. Time a tap after approaching; recovery makes missed swings costly. Its Ground Slam upgrade is a grounded weapon shockwave, not the airborne move.",
  blaster:"A ranged projectile on each attack. Use the direction pad and fire from a clear line; its burst upgrade spreads three shots vertically.",
  uzi:"Rapid projectile fire while ATTACK is held, respecting shot cooldown. Aim to maintain pressure; release before a grab or contextual kick.",
  boomerang:"Throw a blade that turns back toward its owner. Use mid-range space to let its outward/return path threaten the opponent.",
  bow:"Hold ATTACK to draw, release to launch an arrow. Charge changes speed and trajectory; aim before releasing and use distance to buy charging time.",
  bomb:"Throw a bouncing timed explosive. Aim toward a platform or route the opponent may cross; keep clear of the eventual blast. Sticky Bomb attaches on the first platform landing.",
  missile:"Tap ATTACK for one explosive Missile, respecting cooldown. Its arc is fixed and mirrored by facing; no angle/power controls or direction-pad aiming. Reposition to line up the landing point. Cluster Missile releases mini missiles after the main blast.",
  spear:"Tap ATTACK to throw a long, narrow spear in the aiming direction. It flies forward and gradually drops; the Twin Spear upgrade throws two spears at slightly different angles.",
  grapple:"Aim with the direction pad and tap ATTACK to launch a hook. It anchors to platforms and cover, reels you in, and lets you swing with movement. Tap ATTACK again to release; on a fighter it deals light damage and tugs them. Long Cable improves reach and reel speed."
 },
 modes:{
  duel:"Solo versus AI or two selected humans. Deplete the opponent’s HP to win. All weapons are available; use the arena’s cover.",
  "missile-duel":"Missile-only weapon selection. Tap Attack for the fixed facing-aware arc; deplete the opponent’s HP. Reposition and time shots. Manual switching/aiming and airborne Ground Slam are disabled.",
  "melee-only":"Blade and Hammer only. Win by depleting HP. Close distance with jumps and use cover against heavy swings.",
  "random-weapons":"Before the round each human must confirm a randomly assigned starting weapon. The weapon remains locked during the round and never cycles. Win by depleting HP and adapt to your assigned range.",
  "sudden-death":"A successful damaging hit can eliminate a fighter. Movement stays available; the preselected weapon remains locked. Avoid exposure before committing.",
  "low-gravity":"Reduced gravity gives longer air time. Win by depleting HP; account for altered aerial motion and projectile arcs.",
  "king-of-hill":"Stand inside the center alone to accumulate 8 seconds of control; contested center awards neither side. Reach the target or defeat the opponent to win. Push rivals outside the scoring zone.",
  "local-pvp":"Player-count option, not an online mode: two humans share one device and choose any game mode/arena. Both have independent controls; career/Run rewards are not awarded in local PvP."
 },
 progression:[
  {title:"Upgrade Points",body:"Win a solo fight to earn a point. Spend it between fights on one named weapon upgrade. Local two-player fights award no progression. Standard-duel upgrades/points are session state."},
  {title:"Four-fight Run",body:"An optional sequence of three encounters and a Boss. After each victory choose one of three offered upgrades, then continue. A defeat lets you retry the same stage; a new Run starts over. Leaving restores normal Duel settings and saves a retryable Run."},
  {title:"Career vs Run",body:"Career wins and earned medals are saved on this device. Run checkpoints, points and purchased upgrades survive reloads, but the upgrades belong to that Run and do not become permanent Duel upgrades."},
  {title:"Arena mechanics",body:"Arena cards show real platform/cover silhouettes and feature filters. Dashed platforms indicate movement; gaps, breakable bridges, crumbling surfaces, conveyors, wind, vents and gravity wells change tactics. Ice/slippery surfaces affect grip. Downloadable arenas require installation first; installed arenas work offline."}
 ],
 local:[
  {title:"Same device, two humans",body:"Choose Local 2 Players, then a mode and arena. Enter independent optional names. Before starting, each player must select a character and weapon; in combat each uses an independent movement stick and ATTACK. Win two rounds to take a Best of 3 match; draws award no point. Next Round has a three-second countdown and swaps the fighters’ starting sides. Rematch starts a fresh match; Change Equipment returns to loadout selection. Physical left/right controls do not swap in Persian."},
  {title:"Player 1 keyboard",body:"Player 1 uses these bindings (the fighter changes starting side between rounds). Solo arrow-key aliases belong to Player 2 when local play is enabled.",keys:"Move A/D · Down S · Jump W/Space · Attack Z/X · Grab C · Dash Shift · Aim R/F"},
  {title:"Player 2 keyboard",body:"The right fighter has independent actions and ranged aiming. Missile uses facing only.",keys:"Move ←/→ or Numpad4/6 · Down ↓ · Jump ↑/Numpad8 · Attack Enter/Numpad0 · Grab Numpad1 · Dash Numpad5 · Aim PageUp/PageDown"}
 ]
};
export const GUIDE_FA:GuideCopy={
 sections:{controls:"کنترل‌های پایه",advanced:"حرکات پیشرفته",weapons:"سلاح‌ها و ارتقاها",modes:"حالت‌های بازی",progression:"پیشرفت و زمین‌ها",local:"دو بازیکن روی یک دستگاه"},upgradeLabel:"ارتقا",
 controls:[
  {title:"حرکت",body:"موبایل: گوی حرکت را به چپ یا راست بکش. در بازی تک‌نفره کلیدهای جهت هم قابل استفاده‌اند.",keys:"P1: A / D · Solo: ← / →"},
  {title:"پرش",body:"گوی را بالا ببر؛ جهت مورب هم حرکت و پرش را هم‌زمان انجام می‌دهد. پرش معتبر از زمین، حرکت هوایی را شروع می‌کند.",keys:"P1: W / Space · Solo: ↑"},
  {title:"حمله",body:"حمله را بزن یا روی میدان کلیک کن. یوزی با نگه‌داشتن شلیک می‌کند؛ کمان با نگه‌داشتن شارژ و با رهاکردن شلیک می‌کند. موشک با یک لمس و مسیر ثابت شلیک می‌شود؛ کشیدن انگشت زاویه یا قدرت آن را عوض نمی‌کند.",keys:"P1: Z / X · Mouse: click / hold / release"},
  {title:"انتخاب شخصیت و سلاح",body:"پیش از شروع مسابقه سه مرحلهٔ حالت بازی، زمین، و انتخاب اجباری شخصیت و اسلحه را تکمیل کن. هر بازیکن در دونفره جداگانه انتخاب می‌کند. سلاح تا پایان مسابقه ثابت می‌ماند و دکمهٔ تعویض وجود ندارد. در دوئل موشکی موشک و در تن‌به‌تن تیغه/چکش در دسترس است. در حالت تصادفی باید انتخاب تصادفی را تأیید کنی.",keys:"انتخاب فقط پیش از شروع بازی"},
  {title:"جهت سلاح",body:"برای سلاح‌های دوربرد به‌جز موشک، گوی ⊕ را بکش. چرخش با کیبورد نیز برای موشک غیرفعال است. موشک همواره با مسیر ثابت در جهت شخصیت شلیک می‌شود.",keys:"P1: R / F · P2: PageUp / PageDown"},
  {title:"توقف و ادامه",body:"روی موبایل یا با نشانگر، دکمهٔ توقف را دو ثانیه نگه دار؛ سپس «ادامه» را بزن. با فوکوس روی توقف، Enter یا Space را نگه دار. منو امکان بازگشت به منوی اصلی و شروع دوباره در حالت مجاز را هم دارد."}
 ],
 advanced:[
  {title:"پرش دوم",body:"پس از پرش معتبر، در هوا گوی را به مرکز برگردان و دوباره بالا ببر. یک پرش اضافه تا فرود یا پرش دیواری معتبر در دسترس است. نگه‌داشتن گوی در بالا، پرش را تکرار نمی‌کند.",keys:"W / Space · Solo: ↑"},
  {title:"پرش دیواری",body:"کنار سطح عمودی یک سکو یا مانع جامد، در زمان مجاز دوباره پرش کن. از دیوار فاصله می‌گیری و پرش هوایی اضافه بازیابی می‌شود."},
  {title:"دش",body:"فقط با کیبورد در جهت شخصیت جهش سریع انجام بده. زمان بازیابی و محدودیت یک دش هوایی جلوی تکرار را می‌گیرد. دکمهٔ جداگانهٔ دش روی موبایل وجود ندارد.",keys:"P1: Shift · P2: Numpad5"},
  {title:"گرفتن و پرتاب",body:"روی موبایل، سریع از روی حمله به بالا بکش. حریف باید نزدیک و روبه‌رو باشد و مانع یا مصونیت نداشته باشد؛ تلاش معتبر ممکن است خطا برود. گرفتن موفق پس از مکث کوتاه، خودکار به پرتاب منتهی می‌شود.",keys:"P1: C · P2: Numpad1"},
  {title:"لگد مستقیم ← لگد چرخشی",body:"روی زمین گوی را پایین نگه دار و حمله بزن تا لگد مستقیم اجرا شود. حمله را رها کن و درست پس از لگد اول، در بازهٔ ترکیب دوباره بزن تا لگد چرخشی اجرا شود. نگه‌داشتن حمله ترکیب را تکرار نمی‌کند.",keys:"P1: S + Z/X · P2: ↓ + Enter"},
  {title:"کوبش هوایی زمین",body:"در هوا، پایین همراه حمله، کوبش رو به زمین را شروع می‌کند؛ برخورد هنگام فرود به اطراف آسیب می‌زند. کوبش باید در دسترس باشد و شخصیت درگیر حرکت یا ضربه نباشد. در دوئل موشکی مجاز نیست. این حرکت با حملهٔ معمول هوایی و ارتقای چکش فرق دارد.",keys:"P1: S + Z/X · P2: ↓ + Enter"}
 ],
 weapons:{
  blade:"ضربهٔ نزدیک به سمت روبه‌رو. در فاصلهٔ مناسب و رو به حریف حمله بزن؛ نزدیک لبه‌ها فشار وارد کن.",
  hammer:"ضربهٔ سنگین نزدیک با پس‌زنی زیاد. پس از نزدیک‌شدن حمله را زمان‌بندی کن؛ خطای ضربه زمان بازیابی دارد. ارتقای کوبش زمین، موج ضربهٔ چکش روی زمین است و با حرکت کوبش هوایی فرق دارد.",
  blaster:"با هر حمله یک پرتابهٔ دوربرد شلیک می‌کند. مسیر آزاد را نشانه بگیر؛ ارتقای آن سه شلیک با پخش عمودی ایجاد می‌کند.",
  uzi:"با نگه‌داشتن حمله و رعایت فاصلهٔ زمانی شلیک‌ها، سریع آتش می‌کند. برای فشار مداوم نشانه بگیر؛ پیش از گرفتن یا لگد، حمله را رها کن.",
  boomerang:"تیغه‌ای پرتاب می‌شود و به سوی صاحبش برمی‌گردد. در فاصلهٔ متوسط از مسیر رفت و برگشت برای تهدید حریف استفاده کن.",
  bow:"حمله را برای کشیدن کمان نگه دار و برای شلیک تیر رها کن. شارژ سرعت و مسیر تیر را تغییر می‌دهد؛ قبل از رهاکردن نشانه بگیر و از فاصله برای شارژ استفاده کن.",
  bomb:"مواد منفجرهٔ زمان‌دار و جهنده پرتاب می‌کند. سکوی مقصد یا مسیر حرکت حریف را هدف بگیر و از انفجار فاصله داشته باش. بمب چسبنده در اولین فرود روی سکو می‌چسبد.",
  missile:"برای یک شلیک انفجاری، حمله را بزن و منتظر بازیابی بمان. مسیر ثابت و وابسته به جهت شخصیت است؛ زاویه و قدرت یا گوی نشانه‌گیری ندارد. با جای‌گیری، محل فرود را تنظیم کن. ارتقای خوشه‌ای پس از انفجار اصلی موشک‌های کوچک آزاد می‌کند.",
  spear:"برای پرتاب نیزهٔ بلند و باریک، حمله را بزن. نیزه در جهت نشانه‌گیری حرکت می‌کند و به‌تدریج پایین می‌آید. ارتقای نیزهٔ دوتایی دو نیزه با زاویه‌های کمی متفاوت پرتاب می‌کند.",
  grapple:"با گوی جهت‌دهی نشانه بگیر و ATTACK را بزن تا قلاب پرتاب شود. قلاب به سکو یا مانع وصل می‌شود، تو را می‌کشد و امکان تاب‌خوردن می‌دهد. با ATTACK دوباره طناب جدا می‌شود. برخورد به دشمن آسیب کمی دارد و او را می‌کشد. ارتقای طناب بلند برد و سرعت جمع‌شدن را بیشتر می‌کند."
 },
 modes:{
  duel:"تک‌نفره مقابل هوش مصنوعی یا دو انسان انتخاب‌شده. با تمام‌کردن سلامت حریف ببر. همهٔ سلاح‌ها در دسترس‌اند؛ از پوشش میدان استفاده کن.",
  "missile-duel":"انتخاب سلاح فقط موشک است. حمله، موشک را با مسیر ثابت در جهت شخصیت شلیک می‌کند؛ سلامت حریف را تمام کن. جای‌گیری و زمان‌بندی مهم‌اند. تعویض دستی، نشانه‌گیری موشک و کوبش هوایی غیرفعال‌اند.",
  "melee-only":"فقط تیغه و چکش. سلامت حریف را تمام کن؛ با پرش نزدیک شو و در برابر ضربهٔ سنگین از پوشش کمک بگیر.",
  "random-weapons":"قبل از شروع هر مسابقه بازیکن باید اسلحهٔ تصادفی اختصاص‌یافته را تأیید کند. سلاح تا پایان مسابقه قفل است و خودکار تغییر نمی‌کند. برای بردن سلامت حریف را تمام کن و با برد سلاح خود سازگار شو.",
  "sudden-death":"یک ضربهٔ آسیب‌زننده می‌تواند مبارز را حذف کند. حرکت در دسترس است و اسلحهٔ انتخاب‌شده ثابت می‌ماند؛ پیش از حمله، خودت را در معرض ضربه قرار نده.",
  "low-gravity":"جاذبهٔ کمتر، زمان بیشتری در هوا می‌دهد. سلامت حریف را تمام کن؛ مسیر پرش و پرتابه‌ها را با جاذبهٔ تازه بسنج.",
  "king-of-hill":"تنها در مرکز بمان تا ۸ ثانیه کنترل جمع کنی؛ حضور هر دو نفر امتیاز نمی‌دهد. رسیدن به هدف یا شکست حریف باعث برد است. حریف را از محدودهٔ امتیاز بیرون بران.",
  "local-pvp":"گزینهٔ تعداد بازیکنان است، نه بازی آنلاین: دو انسان روی یک دستگاه هر حالت و زمین را انتخاب می‌کنند. کنترل‌ها مستقل‌اند و پیشرفت یا پاداش مسیر به بازی محلی تعلق نمی‌گیرد."
 },
 progression:[
  {title:"امتیاز ارتقا",body:"با برد تک‌نفره یک امتیاز بگیر و بین مبارزه‌ها برای ارتقای نام‌دار یک سلاح خرج کن. بازی دو نفره پیشرفت نمی‌دهد. امتیاز و ارتقای دوئل عادی متعلق به نشست فعلی بازی است."},
  {title:"مسیر چهار مبارزه‌ای",body:"سه رویارویی و یک رئیس نهایی. پس از هر برد یکی از سه ارتقای پیشنهادی را انتخاب و ادامه بده. پس از شکست همان مرحله قابل تکرار است؛ مسیر جدید از ابتدا شروع می‌شود. خروج، تنظیمات دوئل عادی را برمی‌گرداند و مسیر قابل تکرار را ذخیره می‌کند."},
  {title:"دستاورد دائمی و ارتقای مسیر",body:"بردهای مسیر و نشان‌ها روی دستگاه ذخیره می‌شوند. مرحله، امتیاز و ارتقای خریداری‌شدهٔ مسیر پس از بارگذاری دوباره باقی می‌مانند؛ اما ارتقا فقط برای همان مسیر است و به ارتقای دائمی دوئل تبدیل نمی‌شود."},
  {title:"ویژگی زمین‌ها",body:"کارت زمین، طرح واقعی سکو و پوشش را همراه فیلتر ویژگی نشان می‌دهد. خط‌چین نشانهٔ حرکت است؛ شکاف، پل شکستنی، سطح فروریزشی، نوار نقاله، باد، دریچه و میدان جاذبه بر تاکتیک اثر دارند. یخ و سطح لغزنده اصطکاک را تغییر می‌دهند. زمین دانلودی ابتدا باید نصب شود و پس از نصب آفلاین قابل بازی است."}
 ],
 local:[
  {title:"دو انسان، یک دستگاه",body:"دو نفرهٔ محلی، سپس حالت و زمین را انتخاب کن. نام‌های اختیاری مستقل بنویس. قبل از شروع هر بازیکن باید شخصیت و سلاح خود را انتخاب کند؛ در بازی هر نفر گوی حرکت و حملهٔ مستقل دارد. جای فیزیکی چپ و راست در زبان فارسی عوض نمی‌شود."},
  {title:"کیبورد بازیکن اول",body:"مبارز چپ از این کلیدها استفاده می‌کند. در بازی محلی کلیدهای جهتِ تک‌نفره به بازیکن دوم اختصاص دارند. جای شروع دو بازیکن در هر راند عوض می‌شود.",keys:"Move A/D · Down S · Jump W/Space · Attack Z/X · Grab C · Dash Shift · Aim R/F"},
  {title:"کیبورد بازیکن دوم",body:"مبارز راست کنترل مستقل دارد. برای موشک فقط جهت شخصیت اعمال می‌شود.",keys:"Move ←/→ or Numpad4/6 · Down ↓ · Jump ↑/Numpad8 · Attack Enter/Numpad0 · Grab Numpad1 · Dash Numpad5 · Aim PageUp/PageDown"}
 ]
};
