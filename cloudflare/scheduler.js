const scheduler = {
  async scheduled(_event, env, context) {
    context.waitUntil(
      _event.cron === "30 18 * * *" ? maintain(env) : drain(env),
    );
  },
};

export default scheduler;

async function drain(env) {
  if (!env.JOBRADAR_URL || !env.CRON_SECRET)
    throw new Error("Configure JOBRADAR_URL and CRON_SECRET.");
  const collectOne = async () => {
    const response = await fetch(`${env.JOBRADAR_URL}/api/cron`, {
      method: "POST",
      headers: { Authorization: `Bearer ${env.CRON_SECRET}` },
    });
    if (!response.ok)
      throw new Error(`Jobradar scheduler returned ${response.status}.`);
    return response.json();
  };
  // Two calls can safely claim different PostgreSQL leases. Keep this bound low
  // enough for the free database connection limit.
  for (let wave = 0; wave < 13; wave += 1) {
    const results = await Promise.all([collectOne(), collectOne()]);
    if (!results.some((result) => result.processed && result.moreDue)) break;
  }
}

async function maintain(env) {
  const response = await fetch(`${env.JOBRADAR_URL}/api/maintenance`, {
    method: "POST",
    headers: { Authorization: `Bearer ${env.CRON_SECRET}` },
  });
  if (!response.ok)
    throw new Error(`Jobradar maintenance returned ${response.status}.`);
}
