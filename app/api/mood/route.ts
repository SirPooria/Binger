import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { message, watchedShowNames } = await req.json();

    if (!message) {
      return NextResponse.json({ error: 'پیامی ارسال نشده است' }, { status: 400 });
    }

    const apiKey = process.env.GROQ_API_KEY?.trim();
    if (!apiKey) {
      return NextResponse.json({ error: 'کلید Groq تنظیم نشده است' }, { status: 500 });
    }

    // دستورالعمل با الزام صریح به ساختار json
    const systemPrompt = `
        You are the intelligent cinema expert assistant for the web app "Binger".
        You MUST respond strictly in valid json format.

        مخاطب تو یک کاربر فیلم‌باز ایرانی است.
        زبان پاسخ تو در فیلد reply باید فارسی عامیانه، بسیار صمیمی، جذاب و با لحن رفیق سینمایی باشد.

        اطلاعات کاربر:
        ${watchedShowNames && watchedShowNames.length > 0 ? `سریال‌هایی که این کاربر قبلاً دیده: ${watchedShowNames.join('، ')}` : 'کاربر هنوز سریالی ثبت نکرده است.'}

        دستورالعمل‌ها:
        ۱. پیام کاربر را تحلیل کن و ۳ تا ۵ سریال عالی متناسب با حس و حالش پیشنهاد بده.
        ۲. هرگز سریال‌هایی که کاربر قبلاً دیده را پیشنهاد نده. اگر به آن‌ها مرتبط بود، اشاره کن که چون فلان سریال را دیده‌ای، این‌ها را پیشنهاد می‌دهم.
        ۳. در بخش recommended_titles حتماً نام انگلیسی اصلی و رسمی سریال‌ها در TMDB را بنویس (مثلاً: ["The Punisher", "Banshee"]).

        Respond in valid json with this exact structure:
        {
        "reply": "متن صمیمی و فارسی برای کاربر در ۲ تا ۳ خط",
        "recommended_titles": ["Title 1", "Title 2", "Title 3"]
        }
`;

    // ارسال به مدل رسمی و فعال رایگان Groq
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message }
        ],
        response_format: { type: "json_object" },
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Groq API Error Details:', errText);
      return NextResponse.json({ 
        error: 'خطا در ارتباط با سرور هوش مصنوعی', 
        status: response.status,
        detail: errText 
      }, { status: 500 });
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;
    const parsed = JSON.parse(content || '{}');

    return NextResponse.json({
      reply: parsed.reply || 'این گزینه‌ها متناسب با حس و حالتن:',
      recommended_titles: parsed.recommended_titles || []
    });

  } catch (error: any) {
    console.error('Server Route Error:', error);
    return NextResponse.json({ 
      error: 'خطای غیرمنتظره در پردازش',
      detail: error?.message || String(error)
    }, { status: 500 });
  }
}