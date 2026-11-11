// Secrets aren't in wrangler.jsonc, so `wrangler types` can't see them.
interface Env {
  EMAIL: string;
  PASSWORD: string;
  CALENDAR_TOKEN?: string;
}
