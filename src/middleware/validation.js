import { HttpError } from '../utils/HttpError.js';

export const STATUSES = ['Dipinjam', 'Dikembalikan', 'Terlambat'];
const required = ['member_code', 'member_name', 'book_code', 'book_title', 'loan_date', 'due_date'];
const fields = [...required, 'return_date', 'status', 'notes'];
const limits = { member_code: 50, member_name: 150, book_code: 50, book_title: 250, notes: 1000 };

export function validateId(req, res, next) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(req.params.id)) {
    throw new HttpError(400, 'ID peminjaman harus berupa UUID.');
  }
  next();
}

function validDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || value.startsWith('0000')) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function validateLoan({ partial = false } = {}) {
  return (req, res, next) => {
    const body = req.body;
    if (!body || typeof body !== 'object' || Array.isArray(body) || !Object.keys(body).length) {
      throw new HttpError(400, 'Body harus berupa objek JSON yang tidak kosong.');
    }
    const unknown = Object.keys(body).filter(field => !fields.includes(field));
    if (unknown.length) throw new HttpError(400, `Field tidak dikenal: ${unknown.join(', ')}.`);
    if (!partial) {
      for (const field of required) {
        if (!(field in body)) throw new HttpError(400, `${field} wajib diisi.`);
      }
    }
    const payload = { ...body };
    for (const [field, max] of Object.entries(limits)) {
      if (!(field in payload)) continue;
      if (field === 'notes' && payload[field] === null) continue;
      if (typeof payload[field] !== 'string' || !payload[field].trim() || payload[field].trim().length > max) {
        throw new HttpError(400, `${field} harus berupa teks 1–${max} karakter.`);
      }
      payload[field] = payload[field].trim();
    }
    for (const field of ['loan_date', 'due_date', 'return_date']) {
      if (!(field in payload) || (field === 'return_date' && payload[field] === null)) continue;
      if (!validDate(payload[field])) throw new HttpError(400, `${field} harus tanggal valid dengan format YYYY-MM-DD.`);
    }
    if ('status' in payload && !STATUSES.includes(payload.status)) {
      throw new HttpError(400, `status harus salah satu dari: ${STATUSES.join(', ')}.`);
    }
    if (!partial) {
      payload.status ??= 'Dipinjam';
      payload.return_date ??= null;
      payload.notes ??= null;
    }
    if (payload.loan_date && payload.due_date && payload.due_date < payload.loan_date) {
      throw new HttpError(400, 'due_date tidak boleh sebelum loan_date.');
    }
    if (payload.loan_date && payload.return_date && payload.return_date < payload.loan_date) {
      throw new HttpError(400, 'return_date tidak boleh sebelum loan_date.');
    }
    if (!partial && (payload.status === 'Dikembalikan') !== (payload.return_date !== null)) {
      throw new HttpError(400, 'Status Dikembalikan wajib memiliki return_date; status lainnya harus return_date null.');
    }
    req.loan = payload;
    next();
  };
}

export function validateQuery(req, res, next) {
  const allowed = ['status', 'member_code', 'book_code', 'page', 'limit'];
  for (const [key, value] of Object.entries(req.query)) {
    if (!allowed.includes(key)) throw new HttpError(400, `Query tidak dikenal: ${key}.`);
    if (typeof value !== 'string' || !value.trim()) throw new HttpError(400, `Query ${key} harus memiliki satu nilai.`);
  }
  if (req.query.status && !STATUSES.includes(req.query.status)) {
    throw new HttpError(400, `status harus salah satu dari: ${STATUSES.join(', ')}.`);
  }
  const page = req.query.page ?? '1';
  const limit = req.query.limit ?? '20';
  if (!/^[1-9]\d*$/.test(page) || !/^[1-9]\d*$/.test(limit) || Number(limit) > 100 ||
      !Number.isSafeInteger(Number(page)) || !Number.isSafeInteger(Number(page) * Number(limit))) {
    throw new HttpError(400, 'page harus bilangan bulat positif; limit harus 1–100.');
  }
  for (const key of ['member_code', 'book_code']) {
    if (req.query[key] && req.query[key].trim().length > 50) throw new HttpError(400, `${key} maksimal 50 karakter.`);
  }
  req.filters = {
    ...req.query,
    ...(req.query.member_code && { member_code: req.query.member_code.trim() }),
    ...(req.query.book_code && { book_code: req.query.book_code.trim() }),
    page: Number(page), limit: Number(limit)
  };
  next();
}
