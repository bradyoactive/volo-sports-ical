# volo-sports-ical
A Cloudflare Worker that builds an .ics calendar of your Volo sports games every hour and serves it at https://volo.brady.town/calendar.ics.

## Setup
```bash
npm install
npx wrangler secret put EMAIL       # Volo login
npx wrangler secret put PASSWORD
npx wrangler secret put CALENDAR_TOKEN   # optional: feed then needs ?token=<value>
npm run deploy
```

## Local dev
Copy `.dev.vars.example` to `.dev.vars` and fill it in, then run `npm run dev` and call `http://localhost:8787/__scheduled` to build the calendar.
