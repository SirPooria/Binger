// Binger TV Show Spin-Offs Engine
// Provides curated, high-accuracy spin-offs, prequels, sequels, and shared universe companion series
export type ShowDetailsLiteFetcher = (id: string) => Promise<{
  poster_path?: string | null;
  vote_average?: number;
  first_air_date?: string;
  original_name?: string;
} | null>;

export interface SpinOffItem {
  id: number;
  name: string;
  original_name?: string;
  faName?: string;
  relation: 'spin-off' | 'parent' | 'prequel' | 'sequel' | 'shared-universe';
  relationLabel: string; // Persian badge label
  description?: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  vote_average?: number;
  first_air_date?: string;
}

interface FranchiseMember {
  id: number;
  name: string;
  faName?: string;
  type: 'parent' | 'spin-off' | 'prequel' | 'sequel' | 'shared-universe';
  description?: string;
  // Fallback poster if TMDB call fails or is slow
  poster_path?: string;
}

interface FranchiseCluster {
  franchiseName: string;
  members: FranchiseMember[];
}

// Comprehensive database of major TV franchises & interconnected universes
const FRANCHISE_CLUSTERS: FranchiseCluster[] = [
  // 1. Breaking Bad Universe
  {
    franchiseName: 'Breaking Bad',
    members: [
      { id: 1396, name: 'Breaking Bad', faName: 'برکینگ بد', type: 'parent', description: 'سریال اصلی / والت و جسی' },
      { id: 60059, name: 'Better Call Saul', faName: 'بهتره با ساول تماس بگیری', type: 'prequel', description: 'پیش‌درآمد و ماجرای ساول گودمن' },
      { id: 197598, name: "Slippin' Jimmy", faName: 'اسلیپین جیمی', type: 'spin-off', description: 'اسپین‌اف انیمیشنی روزهای جوانی ساول' },
    ],
  },
  // 2. Game of Thrones (Westeros)
  {
    franchiseName: 'Game of Thrones',
    members: [
      { id: 1399, name: 'Game of Thrones', faName: 'بازی تاج‌وتخت', type: 'parent', description: 'سریال مادر دنیای وستروس' },
      { id: 94997, name: 'House of the Dragon', faName: 'خاندان اژدها', type: 'prequel', description: 'پیش‌درآمد درباره رقص اژدهایان و خاندان تارگارین' },
      { id: 224372, name: 'A Knight of the Seven Kingdoms', faName: 'شوالیه‌ای از هفت پادشاهی', type: 'prequel', description: 'اسپین‌اف دانک و اگ در وستروس' },
    ],
  },
  // 3. The Walking Dead Universe
  {
    franchiseName: 'The Walking Dead',
    members: [
      { id: 1402, name: 'The Walking Dead', faName: 'مردگان متحرک', type: 'parent', description: 'سریال اصلی پسا‌آخروزمانی' },
      { id: 62286, name: 'Fear the Walking Dead', faName: 'از مردگان متحرک بترسید', type: 'spin-off', description: 'اولین اسپین‌اف از آغاز شیوع ویروس' },
      { id: 194583, name: 'The Walking Dead: Dead City', faName: 'شهر مردگان', type: 'sequel', description: 'دنباله مگی و نیگان در منهتن' },
      { id: 211684, name: 'The Walking Dead: Daryl Dixon', faName: 'دریل دیکسون', type: 'sequel', description: 'دنباله سفر دریل دیکسون در فرانسه' },
      { id: 206586, name: 'The Walking Dead: The Ones Who Live', faName: 'بازماندگان', type: 'sequel', description: 'پایان داستان حماسی ریک گرایمز و میشون' },
      { id: 94305, name: 'The Walking Dead: World Beyond', faName: 'جهان فراتر', type: 'spin-off', description: 'اسپین‌اف نسل جدید پسا‌آخرالزمان' },
      { id: 136248, name: 'Tales of the Walking Dead', faName: 'قصه‌های مردگان متحرک', type: 'spin-off', description: 'اسپین‌اف آنتولوژی اپیزودیک' },
    ],
  },
  // 4. The Boys Universe
  {
    franchiseName: 'The Boys',
    members: [
      { id: 76479, name: 'The Boys', faName: 'پسران', type: 'parent', description: 'سریال اصلی مبارزه با ابرقهرمانان فاسد' },
      { id: 205715, name: 'Gen V', faName: 'ژن وی', type: 'spin-off', description: 'اسپین‌اف کالج آموزش ابرقهرمانان گادولکین' },
      { id: 153870, name: 'The Boys Presents: Diabolical', faName: 'پسران تقدیم می‌کند: شیطانی', type: 'spin-off', description: 'اسپین‌اف انیمیشنی کوتاه' },
    ],
  },
  // 5. Yellowstone Universe
  {
    franchiseName: 'Yellowstone',
    members: [
      { id: 73586, name: 'Yellowstone', faName: 'یلواستون', type: 'parent', description: 'سریال اصلی خانواده داتون در مونتانا' },
      { id: 118357, name: '1883', faName: '۱۸۸۳', type: 'prequel', description: 'پیش‌درآمد سفر نخستین داتون‌ها به غرب وحشی' },
      { id: 153312, name: '1923', faName: '۱۹۲۳', type: 'prequel', description: 'پیش‌درآمد نسل دوم داتون‌ها با هریسون فورد' },
      { id: 157732, name: 'Lawmen: Bass Reeves', faName: 'مارشال‌ها: باس ریوز', type: 'shared-universe', description: 'آنتولوژی دنیای وسترن تیلور شریدان' },
    ],
  },
  // 6. The Big Bang Theory Universe
  {
    franchiseName: 'The Big Bang Theory',
    members: [
      { id: 1418, name: 'The Big Bang Theory', faName: 'تئوری بیگ بنگ', type: 'parent', description: 'سریال کمدی اصلی نوابغ پاسادینا' },
      { id: 71728, name: 'Young Sheldon', faName: 'شلدون جوان', type: 'prequel', description: 'پیش‌درآمد کودکی و نبوغ شلدون کوپر' },
      { id: 243875, name: "Georgie & Mandy's First Marriage", faName: 'اولین ازدواج جورجی و مندی', type: 'sequel', description: 'دنباله و اسپین‌اف شلدون جوان' },
    ],
  },
  // 7. Vikings Universe
  {
    franchiseName: 'Vikings',
    members: [
      { id: 44217, name: 'Vikings', faName: 'وایکینگ‌ها', type: 'parent', description: 'حماسه راگنار لاثبروک و پسرانش' },
      { id: 116135, name: 'Vikings: Valhalla', faName: 'وایکینگ‌ها: والهالا', type: 'sequel', description: 'دنباله و اسپین‌اف ۱۰۰ سال پس از راگنار' },
    ],
  },
  // 8. Dexter Universe
  {
    franchiseName: 'Dexter',
    members: [
      { id: 1405, name: 'Dexter', faName: 'دکستر', type: 'parent', description: 'سریال اصلی قاتل زنجیره‌ای قانون‌مند' },
      { id: 131927, name: 'Dexter: New Blood', faName: 'دکستر: خون جدید', type: 'sequel', description: 'دنباله بازگشت دکستر سال‌ها بعد در نیویورک' },
      { id: 219937, name: 'Dexter: Original Sin', faName: 'دکستر: گناه نخستین', type: 'prequel', description: 'پیش‌درآمد آغاز قتل‌ها و جوانی دکستر در میامی' },
    ],
  },
  // 9. Power Universe (Courtney Kemp / 50 Cent)
  {
    franchiseName: 'Power',
    members: [
      { id: 54655, name: 'Power', faName: 'قدرت', type: 'parent', description: 'سریال اصلی امپراتوری جیمز سنت‌پاتریک' },
      { id: 97890, name: 'Power Book II: Ghost', faName: 'پاور بوک ۲: گوست', type: 'sequel', description: 'دنباله داستان طارق سنت‌پاتریک' },
      { id: 124394, name: 'Power Book III: Raising Kanan', faName: 'پاور بوک ۳: پرورش کینان', type: 'prequel', description: 'پیش‌درآمد دهه ۹۰ و جوانی کینان' },
      { id: 119845, name: 'Power Book IV: Force', faName: 'پاور بوک ۴: فورس', type: 'spin-off', description: 'اسپین‌اف تامی اگان در شیکاگو' },
    ],
  },
  // 10. Money Heist (La Casa de Papel)
  {
    franchiseName: 'Money Heist',
    members: [
      { id: 71446, name: 'Money Heist', faName: 'سرقت پول (خانه کاغذی)', type: 'parent', description: 'سریال اصلی پروفسور و گروهش در اسپانیا' },
      { id: 146176, name: 'Berlin', faName: 'برلین', type: 'prequel', description: 'پیش‌درآمد و ماجراجویی‌های عاشقانه برلین در پاریس' },
      { id: 114868, name: 'Money Heist: Korea - Joint Economic Area', faName: 'سرقت پول: کره', type: 'spin-off', description: 'اسپین‌اف و بازآفرینی در شبه‌جزیره کره' },
    ],
  },
  // 11. Bridgerton Universe
  {
    franchiseName: 'Bridgerton',
    members: [
      { id: 87739, name: 'Bridgerton', faName: 'بریجرتون', type: 'parent', description: 'سریال اصلی اشراف‌زادگان لندن' },
      { id: 196454, name: 'Queen Charlotte: A Bridgerton Story', faName: 'ملکه شارلوت', type: 'prequel', description: 'پیش‌درآمد قدرت‌گیری و جوانی ملکه شارلوت' },
    ],
  },
  // 12. Suits Universe
  {
    franchiseName: 'Suits',
    members: [
      { id: 37680, name: 'Suits', faName: 'کت‌شلواری‌ها', type: 'parent', description: 'درام حقوقی هاروی اسپکتر و مایک راس' },
      { id: 85950, name: 'Pearson', faName: 'پیرسون', type: 'spin-off', description: 'اسپین‌اف ورود جسیکا پیرسون به سیاست شیکاگو' },
    ],
  },
  // 13. Friends Universe
  {
    franchiseName: 'Friends',
    members: [
      { id: 1668, name: 'Friends', faName: 'فرندز', type: 'parent', description: 'شاهکار سیتکام ۶ دوست نیویورکی' },
      { id: 1466, name: 'Joey', faName: 'جویی', type: 'spin-off', description: 'اسپین‌اف ماجراجویی‌های جویی تریبیانی در هالیوود' },
    ],
  },
  // 14. Marvel Defenders Universe
  {
    franchiseName: 'The Defenders',
    members: [
      { id: 61889, name: 'Daredevil', faName: 'دردویل', type: 'parent', description: 'سریال اصلی مت مرداک در هلز کیچن' },
      { id: 67178, name: "Marvel's The Punisher", faName: 'پانیشر', type: 'spin-off', description: 'اسپین‌اف فرانک کسل، مجازات‌گر بی‌رحم' },
      { id: 202820, name: 'Daredevil: Born Again', faName: 'دردویل: تولد دوباره', type: 'sequel', description: 'ادامه و احیای جدید دردویل در مارول' },
      { id: 62285, name: "Marvel's The Defenders", faName: 'دیفندرز', type: 'shared-universe', description: 'مینی‌سریال گردهمایی قهرمانان نیویورک' },
      { id: 38472, name: "Marvel's Jessica Jones", faName: 'جسیکا جونز', type: 'shared-universe', description: 'کارآگاه خصوصی با گذشته‌ای تاریک' },
      { id: 62126, name: "Marvel's Luke Cage", faName: 'لوک کیج', type: 'shared-universe', description: 'قهرمان نفوذناپذیر هارلم' },
      { id: 62287, name: "Marvel's Iron Fist", faName: 'آیرون فیست', type: 'shared-universe', description: 'مشت آهنین کُن‌لون' },
    ],
  },
  // 15. The Batman Universe
  {
    franchiseName: 'The Batman Universe',
    members: [
      { id: 194764, name: 'The Penguin', faName: 'پنگوئن', type: 'spin-off', description: 'اسپین‌اف به قدرت رسیدن ازوالد کابلپات در گاتهام' },
      { id: 60708, name: 'Gotham', faName: 'گاتهام', type: 'prequel', description: 'داستان جوانی جیم گوردون و رشد بروس وین' },
      { id: 80424, name: 'Pennyworth', faName: 'پنی‌ورث', type: 'prequel', description: 'پیش‌درآمد جوانی آلفرد پنی‌ورث در لندن' },
    ],
  },
  // 16. MCU Disney+ Connections
  {
    franchiseName: 'Marvel Wanda & Agatha',
    members: [
      { id: 85271, name: 'WandaVision', faName: 'وانداویژن', type: 'parent', description: 'سریال ساختارستیز واندا ماکسیموف در وست‌ویو' },
      { id: 138502, name: 'Agatha All Along', faName: 'همه‌اش تقصیر آگاتا بود', type: 'spin-off', description: 'اسپین‌اف بازگشت جادوگر آگاتا هارکنس' },
    ],
  },
  // 17. Star Wars Mandoverse
  {
    franchiseName: 'Star Wars Mandoverse',
    members: [
      { id: 82856, name: 'The Mandalorian', faName: 'مندلورین', type: 'parent', description: 'دین جارین و گروگو در کهکشان دوردست' },
      { id: 115036, name: 'The Book of Boba Fett', faName: 'کتاب بوبا فت', type: 'spin-off', description: 'حکومت بوبا فت بر تاتویین' },
      { id: 114461, name: 'Ahsoka', faName: 'آسوکا', type: 'spin-off', description: 'ماجراجویی آسوکا تانو برای یافتن تران' },
      { id: 202879, name: 'Star Wars: Skeleton Crew', faName: 'اسکلتون کرو', type: 'spin-off', description: 'گروهی از کودکان گمشده در فضا با جود لا' },
    ],
  },
  // 18. Star Wars Animated Universe
  {
    franchiseName: 'Star Wars Animated',
    members: [
      { id: 4174, name: 'Star Wars: The Clone Wars', faName: 'جنگ‌های کلون', type: 'parent', description: 'سریال انیمیشنی حماسی جنگ‌های کلون' },
      { id: 105971, name: 'Star Wars: The Bad Batch', faName: 'بد بچ', type: 'sequel', description: 'دنباله و گروه کلون‌های جهش‌یافته ۹۹' },
      { id: 60554, name: 'Star Wars Rebels', faName: 'شورشیان', type: 'spin-off', description: 'آغاز شکل‌گیری اتحاد شورشیان علیه امپراتوری' },
      { id: 202256, name: 'Star Wars: Tales of the Jedi', faName: 'داستان‌های جدای', type: 'spin-off', description: 'آنتولوژی گذشته آسوکا و دوکو' },
    ],
  },
  // 19. Doctor Who Whoniverse
  {
    franchiseName: 'Doctor Who',
    members: [
      { id: 57243, name: 'Doctor Who', faName: 'دکتر هو', type: 'parent', description: 'سریال علمی‌تخیلی کلاسیک بریتانیایی' },
      { id: 1049, name: 'Torchwood', faName: 'تورچ‌وود', type: 'spin-off', description: 'اسپین‌اف بزرگسالانه کاپیتان جک هارکنس' },
      { id: 1001, name: 'The Sarah Jane Adventures', faName: 'ماجراهای سارا جین', type: 'spin-off', description: 'اسپین‌اف ماجراجویانه همراه قدیمی دکتر' },
      { id: 65942, name: 'Class', faName: 'کلاس', type: 'spin-off', description: 'اسپین‌اف نوجوانانه آکادمی کول هیل' },
    ],
  },
  // 20. Narcos Universe
  {
    franchiseName: 'Narcos',
    members: [
      { id: 63351, name: 'Narcos', faName: 'نارکوز', type: 'parent', description: 'نبرد با کارتل‌های کلمبیا و پابلو اسکوبار' },
      { id: 80968, name: 'Narcos: Mexico', faName: 'نارکوز: مکزیک', type: 'spin-off', description: 'اسپین‌اف شکل‌گیری کارتل گوادالاخارا در مکزیک' },
    ],
  },
  // 21. Sons of Anarchy Universe
  {
    franchiseName: 'Sons of Anarchy',
    members: [
      { id: 1409, name: 'Sons of Anarchy', faName: 'فرزندان آنارشی', type: 'parent', description: 'باشگاه موتورسواران سَم‌کرو و جکس تلر' },
      { id: 75820, name: 'Mayans M.C.', faName: 'مایانز ام‌سی', type: 'spin-off', description: 'اسپین‌اف باشگاه رقیب در مرز کالیفرنیا و مکزیک' },
    ],
  },
  // 22. The Witcher Universe
  {
    franchiseName: 'The Witcher',
    members: [
      { id: 71912, name: 'The Witcher', faName: 'ویچر', type: 'parent', description: 'گرالت اهل ریویا و سرنوشت سیری' },
      { id: 106541, name: 'The Witcher: Blood Origin', faName: 'ویچر: منشأ خون', type: 'prequel', description: 'پیش‌درآمد ۱۲۰۰ سال قبل و پیوند کره‌ها' },
    ],
  },
  // 23. Spartacus Universe
  {
    franchiseName: 'Spartacus',
    members: [
      { id: 46261, name: 'Spartacus', faName: 'اسپارتاکوس', type: 'parent', description: 'شورش گلادیاتورها علیه روم باستان' },
      { id: 36919, name: 'Spartacus: Gods of the Arena', faName: 'خدایان آرنا', type: 'prequel', description: 'پیش‌درآمد گلادیاتور گانیکوس در خانه باتیاتوس' },
    ],
  },
  // 24. The Vampire Diaries Universe
  {
    franchiseName: 'The Vampire Diaries',
    members: [
      { id: 18165, name: 'The Vampire Diaries', faName: 'خاطرات یک خون‌آشام', type: 'parent', description: 'مثلث عشقی برادران سالواتوره و الینا گیلبرت' },
      { id: 46896, name: 'The Originals', faName: 'اصیل‌ها', type: 'spin-off', description: 'اسپین‌اف خانواده مایکلسون در نیواورلئان' },
      { id: 79463, name: 'Legacies', faName: 'میراث‌ها', type: 'sequel', description: 'اسپین‌اف و دنباله هوپ مایکلسون در مدرسه سالواتوره' },
    ],
  },
  // 25. Arrowverse (DC CW)
  {
    franchiseName: 'Arrowverse',
    members: [
      { id: 1412, name: 'Arrow', faName: 'کماندار (ارو)', type: 'parent', description: 'سریال آغازگر الیور کوئین و دنیای دی‌سی' },
      { id: 60735, name: 'The Flash', faName: 'فلش', type: 'spin-off', description: 'اسپین‌اف بری آلن، سریع‌ترین مرد زنده' },
      { id: 62643, name: "DC's Legends of Tomorrow", faName: 'افسانه‌های فردا', type: 'spin-off', description: 'تیم سفر در زمان قهرمانان و ضدقهرمانان' },
      { id: 62688, name: 'Supergirl', faName: 'سوپرگرل', type: 'shared-universe', description: 'دختر پولادین کارا دنورز' },
      { id: 71663, name: 'Black Lightning', faName: 'صاعقه سیاه', type: 'shared-universe', description: 'جفرسون پیرس و مبارزه برای فری‌لند' },
      { id: 89247, name: 'Batwoman', faName: 'بت‌وومن', type: 'spin-off', description: 'شوالیه تاریکی جدید در گاتهام' },
    ],
  },
  // 26. NCIS Universe
  {
    franchiseName: 'NCIS',
    members: [
      { id: 4614, name: 'NCIS', faName: 'ان‌سی‌آی‌اس', type: 'parent', description: 'تحقیقات جنایی نیروی دریایی با مامور گیبس' },
      { id: 17610, name: 'NCIS: Los Angeles', faName: 'ان‌سی‌آی‌اس: لس‌آنجلس', type: 'spin-off', description: 'تیم عملیات ویژه مخفی در کالیفرنیا' },
      { id: 61818, name: 'NCIS: New Orleans', faName: 'ان‌سی‌آی‌اس: نیواورلئان', type: 'spin-off', description: 'پرونده‌های جنایی در لوییزیانا' },
      { id: 120998, name: "NCIS: Hawai'i", faName: 'ان‌سی‌آی‌اس: هاوایی', type: 'spin-off', description: 'دفتر اقیانوس آرام در پرل هاربر' },
      { id: 213713, name: 'NCIS: Sydney', faName: 'ان‌سی‌آی‌اس: سیدنی', type: 'spin-off', description: 'اسپین‌اف بین‌المللی استرالیا' },
      { id: 243754, name: 'NCIS: Origins', faName: 'ان‌سی‌آی‌اس: ریشه‌ها', type: 'prequel', description: 'پیش‌درآمد سال‌های آغازین لیروی جترو گیبس' },
      { id: 4087, name: 'JAG', faName: 'جَگ', type: 'parent', description: 'سریال دادستان‌های نیروی دریایی (خاستگاه ان‌سی‌آی‌اس)' },
    ],
  },
  // 27. CSI Universe
  {
    franchiseName: 'CSI',
    members: [
      { id: 1431, name: 'CSI: Crime Scene Investigation', faName: 'سی‌اس‌آی: بررسی صحنه جرم', type: 'parent', description: 'سریال انقلابی علوم قضایی در لاس‌وگاس' },
      { id: 1620, name: 'CSI: Miami', faName: 'سی‌اس‌آی: میامی', type: 'spin-off', description: 'هوراشیو کین در سواحل میامی' },
      { id: 2362, name: 'CSI: NY', faName: 'سی‌اس‌آی: نیویورک', type: 'spin-off', description: 'مک تیلور در قلب منهتن' },
      { id: 60802, name: 'CSI: Cyber', faName: 'سی‌اس‌آی: سایبر', type: 'spin-off', description: 'جرایم رایانه‌ای و سایبری' },
      { id: 122079, name: 'CSI: Vegas', faName: 'سی‌اس‌آی: وگاس', type: 'sequel', description: 'احیا و ادامه تیم اصلی در وگاس' },
    ],
  },
  // 28. Law & Order Universe
  {
    franchiseName: 'Law & Order',
    members: [
      { id: 549, name: 'Law & Order', faName: 'قانون و نظم', type: 'parent', description: 'پلیس و دادستان‌های شهر نیویورک' },
      { id: 2734, name: 'Law & Order: Special Victims Unit', faName: 'واحد قربانیان ویژه (SVU)', type: 'spin-off', description: 'اولویا بنسون و جرایم جنسی' },
      { id: 104139, name: 'Law & Order: Organized Crime', faName: 'جرایم سازمان‌یافته', type: 'spin-off', description: 'بازگشت الیوت استابلر' },
      { id: 2290, name: 'Law & Order: Criminal Intent', faName: 'مقاصد جنایی', type: 'spin-off', description: 'روانشناسی مجرمان با وینسنت دونوفریو' },
    ],
  },
  // 29. One Chicago Universe
  {
    franchiseName: 'One Chicago',
    members: [
      { id: 44006, name: 'Chicago Fire', faName: 'شیکاگو فایر', type: 'parent', description: 'آتش‌نشانان ایستگاه ۵۱ شیکاگو' },
      { id: 58841, name: 'Chicago P.D.', faName: 'شیکاگو پی‌دی', type: 'spin-off', description: 'واحد اطلاعات پلیس به فرماندهی وویت' },
      { id: 62650, name: 'Chicago Med', faName: 'شیکاگو مِد', type: 'spin-off', description: 'پزشکان اورژانس مجهز گفنی شیکاگو' },
    ],
  },
  // 30. Grey's Anatomy Universe
  {
    franchiseName: 'Grey\'s Anatomy',
    members: [
      { id: 1416, name: "Grey's Anatomy", faName: 'آناتومی گری', type: 'parent', description: 'مرکز پزشکی سیاتل گریس و مردیت گری' },
      { id: 322, name: 'Private Practice', faName: 'مطب خصوصی', type: 'spin-off', description: 'اسپین‌اف دکتر ادیسون مونتگومری در لس‌آنجلس' },
      { id: 76773, name: 'Station 19', faName: 'ایستگاه ۱۹', type: 'spin-off', description: 'آتش‌نشانان شجاع شهر سیاتل' },
    ],
  },
  // 31. The Good Wife Universe
  {
    franchiseName: 'The Good Wife',
    members: [
      { id: 1435, name: 'The Good Wife', faName: 'همسر خوب', type: 'parent', description: 'آلیشیا فلوریک و بازگشت به وکالت' },
      { id: 69158, name: 'The Good Fight', faName: 'نبرد خوب', type: 'spin-off', description: 'دایان لاکهارت در شرکت حقوقی جدید' },
      { id: 220558, name: 'Elsbeth', faName: 'الزبت', type: 'spin-off', description: 'وکیل باهوش الزبت تاسیونی در نیویورک' },
    ],
  },
  // 32. Cheers & Frasier
  {
    franchiseName: 'Cheers & Frasier',
    members: [
      { id: 200, name: 'Cheers', faName: 'چیرز', type: 'parent', description: 'کمدی کلاسیک در باری در بوستون' },
      { id: 1834, name: 'Frasier', faName: 'فریزر', type: 'spin-off', description: 'دکتر فریزر کرین در رادیوی سیاتل' },
      { id: 155531, name: 'Frasier (2023)', faName: 'فریزر (۲۰۲۳)', type: 'sequel', description: 'احیا و بازگشت فریزر به بوستون' },
    ],
  },
  // 33. Buffyverse
  {
    franchiseName: 'Buffyverse',
    members: [
      { id: 95, name: 'Buffy the Vampire Slayer', faName: 'بافی قاتل خون‌آشام‌ها', type: 'parent', description: 'بافی سامرز محافظ شهر سانی‌دیل' },
      { id: 2426, name: 'Angel', faName: 'انجل', type: 'spin-off', description: 'خون‌آشام نفرین‌شده در خیابان‌های تاریک لس‌آنجلس' },
    ],
  },
  // 34. Criminal Minds Universe
  {
    franchiseName: 'Criminal Minds',
    members: [
      { id: 4057, name: 'Criminal Minds', faName: 'ذهن‌های جنایتکار', type: 'parent', description: 'تحلیلگران رفتارشناسی FBI در کوانتیکو' },
      { id: 205626, name: 'Criminal Minds: Evolution', faName: 'ذهن‌های جنایتکار: تکامل', type: 'sequel', description: 'ادامه مدرن واحد BAU با شبکه‌ای از قاتلان' },
      { id: 62710, name: 'Criminal Minds: Beyond Borders', faName: 'فراتر از مرزها', type: 'spin-off', description: 'پرونده‌های شهروندان آمریکایی در خارج از کشور' },
      { id: 33887, name: 'Criminal Minds: Suspect Behavior', faName: 'رفتار مشکوک', type: 'spin-off', description: 'تیم تاکتیکی واکنش سریع BAU' },
    ],
  },
  // 35. American Horror Story Universe
  {
    franchiseName: 'American Horror Story',
    members: [
      { id: 1413, name: 'American Horror Story', faName: 'داستان ترسناک آمریکایی', type: 'parent', description: 'آنتولوژی ترسناک و رازآلود رایان مورفی' },
      { id: 113036, name: 'American Horror Stories', faName: 'داستان‌های ترسناک آمریکایی', type: 'spin-off', description: 'آنتولوژی اپیزودیک مستقل' },
      { id: 65495, name: 'American Crime Story', faName: 'داستان جنایی آمریکایی', type: 'shared-universe', description: 'بازسازی پرونده‌های واقعی تاریخ آمریکا' },
    ],
  },
  // 36. Penny Dreadful
  {
    franchiseName: 'Penny Dreadful',
    members: [
      { id: 59717, name: 'Penny Dreadful', faName: 'پنی دردفول', type: 'parent', description: 'داستان تاریک موجودات گوتیک در لندن ویکتوریایی' },
      { id: 83685, name: 'Penny Dreadful: City of Angels', faName: 'شهر فرشتگان', type: 'spin-off', description: 'فولکلور و تعقیب جنایت در لس‌آنجلس ۱۹۳۸' },
    ],
  },
  // 37. Supernatural Universe
  {
    franchiseName: 'Supernatural',
    members: [
      { id: 1622, name: 'Supernatural', faName: 'سوپرنچرال', type: 'parent', description: 'ماجراجویی ۱۵ ساله برادران وینچستر' },
      { id: 157080, name: 'The Winchesters', faName: 'وینچسترها', type: 'prequel', description: 'پیش‌درآمد عشق جان و مری وینچستر' },
    ],
  },
  // 38. Pretty Little Liars
  {
    franchiseName: 'Pretty Little Liars',
    members: [
      { id: 31917, name: 'Pretty Little Liars', faName: 'دروغ‌گوهای کوچک زیبا', type: 'parent', description: 'رازها و پیام‌های شوم فردی با نام A' },
      { id: 114880, name: 'Pretty Little Liars: Original Sin', faName: 'گناه اصلی', type: 'spin-off', description: 'اسپین‌اف اسلشر جدید نسلی دیگر از دروغ‌گوها' },
      { id: 82728, name: 'Pretty Little Liars: The Perfectionists', faName: 'کمال‌گرایان', type: 'spin-off', description: 'اسپین‌اف در دانشگاه بیکن هایتس' },
      { id: 56499, name: 'Ravenswood', faName: 'ریونز‌وود', type: 'spin-off', description: 'نفرین شوم شهر مرموز ریونز‌وود' },
    ],
  },
  // 39. Gossip Girl
  {
    franchiseName: 'Gossip Girl',
    members: [
      { id: 1395, name: 'Gossip Girl', faName: 'دختر سخن‌چین', type: 'parent', description: 'زندگی نوجوانان نخبه آپر ایست ساید نیویورک' },
      { id: 87784, name: 'Gossip Girl (2021)', faName: 'دختر سخن‌چین (۲۰۲۱)', type: 'sequel', description: 'نسل جدید دانش‌آموزان در عصر شبکه‌های اجتماعی' },
    ],
  },
  // 40. Black-ish Universe
  {
    franchiseName: 'Black-ish',
    members: [
      { id: 61381, name: 'Black-ish', faName: 'بلک-ایش', type: 'parent', description: 'سیتکام خانواده جانسون در حومه شهر' },
      { id: 73107, name: 'Grown-ish', faName: 'گرون-ایش', type: 'spin-off', description: 'اسپین‌اف ورود زوئی به زندگی دانشجویی' },
      { id: 89844, name: 'Mixed-ish', faName: 'میکسد-ایش', type: 'prequel', description: 'پیش‌درآمد دهه ۸۰ و کودکی بو' },
    ],
  },
  // 41. All American
  {
    franchiseName: 'All American',
    members: [
      { id: 81329, name: 'All American', faName: 'تمام‌آمریکایی', type: 'parent', description: 'ورزش و چالش‌های اسپنسر جیمز در بورلی هیلز' },
      { id: 119054, name: 'All American: Homecoming', faName: 'بازگشت به خانه', type: 'spin-off', description: 'تنیس و بیسبال در دانشگاه تاریخی برینگستون' },
    ],
  },
  // 42. Bones
  {
    franchiseName: 'Bones',
    members: [
      { id: 1911, name: 'Bones', faName: 'استخوان‌ها', type: 'parent', description: 'انسان‌شناسی جنایی دکتر تمپرنس برنان' },
      { id: 38780, name: 'The Finder', faName: 'یابنده', type: 'spin-off', description: 'والتر شرمن و مهارت جادویی در یافتن اشیا و افراد' },
    ],
  },
  // 43. Once Upon a Time
  {
    franchiseName: 'Once Upon a Time',
    members: [
      { id: 39272, name: 'Once Upon a Time', faName: 'روزی روزگاری', type: 'parent', description: 'شخصیت‌های افسانه‌ای در دنیای واقعی استوری‌بروک' },
      { id: 57159, name: 'Once Upon a Time in Wonderland', faName: 'در سرزمین عجایب', type: 'spin-off', description: 'ماجرای آلیس در سرزمین عجایب ویکتوریایی' },
    ],
  },
  // 44. Star Trek TV Franchise
  {
    franchiseName: 'Star Trek',
    members: [
      { id: 253, name: 'Star Trek', faName: 'پیشتازان فضا', type: 'parent', description: 'سفرهای جسورانه کاپیتان کرک و آقای اسپاک' },
      { id: 655, name: 'Star Trek: The Next Generation', faName: 'نسل بعدی', type: 'spin-off', description: 'کاپیتان پیکارد در فضاپیمای انترپرایز-دی' },
      { id: 580, name: 'Star Trek: Deep Space Nine', faName: 'ایستگاه فضایی نه', type: 'spin-off', description: 'ایستگاه فضایی لبه کرم‌چاله بیدجور' },
      { id: 1855, name: 'Star Trek: Voyager', faName: 'وویجر', type: 'spin-off', description: 'سرگردان در کوادرانت دلتا با کاپیتان جن‌وی' },
      { id: 2294, name: 'Star Trek: Enterprise', faName: 'انترپرایز', type: 'prequel', description: 'نخستین سفینه‌ی فراسرعت انسان پیش از فدراسیون' },
      { id: 67158, name: 'Star Trek: Discovery', faName: 'دیسکاوری', type: 'spin-off', description: 'سفر در زمان و تکنولوژی اسپور درایو' },
      { id: 85949, name: 'Star Trek: Picard', faName: 'پیکارد', type: 'sequel', description: 'فصل پایانی زندگی ژنرال ژان-لوک پیکارد' },
      { id: 103516, name: 'Star Trek: Strange New Worlds', faName: 'دنیاهای عجیب نو', type: 'spin-off', description: 'کاپیتان کریستوفر پایک و ماجراهای اپیزودیک' },
      { id: 85948, name: 'Star Trek: Lower Decks', faName: 'رده‌های پایین', type: 'spin-off', description: 'انیمیشن کمدی کارکنان رده‌پایین ناو سریتوس' },
    ],
  },
  // 45. 24
  {
    franchiseName: '24',
    members: [
      { id: 1973, name: '24', faName: '۲۴', type: 'parent', description: 'جک باور در ۲۴ ساعت نفس‌گیر ضدتروریسم' },
      { id: 59269, name: '24: Live Another Day', faName: 'یک روز دیگر زنده بمان', type: 'sequel', description: 'ماموریت جک باور در لندن' },
      { id: 65945, name: '24: Legacy', faName: 'میراث', type: 'spin-off', description: 'مامور سابق تکاور اریک کارتر' },
    ],
  },
  // 46. Battlestar Galactica
  {
    franchiseName: 'Battlestar Galactica',
    members: [
      { id: 7130, name: 'Battlestar Galactica', faName: 'ناوشکن گالاکتیکا', type: 'parent', description: 'نبرد انسان‌ها برای بقا در برابر سایلان‌ها' },
      { id: 8671, name: 'Caprica', faName: 'کاپریکا', type: 'prequel', description: 'پیش‌درآمد خلق نخستین روبات‌های سایلان' },
      { id: 45882, name: 'Battlestar Galactica: Blood & Chrome', faName: 'خون و کروم', type: 'prequel', description: 'نخستین جنگ سایلان‌ها و جوانی آدامای' },
    ],
  },
  // 47. Avatar Universe
  {
    franchiseName: 'Avatar',
    members: [
      { id: 246, name: 'Avatar: The Last Airbender', faName: 'آواتار: آخرین بادافزار', type: 'parent', description: 'آنگ و آموختن عناصر چهارگانه برای نجات جهان' },
      { id: 33880, name: 'The Legend of Korra', faName: 'افسانه کورا', type: 'sequel', description: 'آواتار بعدی، دختر سرکش و شجاع از قبیله آب' },
    ],
  },
  // 48. DC Animated Universe
  {
    franchiseName: 'DC Animated Universe',
    members: [
      { id: 2098, name: 'Batman: The Animated Series', faName: 'بتمن کارتونی', type: 'parent', description: 'شاهکار انیمیشن بروس تیم و کوین کانروی' },
      { id: 4629, name: 'The New Batman Adventures', faName: 'ماجراهای جدید بتمن', type: 'sequel', description: 'ادامه ماجراهای بتمن، نایت‌وینگ و رابین' },
      { id: 606, name: 'Batman Beyond', faName: 'بتمن ماورا (بیاند)', type: 'sequel', description: 'تری مک‌گینیس با هدایت بروس وین سالخورده در آینده' },
      { id: 983, name: 'Superman: The Animated Series', faName: 'سوپرمن کارتونی', type: 'shared-universe', description: 'مرد پولادین در شهر متروپلیس' },
      { id: 1988, name: 'Justice League', faName: 'لیگ عدالت', type: 'shared-universe', description: 'گردهمایی ۷ ابرقهرمان بزرگ دی‌سی' },
      { id: 4628, name: 'Justice League Unlimited', faName: 'لیگ عدالت نامحدود', type: 'sequel', description: 'گسترش لیگ به ده‌ها ابرقهرمان دی‌سی' },
      { id: 3118, name: 'The Zeta Project', faName: 'پروژه زتا', type: 'spin-off', description: 'اسپین‌اف ربات انسان‌نمای فراری از بتمن بیاند' },
    ],
  },
  // 49. Teen Titans
  {
    franchiseName: 'Teen Titans',
    members: [
      { id: 1433, name: 'Teen Titans', faName: 'تایتان‌های نوجوان', type: 'parent', description: 'سریال اکشن کلاسیک رابین، ریون، استارفایر و بیست‌بوی' },
      { id: 46889, name: 'Teen Titans Go!', faName: 'تایتان‌های نوجوان به پیش!', type: 'spin-off', description: 'نسخه کمدی و هجوآمیز محبوب' },
    ],
  },
  // 50. Adventure Time
  {
    franchiseName: 'Adventure Time',
    members: [
      { id: 15260, name: 'Adventure Time', faName: 'وقت ماجراجویی', type: 'parent', description: 'فین انسان و جیک سگ جادویی در سرزمین اوو' },
      { id: 131378, name: 'Adventure Time: Fionna and Cake', faName: 'فیونا و کیک', type: 'spin-off', description: 'اسپین‌اف بزرگسالانه جهان‌های موازی فیونا و کیک' },
      { id: 94481, name: 'Adventure Time: Distant Lands', faName: 'سرزمین‌های دوردست', type: 'spin-off', description: 'چهار اپیزود ویژه از سرنوشت شخصیت‌ها' },
    ],
  },
  // 51. SpongeBob SquarePants
  {
    franchiseName: 'SpongeBob SquarePants',
    members: [
      { id: 387, name: 'SpongeBob SquarePants', faName: 'باب اسفنجی شلوار مکعبی', type: 'parent', description: 'زندگی در بیکینی باتم در اعماق اقیانوس' },
      { id: 127395, name: 'The Patrick Star Show', faName: 'شوی پاتریک استار', type: 'spin-off', description: 'تاک‌شوی خانوادگی پاتریک ستاره دریایی' },
      { id: 90074, name: "Kamp Koral: SpongeBob's Under Years", faName: 'کمپ کورال', type: 'prequel', description: 'اردوی تابستانی ۱۰ سالگی باب‌اسفنجی' },
    ],
  },
  // 52. Family Guy
  {
    franchiseName: 'Family Guy',
    members: [
      { id: 1434, name: 'Family Guy', faName: 'فمیلی گای (مرد خانواده)', type: 'parent', description: 'زندگی کمدی پیتر گریفین و خانواده‌اش' },
      { id: 13944, name: 'The Cleveland Show', faName: 'کلیولند شو', type: 'spin-off', description: 'اسپین‌اف نقل مکان کلیولند براون به ویرجینیا' },
    ],
  },
  // 53. Rick and Morty
  {
    franchiseName: 'Rick and Morty',
    members: [
      { id: 60625, name: 'Rick and Morty', faName: 'ریک و مورتی', type: 'parent', description: 'ماجراجویی‌های دیوانه‌وار بین‌بعدی دانشمند نابغه' },
      { id: 202276, name: 'Rick and Morty: The Anime', faName: 'ریک و مورتی انیمه', type: 'spin-off', description: 'بازآفرینی ماجراها در قالب انیمه ژاپنی' },
    ],
  },
  // 54. Ben 10 Universe
  {
    franchiseName: 'Ben 10',
    members: [
      { id: 4385, name: 'Ben 10', faName: 'بن ۱۰ کلاسیک', type: 'parent', description: 'کشف ساعت امنیتریکس توسط بن تنیسون ۱۰ ساله' },
      { id: 14856, name: 'Ben 10: Alien Force', faName: 'نیروی بیگانگان', type: 'sequel', description: 'نوجوانی بن و رویارویی با هایبریدها' },
      { id: 32726, name: 'Ben 10: Ultimate Alien', faName: 'اوج بیگانگان', type: 'sequel', description: 'آلتی‌متریکس و افشای هویت بن برای جهانیان' },
      { id: 46884, name: 'Ben 10: Omniverse', faName: 'امنیورس', type: 'sequel', description: 'همکاری با روک بلانکو در شهر زیرزمینی' },
    ],
  },
  // 55. Scooby-Doo
  {
    franchiseName: 'Scooby-Doo',
    members: [
      { id: 2350, name: 'Scooby-Doo, Where Are You!', faName: 'اسکوبی دو، کجایی!', type: 'parent', description: 'ماشین اسرارآمیز و حل پرونده‌های ارواح' },
      { id: 31872, name: 'Scooby-Doo! Mystery Incorporated', faName: 'شرکت معمایی', type: 'spin-off', description: 'داستانی سریالی و مرموز در کریستال کوو' },
      { id: 119053, name: 'Velma', faName: 'ولما', type: 'spin-off', description: 'اسپین‌اف بزرگسالانه درباره هویت ولما دینکلی' },
    ],
  },
  // 56. We Bare Bears
  {
    franchiseName: 'We Bare Bears',
    members: [
      { id: 62741, name: 'We Bare Bears', faName: 'خرس‌های کله‌پوک', type: 'parent', description: 'گریزلی، پاندا و خرس یخی در سانفرانسیسکو' },
      { id: 96016, name: 'We Baby Bears', faName: 'خرس‌های نوزاد', type: 'prequel', description: 'پیش‌درآمد جادویی کودکی خرس‌ها با جعبه جادویی' },
    ],
  },
  // 57. Steven Universe
  {
    franchiseName: 'Steven Universe',
    members: [
      { id: 49516, name: 'Steven Universe', faName: 'استیون یونیورس', type: 'parent', description: 'جواهرات کریستالی و استیون نیمه‌انسان' },
      { id: 93784, name: 'Steven Universe Future', faName: 'استیون یونیورس: آینده', type: 'sequel', description: 'فصل پایانی و چالش‌های بعد از برقراری صلح' },
    ],
  },
  // 58. Dragon Ball Universe
  {
    franchiseName: 'Dragon Ball',
    members: [
      { id: 12609, name: 'Dragon Ball', faName: 'دراگون بال', type: 'parent', description: 'کودکی سان گوکو و جستجو برای گوی‌های اژدها' },
      { id: 12971, name: 'Dragon Ball Z', faName: 'دراگون بال زد', type: 'sequel', description: 'حماسه سایان‌ها، فریز، سل و ماجین بو' },
      { id: 62715, name: 'Dragon Ball Super', faName: 'دراگون بال سوپر', type: 'sequel', description: 'رویارویی با خدایان تخریب و تورنمنت قدرت' },
      { id: 236682, name: 'Dragon Ball Daima', faName: 'دراگون بال دایما', type: 'spin-off', description: 'ماجراجویی جدید گوکو در دنیای شیاطین' },
      { id: 12697, name: 'Dragon Ball GT', faName: 'دراگون بال جی‌تی', type: 'spin-off', description: 'سفر در فضا و تبدیل سوپر سایان ۴' },
    ],
  },
  // 59. Naruto Universe
  {
    franchiseName: 'Naruto',
    members: [
      { id: 46260, name: 'Naruto', faName: 'ناروتو', type: 'parent', description: 'داستان پسربچه طردشده روستای برگ پنهان' },
      { id: 31910, name: 'Naruto: Shippuden', faName: 'ناروتو شیپودن', type: 'sequel', description: 'رشد ناروتو، نبرد با آکاتسوکی و جنگ چهارم نینجاها' },
      { id: 70881, name: 'Boruto: Naruto Next Generations', faName: 'بوروتو: نسل بعدی ناروتو', type: 'sequel', description: 'داستان نسل بعدی و پسر ناروتو' },
      { id: 45782, name: 'Rock Lee & His Ninja Pals', faName: 'راک لی و دوستان نینجا', type: 'spin-off', description: 'اسپین‌اف کمدی چیبی راک لی' },
    ],
  },
  // 60. Attack on Titan
  {
    franchiseName: 'Attack on Titan',
    members: [
      { id: 1429, name: 'Attack on Titan', faName: 'حمله به تایتان', type: 'parent', description: 'نبرد بشریت درون دیوارها با غول‌ها' },
      { id: 63925, name: 'Attack on Titan: Junior High', faName: 'حمله به تایتان: مدرسه راهنمایی', type: 'spin-off', description: 'اسپین‌اف طنز مدرسه تایتان‌ها' },
    ],
  },
  // 61. JoJo's Bizarre Adventure
  {
    franchiseName: 'JoJo\'s Bizarre Adventure',
    members: [
      { id: 46037, name: "JoJo's Bizarre Adventure", faName: 'ماجراجویی عجیب جوجو', type: 'parent', description: 'حماسه بین‌نسلی خاندان جوستار' },
      { id: 100757, name: 'Thus Spoke Kishibe Rohan', faName: 'چنین گفت روهان کیشیبه', type: 'spin-off', description: 'اسپین‌اف ماجراهای مانگاکای عجیب روهان' },
    ],
  },
  // 62. Sword Art Online
  {
    franchiseName: 'Sword Art Online',
    members: [
      { id: 45782, name: 'Sword Art Online', faName: 'هنر شمشیرزنی آنلاین', type: 'parent', description: 'به دام افتادن در دنیای مرگبار بازی واقعیت مجازی' },
      { id: 76121, name: 'Sword Art Online Alternative: Gun Gale Online', faName: 'گان گیل آنلاین', type: 'spin-off', description: 'اسپین‌اف مسابقات تفنگ و اسکواد جم' },
    ],
  },
  // 63. Toaru / Index / Railgun
  {
    franchiseName: 'A Certain Magical Index',
    members: [
      { id: 43407, name: 'A Certain Magical Index', faName: 'شاخص جادویی خاص', type: 'parent', description: 'برخورد علم و جادو در شهر آکادمی' },
      { id: 30981, name: 'A Certain Scientific Railgun', faName: 'ریلگان علمی خاص', type: 'spin-off', description: 'اسپین‌اف محبوب میساکا میکوتو' },
      { id: 82703, name: 'A Certain Scientific Accelerator', faName: 'اکسلریتور علمی خاص', type: 'spin-off', description: 'اسپین‌اف قوی‌ترین اسپر رتبه ۱ شهر آکادمی' },
    ],
  },
  // 64. Fate Series
  {
    franchiseName: 'Fate',
    members: [
      { id: 35884, name: 'Fate/stay night', faName: 'فیت/استی نایت', type: 'parent', description: 'نبرد برای دستیابی به جام مقدس' },
      { id: 43803, name: 'Fate/Zero', faName: 'فیت/زیرو', type: 'prequel', description: 'پیش‌درآمد حماسی چهارمین جنگ جام مقدس' },
      { id: 71850, name: 'Fate/Apocrypha', faName: 'فیت/آپوکریفا', type: 'spin-off', description: 'نبرد بزرگ دو جناح سیاه و سرخ' },
    ],
  },
  // 65. Detective Conan
  {
    franchiseName: 'Detective Conan',
    members: [
      { id: 235, name: 'Detective Conan', faName: 'کارآگاه کونان', type: 'parent', description: 'شینیچی کودو در کالبد پسر ۷ ساله' },
      { id: 61494, name: 'Magic Kaito 1412', faName: 'کایتو کید ۱۴۱۲', type: 'spin-off', description: 'دزد فانتوم مشهور کایتو کید' },
      { id: 137007, name: "Detective Conan: Zero's Tea Time", faName: 'وقت چای زیرو', type: 'spin-off', description: 'زندگی سه‌گانه تورو آمورو' },
      { id: 137008, name: 'Detective Conan: The Culprit Hanzawa', faName: 'مقصر هانزاوا', type: 'spin-off', description: 'اسپین‌اف کمدی سیلوئت سیاه مجرمان' },
    ],
  },
  // 66. Inuyasha
  {
    franchiseName: 'Inuyasha',
    members: [
      { id: 3854, name: 'Inuyasha', faName: 'اینویاشا', type: 'parent', description: 'سفر به دوره سنگوکو ژاپن برای یافتن جواهر شیکون' },
      { id: 103444, name: 'Yashahime: Princess Half-Demon', faName: 'یاشاهیمه', type: 'sequel', description: 'دنباله و ماجرای دختران اینویاشا و سشومارو' },
    ],
  },
  // 67. The Seven Deadly Sins
  {
    franchiseName: 'The Seven Deadly Sins',
    members: [
      { id: 61733, name: 'The Seven Deadly Sins', faName: 'هفت گناه کبیره', type: 'parent', description: 'ملیوداس و شوالیه‌های افسانه‌ای بریتانیا' },
      { id: 202096, name: 'The Seven Deadly Sins: Four Knights of the Apocalypse', faName: 'چهار شوالیه آخرالزمان', type: 'sequel', description: 'دنباله و نسل جدید شوالیه‌ها' },
    ],
  },
  // 68. Cells at Work!
  {
    franchiseName: 'Cells at Work!',
    members: [
      { id: 80502, name: 'Cells at Work!', faName: 'سلول‌ها در کار', type: 'parent', description: 'کارکرد گلبول‌های بدن انسان در قالب انیمه' },
      { id: 101905, name: 'Cells at Work! CODE BLACK', faName: 'سلول‌ها در کار: کد سیاه', type: 'spin-off', description: 'اسپین‌اف در بدنی ناسالم و در معرض خطر' },
    ],
  },
  // 69. Orphan Black
  {
    franchiseName: 'Orphan Black',
    members: [
      { id: 48784, name: 'Orphan Black', faName: 'یتیم سیاه', type: 'parent', description: 'کشف حقیقت شبیه‌سازی ژنتیکی سارا منینگ' },
      { id: 196584, name: 'Orphan Black: Echoes', faName: 'یتیم سیاه: پژواک‌ها', type: 'spin-off', description: 'اسپین‌اف علمی‌تخیلی آینده شبیه‌سازی با کریستن ریتر' },
    ],
  },
  // 70. MonsterVerse (Godzilla & Kong)
  {
    franchiseName: 'MonsterVerse',
    members: [
      { id: 157202, name: 'Monarch: Legacy of Monsters', faName: 'مونارک: میراث هیولاها', type: 'parent', description: 'سازمان مونارک و ردپای گودزیلا در طول دهه‌ها' },
      { id: 117581, name: 'Skull Island', faName: 'جزیره جمجمه', type: 'spin-off', description: 'انیمیشن ماجراجویی در قلمرو کونگ' },
    ],
  },
  // 71. The Office & Parks and Rec (Spiritual / Universe)
  {
    franchiseName: 'The Office Universe',
    members: [
      { id: 2316, name: 'The Office', faName: 'اداره (نسخه آمریکا)', type: 'parent', description: 'شاهکار مستندنما در شرکت کاغذ داندر میفلین' },
      { id: 8592, name: 'Parks and Recreation', faName: 'پارک‌ها و تفریحات', type: 'shared-universe', description: 'سیتکام شوخ‌طبعانه اداری لزلی نوپ در پاونی' },
    ],
  },
  // 72. That '70s Show
  {
    franchiseName: "That '70s Show",
    members: [
      { id: 1667, name: "That '70s Show", faName: 'دهه هفتادیا', type: 'parent', description: 'سیتکام نوجوانان دهه هفتاد در ویسکانسین' },
      { id: 136283, name: "That '90s Show", faName: 'دهه نودیا', type: 'sequel', description: 'تابستان لیا فورمن در خانه پدربزرگ و مادربزرگ' },
    ],
  },
  // 73. Full House
  {
    franchiseName: 'Full House',
    members: [
      { id: 2473, name: 'Full House', faName: 'فول هاوس', type: 'parent', description: 'بزرگ کردن سه دختر توسط پدر و دوستان در سانفرانسیسکو' },
      { id: 65701, name: 'Fuller House', faName: 'فولر هاوس', type: 'sequel', description: 'دنباله با دی‌جی، استفانی و کیمی در همان خانه' },
    ],
  },
  // 74. Boy Meets World
  {
    franchiseName: 'Boy Meets World',
    members: [
      { id: 2382, name: 'Boy Meets World', faName: 'پسر با دنیا روبه‌رو می‌شود', type: 'parent', description: 'رشد و بلوغ کوری متیوز از کودکی تا جوانی' },
      { id: 60863, name: 'Girl Meets World', faName: 'دختر با دنیا روبه‌رو می‌شود', type: 'sequel', description: 'دنباله زندگی دختر کوری و توپانگا در نیویورک' },
    ],
  },
  // 75. Animaniacs
  {
    franchiseName: 'Animaniacs',
    members: [
      { id: 2404, name: 'Animaniacs', faName: 'انیمینیاکس کلاسیک', type: 'parent', description: 'برادران و خواهر وارنر در برج آب استودیو' },
      { id: 2409, name: 'Pinky and the Brain', faName: 'پینکی و برین', type: 'spin-off', description: 'دو موش آزمایشگاهی با نقشه تسخیر دنیا' },
      { id: 104699, name: 'Animaniacs (2020)', faName: 'انیمینیاکس (۲۰۲۰)', type: 'sequel', description: 'احیا و بازگشت شخصیت‌های محبوب وارنر' },
    ],
  },
  // 76. Suburra
  {
    franchiseName: 'Suburra',
    members: [
      { id: 73671, name: 'Suburra: Blood on Rome', faName: 'سوبورا', type: 'parent', description: 'فساد، کلیسا و مافیای رم' },
      { id: 236402, name: 'Suburræterna', faName: 'سوبورائترنا', type: 'sequel', description: 'دنباله و نبرد بر سر امپراتوری جنایت رم' },
    ],
  },
  // 77. Squid Game
  {
    franchiseName: 'Squid Game',
    members: [
      { id: 93405, name: 'Squid Game', faName: 'بازی مرکب', type: 'parent', description: 'بازی‌های مرگبار مرگ و زندگی برای ۴۵.۶ میلیارد وون' },
      { id: 204095, name: 'Squid Game: The Challenge', faName: 'بازی مرکب: چالش', type: 'spin-off', description: 'رئالیتی‌شوی مسابقه با ۴۵۶ شرکت‌کننده واقعی' },
    ],
  },
];

