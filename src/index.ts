import { makeAndStoreVoloIcal } from "./generate-ical";
import { readIcal } from "./read-ical";

export default {
  fetch: (request, env) => readIcal(request, env),
  scheduled: async (_controller, env) => {
    await makeAndStoreVoloIcal(env);
  },
} satisfies ExportedHandler<Env>;
