import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseClient } from '../supabase/client';
import {
  mapSocialProofEventRow,
  mapSocialProofMetricRow,
  mapSocialProofSettingsRow,
  mapSocialProofTemplateRow,
} from '../supabase/mappers';
import type {
  SocialProofEventRow,
  SocialProofMetricRow,
  SocialProofSettingsRow,
  SocialProofTemplateRow,
} from '../supabase/mappers';
import type { SocialProofEvent, SocialProofMetric, SocialProofSettings, SocialProofTemplate } from '../../types/database';

export function createSocialProofService(client: SupabaseClient = getSupabaseClient()) {
  return {
    async getSettings(): Promise<SocialProofSettings> {
      const { data, error } = await client.from('social_proof_settings').select('*').limit(1).single();
      if (error) throw error;
      return mapSocialProofSettingsRow(data as SocialProofSettingsRow);
    },

    async updateSettings(id: string, updates: Partial<Omit<SocialProofSettings, 'id' | 'updatedAt'>>): Promise<SocialProofSettings> {
      const payload: Record<string, unknown> = {};
      if (updates.enabled !== undefined) payload.enabled = updates.enabled;
      if (updates.testModeEnabled !== undefined) payload.test_mode_enabled = updates.testModeEnabled;
      if (updates.popupPosition !== undefined) payload.popup_position = updates.popupPosition;
      if (updates.displayDurationSeconds !== undefined) payload.display_duration_seconds = updates.displayDurationSeconds;
      if (updates.minDelaySeconds !== undefined) payload.min_delay_seconds = updates.minDelaySeconds;
      if (updates.maxDelaySeconds !== undefined) payload.max_delay_seconds = updates.maxDelaySeconds;
      if (updates.maxQueue !== undefined) payload.max_queue = updates.maxQueue;
      if (updates.maxPerSession !== undefined) payload.max_per_session = updates.maxPerSession;
      if (updates.maxPerMinute !== undefined) payload.max_per_minute = updates.maxPerMinute;
      if (updates.enableSound !== undefined) payload.enable_sound = updates.enableSound;
      if (updates.showCloseButton !== undefined) payload.show_close_button = updates.showCloseButton;
      if (updates.privacyMode !== undefined) payload.privacy_mode = updates.privacyMode;
      if (updates.enabledEventTypes !== undefined) payload.enabled_event_types = updates.enabledEventTypes;
      if (updates.testEventTypes !== undefined) payload.test_event_types = updates.testEventTypes;

      const { data, error } = await client.from('social_proof_settings').update(payload).eq('id', id).select('*').single();
      if (error) throw error;
      return mapSocialProofSettingsRow(data as SocialProofSettingsRow);
    },

    async listTemplates(): Promise<SocialProofTemplate[]> {
      const { data, error } = await client.from('social_proof_templates').select('*').order('event_type', { ascending: true });
      if (error) throw error;
      return (data as SocialProofTemplateRow[]).map(mapSocialProofTemplateRow);
    },

    async updateTemplate(id: string, template: string): Promise<SocialProofTemplate> {
      const { data, error } = await client.from('social_proof_templates').update({ template }).eq('id', id).select('*').single();
      if (error) throw error;
      return mapSocialProofTemplateRow(data as SocialProofTemplateRow);
    },

    /** Recent events for the client-facing popup feed — production + any active client_test broadcasts. */
    async listRecentEvents(limit = 20): Promise<SocialProofEvent[]> {
      const { data, error } = await client
        .from('social_proof_events')
        .select('*')
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data as SocialProofEventRow[]).map(mapSocialProofEventRow);
    },

    /** Sends a live-looking event to connected client dashboards. Requires test_mode_enabled server-side — never used for Preview Only, which stays local. */
    async sendTestEventToClientStream(eventType: string, vars: Record<string, string>, amount?: number, planName?: string): Promise<SocialProofEvent> {
      const { data, error } = await client.rpc('admin_send_test_social_proof_event', {
        p_event_type: eventType,
        p_vars: vars,
        p_amount: amount ?? null,
        p_plan_name: planName ?? null,
      });
      if (error) throw error;
      return mapSocialProofEventRow(data as SocialProofEventRow);
    },

    async recordInteraction(eventId: string, interaction: 'shown' | 'clicked' | 'dismissed'): Promise<void> {
      const { error } = await client.rpc('record_social_proof_interaction', { p_event_id: eventId, p_interaction: interaction });
      if (error) throw error;
    },

    async getAnalytics(): Promise<SocialProofMetric[]> {
      const { data, error } = await client.from('social_proof_metrics').select('*').order('metric_date', { ascending: false }).limit(200);
      if (error) throw error;
      return (data as SocialProofMetricRow[]).map(mapSocialProofMetricRow);
    },
  };
}

export type SocialProofService = ReturnType<typeof createSocialProofService>;