// Map each show ID to its franchise
const SHOW_TO_FRANCHISE_MAP = new Map<number, FranchiseCluster>();
for (const cluster of FRANCHISE_CLUSTERS) {
  for (const member of cluster.members) {
    SHOW_TO_FRANCHISE_MAP.set(member.id, cluster);
  }
}

/**
 * Returns relation label in Persian relative to the target show
 */
function getRelativeRelationLabel(
  currentMember: FranchiseMember | undefined,
  otherMember: FranchiseMember
): { relation: SpinOffItem['relation']; relationLabel: string } {
  // If the other is explicitly the parent/original
  if (otherMember.type === 'parent') {
    return { relation: 'parent', relationLabel: 'سریال مادر (اصلی)' };
  }

  // If the current show is the parent
  if (currentMember?.type === 'parent') {
    if (otherMember.type === 'prequel') return { relation: 'prequel', relationLabel: 'پیش‌درآمد' };
    if (otherMember.type === 'sequel') return { relation: 'sequel', relationLabel: 'دنباله و اسپین‌اف' };
    if (otherMember.type === 'shared-universe') return { relation: 'shared-universe', relationLabel: 'دنیای مشترک' };
    return { relation: 'spin-off', relationLabel: 'اسپین‌اف' };
  }

  // If both are spin-offs of the same universe
  if (otherMember.type === 'prequel') return { relation: 'prequel', relationLabel: 'پیش‌درآمد' };
  if (otherMember.type === 'sequel') return { relation: 'sequel', relationLabel: 'دنباله' };
  if (otherMember.type === 'shared-universe') return { relation: 'shared-universe', relationLabel: 'دنیای مشترک' };
  return { relation: 'spin-off', relationLabel: 'اسپین‌اف هم‌دوره' };
}

