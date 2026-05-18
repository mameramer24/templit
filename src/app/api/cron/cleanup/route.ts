import { NextResponse } from "next/server";
import { list, del } from "@vercel/blob";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request: Request) {
  // تأمين الرابط بحيث لا يمكن لأحد تشغيله يدوياً إلا إذا كان من Vercel Cron
  // Vercel سيرسل هذا الهيدر تلقائياً إذا كان CRON_SECRET معرف في المتغيرات
  const authHeader = request.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    // تحديد الوقت قبل 48 ساعة
    const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);
    
    let hasMore = true;
    let cursor: string | undefined;
    let deletedCount = 0;

    // جلب جميع الملفات على دفعات
    while (hasMore) {
      const result = await list({ cursor, limit: 1000 });
      hasMore = result.hasMore;
      cursor = result.cursor;

      // تصفية الملفات الأقدم من 48 ساعة والتي تبدأ بـ rendered- (التي نولدها نحن فقط)
      const toDelete = result.blobs
        .filter((blob) => blob.uploadedAt < fortyEightHoursAgo && blob.pathname.startsWith("rendered-"))
        .map((blob) => blob.url);

      // حذف الملفات دفعة واحدة
      if (toDelete.length > 0) {
        await del(toDelete);
        deletedCount += toDelete.length;
      }
    }

    return NextResponse.json({ 
      success: true, 
      deletedCount, 
      message: `تم حذف ${deletedCount} ملفات قديمة بنجاح.` 
    });
  } catch (error) {
    console.error("[CRON Cleanup Error]", error);
    return NextResponse.json({ error: "فشل في عملية التنظيف" }, { status: 500 });
  }
}
