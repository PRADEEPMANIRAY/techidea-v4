import { handleApi } from "@/lib/api/handler";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const handler = (request: Request) => handleApi(request, "cities");
export { handler as GET, handler as HEAD, handler as OPTIONS, handler as POST, handler as PUT, handler as PATCH, handler as DELETE };