/**
 * Synchronous lookup of curated spin-offs for a given show ID.
 */
export function getKnownSpinOffs(showId: number | string): SpinOffItem[] {
  const numId = Number(showId);
  if (!numId) return [];

  const cluster = SHOW_TO_FRANCHISE_MAP.get(numId);
  if (!cluster) return [];

  const currentMember = cluster.members.find((m) => m.id === numId);

  return cluster.members
    .filter((m) => m.id !== numId)
    .map((member) => {
      const { relation, relationLabel } = getRelativeRelationLabel(currentMember, member);
      return {
        id: member.id,
        name: member.name,
        faName: member.faName,
        relation,
        relationLabel,
        description: member.description,
        poster_path: member.poster_path || null,
      };
    });
}

/**
 * Checks if a similar show's title dynamically suggests a spin-off or subtitle of the current show.
 * e.g., "The Walking Dead" -> "The Walking Dead: Dead City"
 */
function isDynamicSpinOffMatch(parentTitle: string, candidateTitle: string): boolean {
  if (!parentTitle || !candidateTitle) return false;
  const p = parentTitle.trim().toLowerCase();
  const c = candidateTitle.trim().toLowerCase();

  if (p === c) return false;

  // Prefix colon pattern: "Parent: Subtitle"
  if (c.startsWith(`${p}:`) || c.startsWith(`${p} :`)) return true;

  // Hyphen pattern: "Parent - Subtitle"
  if (c.startsWith(`${p} -`) || c.startsWith(`${p}-`)) return true;

  return false;
}

