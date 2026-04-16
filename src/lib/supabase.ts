import { createClient } from '@supabase/supabase-js';

export const SUPABASE_URL = 'https://vrquxovkptfigrjsmhng.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZycXV4b3ZrcHRmaWdyanNtaG5nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ4NDgyNTksImV4cCI6MjA5MDQyNDI1OX0.3DPsPZXRb681lU_c-GZmxP0K6MISKkUE1liL-k4g1sM';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export interface Article {
  id: string;
  title: string;
  source: string;
  url: string;
  image_url?: string;
  published_at: string;
  sentiment_score: number;
  topics: string | string[];
  affects_hungary: boolean;
  hungary_impact: string;
  warning_level: string;
  summary: string;
  manipulation_tags?: string[] | null;
  conflict_event_type?: string | null;
  conflict_country?: string | null;
  conflict_location?: string | null;
  conflict_latitude?: number | null;
  conflict_longitude?: number | null;
  conflict_fatalities?: number | null;
  conflict_description?: string | null;
  conflict_severity?: string | null;
}

export interface Conflict {
  event_id: string;
  event_type: string;
  country: string;
  location: string;
  latitude: number;
  longitude: number;
  description: string;
  severity: string;
  source: string;
  event_date: string;
  fatalities: number;
  article_count?: number;
  report_count?: number;
  activity_score?: number;
  trend?: 'rising' | 'stable' | 'cooling';
  summary?: string;
  last_seen_at?: string;
  article_url?: string;
}

export interface MarketData {
  symbol: string;
  company: string;
  price: number;
  change_percent: number;
  currency: string;
  recorded_at: string;
  explanation?: string;
  trend?: 'up' | 'down' | 'neutral';
}
