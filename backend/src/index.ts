import app from './app';
import { env } from './config/env';
import { connectDb } from './lib/db';

async function main(): Promise<void> {
  await connectDb(env.databaseUrl);
  console.log(`[hrms] Database connected (${env.nodeEnv})`);

  app.listen(env.port, () => {
    console.log(`[hrms] API running on http://localhost:${env.port}`);
  });
}

main().catch((err) => {
  console.error('[hrms] Failed to start:', err);
  process.exit(1);
});