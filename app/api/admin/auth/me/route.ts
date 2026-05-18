import { getAdminSession } from "@/lib/server/auth";
import { json } from "@/lib/server/http";

export async function GET() {
  const admin = await getAdminSession();

  if (!admin) {
    return json({ admin: null }, { status: 401 });
  }

  return json({ admin });
}
