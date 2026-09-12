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

    // دستورالعمل تخصصی و سینمایی با الزام به ساختار json
    const systemPrompt = `
        You are the cinema expert assistant for the web app "Binger".
        You MUST respond strictly in valid json format.

        مخاطب تو یک کاربر فیلم‌باز ایرانی است.
        زبان پاسخ تو در فیلد reply باید فارسی عامیانه، بسیار صمیمی، جذاب و با لحن یک دوست سینماشناس باشد.

        اطلاعات کاربر:
        ${watchedShowNames && watchedShowNames.length > 0 ? `سریال‌هایی که این کاربر قبلاً دیده: ${watchedShowNames.join('، ')}` : 'کاربر هنوز سریالی ثبت نکرده است.'}

        دستورالعمل‌ها:
        ۱. پیام کاربر را بررسی کن و متناسب با حس، ژانر یا شباهتی که خواسته ۳ تا ۵ سریال فوق‌العاده پیشنهاد بده.
        ۲. بسیار مهم: هرگز سریال‌هایی که کاربر قبلاً دیده را پیشنهاد نده! اگر به آن‌ها شباهت داشت، در متن reply بگو (مثلاً: چون دیدم قبلاً فلان سریال رو دیدی، سراغ این گزینه‌ها رفتم...).
        ۳. در بخش recommended_titles حتماً فقط نام انگلیسی اصلی و رسمی سریال‌ها در TMDB را بنویس (مثلاً: ["The Punisher", "Banshee"]).

        Respond in valid json with this exact structure:
        {
        "reply": "متن صمیمی و فارسی برای کاربر در ۲ تا ۳ خط همراه با دلیل کوتاه پیشنهاد",
        "recommended_titles": ["Title 1", "Title 2", "Title 3"]
        }
    `;

    // ارسال به مدل اختصاصی و فعال اکانت شما
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'openai/gpt-oss-120b',
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
    const rawContent = data.choices[0]?.message?.content || '{}';

    // استخراج تمیز ساختار جیسون حتی اگر کاراکتر اضافه‌ای داشته باشد
    let parsed: any = {};
    try {
      parsed = JSON.parse(rawContent);
    } catch {
      const match = rawContent.match(/\{[\s\S]*\}/);
      if (match) {
        try { parsed = JSON.parse(match[0]); } catch {}
      }
    }

    return NextResponse.json({
      reply: parsed.reply || 'این چند تا گزینه دقیقاً متناسب با سلیقه و مودِ الانتن:',
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