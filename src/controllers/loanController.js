import { HttpError } from '../utils/HttpError.js';

function requireLoan(loan) {
  if (!loan) throw new HttpError(404, 'Data peminjaman tidak ditemukan.');
  return loan;
}

export function createLoanController(model) {
  return {
    async getAll(req, res) {
      const { data, total } = await model.getAll(req.filters);
      const { page, limit } = req.filters;
      res.json({ success: true, data, pagination: { page, limit, total, total_pages: Math.ceil(total / limit) } });
    },
    async getById(req, res) {
      res.json({ success: true, data: requireLoan(await model.getById(req.params.id)) });
    },
    async create(req, res) {
      const data = await model.create(req.loan);
      res.status(201).location(`/loans/${data.id}`).json({ success: true, message: 'Peminjaman berhasil dibuat.', data });
    },
    async update(req, res) {
      const data = requireLoan(await model.update(req.params.id, req.loan));
      res.json({ success: true, message: 'Peminjaman berhasil diperbarui.', data });
    },
    async remove(req, res) {
      requireLoan(await model.remove(req.params.id));
      res.json({ success: true, message: 'Peminjaman berhasil dihapus.' });
    }
  };
}
