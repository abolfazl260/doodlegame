# انتشار دستی و مستقل DoodleGame در کافه‌بازار

این راهنما برای پروژه **DoodleGame** است، نه PixelHub. اجرای انتشار بازار کاملاً مستقل از گردش‌کار Google Play است. **این workflow فقط با Run workflow اجرا می‌شود**؛ نه Push، نه PR، نه Tag و نه Schedule. هر بار یک APK واقعی **Release امضاشده** از آخرین Commit شاخه \`main\` ساخته، بررسی و از API پیشخان به بررسی بازار ارسال می‌شود. هیچ فایل AAB یا کلید Debug در این مسیر وجود ندارد.

- برنامه: **DoodleGame**
- شناسه واقعی Android: \`com.abolfazl.doodlegame\`
- فناوری: **TypeScript + Vite + Capacitor 8** (نه Flutter)
- نسخه نمایشی Android: \`version\` در \`package.json\`
- شماره ساخت بازار: \`versionCode\` در \`config/cafebazaar-release.json\` (با انتقال بدون تغییر به \`ANDROID_VERSION_CODE\`)
- Java: **21**، Node: **22**؛ ساخت Gradle با \`npm run android:sync\` و \`node scripts/android/gradle.mjs assembleRelease\`
- خروجی: \`android/app/build/outputs/apk/release/app-release.apk\`
- [Workflow انتشار بازار](../.github/workflows/cafebazaar-publish.yml) | [اسکریپت پیشخان](../tool/publish_cafebazaar.py) | [کنترل نسخه و امضا](../tool/cafebazaar_version.py)
- [مستندات API پیشخان بازار](https://developers.cafebazaar.ir/fa/guidelines/feature/pishkhan-api) | [ورود به پیشخان](https://pishkhan.cafebazaar.ir/)

## ۱. یک‌بار برای همیشه: فعال‌کردن برنامه و دریافت API Secret

1. با حساب توسعه‌دهنده وارد [پیشخان کافه‌بازار](https://pishkhan.cafebazaar.ir/) شوید.
2. برنامه دارای شناسه **\`com.abolfazl.doodlegame\`** را ایجاد/بررسی کنید. اگر اپ از قبل در بازار وجود دارد، **همان اپ و همان شناسه** باید استفاده شود.
3. در بخش API / API پیشخانِ **همان برنامه**، کلید مخصوص API پیشخان را دریافت کنید. این کلید به همان اپ اختصاص دارد؛ کلید برنامه دیگری کار نمی‌کند.
4. در مخزن GitHub به **Settings → Secrets and variables → Actions → New repository secret** بروید. این موارد را اضافه کنید:

| نام Secret | مقدار موردنیاز |
|---|---|
| \`CAFEBAZAAR_PISHKHAN_API_SECRET\` | توکن مخصوص برنامه DoodleGame از پیشخان بازار |
| \`ANDROID_KEYSTORE_BASE64\` | فایل **همان keystore اصلی Production** به شکل Base64 یک‌خطی |
| \`ANDROID_KEYSTORE_PASSWORD\` | رمز بازکردن keystore |
| \`ANDROID_KEY_ALIAS\` | نام alias کلید امضا |
| \`ANDROID_KEY_PASSWORD\` | رمز همان alias |
| \`CAFEBAZAAR_EXPECTED_CERT_SHA256\` | **SHA-256 اثرانگشت گواهی امضای Production** که بازار برای همین Package می‌شناسد |

نام‌های \`PIXELHUB_UPLOAD_*\` در این پروژه **استفاده نمی‌شوند**. همان \`ANDROID_KEYSTORE_*\` موجود در مسیر Android Release بازی را تنظیم کنید. توکن و رمزها را هیچ‌وقت در سورس، PR، Dispatch Input، Changelog یا Artifact نگذارید.

برای تولید Base64 در Linux:

\`\`\`bash
base64 -w0 doodlegame-release.jks
\`\`\`

در macOS:

\`\`\`bash
base64 < doodlegame-release.jks | tr -d '\n'
\`\`\`

برای یافتن اثرانگشت گواهی از خود keystore:

\`\`\`bash
keytool -list -v -keystore doodlegame-release.jks -alias YOUR_ALIAS
\`\`\`

اثر انگشت **SHA256** را (بدون \`SHA256:\`، با یا بدون \`:\`) در Secret آخر ذخیره کنید. **نکته مهم:** گواهی امضای APK باید دقیقاً همان گواهی نسخه‌های قبلی **کافه‌بازار** باشد؛ کلید آپلود Google Play لزوماً گواهی امضای توزیع آن فروشگاه نیست. بدون اطمینان از گواهی، انتشار متوقف شود. اسکریپت از \`apksigner verify --verbose --print-certs\` استفاده می‌کند و اثر انگشت را با Secret پین‌شده تطبیق می‌دهد.

## ۲. تنظیم نسخه پیش از اولین انتشار

این بازی Flutter نیست؛ **نباید** \`pubspec.yaml\` یا نسخه PixelHub را کپی کنید.

نسخه نمایشی فعلی در \`package.json\` نوشته شده است. در فایل \`config/cafebazaar-release.json\` چهار فیلد وجود دارد:

\`\`\`json
{
  "versionName": "0.1.1",
  "versionCode": null,
  "highestPreviouslySubmittedVersionCode": null,
  "previousVersionName": null
}
\`\`\`

**مقدارهای null عمدی هستند:** سابقه شماره نسخه‌های منتشرشده در حساب بازار از داخل مخزن مشخص نیست. تا وقتی آن‌ها بررسی و تنظیم نشده باشند، Workflow پیش از ساخت APK خطا می‌دهد. هیچ شماره اولیه‌ای بر اساس حدس یا شماره اجرای CI اختصاص داده نمی‌شود.

1. در پیشخان بازار، **تمام نسخه‌های قبلاً ثبت‌شده، حتی نسخه‌های در انتظار بررسی** را بررسی کنید و بزرگ‌ترین Version Code را پیدا کنید. عدد آن را در \`highestPreviouslySubmittedVersionCode\` ثبت کنید. فقط درصورتی‌که این Package **هیچ سابقه‌ای در بازار ندارد**، مقدار \`0\` مجاز است.
2. نام نمایشی آخرین نسخه بازار را در \`previousVersionName\` ثبت کنید؛ برای اپی که هیچ سابقه ندارد، \`null\` بگذارید.
3. در \`package.json\`، نسخه جدید را انتخاب کنید: رفع باگ معمولاً **Patch**؛ افزودن قابلیت **Minor**.
4. دقیقاً همان \`versionName\` را در فایل بازار بنویسید و \`versionCode\` جدید را **بزرگ‌تر از بزرگ‌ترین کد ثبت‌شده** تعیین کنید. هر دو عدد باید بیشتر از نسخه قبلی باشند.
5. تغییرات نسخه را Commit و به \`main\` Merge کنید. Workflow سورس را تغییر نمی‌دهد، نسخه خودکار اضافه نمی‌کند و بدون Commit جدید نسخه متفاوت نمی‌سازد.

مثال آموزشی (اعداد واقعی DoodleGame نیستند):

| نسخه قبلی بازار | شماره جدید | مثال مقدارهای فایل |
|---|---|---|
| \`0.4.0 (7)\` | \`0.4.1 (8)\` | \`previousVersionName=0.4.0\`، \`highestPreviouslySubmittedVersionCode=7\`، \`versionName=0.4.1\`، \`versionCode=8\` |
| \`0.4.1 (8)\` | \`0.5.0 (9)\` | \`previousVersionName=0.4.1\`، \`highestPreviouslySubmittedVersionCode=8\`، \`versionName=0.5.0\`، \`versionCode=9\` |

نسخه خروجی APK با \`aapt dump badging\` کنترل می‌شود و باید با \`package.json\` و فایل بازار **دقیقاً برابر** باشد. پس از آن امضای APK و SHA-256 بررسی می‌شود. اسکریپت از \`last-committed\` و \`last-published\` بازار نیز نسخه آخر را می‌خواند و در صورت دریافت شماره قابل‌مقایسه، نسخه نامعتبر را رد می‌کند. **API این گردش‌کار فهرست کامل تمام نسخه‌های تاریخی را تضمین نمی‌کند**؛ بنابراین صحت مقدار «بزرگ‌ترین نسخه ثبت‌شده» همچنان باید از طریق پیشخان توسط مالک اپ تأیید شود.

## ۳. اجرای دستی برای نسخه جدید

1. وارد مخزن DoodleGame در GitHub و سپس تب **Actions** شوید.
2. گردش‌کار **Publish Cafe Bazaar (manual)** را انتخاب کنید.
3. روی **Run workflow** بزنید و حتماً شاخه **main** را انتخاب کنید.
4. فیلد \`changelog_fa\` را با توضیحات فارسی واقعی **همین نسخه** پر کنید؛ \`changelog_en\` و \`developer_note\` اختیاری‌اند.
5. برای انتشار جدید \`resume_existing_draft=false\` و \`expected_draft_id\` را خالی بگذارید.
6. **\`confirm_publish=true\`** را انتخاب کنید؛ در غیر این صورت Workflow *قبل از ساخت APK* رد می‌شود.
7. اجرای دستی را ثبت کنید. اجرای هم‌زمان دو انتشار بازار در مخزن قفل شده است (\`concurrency\`، بدون لغو خودکار نسخه در حال اجرا).

در همان Run، این مراحل انجام می‌شوند: بررسی دسترسی و نسخه → تست‌های بازی و انتشار → درخواست‌های خواندنی به API برای بررسی پیش‌نویس و تاریخچه → ساخت Release APK فقط با Production keystore → کنترل امضا، Package، versionName/versionCode و SHA-256 → نگهداری APK در Artifact → ایجاد Release جدید در پیشخان → آپلود \`multipart/form-data\` با فیلد \`architecture=all\` و فایل \`apk\` → ثبت \`commit\` با:

\`\`\`json
{
  "auto_publish": true,
  "staged_rollout_percentage": 100,
  "changelog_fa": "(ورودی دستی)",
  "changelog_en": "(ورودی دستی)",
  "developer_note": "(ورودی دستی)"
}
\`\`\`

\`auto_publish=true\` یعنی **بعد از بررسی و تأیید بازار** انتشار خودکار انجام می‌شود؛ به معنای دورزدن بررسی نیست.

## ۴. پیش‌نویس ناقص: Resume Draft با شناسه دقیق

اگر ایجاد Release در اجرای قبلی موفق شد اما آپلود/ثبت نهایی شکست خورد، اجرای تازه **نباید Release دیگری بسازد**. در ابتدا به \`GET /v1/apps/releases/last-uncommitted/\` درخواست ارسال می‌شود:

- اگر پیش‌نویس وجود دارد و \`resume_existing_draft=false\` است، عملیات **متوقف** می‌شود.
- اگر \`resume_existing_draft=true\` باشد، باید **از قبل** همان پیش‌نویس را در پیشخان بررسی کرده و **شناسه دقیق آن** را در ورودی اضافی \`expected_draft_id\` وارد کنید.
- اگر شناسه پیش‌نویس پاسخ API با شناسه مورد انتظار مطابقت نداشته باشد، اجرای Resume **متوقف می‌شود**. اگر پاسخ API شناسه را ارائه نکند، برای جلوگیری از بازنویسی نسخه دیگری، ادامه به‌طور ایمن مسدود می‌شود.
- در Resume، Release جدید ساخته نمی‌شود. اگر شناسه Package، versionCode یا versionName پیش‌نویس قابل‌دریافت باشد، آن‌ها نیز با فایل موردنظر تطبیق داده می‌شوند.
- نسخه و فایل APK باید هنوز همان‌هایی باشند که برای پیش‌نویس آماده کرده‌اید. بعد از یک شکست مبهم، ابتدا **وضعیت واقعی** را در پیشخان چک کنید؛ اجرای مجدد خودکار هیچ‌کدام از POSTهای حساس انجام نمی‌شود.

این ورودی ششم (\`expected_draft_id\`) به‌عنوان قفل امنیتی به پنج ورودی درخواستی اضافه شده است. اگر API/پیشخان شناسه پیش‌نویس را نشان ندهد، Resume از طریق اتوماسیون عمداً ممکن نخواهد بود و باید به‌صورت دستی از پشتیبانی بازار پیگیری شود. این رفتار از انتشار اشتباه امن‌تر است.

## ۵. مدیریت خطاها و وضعیت انتشار

| خطا | علت / اقدام |
|---|---|
| \`401\` / \`403\` | Secret نامعتبر یا متعلق به اپ دیگری است؛ کلید همان Package را در پیشخان بررسی کنید. |
| \`invalid_version\` یا خطای نسخه \`400\` | شماره ساخت تکراری/قدیمی یا نسخه نمایشی غیرصعودی است؛ \`package.json\` و فایل نسخه بازار را اصلاح کنید. |
| \`A draft already exists\` | نسخه نیمه‌کاره قبلی را در پیشخان بررسی کنید؛ فقط با شناسه صحیح Resume کنید. |
| \`Draft ID mismatch\` | پیش‌نویس پاسخ API همان پیش‌نویس مجاز شما نیست. ادامه ممنوع است. |
| \`APK signer certificate ... mismatch\` | keystore فعلی با گواهی نسخه‌های قبلی بازار سازگار نیست؛ کلید صحیح را پیدا کنید. |
| \`APK metadata mismatch\` | Package، Version Name یا Version Code موجود در خود APK با سورس یکی نیست. |
| \`Network outcome unknown\` یا خطای \`commit\` | ممکن است بازار درخواست را دریافت کرده باشد؛ پیش از هر اجرای بعدی وضعیت پیش‌نویس/آخرین نسخه را در پیشخان بررسی کنید. |
| Upload/Commit rejected | پاسخ ساختاریافته محدود از بازار در Actions ثبت می‌شود؛ هدر احراز هویت و Secret چاپ نمی‌شود. |

حتی پس از پیغام **Submitted for Bazaar review**، برنامه لزوماً در فروشگاه منتشر نشده است. وضعیت بررسی/انتشار نهایی را باید در **پیشخان بازار** دنبال کنید.

## ۶. دانلود APK و خواندن گزارش

به صفحه اجرای همان Workflow در **Actions** بروید و بخش **Artifacts** را باز کنید. فایل با قالب زیر برای **۱۴ روز** باقی می‌ماند:

\`doodlegame-bazaar-VERSION-codeVERSIONCODE-COMMIT\`

این Artifact حاوی **\`app-release.apk\` امضاشده** و فایل **\`release-metadata.txt\`** است. Secretها، Keystore و AAB داخل آن قرار نمی‌گیرند.

بخش **Summary** پس از ثبت درخواست، شامل نام برنامه، Package، Version Name، Version Code، Commit، SHA-256، توضیحات فارسی/انگلیسی، وضعیت ارسال درخواست، شناسه Draft و لینک پیشخان است. در اجرای ناموفق پس از ساخت APK، Summary وضعیت نامشخص را مشخص می‌کند تا از تکرار بی‌بررسی جلوگیری شود.

## ۷. تست محلی بدون هیچ انتشار واقعی

برای تست کد بدون دسترسی به پیشخان:

\`\`\`bash
python3 -m unittest discover -s tool/tests -p 'test_cafebazaar*.py' -v
npm test
\`\`\`

هیچ‌کدام از این تست‌ها به بازار درخواست ارسال نمی‌کنند. اجرای **Publish Cafe Bazaar (manual)** با \`confirm_publish=true\` ممکن است یک درخواست واقعی ثبت کند؛ برای آزمایش صرف نباید آن را Dispatch کرد.

گردش‌کار موجود Android Release/Google Play و فایل‌های اصلی بازی تغییر داده نشده‌اند. ساخت بازار مستقل است و کلیدهای Production صرفاً در حافظه و پوشه موقت GitHub Runner استفاده می‌شوند؛ فایل رمزگشایی‌شده در پایان Run حذف می‌شود.
