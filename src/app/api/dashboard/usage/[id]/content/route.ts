import { getUsageContent, USAGE_CONTENT_RETENTION_MS } from "#/lib/database/usage.repository";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await params;
  const content = await getUsageContent(id);
  const headers = { "Cache-Control": "no-store" };

  if (!content || content.createdAt.getTime() < Date.now() - USAGE_CONTENT_RETENTION_MS)
    return Response.json({ error: "Usage content not found" }, { status: 404, headers });

  return Response.json(
    {
      usageId: content.usageId,
      requestBody: content.requestBody,
      responseBody: content.responseBody,
      createdAt: content.createdAt,
    },
    { headers },
  );
}
