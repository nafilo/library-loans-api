import { after, before, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { createApp } from '../src/app.js';

process.env.NODE_ENV = 'test';
let records;
let app;
let server;
const payload = {
  member_code: 'AGT-001', member_name: 'Nadia Contoh', book_code: 'BK-001',
  book_title: 'Belajar REST API', loan_date: '2026-10-01', due_date: '2026-10-08'
};
// Database tiruan hanya untuk pengujian, tidak dipakai aplikasi lokal/production.
const model = {
  async getAll({ status, member_code, book_code, page, limit }) {
    const filtered = [...records.values()].filter(row =>
      (!status || row.status === status) && (!member_code || row.member_code === member_code) &&
      (!book_code || row.book_code === book_code));
    return { data: filtered.slice((page - 1) * limit, page * limit), total: filtered.length };
  },
  async getById(id) { return records.get(id) ?? null; },
  async create(body) {
    const row = { id: randomUUID(), ...body, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
    records.set(row.id, row);
    return row;
  },
  async update(id, body) {
    if (!records.has(id)) return null;
    const row = { ...records.get(id), ...body };
    records.set(id, row);
    return row;
  },
  async remove(id) {
    const row = records.get(id);
    records.delete(id);
    return row ?? null;
  }
};

before(() => {
  app = createApp({ model });
  server = app.listen(0, '127.0.0.1');
});
after(() => new Promise(resolve => server.close(resolve)));
beforeEach(() => { records = new Map(); });

test('root, health, dan endpoint 404 memberikan JSON', async () => {
  const root = await request(server).get('/').expect(200);
  assert.equal(root.body.message, 'Library Loans API');
  await request(server).get('/health').expect(200);
  await request(server).get('/unknown').expect(404).expect('Content-Type', /json/);
});

test('siklus create, read, PUT, PATCH pengembalian, dan delete', async () => {
  const created = await request(server).post('/loans').send(payload).expect(201);
  const id = created.body.data.id;
  assert.equal(created.headers.location, `/loans/${id}`);
  assert.equal(created.body.data.status, 'Dipinjam');
  assert.equal(created.body.data.return_date, null);
  const read = await request(server).get(`/loans/${id}`).expect(200);
  assert.equal(read.body.data.book_title, payload.book_title);
  const updated = await request(server).put(`/loans/${id}`).send({ ...payload, due_date: '2026-10-10' }).expect(200);
  assert.equal(updated.body.data.due_date, '2026-10-10');
  const returned = await request(server).patch(`/loans/${id}`).send({ status: 'Dikembalikan', return_date: '2026-10-05' }).expect(200);
  assert.equal(returned.body.data.status, 'Dikembalikan');
  await request(server).delete(`/loans/${id}`).expect(200);
  await request(server).get(`/loans/${id}`).expect(404);
  await request(server).delete(`/loans/${id}`).expect(404);
});

test('filter kombinasi status, anggota, buku dan pagination', async () => {
  await request(server).post('/loans').send(payload).expect(201);
  await request(server).post('/loans').send({ ...payload, status: 'Terlambat' }).expect(201);
  await request(server).post('/loans').send({ ...payload, member_code: 'AGT-002', status: 'Terlambat' }).expect(201);
  const filtered = await request(server).get('/loans?status=Terlambat&member_code=AGT-001&book_code=BK-001&limit=1').expect(200);
  assert.equal(filtered.body.data.length, 1);
  assert.equal(filtered.body.data[0].status, 'Terlambat');
  assert.deepEqual(filtered.body.pagination, { page: 1, limit: 1, total: 1, total_pages: 1 });
  const empty = await request(server).get('/loans?page=4&limit=1').expect(200);
  assert.deepEqual(empty.body.data, []);
});

test('menolak UUID invalid dan membedakan ID valid yang tidak ditemukan', async () => {
  await request(server).get('/loans/bukan-uuid').expect(400);
  const id = randomUUID();
  await request(server).get(`/loans/${id}`).expect(404);
  await request(server).put(`/loans/${id}`).send(payload).expect(404);
  await request(server).patch(`/loans/${id}`).send({ notes: 'contoh' }).expect(404);
});

test('menolak body invalid, field asing, teks kosong, dan field wajib hilang', async () => {
  for (const body of [{}, [], { ...payload, id: randomUUID() }, { ...payload, member_name: '  ' }, { book_title: 'Judul saja' }]) {
    await request(server).post('/loans').send(body).expect(400);
  }
  await request(server).post('/loans').set('Content-Type', 'application/json').send('{broken').expect(400);
  await request(server).post('/loans').send({ ...payload, notes: 'x'.repeat(18000) }).expect(413);
  await request(server).patch(`/loans/${randomUUID()}`).send({}).expect(400);
});

test('validasi tanggal kalender dan aturan status pengembalian', async () => {
  for (const change of [
    { loan_date: '2026-02-30' }, { due_date: '2026-09-30' },
    { loan_date: '0000-01-01' }, { return_date: '2026-10-05' },
    { status: 'Dikembalikan' }, { status: 'dikembalikan' },
    { status: 'Dikembalikan', return_date: '2026-09-30' }
  ]) {
    await request(server).post('/loans').send({ ...payload, ...change }).expect(400);
  }
  await request(server).post('/loans').send({ ...payload, status: 'Dikembalikan', return_date: '2026-10-05' }).expect(201);
  await request(server).post('/loans').send({ ...payload, loan_date: '2028-02-29', due_date: '2028-03-01' }).expect(201);
});

test('query invalid tidak diteruskan ke database', async () => {
  for (const query of ['status=Salah', 'status=Dipinjam&status=Terlambat', 'page=0', 'limit=101', 'page=1.5', 'page=999999999999999999', 'status=', 'foo=bar']) {
    await request(server).get(`/loans?${query}`).expect(400);
  }
});

test('PUT membutuhkan seluruh field wajib; PATCH menerima sebagian dan null notes', async () => {
  const { body } = await request(server).post('/loans').send(payload).expect(201);
  await request(server).put(`/loans/${body.data.id}`).send({ notes: 'Tes' }).expect(400);
  const updated = await request(server).patch(`/loans/${body.data.id}`).send({ notes: null, member_name: '  Nadia Baru  ' }).expect(200);
  assert.equal(updated.body.data.member_name, 'Nadia Baru');
  assert.equal(updated.body.data.book_title, payload.book_title);
});

test('error database disanitasi dan constraint tanggal PATCH dipetakan ke 400', async () => {
  const failed = createApp({ model: {
    async getAll() { throw { code: '08006', message: 'SECRET database detail' }; },
    async update() { throw { code: '23514', message: 'check violation' }; }
  } }).listen(0, '127.0.0.1');
  try {
    const response = await request(failed).get('/loans').expect(500);
    assert.equal(JSON.stringify(response.body).includes('SECRET'), false);
    await request(failed).patch(`/loans/${randomUUID()}`).send({ due_date: '2020-01-01' }).expect(400);
    await request(failed).patch(`/loans/${randomUUID()}`).send({ status: 'Dikembalikan' }).expect(400);
  } finally {
    await new Promise(resolve => failed.close(resolve));
  }
});
