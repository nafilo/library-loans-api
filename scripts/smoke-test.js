import assert from 'node:assert/strict';

// Membuat satu record fiktif baru, mengujinya, lalu menghapusnya di finally.
const baseUrl = (process.env.BASE_URL ?? 'http://localhost:3000').replace(/\/$/, '');
let loanId;

async function call(path, { method = 'GET', body, expected = 200 } = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(15000)
  });
  const json = await response.json();
  assert.equal(response.status, expected, `${method} ${path}: ${JSON.stringify(json)}`);
  return json;
}

try {
  await call('/health');
  const memberCode = `TEST-${Date.now()}`;
  const created = await call('/loans', { method: 'POST', expected: 201, body: {
    member_code: memberCode, member_name: 'Anggota Uji Otomatis',
    book_code: 'TEST-BOOK', book_title: 'Buku Uji Otomatis',
    loan_date: '2026-10-01', due_date: '2026-10-08'
  } });
  loanId = created.data.id;
  assert.equal(created.data.status, 'Dipinjam');
  assert.equal((await call(`/loans/${loanId}`)).data.id, loanId);
  await call(`/loans/${loanId}`, { method: 'PUT', body: {
    member_code: memberCode, member_name: 'Anggota Uji Otomatis',
    book_code: 'TEST-BOOK', book_title: 'Buku Uji Otomatis',
    loan_date: '2026-10-01', due_date: '2026-10-10', status: 'Terlambat'
  } });
  const filtered = await call(`/loans?status=Terlambat&member_code=${memberCode}&limit=1`);
  assert.equal(filtered.data[0].id, loanId);
  const returned = await call(`/loans/${loanId}`, { method: 'PATCH', body: {
    status: 'Dikembalikan', return_date: '2026-10-06'
  } });
  assert.equal(returned.data.status, 'Dikembalikan');
  assert.ok(Date.parse(returned.data.updated_at) >= Date.parse(created.data.created_at));
  await call(`/loans/${loanId}`, { method: 'PATCH', expected: 400, body: { due_date: '2020-01-01' } });
  await call('/loans?status=Invalid', { expected: 400 });
  await call('/loans/bukan-uuid', { expected: 400 });
  await call(`/loans/${loanId}`, { method: 'DELETE' });
  await call(`/loans/${loanId}`, { expected: 404 });
  loanId = undefined;
  console.log(`LULUS: CRUD, filter, timestamp, validasi dan 404 pada ${baseUrl}`);
} catch (error) {
  console.error(`GAGAL: ${error.message}`);
  process.exitCode = 1;
} finally {
  if (loanId) {
    try {
      await call(`/loans/${loanId}`, { method: 'DELETE' });
    } catch {
      console.error(`Pembersihan gagal. Hapus record uji ${loanId} melalui API atau Supabase Table Editor.`);
      process.exitCode = 1;
    }
  }
}
