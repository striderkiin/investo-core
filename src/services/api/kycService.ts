import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseClient } from '../supabase/client';

export type KycStatus = 'pending' | 'approved' | 'rejected';
export type KycReviewAction = 'approve' | 'reject';
export type KycDocumentKind = 'id' | 'address';

export interface KycSubmission {
  id: string;
  userId: string;
  legalFullName: string;
  dateOfBirth: string;
  country: string;
  idDocumentPath: string;
  proofOfAddressPath: string;
  status: KycStatus;
  reviewNotes: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface KycSubmissionRow {
  id: string;
  user_id: string;
  legal_full_name: string;
  date_of_birth: string;
  country: string;
  id_document_path: string;
  proof_of_address_path: string;
  status: KycStatus;
  review_notes: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

function mapSubmission(row: KycSubmissionRow): KycSubmission {
  return {
    id: row.id,
    userId: row.user_id,
    legalFullName: row.legal_full_name,
    dateOfBirth: row.date_of_birth,
    country: row.country,
    idDocumentPath: row.id_document_path,
    proofOfAddressPath: row.proof_of_address_path,
    status: row.status,
    reviewNotes: row.review_notes,
    reviewedBy: row.reviewed_by,
    reviewedAt: row.reviewed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function createKycService(client: SupabaseClient = getSupabaseClient()) {
  return {
    async getMySubmission(userId: string): Promise<KycSubmission | null> {
      const { data, error } = await client.from('kyc_submissions').select('*').eq('user_id', userId).maybeSingle();
      if (error) throw error;
      return data ? mapSubmission(data as KycSubmissionRow) : null;
    },

    async uploadDocument(userId: string, file: File, kind: KycDocumentKind): Promise<string> {
      const path = `${userId}/${kind}-${Date.now()}.${file.name.split('.').pop() ?? 'bin'}`;
      const { error } = await client.storage.from('kyc-documents').upload(path, file, { upsert: true });
      if (error) throw error;
      return path;
    },

    async getSignedDocumentUrl(path: string, expiresInSeconds = 300): Promise<string> {
      const { data, error } = await client.storage.from('kyc-documents').createSignedUrl(path, expiresInSeconds);
      if (error) throw error;
      return data.signedUrl;
    },

    async submit(params: {
      legalFullName: string;
      dateOfBirth: string;
      country: string;
      idDocumentPath: string;
      proofOfAddressPath: string;
    }): Promise<KycSubmission> {
      const { data, error } = await client.rpc('submit_kyc', {
        p_legal_full_name: params.legalFullName,
        p_date_of_birth: params.dateOfBirth,
        p_country: params.country,
        p_id_document_path: params.idDocumentPath,
        p_proof_of_address_path: params.proofOfAddressPath,
      });
      if (error) throw error;
      return mapSubmission(data as KycSubmissionRow);
    },

    // --- Admin ---
    async listAll(status?: KycStatus): Promise<KycSubmission[]> {
      let query = client.from('kyc_submissions').select('*').order('created_at', { ascending: false });
      if (status) query = query.eq('status', status);
      const { data, error } = await query;
      if (error) throw error;
      return (data as KycSubmissionRow[]).map(mapSubmission);
    },

    async review(submissionId: string, action: KycReviewAction, notes?: string): Promise<KycSubmission> {
      const { data, error } = await client.rpc('review_kyc', { p_submission_id: submissionId, p_action: action, p_notes: notes ?? null });
      if (error) throw error;
      return mapSubmission(data as KycSubmissionRow);
    },
  };
}

export type KycService = ReturnType<typeof createKycService>;
