import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { message, watchedShowNames } = await req.json();

    if (!message) {
      return NextResponse.json({ error: 'پیامی ارسال نشده است' }, { status: 400 });
    }

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'کلید Groq تنظیم نشده است' }, { status: 500 });
    }

    // دستورالعمل و لحن کارشناس سینمایی برای هوش مصنوعی
    const systemPrompt = `
تو دستیار هوشمند، رفیق و کارشناس فیلم و سریال اپلیکیشن «بینجر» (Binger) هستی.
زبان تو: فارسی عامیانه، بسیار صمیمی، حرفه‌ای و جذاب برای مخاطبان فیلم‌باز ایرانی.

اطلاعات کاربر:
${watchedShowNames && watchedShowNames.length > 0 ? `سریال‌هایی که این کاربر قبلاً دیده و ثبت کرده: ${watchedShowNames.join('، ')}` : 'کاربر هنوز سریالی به عنوان دیده شده ثبت نکرده است.'}

دستورالعمل‌ها:
۱. پیام کاربر را دقیق تحلیل کن. اگر نام سریالی را آورد یا حسی را گفت، متناسب با آن ۳ تا ۵ سریال عالی به او پیشنهاد بده.
۲. بسیار مهم: هرگز سریال‌هایی که کاربر قبلاً دیده را پیشنهاد نده! اگر کاربر سریالی شبیه یکی از کارهایی که قبلاً دیده خواست، حتماً با اشاره بگو (مثلاً: «دیدم قبلاً فلان سریال رو دیدی، برای همین این گزینه‌ها رو پیشنهاد می‌دم...»).
۳. پاسخ تو باید دقیقاً یک فرمت JSON با ساختار زیر باشد تا برنامه بتواند پوسترها را پیدا کند. هیچ متن اضافه‌ای خارج از این JSON ننویس:

{
  "reply": "متن صمیمی و فارسی برای کاربر در ۲ تا ۴ خط همراه با توضیح مختصر اینکه چرا این سریال‌ها رو پیشنهاد دادی",
  "recommended_titles": ["Original English Title 1", "Original English Title 2", "Original English Title 3"]
}
نکته: در بخش recommended_titles حتماً نام انگلیسی و رسمی سریال‌ها در TMDB را بنویس (مثلا: "The Punisher" یا "Breaking Bad") تا پوسترها پیدا شوند.
`;

    // ارسال مستقیم به سریع‌ترین مدل هوش مصنوعی Groq
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message }
        ],
        response_format: { type: "json_object" },
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('Groq API Error:', err);
      return NextResponse.json({ error: 'خطا در ارتباط با سرور هوش مصنوعی' }, { status: 500 });
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;
    const parsed = JSON.parse(content || '{}');

    return NextResponse.json({
      reply: parsed.reply || 'این گزینه‌ها متناسب با حس و حالتن:',
      recommended_titles: parsed.recommended_titles || []
    });

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'خطای غیرمنتظره در پردازش هوش مصنوعی' }, { status: 500 });
  }
}