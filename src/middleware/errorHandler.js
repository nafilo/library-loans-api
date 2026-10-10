export function errorHandler(error, req, res, next) {
  if (res.headersSent) return next(error);
  let status = 500;
  let message = 'Terjadi kesalahan pada server atau koneksi database.';
  if (error.type === 'entity.parse.failed') {
    status = 400;
    message = 'Body JSON tidak valid.';
  } else if (error.type === 'entity.too.large') {
    status = 413;
    message = 'Body request terlalu besar (maksimal 16 KB).';
  } else if (error.code === '23514' || error.code === '22007' || error.code === '22008') {
    status = 400;
    message = 'Data melanggar aturan tanggal, panjang teks, atau status pengembalian. Periksa body request.';
  } else if (error.code === '23505') {
    status = 409;
    message = 'Data duplikat.';
  } else if (error.status >= 400 && error.status < 500 && error instanceof Error) {
    status = error.status;
    message = error.message;
  }
  // Jangan bocorkan detail database, kredensial, atau stack trace ke klien.
  if (status === 500 && process.env.NODE_ENV !== 'test') {
    console.error('API error:', error.code ?? 'INTERNAL_ERROR');
  }
  res.status(status).json({ success: false, message });
}
