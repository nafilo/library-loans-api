import app from './app.js';
import { getSupabase } from './config/supabaseClient.js';

// Fail fast lokal jika .env belum diisi.
getSupabase();
const port = Number(process.env.PORT ?? 3000);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT harus 1–65535.');
app.listen(port, () => console.log(`Library Loans API berjalan di http://localhost:${port}`));
