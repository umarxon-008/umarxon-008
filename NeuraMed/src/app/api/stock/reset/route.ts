import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { resetStock, loadStock } from "@/lib/modules/stock-db";
import { apiError } from "@/lib/modules/http";

/** POST — demo zaxirani boshlang'ich holatga qaytarish. */
export async function POST() {
  try {
    const user = await requireAuth();
    await resetStock(user.id);
    return NextResponse.json(await loadStock(user.id));
  } catch (e) { return apiError(e); }
}
