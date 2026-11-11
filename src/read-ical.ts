import { ICAL_KEY } from "./generate-ical";

export async function readIcal(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  if (url.pathname !== "/calendar.ics") {
    return new Response("Not found", { status: 404 });
  }
  // The calendar lists your games and venues, so an optional token keeps the URL private.
  if (env.CALENDAR_TOKEN && url.searchParams.get("token") !== env.CALENDAR_TOKEN) {
    return new Response("Not found", { status: 404 });
  }

  const iCalContents = await env.VOLO_SPORTS_ICAL.get(ICAL_KEY);
  if (iCalContents === null) {
    return new Response("Calendar has not been generated yet", { status: 503 });
  }
  return new Response(iCalContents, {
    headers: { "content-type": "text/calendar; charset=utf-8" },
  });
}
