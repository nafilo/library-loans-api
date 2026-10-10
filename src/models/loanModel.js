import { getSupabase } from '../config/supabaseClient.js';

// Model hanya menangani komunikasi dengan database; HTTP ditangani controller.
export function createLoanModel(getClient = getSupabase) {
  return {
    async getAll({ status, member_code, book_code, page, limit }) {
      let query = getClient().from('loans').select('*', { count: 'exact' })
        .order('created_at', { ascending: false }).order('id', { ascending: false });
      for (const [field, value] of Object.entries({ status, member_code, book_code })) {
        if (value) query = query.eq(field, value);
      }
      const { data, error, count } = await query.range((page - 1) * limit, page * limit - 1);
      if (error) throw error;
      return { data, total: count };
    },
    async getById(id) {
      const { data, error } = await getClient().from('loans').select('*').eq('id', id).maybeSingle();
      if (error) throw error;
      return data;
    },
    async create(payload) {
      const { data, error } = await getClient().from('loans').insert(payload).select('*').single();
      if (error) throw error;
      return data;
    },
    async update(id, payload) {
      const { data, error } = await getClient().from('loans').update(payload).eq('id', id).select('*').maybeSingle();
      if (error) throw error;
      return data;
    },
    async remove(id) {
      const { data, error } = await getClient().from('loans').delete().eq('id', id).select('id').maybeSingle();
      if (error) throw error;
      return data;
    }
  };
}
