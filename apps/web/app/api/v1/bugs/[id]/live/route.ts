import { canUserAccessBug, getCurrentUser } from '@/lib/services/auth';

interface RouteParams {
  params: { id: string };
}

export async function GET(request: Request, { params }: RouteParams) {
  const bugId = parseInt(params.id, 10);
  if (isNaN(bugId)) {
    return new Response(JSON.stringify({ error: 'INVALID_ID' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const user = await getCurrentUser();
  const hasAccess = await canUserAccessBug(bugId, user?.id ?? null);
  if (!hasAccess) {
    return new Response(JSON.stringify({ error: 'NOT_FOUND' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      // Send initial connected payload
      controller.enqueue(
        encoder.encode(
          `event: connected\ndata: ${JSON.stringify({
            connected: true,
            bug_id: bugId,
            timestamp: new Date().toISOString(),
          })}\n\n`
        )
      );

      // Keep-alive heartbeat every 3 seconds
      const interval = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: heartbeat\n\n`));
        } catch {
          clearInterval(interval);
        }
      }, 3000);

      request.signal.addEventListener('abort', () => {
        clearInterval(interval);
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}
