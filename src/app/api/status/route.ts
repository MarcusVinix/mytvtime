import { NextResponse } from "next/server";
import { isSupabaseConfigured, isTmdbConfigured } from "@/lib/env";

export async function GET() {
  return NextResponse.json({
    supabaseConfigured: isSupabaseConfigured(),
    tmdbConfigured: isTmdbConfigured(),
  });
}
