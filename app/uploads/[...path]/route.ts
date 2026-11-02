import { getCurrentUser } from "@/server/auth/dal";
import { readUpload } from "@/server/uploads";

export async function GET(_request: Request, ctx: RouteContext<"/uploads/[...path]">) {
  const user = await getCurrentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const { path } = await ctx.params;
  const file = await readUpload(path);
  if (!file) return new Response("Not found", { status: 404 });

  return new Response(new Uint8Array(file.data), {
    headers: {
      "Content-Type": file.contentType,
      "Cache-Control": "private, max-age=86400",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