/**
 * High-level function called by the TV show page.
 * Returns the list of spin-offs enriched with live TMDB poster, rating, and release date.
 * If no spin-offs exist, returns an empty array [].
 */
export async function getShowSpinOffs(
  showId: number | string,
  showName?: string,
  similarShows?: any[],
  detailsFetcher?: ShowDetailsLiteFetcher
): Promise<SpinOffItem[]> {
  const numId = Number(showId);
  if (!numId) return [];

  // 1. Check curated database
  const known = getKnownSpinOffs(numId);

  if (known.length > 0) {
    if (detailsFetcher) {
      // Enrich known spin-offs with live TMDB data (poster_path, vote_average, first_air_date)
      try {
        const enriched = await Promise.all(
          known.map(async (item) => {
            try {
              const details = await detailsFetcher(String(item.id));
              if (details) {
                return {
                  ...item,
                  poster_path: details.poster_path || item.poster_path,
                  vote_average: details.vote_average,
                  first_air_date: details.first_air_date,
                  original_name: details.original_name,
                };
              }
            } catch {
              // Keep fallback
            }
            return item;
          })
        );
        return enriched;
      } catch {
        return known;
      }
    }
    return known;
  }

  // 2. Dynamic heuristic fallback: check similar/recommended shows for clear franchise title patterns
  if (showName && Array.isArray(similarShows) && similarShows.length > 0) {
    const matched: SpinOffItem[] = [];
    for (const sim of similarShows) {
      if (sim && sim.id !== numId && isDynamicSpinOffMatch(showName, sim.name)) {
        matched.push({
          id: sim.id,
          name: sim.name,
          relation: 'spin-off',
          relationLabel: 'اسپین‌اف',
          poster_path: sim.poster_path,
          vote_average: sim.vote_average,
          first_air_date: sim.first_air_date,
        });
      }
    }
    if (matched.length > 0) {
      return matched;
    }
  }

  // 3. No spin-offs exist for this show
  return [];
}
