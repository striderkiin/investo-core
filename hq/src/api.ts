import { supabase } from './supabase';
import type { Buyer, HqSettings, Payment, PaymentKind, Site, SiteEvent, SiteOverview } from './types';

const must = <T,>(result: { data: T | null; error: { message: string } | null }): T => {
  if (result.error) throw new Error(result.error.message);
  return result.data as T;
};

const clean = (value: string | null | undefined) => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
};

export type BuyerInput = Pick<Buyer, 'name' | 'email' | 'contact' | 'notes'>;
export type SiteInput = Pick<Site, 'buyer_id' | 'name' | 'domain' | 'temp_url' | 'status' | 'billing_cycle' | 'monthly_fee' | 'region' | 'supabase_ref' | 'notes'>;

const buyerRow = (input: BuyerInput) => ({
  name: input.name.trim(),
  email: clean(input.email),
  contact: clean(input.contact),
  notes: clean(input.notes),
});

const siteRow = (input: SiteInput) => ({
  ...input,
  name: input.name.trim(),
  domain: clean(input.domain)?.toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '') ?? null,
  temp_url: clean(input.temp_url),
  supabase_ref: clean(input.supabase_ref),
  notes: clean(input.notes),
});

export const api = {
  settings: async () => must<HqSettings>(await supabase.from('hq_settings').select('*').eq('id', 1).single()),
  saveSettings: async (values: HqSettings) => {
    must(await supabase.from('hq_settings').update(values).eq('id', 1));
  },

  buyers: async () => must<Buyer[]>(await supabase.from('buyers').select('*').order('created_at', { ascending: false })),
  createBuyer: async (input: BuyerInput) => must<Buyer>(await supabase.from('buyers').insert(buyerRow(input)).select('*').single()),
  updateBuyer: async (id: string, input: BuyerInput) => {
    must(await supabase.from('buyers').update(buyerRow(input)).eq('id', id));
  },

  sites: async () => must<SiteOverview[]>(await supabase.from('site_overview').select('*').order('created_at', { ascending: false })),
  site: async (id: string) => must<SiteOverview>(await supabase.from('site_overview').select('*').eq('id', id).single()),
  createSite: async (input: SiteInput) => must<Site>(await supabase.from('sites').insert(siteRow(input)).select('*').single()),
  updateSite: async (id: string, input: SiteInput) => {
    must(await supabase.from('sites').update(siteRow(input)).eq('id', id));
  },

  payments: async (siteId?: string) => {
    let query = supabase.from('payments').select('*').order('paid_at', { ascending: false }).order('created_at', { ascending: false });
    if (siteId) query = query.eq('site_id', siteId);
    return must<Payment[]>(await query);
  },
  recordPayment: async (p: { siteId: string; kind: PaymentKind; amount: number; method?: string; reference?: string; note?: string; paidAt: string }) =>
    must<string | null>(
      await supabase.rpc('record_payment', {
        p_site_id: p.siteId,
        p_kind: p.kind,
        p_amount: p.amount,
        p_method: p.method ?? null,
        p_reference: p.reference ?? null,
        p_note: p.note ?? null,
        p_paid_at: p.paidAt,
      })
    ),
  voidPayment: async (id: string) => must<string | null>(await supabase.rpc('void_payment', { p_payment_id: id })),

  events: async (siteId: string) =>
    must<SiteEvent[]>(await supabase.from('site_events').select('*').eq('site_id', siteId).order('created_at', { ascending: false }).limit(100)),
};

export const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
