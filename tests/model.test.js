import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';
import { createLoanModel } from '../src/models/loanModel.js';

function setup(responder) {
  const calls = [];
  const client = createClient('https://example.supabase.co', 'test-server-key', {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: async (url, options) => {
      calls.push({ url: new URL(url), ...options });
      return responder(calls.at(-1));
    } }
  });
  return { calls, model: createLoanModel(() => client) };
}

test('SDK Supabase mengirim filter, urutan stabil, count dan pagination', async () => {
  const { model, calls } = setup(() => new Response('[]', {
    status: 200, headers: { 'Content-Type': 'application/json', 'Content-Range': '0-0/7' }
  }));
  const result = await model.getAll({ status: 'Terlambat', member_code: 'AGT-001', book_code: 'BK-001', page: 2, limit: 3 });
  const query = calls[0].url.searchParams;
  assert.equal(calls[0].url.pathname, '/rest/v1/loans');
  assert.equal(query.get('status'), 'eq.Terlambat');
  assert.equal(query.get('member_code'), 'eq.AGT-001');
  assert.equal(query.get('book_code'), 'eq.BK-001');
  assert.equal(query.get('offset'), '3');
  assert.equal(query.get('limit'), '3');
  assert.equal(query.get('order'), 'created_at.desc,id.desc');
  assert.equal(result.total, 7);
});

test('SDK memakai POST, PATCH dan DELETE serta membatasi operasi dengan ID', async () => {
  const id = '11111111-1111-4111-8111-111111111111';
  const { model, calls } = setup(call => new Response(JSON.stringify(
    call.method === 'POST' ? { id } : [{ id }]
  ), { status: 200, headers: { 'Content-Type': 'application/json' } }));
  await model.create({ member_name: 'Contoh' });
  await model.update(id, { notes: null });
  await model.remove(id);
  assert.deepEqual(calls.map(call => call.method), ['POST', 'PATCH', 'DELETE']);
  assert.deepEqual(JSON.parse(calls[1].body), { notes: null });
  for (const call of calls.slice(1)) assert.equal(call.url.searchParams.get('id'), `eq.${id}`);
});

test('nol baris dari Supabase menghasilkan null untuk baca/update/hapus', async () => {
  const { model } = setup(() => new Response('[]', { headers: { 'Content-Type': 'application/json' } }));
  assert.equal(await model.getById('missing'), null);
  assert.equal(await model.update('missing', { notes: null }), null);
  assert.equal(await model.remove('missing'), null);
});

test('constraint database diteruskan ke error handler tanpa diubah menjadi sukses', async () => {
  const { model } = setup(() => new Response(JSON.stringify({ code: '23514', message: 'constraint failed' }), {
    status: 400, headers: { 'Content-Type': 'application/json' }
  }));
  await assert.rejects(model.update('id', { due_date: '2020-01-01' }), error => error.code === '23514');
});
