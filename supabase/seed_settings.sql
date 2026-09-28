-- =========================================================================
-- Seed SQL: Dynamic CMS Site Settings for Binger
-- Gracefully inserts default Persian texts for public pages.
-- =========================================================================

INSERT INTO public.site_settings (setting_key, setting_value, description)
VALUES
  (
    'home_hero_title',
    'دستیار هوشمند خوره‌های سریال',
    'تیتر اصلی بخش هیرو در صفحه نخست'
  ),
  (
    'home_hero_subtitle',
    'دیگه هرگز گم نکن کدوم اپیزود بودی! سریال‌هاتو با یک لمس تیک بزن، تقویم اختصاصی پخش داشته باش و با دستیار هوش مصنوعی دقیقاً طبق مودِ لحظه‌ات اثر بعدی رو پیدا کن.',
    'زیرعنوان و توضیحات معرفی بخش هیرو در صفحه نخست'
  ),
  (
    'home_cta_text',
    'شروع رایگان در چند ثانیه',
    'متن دکمه فراخوان به اقدام (CTA) در صفحه نخست'
  ),
  (
    'explore_page_title',
    'کاوش و کشف هوشمند سریال‌ها',
    'عنوان اصلی بالای صفحه اکسپلور'
  ),
  (
    'explore_page_subtitle',
    'جدیدترین، محبوب‌ترین و بهترین سریال‌های ایران و جهان به انتخاب بینجر',
    'زیرعنوان و توضیحات بالای صفحه اکسپلور'
  ),
  (
    'footer_description',
    'بینجر پلتفرم هوشمند مدیریت و کشف سریال است. با بینجر همیشه می‌دونی چی ببینی و تا کجا دیدی.',
    'متن کوتاه معرفی در فوتر سراسری'
  ),
  (
    'footer_copyright',
    '© ۲۰۲۶ تمامی حقوق برای پلتفرم بینجر (Binger) محفوظ است.',
    'متن کپی‌رایت و امضای حقوقی در فوتر'
  )
ON CONFLICT (setting_key) 
DO UPDATE SET 
  setting_value = EXCLUDED.setting_value,
  description = EXCLUDED.description
WHERE site_settings.setting_value IS NULL OR site_settings.setting_value = '';
