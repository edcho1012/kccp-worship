import { NextRequest, NextResponse } from "next/server";
import { currentMinistryYearLabel, getCurrentMinistryYear, setMinistryYearFixedSongs } from "@/lib/ministryYear";

export async function GET() {
  const year = await getCurrentMinistryYear();
  return NextResponse.json(year);
}

export async function POST(req: NextRequest) {
  const { entranceTitle, confessionTitle, label } = await req.json();

  if (!entranceTitle || !confessionTitle) {
    return NextResponse.json({ error: "입례곡과 공동체 고백송 제목이 둘 다 필요해요" }, { status: 400 });
  }

  const year = await setMinistryYearFixedSongs(
    label || currentMinistryYearLabel(),
    entranceTitle,
    confessionTitle
  );
  return NextResponse.json(year);
}
