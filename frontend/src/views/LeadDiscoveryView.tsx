import React, { useState, useEffect } from 'react';
import { Sidebar } from '../components/Sidebar';
import { Header } from '../components/Header';
import { LeadsService } from '../services/leads.service';
import { SocketService } from '../services/socket.service';
import {
  Lead, LeadSocialLink, LeadSocialProfile, CrawlJob
} from '../api/types';
import { useWorkspaceId } from '../hooks/useWorkspaceId';

interface PlatformConfig {
  label: string;
  icon: string;
  color: string;
  bg: string;
  svg?: string;
}

const detectPlatform = (urlStr: string): PlatformConfig => {
  const lowerUrl = urlStr.toLowerCase();
  
  if (lowerUrl.includes('linkedin.com')) {
    return {
      label: 'LinkedIn',
      icon: 'share',
      color: 'text-[#0A66C2]',
      bg: 'bg-[#F3F8FC]',
      svg: `<svg class="w-4 h-4 text-[#0A66C2] flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
        <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.32 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.79M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z"/>
      </svg>`
    };
  }
  
  if (lowerUrl.includes('github.com')) {
    return {
      label: 'GitHub',
      icon: 'code',
      color: 'text-[#24292F]',
      bg: 'bg-[#F6F8FA]',
      svg: `<svg class="w-4 h-4 text-[#24292F] flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
        <path fill-rule="evenodd" clip-rule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.464-1.11-1.464-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.579.688.481C19.137 20.164 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
      </svg>`
    };
  }

  if (lowerUrl.includes('twitter.com') || lowerUrl.includes('x.com')) {
    return {
      label: 'Twitter/X',
      icon: 'alternate_email',
      color: 'text-[#0F1419]',
      bg: 'bg-[#F7F7F7]',
      svg: `<svg class="w-4 h-4 text-[#0F1419] flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>`
    };
  }

  if (lowerUrl.includes('facebook.com')) {
    return {
      label: 'Facebook',
      icon: 'thumb_up',
      color: 'text-[#1877F2]',
      bg: 'bg-[#F0F2F5]',
      svg: `<svg class="w-4 h-4 text-[#1877F2] flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
        <path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15H8v-3h2V9.5C10 7.57 11.57 6 13.5 6H16v3h-2c-.55 0-1 .45-1 1v2h3v3h-3v6.95c4.56-.93 8-4.96 8-9.75z" />
      </svg>`
    };
  }

  if (lowerUrl.includes('instagram.com')) {
    return {
      label: 'Instagram',
      icon: 'camera_alt',
      color: 'text-[#E4405F]',
      bg: 'bg-[#FDF2F8]',
      svg: `<svg class="w-4 h-4 text-[#E4405F] flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.051.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z" />
      </svg>`
    };
  }

  if (lowerUrl.includes('youtube.com') || lowerUrl.includes('youtu.be')) {
    return {
      label: 'YouTube',
      icon: 'smart_display',
      color: 'text-[#FF0000]',
      bg: 'bg-[#FFF5F5]',
      svg: `<svg class="w-4 h-4 text-[#FF0000] flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
        <path d="M23.498 6.163a3.003 3.003 0 0 0-2.11-2.11C19.518 3.5 12 3.5 12 3.5s-7.518 0-9.388.503a3.003 3.003 0 0 0-2.11 2.11C0 8.033 0 12 0 12s0 3.967.502 5.837a3.003 3.003 0 0 0 2.11 2.11c1.87.503 9.388.503 9.388.503s7.518 0 9.388-.503a3.003 3.003 0 0 0 2.11-2.11c.502-1.87.502-5.837.502-5.837s0-3.967-.502-5.837zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
      </svg>`
    };
  }

  if (lowerUrl.includes('medium.com')) {
    return {
      label: 'Medium',
      icon: 'article',
      color: 'text-[#12100E]',
      bg: 'bg-[#FAF9F6]',
      svg: `<svg class="w-4 h-4 text-[#12100E] flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
        <path d="M13.54 12a6.8 6.8 0 0 1-6.77 6.82A6.8 6.8 0 0 1 0 12a6.8 6.8 0 0 1 6.77 6.82A6.8 6.8 0 0 1 13.54 12zm5.9 0c0 3.5 1.37 6.36 3.07 6.36S24 15.5 24 12s-1.37-6.36-3.07-6.36-3.07 2.86-3.07 6.36zM14.2 12c0 3.77.78 6.82 1.75 6.82S17.7 15.8 17.7 12s-.78-6.82-1.75-6.82-1.75 3.05-1.75 6.82z" />
      </svg>`
    };
  }

  if (lowerUrl.includes('wa.me') || lowerUrl.includes('whatsapp.com')) {
    return {
      label: 'WhatsApp',
      icon: 'chat',
      color: 'text-[#25D366]',
      bg: 'bg-[#E8F8EF]',
      svg: `<svg class="w-4 h-4 text-[#25D366] flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
        <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.513 2.262 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.73-1.45L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.42 9.864-9.858.002-2.634-1.02-5.11-2.881-6.973-1.86-1.863-4.334-2.887-6.97-2.889-5.44 0-9.863 4.42-9.867 9.86-.001 1.777.478 3.511 1.387 5.032L2.067 21.93l6.58-1.776z"/>
      </svg>`
    };
  }

  if (lowerUrl.includes('t.me') || lowerUrl.includes('telegram')) {
    return {
      label: 'Telegram',
      icon: 'send',
      color: 'text-[#0088cc]',
      bg: 'bg-[#E6F3FA]',
      svg: `<svg class="w-4 h-4 text-[#0088cc] flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-1-.65-.35-1 .22-1.6.15-.15 2.76-2.53 2.81-2.75.01-.03.01-.1-.04-.14-.04-.04-.11-.03-.16-.02-.07.01-1.14.72-3.22 2.12-.3.21-.58.31-.83.3-.27-.01-.8-.16-1.19-.28-.48-.15-.86-.23-.83-.49.02-.13.2-.27.56-.4 2.19-.95 3.65-1.58 4.38-1.88 2.08-.85 2.52-.99 2.8-.99.06 0 .2.02.29.09.07.06.1.15.11.25z"/>
      </svg>`
    };
  }

  if (lowerUrl.includes('discord.gg') || lowerUrl.includes('discord.com')) {
    return {
      label: 'Discord',
      icon: 'sports_esports',
      color: 'text-[#5865F2]',
      bg: 'bg-[#EEF0FC]',
      svg: `<svg class="w-4 h-4 text-[#5865F2] flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
        <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0c-.172-.393-.412-.882-.628-1.25a.074.074 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.094 13.094 0 0 1-1.873-.894.077.077 0 0 1-.008-.128c.126-.093.252-.19.372-.287a.075.075 0 0 1 .077-.011c3.92 1.793 8.18 1.793 12.061 0a.073.073 0 0 1 .078.009c.12.099.246.196.373.289a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.894.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.156-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.156 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.156-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.156 2.418z"/>
      </svg>`
    };
  }

  if (lowerUrl.includes('/contact') || lowerUrl.includes('contact-us') || lowerUrl.includes('/support')) {
    return { label: 'Contact Page', icon: 'contact_mail', color: 'text-emerald-600', bg: 'bg-emerald-50' };
  }

  if (lowerUrl.includes('/docs') || lowerUrl.includes('docs.') || lowerUrl.includes('/documentation') || lowerUrl.includes('/api')) {
    return { label: 'Documentation', icon: 'menu_book', color: 'text-indigo-600', bg: 'bg-indigo-50' };
  }

  if (lowerUrl.includes('/blog') || lowerUrl.includes('blog.') || lowerUrl.includes('/news')) {
    return { label: 'Blog', icon: 'rss_feed', color: 'text-amber-600', bg: 'bg-amber-50' };
  }

  return { label: 'Website', icon: 'language', color: 'text-blue-600', bg: 'bg-blue-50' };
};

const isValidUrl = (urlStr: string): boolean => {
  if (!urlStr) return false;
  try {
    new URL(urlStr);
    return true;
  } catch (_) {
    if (/^[a-zA-Z0-9-]+\.[a-zA-Z0-9-]+/.test(urlStr)) {
      return true;
    }
    return false;
  }
};

const normalizeUrl = (urlStr: string): string => {
  if (!urlStr) return '';
  let clean = urlStr.trim();
  if (!/^https?:\/\//i.test(clean)) {
    clean = 'https://' + clean;
  }
  try {
    const urlObj = new URL(clean);
    const host = urlObj.hostname.toLowerCase().replace(/^www\./, '');
    let pathname = urlObj.pathname.replace(/\/+$/, '');
    return `${urlObj.protocol}//${host}${pathname}`;
  } catch (_) {
    let base = clean.split('?')[0].replace(/\/+$/, '');
    return base.toLowerCase();
  }
};

const getUniqueSocialLinks = (links: LeadSocialLink[] = []) => {
  const seen = new Set<string>();
  return links.filter(link => {
    if (!link.socialUrl) return false;
    const normalized = normalizeUrl(link.socialUrl);
    if (seen.has(normalized)) return false;
    seen.add(normalized);
    return true;
  });
};

// Dedup social profiles (new typed array)
const getUniqueSocialProfiles = (profiles: LeadSocialProfile[] = []) => {
  const seen = new Set<string>();
  return profiles.filter(p => {
    if (!p.socialUrl) return false;
    if (p.validationStatus === 'INVALID') return false;
    const normalized = normalizeUrl(p.socialUrl);
    if (seen.has(normalized)) return false;
    seen.add(normalized);
    return true;
  });
};

// Dedup page-type URL arrays (contactPages, aboutPages, etc.)
const getUniquePages = <T extends { url: string }>(pages: T[] = []): T[] => {
  const seen = new Set<string>();
  return pages.filter(p => {
    if (!p.url) return false;
    const normalized = normalizeUrl(p.url);
    if (seen.has(normalized)) return false;
    seen.add(normalized);
    return true;
  });
};

const calculateDataCompleteness = (lead: Lead): number => {
  let score = 0;
  if (lead.website) score += 15;
  if (lead.email || (lead.emails && lead.emails.length > 0)) score += 20;
  if (lead.phone || (lead.phones && lead.phones.length > 0)) score += 20;
  // Count social profiles (real profiles, not page links)
  if (lead.socialProfiles && lead.socialProfiles.length > 0) score += 15;
  else if (lead.socialLinks && lead.socialLinks.filter(s => ['linkedin','github','twitter','facebook','instagram','youtube','whatsapp','telegram','discord'].includes(s.network)).length > 0) score += 15;
  if (lead.sector || lead.industry) score += 10;
  if (lead.funding) score += 10;
  if (lead.city || lead.state || lead.country) score += 10;
  return score;
};

const getSourceReliability = (source: string | null | undefined): { percentage: number; label: string; color: string } => {
  if (!source) return { percentage: 85, label: 'Medium Reliability', color: 'text-amber-600' };
  const src = source.toLowerCase();
  if (src.includes('crunchbase') || src.includes('yc') || src.includes('y combinator')) {
    return { percentage: 95, label: 'High Reliability', color: 'text-emerald-600' };
  }
  if (src.includes('product hunt')) {
    return { percentage: 88, label: 'High-Medium', color: 'text-blue-600' };
  }
  if (src.includes('directory') || src.includes('manual')) {
    return { percentage: 80, label: 'Medium Reliability', color: 'text-amber-600' };
  }
  return { percentage: 85, label: 'Medium Reliability', color: 'text-amber-600' };
};

const getLeadQuality = (score: number) => {
  if (score >= 80) return { label: 'Tier A Match', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
  if (score >= 60) return { label: 'Tier B Fit', color: 'bg-blue-50 text-blue-700 border-blue-200' };
  return { label: 'Nurture Account', color: 'bg-amber-50 text-amber-700 border-amber-200' };
};

// Unused helper functions getStrengths, getRisks, and getOutreachRecommendation removed to avoid build errors.

interface PlatformLinkProps {
  link: LeadSocialLink;
  copiedUrl: string | null;
  onCopy: (url: string) => void;
}

const PlatformLink: React.FC<PlatformLinkProps> = ({ link, copiedUrl, onCopy }) => {
  const { label, icon, color, bg, svg } = detectPlatform(link.socialUrl);
  const isCopied = copiedUrl === link.socialUrl;
  
  if (!isValidUrl(link.socialUrl)) return null;
  
  const href = link.socialUrl.startsWith('http') ? link.socialUrl : `https://${link.socialUrl}`;

  return (
    <div className="flex items-center justify-between p-3 rounded-xl border border-neutral-200/60 bg-white hover:border-primary/30 hover:shadow-sm transition-all duration-300">
      <div className="flex items-center gap-2.5 min-w-0">
        <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center flex-shrink-0`}>
          {svg ? (
            <div className="flex items-center justify-center" dangerouslySetInnerHTML={{ __html: svg }} />
          ) : (
            <span className={`material-symbols-outlined text-sm ${color}`}>{icon}</span>
          )}
        </div>
        <div className="flex flex-col min-w-0">
          <span className="text-[10px] font-extrabold text-[#0F172A]">{label}</span>
          <span className="text-[9px] text-neutral-400 truncate max-w-[140px] font-mono" title={link.socialUrl}>
            {link.socialUrl.replace(/^https?:\/\/(www\.)?/, '')}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <button
          type="button"
          onClick={() => onCopy(link.socialUrl)}
          className="w-6 h-6 rounded-md hover:bg-neutral-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors"
          title="Copy to clipboard"
        >
          <span className="material-symbols-outlined text-[14px]">
            {isCopied ? 'check' : 'content_copy'}
          </span>
        </button>
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="w-6 h-6 rounded-md hover:bg-neutral-100 flex items-center justify-center text-slate-400 hover:text-primary transition-colors"
          title="Open in new tab"
        >
          <span className="material-symbols-outlined text-[14px]">open_in_new</span>
        </a>
      </div>
    </div>
  );
};

interface ScoreFactor {
  label: string;
  value: number;
  isPositive: boolean;
}

const calculateConfidenceScore = (lead: Lead): number => {
  let score = 0;
  
  // Data completeness: 30 points max
  const completeness = calculateDataCompleteness(lead);
  score += completeness * 0.3;
  
  // Contact availability: 25 points max
  const hasEmail = (lead.emails && lead.emails.length > 0) || lead.email;
  const hasPhone = (lead.phones && lead.phones.length > 0) || lead.phone;
  if (hasEmail && hasPhone) {
    score += 25;
  } else if (hasEmail) {
    score += 15;
  } else if (hasPhone) {
    score += 10;
  }
  
  // Discovered social profiles (real profiles only): 20 points max
  const profileCount = getUniqueSocialProfiles(lead.socialProfiles).length ||
    getUniqueSocialLinks(lead.socialLinks?.filter(s => ['linkedin','github','twitter','facebook','instagram','youtube'].includes(s.network))).length;
  if (profileCount >= 2) {
    score += 20;
  } else if (profileCount === 1) {
    score += 12;
  }
  
  // Website quality: 15 points max
  if (lead.website) {
    if (lead.website.startsWith('https://')) {
      score += 15;
    } else {
      score += 10;
    }
  }
  
  // Funding info: 10 points max
  if (lead.funding) {
    score += 10;
  }
  
  return Math.min(100, Math.round(score));
};

const getScoreFactors = (lead: Lead): ScoreFactor[] => {
  const factors: ScoreFactor[] = [];
  
  // Website Presence
  if (lead.website) {
    factors.push({ label: 'Active Company Website', value: 15, isPositive: true });
  } else {
    factors.push({ label: 'Missing Website', value: -15, isPositive: false });
  }
  
  // Social Presence (use socialProfiles if available, fall back to filtered socialLinks)
  const socialProfileCount = getUniqueSocialProfiles(lead.socialProfiles).length ||
    getUniqueSocialLinks(lead.socialLinks?.filter(s => ['linkedin','github','twitter','facebook','instagram','youtube'].includes(s.network))).length;
  if (socialProfileCount >= 2) {
    factors.push({ label: 'Strong Social Footprint', value: 15, isPositive: true });
  } else if (socialProfileCount === 1) {
    factors.push({ label: 'Single Social Channel Found', value: 8, isPositive: true });
  } else {
    factors.push({ label: 'No Discovered Socials', value: -10, isPositive: false });
  }
  
  // Funding Presence
  if (lead.funding) {
    factors.push({ label: 'Funding History Discovered', value: 15, isPositive: true });
  } else {
    factors.push({ label: 'No Public Funding Details', value: -5, isPositive: false });
  }
  
  // Headcount Growth
  if (lead.employees > 500) {
    factors.push({ label: 'Large Enterprise Headcount', value: 20, isPositive: true });
  } else if (lead.employees > 100) {
    factors.push({ label: 'Mid-Market Team Size', value: 12, isPositive: true });
  } else if (lead.employees > 0) {
    factors.push({ label: 'Small Team Operations', value: 5, isPositive: true });
  }
  
  // Hiring Status
  if (lead.hiringStatus === 'HIGH_VOLUME') {
    factors.push({ label: 'Active High-Volume Hiring', value: 15, isPositive: true });
  } else if (lead.hiringStatus === 'EXECUTIVE_SEARCH') {
    factors.push({ label: 'Executive Team Expansion', value: 10, isPositive: true });
  } else if (lead.hiringStatus === 'STABLE') {
    factors.push({ label: 'Stable Personnel Retention', value: 5, isPositive: true });
  } else {
    factors.push({ label: 'No Active Ingestion Hiring', value: -5, isPositive: false });
  }
  
  // Contact details
  const hasEmail = (lead.emails && lead.emails.length > 0) || lead.email;
  const hasPhone = (lead.phones && lead.phones.length > 0) || lead.phone;
  if (hasEmail || hasPhone) {
    factors.push({ label: 'Verified Contacts Available', value: 20, isPositive: true });
  } else {
    factors.push({ label: 'Missing Contact Details', value: -15, isPositive: false });
  }
  
  return factors;
};

const getFinalReasoning = (lead: Lead, score: number): string => {
  if (score >= 80) {
    return `Strong target profile with verified online footprints, robust sector alignment (${lead.sector || 'Unknown'}), and key growth indicators. Highly recommended for immediate priority outreach.`;
  }
  if (score >= 60) {
    return `Standard fit prospect with stable signals. Website and basic company properties are verified. Recommended for customized warm outreach.`;
  }
  return `Low qualification profile due to restricted firmographics or missing direct contact lines. Recommended for long-term nurture routing.`;
};

export const LeadDiscoveryView: React.FC = () => {
  const defaultWorkspaceId = useWorkspaceId();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [enrichingId, setEnrichingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedLeadId, setExpandedLeadId] = useState<string | null>(null);
  const [selectedLeadIds, setSelectedLeadIds] = useState<Set<string>>(new Set());
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const [cleaning, setCleaning] = useState<boolean>(false);
  const [cleanMessage, setCleanMessage] = useState<string | null>(null);

  // Inline toast state (replaces alert())
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Live Crawl States
  const [crawlUrl, setCrawlUrl] = useState<string>('');

  // Queue of active crawl jobs
  const [crawlJobs, setCrawlJobs] = useState<CrawlJob[]>([]);
  const [jobLogs, setJobLogs] = useState<Record<string, string[]>>({});
  const [jobProgress, setJobProgress] = useState<Record<string, { crawled: number; total: number }>>({});
  const [selectedLogJobId, setSelectedLogJobId] = useState<string | null>(null);

  // Connect WebSocket and listen for events centrally
  useEffect(() => {
    if (!defaultWorkspaceId) return;

    // Connect WebSocket
    SocketService.connectTelemetry(defaultWorkspaceId, () => {});

    // Listen to log and status events centrally
    const unsubLog = SocketService.onAnyEvent((event) => {
      if (event.type === 'CRAWL_LOG') {
        const e = event;
        setJobLogs(prev => ({
          ...prev,
          [e.jobId]: [...(prev[e.jobId] || []), e.message]
        }));
        setJobProgress(prev => ({
          ...prev,
          [e.jobId]: { crawled: e.pagesCrawled, total: e.pagesTotal }
        }));
      } else if (event.type === 'CRAWL_COMPLETE') {
        const e = event;
        setJobLogs(prev => ({
          ...prev,
          [e.jobId]: [...(prev[e.jobId] || []), `✅ ${e.message}`]
        }));
        setJobProgress(prev => ({
          ...prev,
          [e.jobId]: { crawled: e.pagesCrawled, total: e.pagesCrawled }
        }));
        setCrawlJobs(prev => prev.map(j => j.id === e.jobId ? { ...j, status: 'completed', leadId: e.leadId } : j));
        fetchDiscoveredLeads();
        fetchStats();

        if (e.leadId) {
          LeadsService.getCrawlResults(e.jobId).then(freshLead => {
            setLeads(prev => {
              const filtered = prev.filter(l => l.id !== freshLead.id);
              return [freshLead, ...filtered];
            });
            handleSelectLeadRow(e.leadId);
          }).catch(console.error);
        }
      } else if (event.type === 'CRAWL_ERROR') {
        const e = event;
        setJobLogs(prev => ({
          ...prev,
          [e.jobId]: [...(prev[e.jobId] || []), `❌ ${e.message}`]
        }));
        setCrawlJobs(prev => prev.map(j => j.id === e.jobId ? { ...j, status: 'failed', errorMessage: e.error } : j));
        fetchDiscoveredLeads();
        fetchStats();
      }
    });

    return () => {
      unsubLog();
      SocketService.disconnectTelemetry();
    };
  }, [defaultWorkspaceId]);

  // Centralized sequential fallback polling for active jobs
  useEffect(() => {
    const activeJobs = crawlJobs.filter(j => j.status === 'queued' || j.status === 'crawling');
    if (activeJobs.length === 0) return;

    const pollId = setInterval(async () => {
      for (const job of activeJobs) {
        try {
          const updatedJob = await LeadsService.getCrawlStatus(job.id);
          if (updatedJob.status !== job.status) {
            setCrawlJobs(prev => prev.map(j => j.id === job.id ? updatedJob : j));
            if (updatedJob.status === 'completed') {
              const leadId = updatedJob.leadId;
              if (leadId) {
                LeadsService.getCrawlResults(job.id).then(freshLead => {
                  setLeads(lPrev => {
                    const filtered = lPrev.filter(l => l.id !== freshLead.id);
                    return [freshLead, ...filtered];
                  });
                  handleSelectLeadRow(leadId);
                }).catch(console.error);
              }
              fetchDiscoveredLeads();
              fetchStats();
            } else if (updatedJob.status === 'failed') {
              fetchDiscoveredLeads();
              fetchStats();
            }
          }
        } catch (_) {}
      }
    }, 6000);

    return () => clearInterval(pollId);
  }, [crawlJobs.filter(j => j.status === 'queued' || j.status === 'crawling').map(j => j.id).join(',')]);

  const handleSelectLeadRow = (leadId: string) => {
    setCountry('');
    setStateFilter('');
    setCityFilter('');
    setIndustry('');
    setFundingStage('');
    setRevenueRange('');
    setMinEmployees('');
    setMaxEmployees('');
    setHiringStatusFilter('');
    setHiringDepartment('');
    setSubIndustry('');
    setTechnology('');
    setMinScore('');
    setMaxScore('');
    setExpandedLeadId(leadId);

    setTimeout(() => {
      const el = document.getElementById(`lead-row-${leadId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.classList.add('bg-[#EFF6FF]/60', 'ring-2', 'ring-indigo-500/20');
        setTimeout(() => {
          el.classList.remove('bg-[#EFF6FF]/60', 'ring-2', 'ring-indigo-500/20');
        }, 3000);
      }
    }, 200);
  };

  const handleStartCrawl = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!crawlUrl || !defaultWorkspaceId) return;

    let targetUrl = crawlUrl.trim();
    if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
      targetUrl = 'https://' + targetUrl;
    }

    try {
      setError(null);
      const job = await LeadsService.startCrawl(targetUrl, defaultWorkspaceId);
      
      setCrawlJobs(prev => [job, ...prev]);
      setJobLogs(prev => ({
        ...prev,
        [job.id]: [`🔍 Crawl job created for ${targetUrl}`, `⏳ Status: ${job.status} — waiting for engine to start...`]
      }));
      setSelectedLogJobId(job.id); // Expand terminal logs automatically
      setCrawlUrl('');
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || 'Failed to start live website crawl.');
    }
  };


  const handleCleanAndRecrawl = async () => {
    if (!defaultWorkspaceId) return;
    try {
      setCleaning(true);
      setCleanMessage(null);
      const data = await LeadsService.cleanAndRecrawl(defaultWorkspaceId);
      if (data.status === 'SUCCESS') {
        setCleanMessage('Historical duplicates cleaned. Background re-crawl started.');
        setTimeout(() => setCleanMessage(null), 5000);
        await fetchDiscoveredLeads();
        await fetchStats();
      } else {
        setError(data.message || 'Failed to trigger cleanup & re-crawl.');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to trigger cleanup.');
    } finally {
      setCleaning(false);
    }
  };

  const handleCopy = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedUrl(url);
    setTimeout(() => {
      setCopiedUrl(null);
    }, 2000);
  };

  // Stats State
  const [stats, setStats] = useState<{
    totalDiscovered: number;
    newAddedToday: number;
    contactCount: number;
    enrichmentRate: number;
  } | null>(null);

  // Filter States
  const [country, setCountry] = useState<string>('');
  const [stateFilter, setStateFilter] = useState<string>('');
  const [cityFilter, setCityFilter] = useState<string>('');
  const [industry, setIndustry] = useState<string>('');
  const [fundingStage, setFundingStage] = useState<string>('');
  const [revenueRange, setRevenueRange] = useState<string>('');
  const [minEmployees, setMinEmployees] = useState<string>('');
  const [maxEmployees, setMaxEmployees] = useState<string>('');
  const [hiringStatusFilter, setHiringStatusFilter] = useState<string>('');
  const [hiringDepartment, setHiringDepartment] = useState<string>('');
  const [subIndustry, setSubIndustry] = useState<string>('');
  const [technology, setTechnology] = useState<string>('');
  const [minScore, setMinScore] = useState<string>('');
  const [maxScore, setMaxScore] = useState<string>('');

  const [industryOptions, setIndustryOptions] = useState<string[]>([]);
  const [subIndustryOptions, setSubIndustryOptions] = useState<string[]>([]);
  const [fundingStageOptions, setFundingStageOptions] = useState<string[]>([]);
  const [revenueRangeOptions, setRevenueRangeOptions] = useState<string[]>([]);
  const [hiringStatusOptions, setHiringStatusOptions] = useState<string[]>([]);
  const [technologyOptions, setTechnologyOptions] = useState<string[]>([]);
  const [departmentOptions, setDepartmentOptions] = useState<string[]>([]);
  const [discovering, setDiscovering] = useState<boolean>(false);
  const [countriesList, setCountriesList] = useState<string[]>([]);
  const [statesList, setStatesList] = useState<string[]>([]);
  const [citiesList, setCitiesList] = useState<string[]>([]);
  const [shuffleMode, setShuffleMode] = useState<boolean>(false);
  const [shuffledLeads, setShuffledLeads] = useState<Lead[]>([]);

  // ISO code lookup for display
  const COUNTRY_ISO: Record<string, string> = {
    'India': 'IN', 'United States': 'US', 'United Kingdom': 'GB',
    'Canada': 'CA', 'Australia': 'AU', 'Germany': 'DE', 'France': 'FR',
    'Singapore': 'SG', 'Japan': 'JP', 'China': 'CN', 'Netherlands': 'NL',
    'Sweden': 'SE', 'Ireland': 'IE', 'United Arab Emirates': 'AE',
    'Brazil': 'BR', 'Mexico': 'MX', 'New Zealand': 'NZ',
  };

  const fetchDiscoveredLeads = async (filters?: {
    country?: string; state?: string; city?: string; industry?: string;
    subIndustry?: string; technology?: string; minScore?: string; maxScore?: string;
    hiringDepartment?: string; fundingStage?: string; revenueRange?: string;
    minEmployees?: string; maxEmployees?: string; hiringStatus?: string;
  }) => {
    if (!defaultWorkspaceId) return;
    try {
      setLoading(true);
      setSelectedLeadIds(new Set());
      const activeFilters = filters || {};
      const data = await LeadsService.listLeads({
        workspaceId: defaultWorkspaceId,
        status: 'DISCOVERED',
        country: activeFilters.country || undefined,
        state: activeFilters.state || undefined,
        city: activeFilters.city || undefined,
        industry: activeFilters.industry || undefined,
        hiringDepartment: activeFilters.hiringDepartment || undefined,
        fundingStage: activeFilters.fundingStage || undefined,
        revenueRange: activeFilters.revenueRange || undefined,
        minEmployees: activeFilters.minEmployees ? parseInt(activeFilters.minEmployees, 10) : undefined,
        maxEmployees: activeFilters.maxEmployees ? parseInt(activeFilters.maxEmployees, 10) : undefined,
        hiringStatus: activeFilters.hiringStatus || undefined,
        subIndustry: activeFilters.subIndustry || undefined,
        technology: activeFilters.technology || undefined,
        minScore: activeFilters.minScore ? parseInt(activeFilters.minScore, 10) : undefined,
        maxScore: activeFilters.maxScore ? parseInt(activeFilters.maxScore, 10) : undefined,
      });
      setLeads(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch discovered signals queue.');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    if (!defaultWorkspaceId) return;
    try {
      const data = await LeadsService.getDiscoveryStats(defaultWorkspaceId);
      setStats(data);
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  };

  useEffect(() => {
    if (defaultWorkspaceId) {
      fetchDiscoveredLeads();
      fetchStats();
      
      // Fetch dynamic options for filters
      LeadsService.getIndustries(defaultWorkspaceId).then(setIndustryOptions).catch(console.error);
      LeadsService.getSubIndustries(defaultWorkspaceId).then(setSubIndustryOptions).catch(console.error);
      LeadsService.getFundingStages(defaultWorkspaceId).then(setFundingStageOptions).catch(console.error);
      LeadsService.getRevenueRanges(defaultWorkspaceId).then(setRevenueRangeOptions).catch(console.error);
      LeadsService.getHiringStatuses(defaultWorkspaceId).then(setHiringStatusOptions).catch(console.error);
      LeadsService.getTechnologies(defaultWorkspaceId).then(setTechnologyOptions).catch(console.error);
      LeadsService.getDepartments(defaultWorkspaceId).then(setDepartmentOptions).catch(console.error);
    }
  }, [defaultWorkspaceId]);

  // Load countries on component mount
  useEffect(() => {
    const loadCountries = async () => {
      try {
        const list = await LeadsService.getCountries();
        setCountriesList(list);
      } catch (err) {
        console.error('Failed to load countries:', err);
      }
    };
    loadCountries();
  }, []);

  // Load states when country changes
  useEffect(() => {
    const loadStates = async () => {
      if (!country) {
        setStatesList([]);
        setCitiesList([]);
        setStateFilter('');
        setCityFilter('');
        return;
      }
      try {
        const list = await LeadsService.getStates(country);
        setStatesList(list);
        setCitiesList([]);
        setStateFilter('');
        setCityFilter('');
      } catch (err) {
        console.error('Failed to load states:', err);
      }
    };
    loadStates();
  }, [country]);

  // Load cities when state changes
  useEffect(() => {
    const loadCities = async () => {
      if (!stateFilter) {
        setCitiesList([]);
        setCityFilter('');
        return;
      }
      try {
        const list = await LeadsService.getCities(country, stateFilter);
        setCitiesList(list);
        setCityFilter('');
      } catch (err) {
        console.error('Failed to load cities:', err);
      }
    };
    loadCities();
  }, [stateFilter, country]);

  // Re-fetch from server whenever ANY filter changes (debounced 400ms)
  const filterDebounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!defaultWorkspaceId) return;
    if (filterDebounceRef.current) clearTimeout(filterDebounceRef.current);
    filterDebounceRef.current = setTimeout(() => {
      fetchDiscoveredLeads({
        country, state: stateFilter, city: cityFilter, industry,
        hiringDepartment, fundingStage, revenueRange, minEmployees, maxEmployees,
        hiringStatus: hiringStatusFilter,
      });
    }, 400);
    return () => { if (filterDebounceRef.current) clearTimeout(filterDebounceRef.current); };
  }, [country, stateFilter, cityFilter, industry, hiringDepartment, fundingStage, revenueRange, minEmployees, maxEmployees, hiringStatusFilter, defaultWorkspaceId]);

  // Trigger automated location discovery when city is selected
  useEffect(() => {
    const triggerLocationDiscovery = async () => {
      if (!country || !stateFilter || !cityFilter || !defaultWorkspaceId) return;
      try {
        const res = await LeadsService.discoverByLocation({
          country,
          state: stateFilter,
          city: cityFilter,
          workspaceId: defaultWorkspaceId
        });
        
        if (res.triggeredJobs && res.triggeredJobs.length > 0) {
          showToast(`AI Discovery initiated: searching ${cityFilter} for matching companies...`, 'success');
          
          // Inject triggered crawl jobs into crawlJobs queue to show progress cards
          setCrawlJobs(prev => {
            const current = [...prev];
            res.triggeredJobs.forEach((job: any) => {
              if (!current.some(j => j.id === job.jobId)) {
                current.push({
                  id: job.jobId,
                  url: job.url,
                  status: 'queued',
                  leadId: null,
                  errorMessage: null,
                  pagesCrawled: 0,
                  pagesTotal: 15,
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString()
                });
              }
            });
            return current;
          });
        }
      } catch (err) {
        console.error('Failed to run location discovery:', err);
      }
    };
    triggerLocationDiscovery();
  }, [cityFilter, stateFilter, country, defaultWorkspaceId]);

  useEffect(() => {
    if (shuffleMode && leads.length > 0) {
      let list = [...leads];
      // Fisher-Yates Shuffle
      for (let i = list.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [list[i], list[j]] = [list[j], list[i]];
      }
      setShuffledLeads(list);
    } else {
      setShuffledLeads([]);
    }
  }, [shuffleMode, leads]);



  const getProcessedLeads = () => {
    let list = shuffleMode ? [...shuffledLeads] : [...leads];
    // Sort by newest discovered first if not in shuffle mode
    if (!shuffleMode) {
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    return list;
  };

  const formatFreshness = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours}h ago`;
      return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return 'Recently';
    }
  };

  const toggleSelectLead = (id: string, e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    setSelectedLeadIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectAll = (filteredLeads: Lead[]) => {
    const filteredIds = filteredLeads.map(l => l.id);
    const allSelected = filteredIds.length > 0 && filteredIds.every(id => selectedLeadIds.has(id));
    setSelectedLeadIds(prev => {
      const next = new Set(prev);
      if (allSelected) {
        filteredIds.forEach(id => next.delete(id));
      } else {
        filteredIds.forEach(id => next.add(id));
      }
      return next;
    });
  };

  const handleSingleQualify = async (leadId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      setEnrichingId(leadId);
      await LeadsService.bulkQualify([leadId]);
      showToast('Lead qualified and promoted to pipeline.');
      setSelectedLeadIds(prev => {
        const next = new Set(prev);
        next.delete(leadId);
        return next;
      });
      await fetchDiscoveredLeads();
      await fetchStats();
    } catch (err: any) {
      showToast(err.message || 'Failed to qualify target.', 'error');
    } finally {
      setEnrichingId(null);
    }
  };

  const handleSingleReject = async (leadId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to reject this company profile?')) return;
    try {
      setEnrichingId(leadId);
      await LeadsService.bulkReject([leadId]);
      showToast('Company profile rejected.');
      setSelectedLeadIds(prev => {
        const next = new Set(prev);
        next.delete(leadId);
        return next;
      });
      await fetchDiscoveredLeads();
      await fetchStats();
    } catch (err: any) {
      showToast(err.message || 'Failed to reject target.', 'error');
    } finally {
      setEnrichingId(null);
    }
  };

  const handleBulkQualify = async () => {
    if (selectedLeadIds.size === 0) return;
    try {
      setLoading(true);
      await LeadsService.bulkQualify(Array.from(selectedLeadIds));
      showToast(`${selectedLeadIds.size} lead(s) qualified and promoted.`);
      setSelectedLeadIds(new Set());
      await fetchDiscoveredLeads();
      await fetchStats();
    } catch (err: any) {
      showToast(err.message || 'Failed to qualify selected leads.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleBulkReject = async () => {
    if (selectedLeadIds.size === 0) return;
    if (!window.confirm(`Reject the ${selectedLeadIds.size} selected leads?`)) return;
    try {
      setLoading(true);
      await LeadsService.bulkReject(Array.from(selectedLeadIds));
      showToast(`${selectedLeadIds.size} lead(s) rejected.`);
      setSelectedLeadIds(new Set());
      await fetchDiscoveredLeads();
      await fetchStats();
    } catch (err: any) {
      showToast(err.message || 'Failed to reject selected leads.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleBulkExport = () => {
    if (selectedLeadIds.size === 0) return;
    const idsQuery = Array.from(selectedLeadIds).join(',');
    window.open(`http://localhost:5000/api/v1/leads/export/csv?workspaceId=${defaultWorkspaceId}&leadIds=${idsQuery}`, '_blank');
  };

  const handleRunDiscovery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!defaultWorkspaceId) return;
    try {
      setDiscovering(true);
      setError(null);
      const res = await LeadsService.discoverLeads({
        workspaceId: defaultWorkspaceId,
        country: country || undefined,
        state: stateFilter || undefined,
        city: cityFilter || undefined,
        industry: industry || undefined,
        minEmployees: minEmployees ? parseInt(minEmployees, 10) : undefined,
        maxEmployees: maxEmployees ? parseInt(maxEmployees, 10) : undefined,
        fundingStage: fundingStage || undefined,
        revenueRange: revenueRange || undefined,
      });

      const jobs = res.jobs || [];
      if (jobs.length > 0) {
        setCrawlJobs(prev => [...jobs, ...prev]);
        setJobLogs(prev => {
          const next = { ...prev };
          jobs.forEach((job: CrawlJob) => {
            next[job.id] = [`🔍 Queued discovery crawl for ${job.url}`, `⏳ Status: queued`];
          });
          return next;
        });
        setSelectedLogJobId(jobs[0].id); // Auto-expand logs for the first discovery target
        showToast(`Discovery scan queued ${jobs.length} companies for crawling.`);
      } else {
        showToast("No new matching companies found to queue.", "error");
      }
      fetchDiscoveredLeads();
      fetchStats();
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || 'Discovery scan failed.');
    } finally {
      setDiscovering(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAFBFD] text-slate-800 font-sans flex select-none">
      <Sidebar />

      <div className="flex-1 flex flex-col min-h-screen">
        <Header title="Lead Discovery Hub" />

        {/* Inline Toast Notification */}
        {toast && (
          <div className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl border text-xs font-bold transition-all animate-fade-in ${
            toast.type === 'error'
              ? 'bg-rose-950 border-rose-500/40 text-rose-200'
              : 'bg-emerald-950 border-emerald-500/40 text-emerald-200'
          }`}>
            <span className="material-symbols-outlined text-base">
              {toast.type === 'error' ? 'error' : 'check_circle'}
            </span>
            {toast.message}
            <button onClick={() => setToast(null)} className="ml-2 text-current/60 hover:text-current">
              <span className="material-symbols-outlined text-sm">close</span>
            </button>
          </div>
        )}

        <main className="pl-64 flex-1 p-8 space-y-6 max-w-[1400px] mx-auto w-full">
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-xs font-semibold text-red-600">
              ⚠️ System Error: {error}
            </div>
          )}

          {cleanMessage && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-semibold text-emerald-700 flex items-center gap-2">
              <span className="material-symbols-outlined text-sm">check_circle</span>
              {cleanMessage}
            </div>
          )}

          {/* Intro info panel */}
          <div className="bg-surface border border-neutral-200/50 rounded-xl p-6 shadow-sm">
            <h2 className="text-sm font-extrabold text-[#0F172A] tracking-tight mb-1">Crawl Signals Enrichment Queue</h2>
            <p className="text-xs text-slate-500 leading-relaxed font-semibold">
              Inspect recently discovered intent cues captured from deep crawls. Select a lead opportunity to run GPT-4o qualification models and enrich accounts with firmographic and contact parameters.
            </p>
          </div>

          {/* Live Website Ingestion Crawler */}
          <div className="bg-gradient-to-r from-slate-900 to-indigo-950 border border-indigo-900/50 rounded-2xl p-6 shadow-lg text-white relative overflow-hidden transition-all duration-300">
            {/* Background elements */}
            <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-1/4 w-60 h-60 bg-blue-500/5 rounded-full blur-2xl pointer-events-none" />
            
            <div className="relative z-10 flex flex-col gap-5">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                    <h3 className="text-sm font-black tracking-wider text-indigo-300 uppercase">AI Ingestion System</h3>
                  </div>
                  <h2 className="text-lg font-extrabold text-white tracking-tight mt-1">Live Website Crawling Intelligence</h2>
                  <p className="text-xs text-indigo-200/80 leading-relaxed font-semibold max-w-2xl mt-1">
                    Enter any public company URL. The engine recursively visits Home, About, Contact, Careers, Pricing, Blog, Docs, Press, and 15+ page types — extracting emails, phones, social profiles, technology stack, and job listings in real time.
                  </p>
                </div>
                <div className="hidden md:flex w-12 h-12 rounded-xl bg-indigo-500/15 border border-indigo-500/20 items-center justify-center text-indigo-300 shadow-inner">
                  <span className="material-symbols-outlined text-2xl font-bold animate-pulse">travel_explore</span>
                </div>
              </div>

              <form onSubmit={handleStartCrawl} className="flex flex-col sm:flex-row gap-3 items-stretch">
                <div className="relative flex-1">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 material-symbols-outlined text-indigo-400 text-sm">
                    language
                  </span>
                  <input
                    type="text"
                    value={crawlUrl}
                    onChange={(e) => setCrawlUrl(e.target.value)}
                    placeholder="e.g. stripe.com or https://notion.so"
                    required
                    className="w-full h-11 bg-white/5 border border-indigo-500/20 rounded-xl pl-10 pr-4 text-xs font-semibold text-white placeholder-indigo-300/40 focus:outline-none focus:border-indigo-400 focus:bg-white/10 focus:ring-2 focus:ring-indigo-400/20 transition-all font-mono"
                  />
                </div>
                <button
                  type="submit"
                  className="h-11 bg-gradient-to-r from-primary to-indigo-600 hover:from-primary/90 hover:to-indigo-500 text-white font-extrabold text-xs px-6 rounded-xl transition-all shadow-md active:scale-95 flex items-center justify-center gap-2 flex-shrink-0"
                >
                  <span className="material-symbols-outlined text-sm">smart_toy</span>
                  Trigger Live Crawl
                </button>
              </form>

              {crawlJobs.length > 0 && (
                <div className="space-y-3 mt-4">
                  <h4 className="text-[10px] font-black tracking-widest text-indigo-300 uppercase">Live Crawl Queue ({crawlJobs.length})</h4>
                  <div className="grid grid-cols-1 gap-3 max-h-[350px] overflow-y-auto pr-1">
                    {crawlJobs.map((job) => {
                      const progress = jobProgress[job.id] || { crawled: job.pagesCrawled || 0, total: job.pagesTotal || 0 };
                      const logs = jobLogs[job.id] || [];
                      const isExpanded = selectedLogJobId === job.id;
                      
                      return (
                        <div key={job.id} className="bg-black/30 border border-white/10 rounded-xl p-4 backdrop-blur-md flex flex-col gap-3 transition-all duration-300 hover:border-white/20">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              {job.status === 'completed' ? (
                                <span className="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0" />
                              ) : job.status === 'failed' ? (
                                <span className="w-2 h-2 rounded-full bg-rose-400 flex-shrink-0" />
                              ) : (
                                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping flex-shrink-0" />
                              )}
                              <span className="text-xs font-bold text-indigo-100 font-mono truncate max-w-xs sm:max-w-md" title={job.url}>
                                {job.url}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-full uppercase tracking-wider border ${
                                job.status === 'completed' ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300' :
                                job.status === 'failed' ? 'bg-rose-500/15 border-rose-500/30 text-rose-300' :
                                'bg-amber-500/15 border-amber-500/30 text-amber-300'
                              }`}>
                                {job.status}
                              </span>
                              <button
                                type="button"
                                onClick={() => setSelectedLogJobId(isExpanded ? null : job.id)}
                                className="text-[10px] font-bold text-indigo-300 hover:text-white px-2.5 py-1 rounded bg-white/5 hover:bg-white/10 transition-colors flex items-center gap-1"
                              >
                                <span className="material-symbols-outlined text-[12px]">{isExpanded ? 'keyboard_arrow_up' : 'terminal'}</span>
                                {isExpanded ? 'Hide Logs' : 'View Logs'}
                              </button>
                              {job.status === 'completed' && job.leadId && (
                                <button
                                  type="button"
                                  onClick={() => job.leadId && handleSelectLeadRow(job.leadId)}
                                  className="bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-extrabold text-[10px] uppercase tracking-wider px-3 py-1 rounded transition-colors"
                                >
                                  View Lead
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Progress bar */}
                          {(progress.total > 0 || progress.crawled > 0) && (
                            <div>
                              <div className="flex justify-between items-center mb-1">
                                <span className="text-[9px] font-bold text-indigo-300/70">Pages crawled</span>
                                <span className="text-[9px] font-mono text-indigo-200">
                                  {progress.crawled} / {progress.total > 0 ? progress.total : '?'}
                                </span>
                              </div>
                              <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-gradient-to-r from-indigo-500 to-emerald-400 rounded-full transition-all duration-500"
                                  style={{ width: `${progress.total > 0 ? Math.min(100, (progress.crawled / progress.total) * 100) : 0}%` }}
                                />
                              </div>
                            </div>
                          )}

                          {/* Expanded logs terminal */}
                          {isExpanded && (
                            <div className="bg-black/50 rounded-lg border border-white/5 p-3 h-36 overflow-y-auto font-mono text-[9px] leading-relaxed relative">
                              {logs.length === 0 ? (
                                <span className="text-indigo-400/50 animate-pulse">Connecting to crawl engine...</span>
                              ) : (
                                logs.map((line, i) => (
                                  <div
                                    key={i}
                                    className={`${
                                      line.startsWith('✅') ? 'text-emerald-400' :
                                      line.startsWith('❌') || line.startsWith('✗') ? 'text-rose-400' :
                                      line.startsWith('⚠') ? 'text-amber-400' :
                                      line.startsWith('  ↳') ? 'text-cyan-300/80' :
                                      line.startsWith('✓') ? 'text-green-400' :
                                      'text-indigo-200/80'
                                    } mb-0.5`}
                                  >
                                    {line}
                                  </div>
                                ))
                              )}
                              {(job.status === 'queued' || job.status === 'crawling') && (
                                <span className="inline-block w-1.5 h-2.5 bg-indigo-400 animate-pulse ml-0.5" />
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>


          {/* Dashboard Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
            {/* Total Discovered */}
            <div className="bg-surface border border-neutral-200/50 rounded-xl p-5 shadow-sm relative overflow-hidden flex flex-col justify-between h-[110px]">
              <div>
                <span className="text-[10px] font-extrabold text-neutral-400 uppercase tracking-widest block">Total Discovered</span>
                <span className="text-2xl font-black text-[#0F172A] mt-1 block">
                  {stats ? stats.totalDiscovered : '0'}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500">
                <span className="material-symbols-outlined text-sm text-primary">explore</span>
                <span>Ready for qualification</span>
              </div>
            </div>

            {/* Added Today */}
            <div className="bg-surface border border-neutral-200/50 rounded-xl p-5 shadow-sm relative overflow-hidden flex flex-col justify-between h-[110px]">
              <div>
                <span className="text-[10px] font-extrabold text-neutral-400 uppercase tracking-widest block">Added Today</span>
                <span className="text-2xl font-black text-[#0F172A] mt-1 block">
                  {stats ? stats.newAddedToday : '0'}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-600">
                <span className="material-symbols-outlined text-sm text-emerald-500 animate-pulse">new_releases</span>
                <span>Fresh ingestion updates</span>
              </div>
            </div>

            {/* Discovered Contacts */}
            <div className="bg-surface border border-neutral-200/50 rounded-xl p-5 shadow-sm relative overflow-hidden flex flex-col justify-between h-[110px]">
              <div>
                <span className="text-[10px] font-extrabold text-neutral-400 uppercase tracking-widest block">Discovered Contacts</span>
                <span className="text-2xl font-black text-[#0F172A] mt-1 block">
                  {stats ? stats.contactCount : '0'}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500">
                <span className="material-symbols-outlined text-sm text-primary">contacts</span>
                <span>Emails, phones & socials</span>
              </div>
            </div>

            {/* Enrichment Rate */}
            <div className="bg-surface border border-neutral-200/50 rounded-xl p-5 shadow-sm relative overflow-hidden flex flex-col justify-between h-[110px]">
              <div>
                <span className="text-[10px] font-extrabold text-neutral-400 uppercase tracking-widest block">Enrichment Rate</span>
                <span className="text-2xl font-black text-[#0F172A] mt-1 block">
                  {stats ? `${stats.enrichmentRate}%` : '0%'}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 w-full">
                <div className="w-full bg-neutral-100 h-1.5 rounded-full overflow-hidden">
                  <div 
                    className="bg-gradient-to-r from-primary to-ai-purple h-full rounded-full transition-all duration-500" 
                    style={{ width: stats ? `${stats.enrichmentRate}%` : '0%' }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Discovery Filter Controls */}
          <div className="bg-surface border border-neutral-200/50 rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4 border-b border-neutral-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-lg font-bold">query_stats</span>
                <h3 className="text-xs font-extrabold text-[#0F172A] uppercase tracking-wider">Discovery Engine Filters</h3>
              </div>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-1.5 text-[10px] font-bold text-neutral-500 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={shuffleMode}
                    onChange={(e) => setShuffleMode(e.target.checked)}
                    className="rounded border-neutral-300 text-primary focus:ring-primary h-3.5 w-3.5 cursor-pointer"
                  />
                  <span>Shuffle Results</span>
                </label>
                <button 
                  type="button" 
                  onClick={() => {
                    setCountry('');
                    setStateFilter('');
                    setCityFilter('');
                    setIndustry('');
                    setFundingStage('');
                    setRevenueRange('');
                    setMinEmployees('');
                    setMaxEmployees('');
                    setHiringStatusFilter('');
                    setHiringDepartment('');
                  }}
                  className="text-[10px] font-bold text-neutral-400 hover:text-neutral-600 transition-colors flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-xs">restart_alt</span>
                  Reset Filters
                </button>
              </div>
            </div>
            
            <form onSubmit={handleRunDiscovery} className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {/* Country */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] font-extrabold text-neutral-400 uppercase tracking-widest">Country</label>
                  <select
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    className="h-9 bg-[#FAFAFA] border border-neutral-200 rounded-lg px-3 text-xs text-neutral-600 font-bold focus:outline-none focus:border-primary focus:bg-surface transition-all"
                  >
                    <option value="">All Countries</option>
                    {countriesList.map(c => (
                      <option key={c} value={c}>{c}{COUNTRY_ISO[c] ? ` (${COUNTRY_ISO[c]})` : ''}</option>
                    ))}
                  </select>
                </div>

                {/* State */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] font-extrabold text-neutral-400 uppercase tracking-widest">State</label>
                  <select
                    value={stateFilter}
                    onChange={(e) => setStateFilter(e.target.value)}
                    disabled={!country}
                    className="h-9 bg-[#FAFAFA] border border-neutral-200 rounded-lg px-3 text-xs text-neutral-600 font-bold focus:outline-none focus:border-primary focus:bg-surface transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <option value="">All States</option>
                    {statesList.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                {/* City */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] font-extrabold text-neutral-400 uppercase tracking-widest">City</label>
                  <select
                    value={cityFilter}
                    onChange={(e) => setCityFilter(e.target.value)}
                    disabled={!stateFilter}
                    className="h-9 bg-[#FAFAFA] border border-neutral-200 rounded-lg px-3 text-xs text-neutral-600 font-bold focus:outline-none focus:border-primary focus:bg-surface transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <option value="">All Cities</option>
                    {citiesList.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                {/* Industry */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] font-extrabold text-neutral-400 uppercase tracking-widest">Sector/Industry</label>
                  <select
                    value={industry}
                    onChange={(e) => setIndustry(e.target.value)}
                    className="h-9 bg-[#FAFAFA] border border-neutral-200 rounded-lg px-3 text-xs text-neutral-600 font-bold focus:outline-none focus:border-primary focus:bg-surface transition-all"
                  >
                    <option value="">All Sectors</option>
                    {industryOptions.map(ind => (
                      <option key={ind} value={ind}>{ind}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-7 gap-4 items-end mt-4">
                {/* Sub Industry */}
                <div className="flex flex-col gap-1.5 col-span-1">
                  <label className="text-[9px] font-extrabold text-neutral-400 uppercase tracking-widest">Sub Industry</label>
                  <select
                    value={subIndustry}
                    onChange={(e) => setSubIndustry(e.target.value)}
                    className="h-9 bg-[#FAFAFA] border border-neutral-200 rounded-lg px-3 text-xs text-neutral-600 font-bold focus:outline-none focus:border-primary focus:bg-surface transition-all"
                  >
                    <option value="">All Sub Industries</option>
                    {subIndustryOptions.map(ind => (
                      <option key={ind} value={ind}>{ind}</option>
                    ))}
                  </select>
                </div>
                
                {/* Technology */}
                <div className="flex flex-col gap-1.5 col-span-1">
                  <label className="text-[9px] font-extrabold text-neutral-400 uppercase tracking-widest">Technology</label>
                  <select
                    value={technology}
                    onChange={(e) => setTechnology(e.target.value)}
                    className="h-9 bg-[#FAFAFA] border border-neutral-200 rounded-lg px-3 text-xs text-neutral-600 font-bold focus:outline-none focus:border-primary focus:bg-surface transition-all"
                  >
                    <option value="">All Technologies</option>
                    {technologyOptions.map(tech => (
                      <option key={tech} value={tech}>{tech}</option>
                    ))}
                  </select>
                </div>

                {/* Min Score */}
                <div className="flex flex-col gap-1.5 col-span-1">
                  <label className="text-[9px] font-extrabold text-neutral-400 uppercase tracking-widest">Min AI Score</label>
                  <input
                    type="number"
                    value={minScore}
                    onChange={(e) => setMinScore(e.target.value)}
                    placeholder="e.g. 80"
                    className="h-9 bg-[#FAFAFA] border border-neutral-200 rounded-lg px-3 text-xs text-neutral-600 font-bold focus:outline-none focus:border-primary focus:bg-surface transition-all"
                  />
                </div>

                {/* Max Score */}
                <div className="flex flex-col gap-1.5 col-span-1">
                  <label className="text-[9px] font-extrabold text-neutral-400 uppercase tracking-widest">Max AI Score</label>
                  <input
                    type="number"
                    value={maxScore}
                    onChange={(e) => setMaxScore(e.target.value)}
                    placeholder="e.g. 100"
                    className="h-9 bg-[#FAFAFA] border border-neutral-200 rounded-lg px-3 text-xs text-neutral-600 font-bold focus:outline-none focus:border-primary focus:bg-surface transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-7 gap-4 items-end mt-4">
                {/* Funding Stage */}
                <div className="flex flex-col gap-1.5 col-span-1">
                  <label className="text-[9px] font-extrabold text-neutral-400 uppercase tracking-widest">Funding Stage</label>
                  <select
                    value={fundingStage}
                    onChange={(e) => setFundingStage(e.target.value)}
                    className="h-9 bg-[#FAFAFA] border border-neutral-200 rounded-lg px-3 text-xs text-neutral-600 font-bold focus:outline-none focus:border-primary focus:bg-surface transition-all"
                  >
                    <option value="">All Stages</option>
                    {fundingStageOptions.map(stage => (
                      <option key={stage} value={stage}>{stage}</option>
                    ))}
                  </select>
                </div>

                {/* Hiring Status */}
                <div className="flex flex-col gap-1.5 col-span-1">
                  <label className="text-[9px] font-extrabold text-neutral-400 uppercase tracking-widest">Hiring Status</label>
                  <select
                    value={hiringStatusFilter}
                    onChange={(e) => setHiringStatusFilter(e.target.value)}
                    className="h-9 bg-[#FAFAFA] border border-neutral-200 rounded-lg px-3 text-xs text-neutral-600 font-bold focus:outline-none focus:border-primary focus:bg-surface transition-all"
                  >
                    <option value="">All Statuses</option>
                    {hiringStatusOptions.map(status => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>
                </div>

                {/* Hiring Department */}
                <div className="flex flex-col gap-1.5 col-span-1">
                  <label className="text-[9px] font-extrabold text-neutral-400 uppercase tracking-widest">Hiring Department</label>
                  <select
                    value={hiringDepartment}
                    onChange={(e) => setHiringDepartment(e.target.value)}
                    className="h-9 bg-[#FAFAFA] border border-neutral-200 rounded-lg px-3 text-xs text-neutral-600 font-bold focus:outline-none focus:border-primary focus:bg-surface transition-all"
                  >
                    <option value="">All Departments</option>
                    {departmentOptions.map(dept => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                </div>

                {/* Revenue Range */}
                <div className="flex flex-col gap-1.5 col-span-1">
                  <label className="text-[9px] font-extrabold text-neutral-400 uppercase tracking-widest">Revenue Range</label>
                  <select
                    value={revenueRange}
                    onChange={(e) => setRevenueRange(e.target.value)}
                    className="h-9 bg-[#FAFAFA] border border-neutral-200 rounded-lg px-3 text-xs text-neutral-600 font-bold focus:outline-none focus:border-primary focus:bg-surface transition-all"
                  >
                    <option value="">All Ranges</option>
                    {revenueRangeOptions.map(range => (
                      <option key={range} value={range}>{range}</option>
                    ))}
                  </select>
                </div>

                {/* Min Employees */}
                <div className="flex flex-col gap-1.5 col-span-1">
                  <label className="text-[9px] font-extrabold text-neutral-400 uppercase tracking-widest">Min Employees</label>
                  <input
                    type="number"
                    value={minEmployees}
                    onChange={(e) => setMinEmployees(e.target.value)}
                    placeholder="e.g. 10"
                    className="h-9 bg-[#FAFAFA] border border-neutral-200 rounded-lg px-3 text-xs text-neutral-600 font-bold focus:outline-none focus:border-primary focus:bg-surface transition-all"
                  />
                </div>

                {/* Max Employees */}
                <div className="flex flex-col gap-1.5 col-span-1">
                  <label className="text-[9px] font-extrabold text-neutral-400 uppercase tracking-widest">Max Employees</label>
                  <input
                    type="number"
                    value={maxEmployees}
                    onChange={(e) => setMaxEmployees(e.target.value)}
                    placeholder="e.g. 500"
                    className="h-9 bg-[#FAFAFA] border border-neutral-200 rounded-lg px-3 text-xs text-neutral-600 font-bold focus:outline-none focus:border-primary focus:bg-surface transition-all"
                  />
                </div>

                {/* Submit button */}
                <div className="col-span-2 md:col-span-1">
                  <button
                    type="submit"
                    disabled={discovering}
                    className="w-full h-9 bg-gradient-to-r from-primary to-ai-purple text-white rounded-lg text-xs font-extrabold hover:shadow-lg hover:shadow-blue-500/10 active:scale-[0.99] disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                  >
                    {discovering ? (
                      <>
                        <div className="animate-spin rounded-full h-3.5 w-3.5 border-t-2 border-white"></div>
                        Discovering...
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-sm">rocket_launch</span>
                        Discover New Companies
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>

          {/* Table container with horizontal scroll */}
          <div className="bg-surface border border-neutral-200/50 rounded-xl overflow-hidden shadow-sm">
            <div className="px-6 py-4 border-b border-neutral-200/50 flex items-center justify-between bg-white">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-lg font-bold">list_alt</span>
                <h3 className="text-xs font-extrabold text-[#0F172A] uppercase tracking-wider">Discovered Opportunities Queue</h3>
                {(country || stateFilter || cityFilter || industry || hiringDepartment || fundingStage || revenueRange || minEmployees || maxEmployees || hiringStatusFilter) && (
                  <span className="ml-1 px-2 py-0.5 text-[9px] font-black bg-blue-50 text-blue-600 border border-blue-200 rounded-full uppercase tracking-widest">Filtered</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={cleaning}
                  onClick={handleCleanAndRecrawl}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-violet-50 hover:bg-violet-100 border border-violet-200 text-violet-700 hover:text-violet-900 text-[10px] font-bold rounded-lg transition-all disabled:opacity-50"
                  title="Deduplicate historical links and trigger a full background re-crawl of all leads"
                >
                  <span className={`material-symbols-outlined text-xs ${cleaning ? 'animate-spin' : ''}`}>{cleaning ? 'sync' : 'cleaning_services'}</span>
                  {cleaning ? 'Cleaning & Crawling...' : 'Crawl Audit & Clean'}
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    await fetchDiscoveredLeads();
                    await fetchStats();
                  }}
                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-neutral-50 hover:bg-neutral-100 border border-neutral-200 text-neutral-600 hover:text-neutral-800 text-[10px] font-bold rounded-lg transition-all"
                >
                  <span className="material-symbols-outlined text-xs">refresh</span>
                  Refresh Queue
                </button>
              </div>
            </div>

            {selectedLeadIds.size > 0 && (
              <div className="bg-[#EFF6FF] px-6 py-3 border-b border-blue-200 flex items-center justify-between transition-all duration-300">
                <div className="flex items-center gap-2 text-xs font-bold text-blue-700">
                  <span className="material-symbols-outlined text-sm">check_box</span>
                  <span>{selectedLeadIds.size} companies selected</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleBulkQualify}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-[10px] font-extrabold rounded-lg transition-all shadow-sm active:scale-95"
                  >
                    <span className="material-symbols-outlined text-xs">auto_awesome</span>
                    Qualify Selected
                  </button>
                  <button
                    type="button"
                    onClick={handleBulkReject}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#DC2626] hover:bg-[#B91C1C] text-white text-[10px] font-extrabold rounded-lg transition-all shadow-sm active:scale-95"
                  >
                    <span className="material-symbols-outlined text-xs">close</span>
                    Reject Selected
                  </button>
                  <button
                    type="button"
                    onClick={handleBulkExport}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 border border-neutral-300 text-neutral-700 text-[10px] font-bold rounded-lg transition-all shadow-sm active:scale-95"
                  >
                    <span className="material-symbols-outlined text-xs">download</span>
                    Export Selected
                  </button>
                </div>
              </div>
            )}
            
            <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left border-collapse">
              <thead>
                <tr className="bg-neutral-50 border-b border-neutral-200/50">
                  <th className="px-4 py-4 w-12 text-center">
                    <input
                      type="checkbox"
                      checked={getProcessedLeads().length > 0 && getProcessedLeads().every(l => selectedLeadIds.has(l.id))}
                      onChange={() => toggleSelectAll(getProcessedLeads())}
                      className="rounded border-neutral-300 text-primary focus:ring-primary h-3.5 w-3.5 cursor-pointer"
                    />
                  </th>
                  <th className="px-6 py-4 text-[9px] font-extrabold text-neutral-400 uppercase tracking-widest">Company</th>
                  <th className="px-6 py-4 text-[9px] font-extrabold text-neutral-400 uppercase tracking-widest">Location</th>
                  <th className="px-6 py-4 text-[9px] font-extrabold text-neutral-400 uppercase tracking-widest">LinkedIn</th>
                  <th className="px-6 py-4 text-[9px] font-extrabold text-neutral-400 uppercase tracking-widest">Contacts (Email / Phone)</th>
                  <th className="px-6 py-4 text-[9px] font-extrabold text-neutral-400 uppercase tracking-widest">Hiring</th>
                  <th className="px-6 py-4 text-[9px] font-extrabold text-neutral-400 uppercase tracking-widest">Funding</th>
                  <th className="px-6 py-4 text-[9px] font-extrabold text-neutral-400 uppercase tracking-widest">Source</th>
                  <th className="px-6 py-4 text-[9px] font-extrabold text-neutral-400 uppercase tracking-widest">Freshness</th>
                  <th className="px-6 py-4 text-[9px] font-extrabold text-neutral-400 uppercase tracking-widest text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {loading ? (
                  Array.from({ length: 5 }).map((_, idx) => (
                    <tr key={idx} className="animate-pulse">
                      <td className="px-4 py-5 text-center">
                        <div className="w-4 h-4 bg-slate-200 rounded mx-auto"></div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-slate-200 rounded-lg flex-shrink-0"></div>
                          <div className="flex-1 space-y-2">
                            <div className="h-3 bg-slate-200 rounded w-28"></div>
                            <div className="h-2 bg-slate-200 rounded w-16"></div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="h-3 bg-slate-200 rounded w-20"></div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="h-6 bg-slate-200 rounded w-16"></div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="h-3 bg-slate-200 rounded w-24"></div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="h-5 bg-slate-200 rounded w-14"></div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="h-3 bg-slate-200 rounded w-16"></div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="h-5 bg-slate-200 rounded w-16"></div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="h-3 bg-slate-200 rounded w-12"></div>
                      </td>
                      <td className="px-6 py-5 text-right">
                        <div className="flex gap-2 justify-end">
                          <div className="w-7 h-7 bg-slate-200 rounded-lg"></div>
                          <div className="w-7 h-7 bg-slate-200 rounded-lg"></div>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : getProcessedLeads().length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-24 text-center">
                      <div className="flex flex-col items-center justify-center space-y-4 max-w-md mx-auto">
                        <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                          </svg>
                        </div>
                        <div className="space-y-1">
                          <h4 className="text-sm font-extrabold text-[#0F172A] uppercase tracking-wider">Queue Completely Cleared</h4>
                          <p className="text-xs text-neutral-400 font-semibold leading-relaxed">
                            All discovered company profiles in this workspace have been successfully qualified or rejected. Run the discovery engine above to crawl and ingest new accounts.
                          </p>
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  getProcessedLeads().map((lead) => (
                    <React.Fragment key={lead.id}>
                      <tr 
                        id={`lead-row-${lead.id}`}
                        onClick={() => setExpandedLeadId(expandedLeadId === lead.id ? null : lead.id)}
                        className={`hover:bg-neutral-50/50 transition-colors cursor-pointer ${expandedLeadId === lead.id ? 'bg-[#EFF6FF]/40' : ''}`}
                      >
                        <td className="px-4 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={selectedLeadIds.has(lead.id)}
                            onChange={(e) => toggleSelectLead(lead.id, e)}
                            className="rounded border-neutral-300 text-primary focus:ring-primary h-3.5 w-3.5 cursor-pointer"
                          />
                        </td>
                        {/* Company column */}
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center font-extrabold text-[10px] text-primary shadow-sm flex-shrink-0">
                              {lead.companyName.substring(0, 2).toUpperCase()}
                            </div>
                            <div className="flex flex-col min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="font-extrabold text-[#0F172A] text-xs truncate" title={lead.companyName}>{lead.companyName}</span>
                                {lead.status === "DISCOVERED" && (
                                  <span className="px-1.5 py-0.5 text-[8px] font-bold rounded bg-slate-100 text-slate-500 border border-slate-200 uppercase tracking-widest flex-shrink-0">⚙ Ingested</span>
                                )}
                                {lead.status === "CRAWLED" && (
                                  <span className="px-1.5 py-0.5 text-[8px] font-bold rounded bg-blue-50 text-blue-500 border border-blue-100 uppercase tracking-widest flex-shrink-0">🌐 Crawled</span>
                                )}
                                {lead.status === "ENRICHED" && (
                                  <span className="px-1.5 py-0.5 text-[8px] font-bold rounded bg-emerald-50 text-emerald-600 border border-emerald-100 uppercase tracking-widest flex-shrink-0">✨ Enriched</span>
                                )}
                                {lead.status === "QUALIFIED" && (
                                  <span className="px-1.5 py-0.5 text-[8px] font-bold rounded bg-purple-50 text-purple-600 border border-purple-100 uppercase tracking-widest flex-shrink-0">🏆 Qualified</span>
                                )}
                              </div>
                              {lead.website && (
                                <a 
                                  href={lead.website.startsWith('http') ? lead.website : `https://${lead.website}`} 
                                  target="_blank" 
                                  rel="noopener noreferrer" 
                                  className="text-[10px] text-primary hover:underline font-semibold flex items-center gap-0.5 truncate"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <span className="material-symbols-outlined text-[10px]">link</span>
                                  {lead.website.replace(/^https?:\/\/(www\.)?/, '')}
                                </a>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Location column */}
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="text-xs font-bold text-slate-700">{lead.country || 'Unknown'}</span>
                            {lead.city && (
                              <span className="text-[10px] text-neutral-400 font-semibold truncate max-w-[120px]" title={lead.city}>
                                {lead.city}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* LinkedIn column */}
                        <td className="px-6 py-4">
                          {(() => {
                            // Prefer socialProfiles (typed), fall back to legacy socialLinks
                            const li = lead.socialProfiles?.find(s => s.network === 'linkedin') ||
                              lead.socialLinks?.find(s => s.network === 'linkedin');
                            const liUrl = li ? (li as any).socialUrl : null;
                            if (liUrl) {
                              return (
                                <a 
                                  href={liUrl} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1.5 px-2 py-1 bg-[#F3F4F6] hover:bg-[#E5E7EB] border border-[#D1D5DB] rounded text-[10px] font-bold text-[#374151] transition-colors"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <svg className="w-3.5 h-3.5 text-[#0A66C2] flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.32 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.79M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z"/>
                                  </svg>
                                  LinkedIn
                                </a>
                              );
                            }
                            return <span className="text-[10px] text-neutral-400 italic">None</span>;
                          })()}
                        </td>

                        {/* Contacts column */}
                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-1">
                            {/* Emails summary */}
                            {lead.emails && lead.emails.length > 0 ? (
                              <div className="flex flex-wrap gap-1 max-w-[200px]">
                                {lead.emails.slice(0, 1).map((e) => (
                                  <span key={e.id} className="text-[9px] bg-[#EEF2F6] text-neutral-600 px-1.5 py-0.5 rounded font-mono truncate max-w-[150px]" title={e.email}>
                                    {e.email}
                                  </span>
                                ))}
                                {lead.emails.length > 1 && (
                                  <span className="text-[8px] text-primary font-bold bg-blue-50 px-1 py-0.5 rounded">
                                    +{lead.emails.length - 1} more
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-[9px] text-neutral-400 italic">No emails</span>
                            )}
                            {/* Phones summary */}
                            {lead.phones && lead.phones.length > 0 ? (
                              <div className="flex flex-wrap gap-1 max-w-[200px]">
                                {lead.phones.slice(0, 1).map((p) => (
                                  <span key={p.id} className="text-[9px] bg-[#FDF2F8] text-neutral-600 px-1.5 py-0.5 rounded font-mono truncate max-w-[150px]" title={p.phone}>
                                    {p.phone}
                                  </span>
                                ))}
                                {lead.phones.length > 1 && (
                                  <span className="text-[8px] text-pink-600 font-bold bg-pink-50 px-1 py-0.5 rounded">
                                    +{lead.phones.length - 1} more
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-[9px] text-neutral-400 italic">No phones</span>
                            )}
                          </div>
                        </td>

                        {/* Hiring column */}
                        <td className="px-6 py-4">
                          <span className={`px-2 py-0.5 text-[9px] font-bold rounded uppercase tracking-wider ${
                            lead.hiringStatus === 'HIGH_VOLUME' ? 'bg-[#EFF6FF] text-[#0070f3] border border-blue-100' :
                            lead.hiringStatus === 'STABLE' ? 'bg-neutral-100 text-neutral-500 border border-neutral-200' : 'bg-red-50 text-red-500 border border-red-100'
                          }`}>
                            {lead.hiringStatus}
                          </span>
                        </td>

                        {/* Funding column */}
                        <td className="px-6 py-4 font-mono text-[10px] text-slate-500 font-semibold">{lead.funding || 'Unknown'}</td>

                        {/* Source column */}
                        <td className="px-6 py-4">
                          <span className="text-[10px] font-bold text-violet-600 bg-[#EEF2F6] border border-violet-100 px-1.5 py-0.5 rounded">
                            {lead.discoverySource || 'Unknown'}
                          </span>
                        </td>

                        {/* Freshness column */}
                        <td className="px-6 py-4 text-xs font-bold text-slate-500">
                          <span className="flex items-center gap-1">
                            <span className="material-symbols-outlined text-[13px] text-slate-400">schedule</span>
                            {formatFreshness(lead.createdAt)}
                          </span>
                        </td>

                        {/* Actions column */}
                        <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center gap-2 justify-end">
                            <button
                              disabled={enrichingId !== null}
                              onClick={(e) => handleSingleQualify(lead.id, e)}
                              className="w-7 h-7 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-600 rounded-lg text-[10px] font-bold hover:shadow active:scale-90 disabled:opacity-50 transition-all flex items-center justify-center"
                              title="Qualify & Promote"
                            >
                              {enrichingId === lead.id ? (
                                <div className="animate-spin rounded-full h-3 w-3 border-t-2 border-blue-600"></div>
                              ) : (
                                <span className="material-symbols-outlined text-sm">check</span>
                              )}
                            </button>
                            <button
                              disabled={enrichingId !== null}
                              onClick={(e) => handleSingleReject(lead.id, e)}
                              className="w-7 h-7 bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 rounded-lg text-[10px] font-bold hover:shadow active:scale-90 disabled:opacity-50 transition-all flex items-center justify-center"
                              title="Reject Lead"
                            >
                              <span className="material-symbols-outlined text-sm">close</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                      {expandedLeadId === lead.id && (
                        <tr onClick={(e) => e.stopPropagation()}>
                          <td colSpan={10} className="bg-slate-50/70 p-6 border-b border-neutral-200/50">
                            <div className="space-y-6">
                              {/* Intelligence Indicators Header */}
                              <div className="flex flex-wrap items-center justify-between gap-4 bg-white border border-neutral-200/60 rounded-xl p-4 shadow-sm">
                                <div className="flex items-center gap-4">
                                  {/* Quality badge */}
                                  <div>
                                    <span className="text-[9px] font-extrabold text-neutral-400 uppercase tracking-widest block mb-1">Lead Quality</span>
                                    <span className={`px-2.5 py-1 text-xs font-bold rounded-lg border uppercase tracking-wider ${getLeadQuality(lead.aiScore).color}`}>
                                      {getLeadQuality(lead.aiScore).label}
                                    </span>
                                  </div>
                                  {/* Enrichment Status */}
                                  <div>
                                    <span className="text-[9px] font-extrabold text-neutral-400 uppercase tracking-widest block mb-1">Enrichment Status</span>
                                    <span className={`px-2.5 py-1 text-xs font-bold rounded-lg border uppercase tracking-wider ${
                                      lead.status === 'ENRICHED' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                      lead.status === 'CRAWLED' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-slate-100 text-slate-600 border-slate-200'
                                    }`}>
                                      {lead.status === 'ENRICHED' ? 'Enriched' : lead.status === 'CRAWLED' ? 'Crawled' : 'Ingested'}
                                    </span>
                                  </div>
                                  {/* Source reliability */}
                                  <div>
                                    <span className="text-[9px] font-extrabold text-neutral-400 uppercase tracking-widest block mb-1">Source Reliability</span>
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-xs font-bold text-neutral-800">{getSourceReliability(lead.discoverySource).percentage}%</span>
                                      <span className={`text-[10px] font-bold ${getSourceReliability(lead.discoverySource).color}`}>
                                        ({getSourceReliability(lead.discoverySource).label})
                                      </span>
                                    </div>
                                  </div>
                                </div>
                                
                                {/* Data Completeness */}
                                <div className="flex items-center gap-3">
                                  <div className="text-right">
                                    <span className="text-[9px] font-extrabold text-neutral-400 uppercase tracking-widest block mb-0.5">Data Completeness</span>
                                    <span className="text-xs font-black text-slate-800">{calculateDataCompleteness(lead)}%</span>
                                  </div>
                                  <div className="w-24 bg-neutral-100 h-2 rounded-full overflow-hidden border border-neutral-200/40">
                                    <div 
                                      className="bg-gradient-to-r from-blue-500 to-indigo-500 h-full rounded-full transition-all duration-500" 
                                      style={{ width: `${calculateDataCompleteness(lead)}%` }}
                                    />
                                  </div>
                                </div>
                              </div>

                              {/* Dual column: Company Details & AI Insights */}
                              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                                {/* Left Column: Company Profile & Details (7 cols) */}
                                <div className="lg:col-span-7 space-y-6">
                                  
                                  {/* Company Profile Card */}
                                  <div className="bg-white border border-neutral-200/60 rounded-xl p-5 shadow-sm space-y-4">
                                    <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
                                      <div className="flex items-center gap-2">
                                        <span className="material-symbols-outlined text-primary text-lg font-bold">domain</span>
                                        <h4 className="text-xs font-extrabold text-[#0F172A] uppercase tracking-wider">Company Profile</h4>
                                      </div>
                                      
                                      {/* Finding highlights */}
                                      <div className="flex flex-wrap gap-1.5">
                                        {lead.employees >= 500 && (
                                          <span className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-blue-50 text-blue-600 border border-blue-100">⚡ High Growth</span>
                                        )}
                                        {lead.funding && (
                                          <span className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-emerald-50 text-emerald-600 border border-emerald-100">💰 Funded</span>
                                        )}
                                        {lead.hiringStatus === 'HIGH_VOLUME' && (
                                          <span className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-pink-50 text-pink-600 border border-pink-100">🔥 Active Hiring</span>
                                        )}
                                      </div>
                                    </div>

                                    <div className="space-y-3">
                                      <div>
                                        <span className="text-[9px] font-extrabold text-neutral-400 uppercase tracking-widest block mb-0.5">Company Overview</span>
                                        <p className="text-xs text-neutral-700 leading-relaxed font-medium">
                                          {lead.companyName} is an enterprise-scale organization operating in the <span className="font-bold text-[#0F172A]">{lead.sector || 'Unknown'}</span> sector, specifically specializing in <span className="font-bold text-[#0F172A]">{lead.industry || 'Unknown'}</span>.
                                        </p>
                                      </div>

                                      <div>
                                        <span className="text-[9px] font-extrabold text-neutral-400 uppercase tracking-widest block mb-0.5">Company Description</span>
                                        <p className="text-xs text-neutral-500 leading-relaxed font-semibold">
                                          {lead.description || (lead.insights && lead.insights.length > 0 ? lead.insights[0].summary : `${lead.companyName} is a high-intent company identified via deep web crawls.`)}
                                        </p>
                                      </div>

                                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2 border-t border-neutral-100">
                                        <div>
                                          <span className="text-[9px] font-extrabold text-neutral-400 uppercase tracking-widest block">Sector</span>
                                          <span className="text-xs font-bold text-neutral-800">{lead.sector || 'Unknown'}</span>
                                        </div>
                                        <div>
                                          <span className="text-[9px] font-extrabold text-neutral-400 uppercase tracking-widest block">Employees</span>
                                          <span className="text-xs font-bold text-neutral-800">{lead.employees ? lead.employees.toLocaleString() : 'Unknown'}</span>
                                        </div>
                                        <div>
                                          <span className="text-[9px] font-extrabold text-neutral-400 uppercase tracking-widest block">Headquarters</span>
                                          <span className="text-xs font-bold text-neutral-800 truncate block" title={`${lead.city || ''}, ${lead.state || ''}, ${lead.country || ''}`.trim().replace(/^,|,$/, '')}>
                                            {`${lead.city || ''}${lead.city && lead.state ? ', ' : ''}${lead.state || ''}${ (lead.city || lead.state) && lead.country ? ' (' : ''}${lead.country || ''}${(lead.city || lead.state) && lead.country ? ')' : ''}` || 'Unknown'}
                                          </span>
                                        </div>
                                        <div>
                                          <span className="text-[9px] font-extrabold text-neutral-400 uppercase tracking-widest block">Funding</span>
                                          <span className="text-xs font-bold text-neutral-800 truncate block" title={lead.funding || 'Unknown'}>{lead.funding || 'Unknown'}</span>
                                        </div>
                                      </div>

                                      {(lead.fullAddress || lead.postalCode || (lead.latitude !== undefined && lead.latitude !== null)) && (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 mt-2 border-t border-neutral-100">
                                          {lead.fullAddress && (
                                            <div className="col-span-1">
                                              <span className="text-[9px] font-extrabold text-neutral-400 uppercase tracking-widest block">Full Address</span>
                                              <span className="text-xs font-bold text-neutral-800 leading-normal block">
                                                {lead.fullAddress} {lead.postalCode ? `(${lead.postalCode})` : ''}
                                              </span>
                                            </div>
                                          )}
                                          {lead.latitude !== undefined && lead.latitude !== null && lead.longitude !== undefined && lead.longitude !== null && (
                                            <div className="col-span-1">
                                              <span className="text-[9px] font-extrabold text-neutral-400 uppercase tracking-widest block">Coordinates</span>
                                              <span className="text-xs font-mono font-bold text-violet-600 block">
                                                {lead.latitude.toFixed(6)}, {lead.longitude.toFixed(6)}
                                              </span>
                                            </div>
                                          )}
                                        </div>
                                      )} 
                                    </div>
                                  </div>

                                  {/* Discovery Metrics Section (Replacing the old sections) */}
                                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    
                                    {/* Card 1: Emails Found */}
                                    <div className="bg-white border border-neutral-200/60 rounded-xl p-4 shadow-sm flex flex-col justify-between min-h-[140px]">
                                      <div>
                                        <div className="flex items-center justify-between border-b border-neutral-100 pb-2 mb-2">
                                          <span className="text-[10px] font-extrabold text-[#0F172A] uppercase tracking-wider flex items-center gap-1">
                                            <span className="material-symbols-outlined text-xs text-primary">mail</span>
                                            Emails
                                          </span>
                                          <span className="px-1.5 py-0.5 rounded-full bg-blue-50 text-primary text-[10px] font-black">
                                            {lead.emails ? lead.emails.length : 0}
                                          </span>
                                        </div>
                                        
                                        {lead.emails && lead.emails.length > 0 ? (
                                          <div className="space-y-1.5 max-h-[80px] overflow-y-auto pr-1">
                                            {lead.emails.map(e => (
                                              <div key={e.id} className="flex justify-between items-center gap-1.5">
                                                <span className="text-[10px] font-semibold text-neutral-700 truncate select-all" title={e.email}>{e.email}</span>
                                                <span className="text-[8px] font-bold text-violet-600 bg-violet-50 px-1 py-0.5 rounded flex-shrink-0">
                                                  {Math.round(e.confidenceScore * 100)}%
                                                </span>
                                              </div>
                                            ))}
                                          </div>
                                        ) : (
                                          <div className="flex flex-col items-center justify-center py-4 text-center">
                                            <span className="material-symbols-outlined text-slate-300 text-lg">mail_lock</span>
                                            <span className="text-[9px] text-neutral-400 italic mt-1 font-semibold">No emails discovered yet</span>
                                          </div>
                                        )}
                                      </div>
                                    </div>

                                    {/* Card 2: Phone Numbers Found */}
                                    <div className="bg-white border border-neutral-200/60 rounded-xl p-4 shadow-sm flex flex-col justify-between min-h-[140px]">
                                      <div>
                                        <div className="flex items-center justify-between border-b border-neutral-100 pb-2 mb-2">
                                          <span className="text-[10px] font-extrabold text-[#0F172A] uppercase tracking-wider flex items-center gap-1">
                                            <span className="material-symbols-outlined text-xs text-primary">phone</span>
                                            Phone Numbers
                                          </span>
                                          <span className="px-1.5 py-0.5 rounded-full bg-pink-50 text-pink-600 text-[10px] font-black">
                                            {lead.phones ? lead.phones.length : 0}
                                          </span>
                                        </div>
                                        
                                        {lead.phones && lead.phones.length > 0 ? (
                                          <div className="space-y-1.5 max-h-[80px] overflow-y-auto pr-1">
                                            {lead.phones.map(p => (
                                              <div key={p.id} className="flex justify-between items-center gap-1.5">
                                                <span className="text-[10px] font-semibold text-neutral-700 truncate select-all">{p.phone}</span>
                                                <span className="text-[8px] font-bold text-violet-600 bg-violet-50 px-1 py-0.5 rounded flex-shrink-0">
                                                  {Math.round(p.confidenceScore * 100)}%
                                                </span>
                                              </div>
                                            ))}
                                          </div>
                                        ) : (
                                          <div className="flex flex-col items-center justify-center py-4 text-center">
                                            <span className="material-symbols-outlined text-slate-300 text-lg">phone_disabled</span>
                                            <span className="text-[9px] text-neutral-400 italic mt-1 font-semibold">No phone numbers discovered yet</span>
                                          </div>
                                        )}
                                      </div>
                                    </div>

                                    {/* Card 3: Social Profiles Discovered */}
                                    {(() => {
                                      const profiles = getUniqueSocialProfiles(lead.socialProfiles);
                                      // Fall back to filtered socialLinks for legacy data
                                      const legacyProfiles = profiles.length > 0 ? [] :
                                        getUniqueSocialLinks(lead.socialLinks?.filter(s =>
                                          ['linkedin','github','twitter','facebook','instagram','youtube'].includes(s.network)
                                        ));
                                      const allProfiles = profiles.length > 0 ? profiles : legacyProfiles;
                                      return (
                                        <div className="bg-white border border-neutral-200/60 rounded-xl p-4 shadow-sm flex flex-col justify-between min-h-[140px]">
                                          <div>
                                            <div className="flex items-center justify-between border-b border-neutral-100 pb-2 mb-2">
                                              <span className="text-[10px] font-extrabold text-[#0F172A] uppercase tracking-wider flex items-center gap-1">
                                                <span className="material-symbols-outlined text-xs text-primary">share</span>
                                                Social Profiles
                                              </span>
                                              <span className="px-1.5 py-0.5 rounded-full bg-indigo-50 text-indigo-600 text-[10px] font-black">
                                                {allProfiles.length}
                                              </span>
                                            </div>

                                            {allProfiles.length > 0 ? (
                                              <div className="flex flex-wrap gap-2 pt-1 max-h-[80px] overflow-y-auto pr-1">
                                                {allProfiles.map(s => {
                                                  const url = (s as any).socialUrl || (s as any).url;
                                                  const platform = detectPlatform(url);
                                                  return (
                                                    <a
                                                      key={s.id}
                                                      href={url.startsWith('http') ? url : `https://${url}`}
                                                      target="_blank"
                                                      rel="noopener noreferrer"
                                                      className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-neutral-200 hover:border-primary/20 hover:shadow-sm text-[10px] font-bold ${platform.color} ${platform.bg} transition-all duration-300`}
                                                      title={url}
                                                    >
                                                      {platform.svg ? (
                                                        <div dangerouslySetInnerHTML={{ __html: platform.svg.replace('w-4 h-4', 'w-3 h-3') }} />
                                                      ) : (
                                                        <span className="material-symbols-outlined text-[10px]">{platform.icon}</span>
                                                      )}
                                                      {platform.label}
                                                    </a>
                                                  );
                                                })}
                                              </div>
                                            ) : (
                                              <div className="flex flex-col items-center justify-center py-4 text-center">
                                                <span className="material-symbols-outlined text-slate-300 text-lg">public_off</span>
                                                <span className="text-[9px] text-neutral-400 italic mt-1 font-semibold">No social profiles discovered yet</span>
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      );
                                    })()}

                                  </div>

                                </div>

                                {/* Right Column: AI Insights Panel (5 cols) */}
                                <div className="lg:col-span-5 space-y-6">
                                  
                                  {/* AI Insights Card */}
                                  <div className="bg-white border border-neutral-200/60 rounded-xl p-5 shadow-sm space-y-5 relative overflow-hidden">
                                    {/* Subtle background glow */}
                                    <div className="absolute -right-24 -top-24 w-48 h-48 bg-purple-500/5 rounded-full blur-3xl pointer-events-none" />
                                    
                                    <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
                                      <div className="flex items-center gap-2">
                                        <span className="material-symbols-outlined text-ai-purple text-lg font-bold">auto_awesome</span>
                                        <h4 className="text-xs font-extrabold text-[#0F172A] uppercase tracking-wider">AI Lead Intelligence</h4>
                                      </div>
                                      
                                      {/* Priority Badge */}
                                      {(() => {
                                        const score = lead.aiScore;
                                        let bg = 'bg-red-50 text-red-700 border-red-200';
                                        let label = 'HIGH';
                                        if (score < 60) {
                                          bg = 'bg-slate-100 text-slate-700 border-slate-200';
                                          label = 'LOW';
                                        } else if (score < 80) {
                                          bg = 'bg-amber-50 text-amber-700 border-amber-200';
                                          label = 'MEDIUM';
                                        }
                                        return (
                                          <span className={`px-2 py-0.5 rounded text-[9px] font-black border uppercase tracking-wider ${bg}`}>
                                            {label} PRIORITY
                                          </span>
                                        );
                                      })()}
                                    </div>

                                    {/* Dial / Circular Score & Calculated Confidence */}
                                    <div className="grid grid-cols-2 gap-4 bg-neutral-50/50 p-3.5 rounded-xl border border-neutral-200/40">
                                      {/* Score Circle */}
                                      <div className="flex items-center gap-2.5">
                                        <div className="relative w-12 h-12 flex items-center justify-center flex-shrink-0">
                                          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                                            <path
                                              className="text-neutral-200"
                                              strokeWidth="3.2"
                                              stroke="currentColor"
                                              fill="none"
                                              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                            />
                                            <path
                                              className="text-ai-purple"
                                              strokeDasharray={`${lead.aiScore}, 100`}
                                              strokeWidth="3.5"
                                              strokeLinecap="round"
                                              stroke="currentColor"
                                              fill="none"
                                              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                            />
                                          </svg>
                                          <div className="absolute flex flex-col items-center justify-center">
                                            <span className="text-xs font-black text-slate-800 leading-none">{lead.aiScore}</span>
                                          </div>
                                        </div>
                                        <div>
                                          <span className="text-[9px] font-extrabold text-neutral-400 uppercase tracking-widest block">AI Score</span>
                                          <span className="text-xs font-bold text-neutral-800">{lead.aiScore >= 75 ? 'Qualified' : 'Nurture'}</span>
                                        </div>
                                      </div>

                                      {/* Confidence Rating */}
                                      {(() => {
                                        const confidence = lead.confidenceScore !== undefined && lead.confidenceScore > 0 
                                          ? Math.round(lead.confidenceScore) 
                                          : calculateConfidenceScore(lead);
                                        return (
                                          <div className="flex items-center gap-2.5 border-l border-neutral-200 pl-4">
                                            <div className="relative w-12 h-12 flex items-center justify-center flex-shrink-0">
                                              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                                                <path
                                                  className="text-neutral-200"
                                                  strokeWidth="3.2"
                                                  stroke="currentColor"
                                                  fill="none"
                                                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                                />
                                                <path
                                                  className="text-primary"
                                                  strokeDasharray={`${confidence}, 100`}
                                                  strokeWidth="3.5"
                                                  strokeLinecap="round"
                                                  stroke="currentColor"
                                                  fill="none"
                                                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                                />
                                              </svg>
                                              <div className="absolute flex flex-col items-center justify-center">
                                                <span className="text-xs font-black text-slate-800 leading-none">{confidence}%</span>
                                              </div>
                                            </div>
                                            <div>
                                              <span className="text-[9px] font-extrabold text-neutral-400 uppercase tracking-widest block">Confidence</span>
                                              <span className="text-xs font-bold text-neutral-800">{confidence >= 80 ? 'High' : confidence >= 60 ? 'Medium' : 'Low'}</span>
                                            </div>
                                          </div>
                                        );
                                      })()}
                                    </div>

                                    {/* Explainable AI Score Breakdown */}
                                    <div className="bg-neutral-50/30 p-3 rounded-xl border border-neutral-200/50 space-y-2.5">
                                      <span className="text-[9px] font-extrabold text-neutral-400 uppercase tracking-widest block">Explainable AI Scoring Factors</span>
                                      
                                      <div className="space-y-1.5 text-[11px] font-semibold text-neutral-600">
                                        {getScoreFactors(lead).map((factor, idx) => (
                                          <div key={idx} className="flex justify-between items-center">
                                            <div className="flex items-center gap-1">
                                              <span className={factor.isPositive ? 'text-emerald-500 font-bold' : 'text-[#DC2626] font-bold'}>
                                                {factor.isPositive ? '✓' : '✗'}
                                              </span>
                                              <span>{factor.label}</span>
                                            </div>
                                            <span className={`font-mono font-bold ${factor.isPositive ? 'text-emerald-600' : 'text-[#DC2626]'}`}>
                                              {factor.isPositive ? `+${factor.value}` : factor.value}
                                            </span>
                                          </div>
                                        ))}
                                      </div>
                                      
                                      <div className="pt-2 border-t border-neutral-100">
                                        <p className="text-[10px] text-neutral-500 italic font-medium leading-relaxed">
                                          <strong className="text-slate-700 not-italic uppercase tracking-wider text-[8px] font-extrabold mr-1 block">Final Reasoning:</strong>
                                          {getFinalReasoning(lead, lead.aiScore)}
                                        </p>
                                      </div>
                                    </div>

                                    {/* Lead Opportunity Analysis */}
                                    <div className="space-y-2.5 pt-1">
                                      <span className="text-[9px] font-extrabold text-neutral-400 uppercase tracking-widest block">Opportunity Analysis</span>
                                      <div className="grid grid-cols-2 gap-3.5 text-[11px] font-semibold text-neutral-600">
                                        <div className="bg-neutral-50/50 p-2.5 rounded-lg border border-neutral-200/30">
                                          <strong className="text-[#0F172A] block mb-0.5 text-[10px]">Value Thesis</strong>
                                          <span className="leading-tight block text-neutral-500 font-medium">
                                            Compatible {lead.sector || 'SaaS'} partner with headcount size of {lead.employees} showing operational capacity.
                                          </span>
                                        </div>
                                        <div className="bg-neutral-50/50 p-2.5 rounded-lg border border-neutral-200/30">
                                          <strong className="text-[#0F172A] block mb-0.5 text-[10px]">Buying Signals</strong>
                                          <span className="leading-tight block text-neutral-500 font-medium">
                                            {lead.hiringStatus === 'HIGH_VOLUME' ? 'Active hiring spikes suggest development scaling.' : lead.funding ? 'Funding round aligns with procurement cycles.' : 'Standard operational activity with validated presence.'}
                                          </span>
                                        </div>
                                        <div className="bg-neutral-50/50 p-2.5 rounded-lg border border-neutral-200/30">
                                          <strong className="text-[#0F172A] block mb-0.5 text-[10px]">Growth Indicators</strong>
                                          <span className="leading-tight block text-neutral-500 font-medium">
                                            {lead.employees > 100 ? 'Established enterprise footprint.' : 'Growth-stage agile team operations.'} ({lead.employees} headcount)
                                          </span>
                                        </div>
                                        <div className="bg-neutral-50/50 p-2.5 rounded-lg border border-neutral-200/30">
                                          <strong className="text-[#0F172A] block mb-0.5 text-[10px]">Credibility Signal</strong>
                                          <span className="leading-tight block text-neutral-500 font-medium">
                                            Vetted platform details discovered via {lead.discoverySource || 'Ingested source'}.
                                          </span>
                                        </div>
                                      </div>
                                    </div>

                                    {/* Dynamic Trend Indicators */}
                                    <div className="space-y-2">
                                      <span className="text-[9px] font-extrabold text-neutral-400 uppercase tracking-widest block">Dynamic Trends</span>
                                      <div className="flex flex-wrap gap-1.5">
                                        {lead.funding && (
                                          <span className="px-2 py-1 text-[9px] font-bold rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-100 flex items-center gap-1">
                                            <span>💰</span> Funded Company
                                          </span>
                                        )}
                                        {lead.hiringStatus !== 'NONE' && (
                                          <span className="px-2 py-1 text-[9px] font-bold rounded-lg bg-blue-50 text-blue-700 border border-blue-100 flex items-center gap-1">
                                            <span>🔥</span> Hiring Activity
                                          </span>
                                        )}
                                        {(() => {
                                          const profileCount = getUniqueSocialProfiles(lead.socialProfiles).length ||
                                            getUniqueSocialLinks(lead.socialLinks?.filter(s =>
                                              ['linkedin','github','twitter','facebook','instagram','youtube'].includes(s.network)
                                            )).length;
                                          return profileCount >= 2 ? (
                                            <span className="px-2 py-1 text-[9px] font-bold rounded-lg bg-purple-50 text-purple-700 border border-purple-100 flex items-center gap-1">
                                              <span>📈</span> Omnichannel Socials
                                            </span>
                                          ) : null;
                                        })()}
                                        {(lead.sector.toLowerCase().includes('ai') || lead.sector.toLowerCase().includes('data') || lead.sector.toLowerCase().includes('software') || lead.sector.toLowerCase().includes('infra')) && (
                                          <span className="px-2 py-1 text-[9px] font-bold rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-100 flex items-center gap-1">
                                            <span>💻</span> Modern Tech Stack
                                          </span>
                                        )}
                                      </div>
                                    </div>

                                    {/* Outreach Strategy Panel */}
                                    {(() => {
                                      const hasEmail = (lead.emails && lead.emails.length > 0) || lead.email;
                                      const hasPhone = (lead.phones && lead.phones.length > 0) || lead.phone;
                                      // Check socialProfiles first (typed), fall back to legacy socialLinks
                                      const hasLinkedIn =
                                        (lead.socialProfiles && lead.socialProfiles.some(s => s.network === 'linkedin')) ||
                                        (lead.socialLinks && lead.socialLinks.some(s => s.network === 'linkedin'));
                                      
                                      let primaryChannel = 'Website contact form';
                                      let sequence = 'Day 1: Contact form submission -> Day 4: Follow up check';
                                      let messageAngle = `Strategic efficiency within the ${lead.industry || lead.sector} space.`;
                                      
                                      if (hasEmail) {
                                        primaryChannel = 'Direct Email';
                                        sequence = 'Day 1: Cold Email Pitch -> Day 4: Case Study Follow-Up -> Day 7: Final Break-Up Value Check';
                                      } else if (hasLinkedIn) {
                                        primaryChannel = 'LinkedIn Connect';
                                        sequence = 'Day 1: LinkedIn connection -> Day 3: Custom InMail note -> Day 7: Follow up message';
                                      } else if (hasPhone) {
                                        primaryChannel = 'Direct Phone Line';
                                        sequence = 'Day 1: Warm introduction call -> Day 3: Alternative coordinate inquiry';
                                      }
                                      
                                      if (lead.sector.toLowerCase().includes('ai') || lead.sector.toLowerCase().includes('data')) {
                                        messageAngle = 'Productivity acceleration, automated workflows, and high-efficiency model orchestration.';
                                      } else if (lead.hiringStatus === 'HIGH_VOLUME') {
                                        messageAngle = 'Leveraging recruitment acceleration and operational headcount-scaling optimization.';
                                      } else if (lead.funding) {
                                        messageAngle = 'Capitalization runway extensions, scaling milestones, and high-velocity growth support.';
                                      }
                                      
                                      return (
                                        <div className="bg-[#FAFBFD] border border-neutral-200/60 rounded-xl p-3.5 space-y-2.5">
                                          <span className="text-[9px] font-extrabold text-neutral-400 uppercase tracking-widest block">Outreach Strategy</span>
                                          
                                          <div className="space-y-1.5 text-[11px] font-semibold text-neutral-600">
                                            <div>
                                              <span className="text-slate-400 block text-[8px] font-extrabold uppercase">Primary Channel</span>
                                              <span className="text-[#0F172A] font-bold">{primaryChannel}</span>
                                            </div>
                                            <div>
                                              <span className="text-slate-400 block text-[8px] font-extrabold uppercase">Recommended Sequence</span>
                                              <span className="text-[#0F172A] leading-relaxed block text-[10px]">{sequence}</span>
                                            </div>
                                            <div>
                                              <span className="text-slate-400 block text-[8px] font-extrabold uppercase">Messaging Angle</span>
                                              <span className="text-neutral-500 font-medium leading-relaxed block text-[10px]">{messageAngle}</span>
                                            </div>
                                          </div>
                                        </div>
                                      );
                                    })()}

                                    {/* AI Lead Recommendations (Context-Aware Matching) */}
                                    {(() => {
                                      const matchingCompanies = leads.filter(l => l.id !== lead.id && l.sector === lead.sector).slice(0, 2);
                                      const matchingIndustries = leads.filter(l => l.id !== lead.id && l.industry === lead.industry).slice(0, 2);
                                      const relatedProspects = leads.filter(l => l.id !== lead.id && l.country === lead.country && l.aiScore >= 70).slice(0, 2);
                                      
                                      const hasRecs = matchingCompanies.length > 0 || matchingIndustries.length > 0 || relatedProspects.length > 0;
                                      
                                      if (!hasRecs) return null;
                                      
                                      return (
                                        <div className="pt-3 border-t border-neutral-100 space-y-2.5">
                                          <span className="text-[9px] font-extrabold text-neutral-400 uppercase tracking-widest block">AI Lead Recommendations</span>
                                          
                                          <div className="space-y-2 text-[10px] font-semibold">
                                            {matchingCompanies.length > 0 && (
                                              <div className="flex flex-col gap-1">
                                                <span className="text-slate-400 text-[8px] font-extrabold uppercase tracking-wider">Similar Companies</span>
                                                <div className="flex flex-wrap gap-1.5">
                                                  {matchingCompanies.map(rec => (
                                                    <button
                                                      key={rec.id}
                                                      type="button"
                                                      onClick={() => setExpandedLeadId(rec.id)}
                                                      className="px-2 py-1 bg-slate-50 border border-slate-200 hover:border-primary/30 hover:bg-primary-container/20 text-[9px] font-extrabold rounded-lg text-slate-700 hover:text-primary transition-all flex items-center gap-1"
                                                    >
                                                      <span className="material-symbols-outlined text-[10px]">explore</span>
                                                      {rec.companyName} ({rec.aiScore})
                                                    </button>
                                                  ))}
                                                </div>
                                              </div>
                                            )}

                                            {matchingIndustries.length > 0 && (
                                              <div className="flex flex-col gap-1">
                                                <span className="text-slate-400 text-[8px] font-extrabold uppercase tracking-wider">Similar Industries</span>
                                                <div className="flex flex-wrap gap-1.5">
                                                  {matchingIndustries.map(rec => (
                                                    <button
                                                      key={rec.id}
                                                      type="button"
                                                      onClick={() => setExpandedLeadId(rec.id)}
                                                      className="px-2 py-1 bg-slate-50 border border-slate-200 hover:border-primary/30 hover:bg-primary-container/20 text-[9px] font-extrabold rounded-lg text-slate-700 hover:text-primary transition-all flex items-center gap-1"
                                                    >
                                                      <span className="material-symbols-outlined text-[10px]">category</span>
                                                      {rec.companyName} ({rec.aiScore})
                                                    </button>
                                                  ))}
                                                </div>
                                              </div>
                                            )}

                                            {relatedProspects.length > 0 && (
                                              <div className="flex flex-col gap-1">
                                                <span className="text-slate-400 text-[8px] font-extrabold uppercase tracking-wider">Related Prospects ({lead.country})</span>
                                                <div className="flex flex-wrap gap-1.5">
                                                  {relatedProspects.map(rec => (
                                                    <button
                                                      key={rec.id}
                                                      type="button"
                                                      onClick={() => setExpandedLeadId(rec.id)}
                                                      className="px-2 py-1 bg-slate-50 border border-slate-200 hover:border-primary/30 hover:bg-primary-container/20 text-[9px] font-extrabold rounded-lg text-slate-700 hover:text-primary transition-all flex items-center gap-1"
                                                    >
                                                      <span className="material-symbols-outlined text-[10px]">person_pin_circle</span>
                                                      {rec.companyName} ({rec.aiScore})
                                                    </button>
                                                  ))}
                                                </div>
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      );
                                    })()}

                                  </div>

                                </div>
                              </div>

                              {/* Crawled Intelligence — Categorized Sections */}
                              {(() => {
                                const socialProfiles = getUniqueSocialProfiles(lead.socialProfiles);
                                const contactPages = getUniquePages(lead.contactPages);
                                const aboutPages = getUniquePages(lead.aboutPages);
                                const supportPages = getUniquePages(lead.supportPages);
                                const careersPages = getUniquePages(lead.careersPages);
                                const productPages = getUniquePages(lead.productPages);

                                // Aggregate all entries for the audit log table
                                type AuditEntry = { id: string; url: string; sourceUrl: string; discoveryPage: string | null; crawlTimestamp: string; category: string; validationStatus?: string; };
                                const auditEntries: AuditEntry[] = [
                                  ...socialProfiles.map(s => ({ id: s.id, url: s.socialUrl, sourceUrl: s.sourceUrl, discoveryPage: s.discoveryPage, crawlTimestamp: s.crawlTimestamp, category: s.network.toUpperCase(), validationStatus: s.validationStatus })),
                                  ...contactPages.map(p => ({ id: p.id, url: p.url, sourceUrl: p.sourceUrl, discoveryPage: p.discoveryPage, crawlTimestamp: p.crawlTimestamp, category: 'CONTACT PAGE' })),
                                  ...aboutPages.map(p => ({ id: p.id, url: p.url, sourceUrl: p.sourceUrl, discoveryPage: p.discoveryPage, crawlTimestamp: p.crawlTimestamp, category: 'ABOUT PAGE' })),
                                  ...supportPages.map(p => ({ id: p.id, url: p.url, sourceUrl: p.sourceUrl, discoveryPage: p.discoveryPage, crawlTimestamp: p.crawlTimestamp, category: 'SUPPORT PAGE' })),
                                  ...careersPages.map(p => ({ id: p.id, url: p.url, sourceUrl: p.sourceUrl, discoveryPage: p.discoveryPage, crawlTimestamp: p.crawlTimestamp, category: 'CAREERS PAGE' })),
                                  ...productPages.map(p => ({ id: p.id, url: p.url, sourceUrl: p.sourceUrl, discoveryPage: p.discoveryPage, crawlTimestamp: p.crawlTimestamp, category: 'PRODUCT PAGE' })),
                                ];

                                // Also fall back to legacy socialLinks (filtered to true social platforms) if no typed profiles exist
                                const legacySocials = socialProfiles.length === 0 ?
                                  getUniqueSocialLinks(lead.socialLinks?.filter(s =>
                                    ['linkedin','github','twitter','facebook','instagram','youtube'].includes(s.network)
                                  )) : [];
                                if (legacySocials.length > 0 && auditEntries.length === 0) {
                                  legacySocials.forEach(s => auditEntries.push({ id: s.id, url: s.socialUrl, sourceUrl: s.sourceUrl, discoveryPage: s.discoveryPage, crawlTimestamp: s.crawlTimestamp, category: s.network.toUpperCase(), validationStatus: s.validationStatus }));
                                }

                                const hasAnyData = auditEntries.length > 0 || legacySocials.length > 0;

                                return (
                                  <>
                                    {/* Technologies Stack Section */}
                                    {lead.technologies && (() => {
                                      try {
                                        const techs = JSON.parse(lead.technologies) as string[];
                                        if (techs.length > 0) {
                                          return (
                                            <div className="bg-white border border-neutral-200/60 rounded-xl p-5 shadow-sm space-y-3">
                                              <div className="flex items-center gap-2 border-b border-neutral-100 pb-3 mb-1">
                                                <span className="material-symbols-outlined text-primary text-lg font-bold">integration_instructions</span>
                                                <h4 className="text-xs font-extrabold text-[#0F172A] uppercase tracking-wider">Detected Technology Stack</h4>
                                                <span className="ml-auto px-2 py-0.5 rounded-full bg-blue-50 text-primary text-[9px] font-black">
                                                  {techs.length}
                                                </span>
                                              </div>
                                              <div className="flex flex-wrap gap-2 pt-1">
                                                {techs.map(tech => (
                                                  <span key={tech} className="px-2.5 py-1 bg-neutral-50 hover:bg-neutral-100 border border-neutral-200 text-slate-700 rounded-lg text-[10px] font-extrabold shadow-sm transition-all duration-300">
                                                    {tech}
                                                  </span>
                                                ))}
                                              </div>
                                            </div>
                                          );
                                        }
                                      } catch (_) {}
                                      return null;
                                    })()}

                                    {/* Open Job Listings & Departments */}
                                    {(() => {
                                      if (!lead.jobListings) return null;
                                      try {
                                        const jobs = JSON.parse(lead.jobListings) as { title: string; department: string }[];
                                        if (jobs.length > 0) {
                                          return (
                                            <div className="bg-white border border-neutral-200/60 rounded-xl p-5 shadow-sm space-y-3">
                                              <div className="flex items-center gap-2 border-b border-neutral-100 pb-3 mb-1">
                                                <span className="material-symbols-outlined text-primary text-lg font-bold">work</span>
                                                <h4 className="text-xs font-extrabold text-[#0F172A] uppercase tracking-wider">Detected Job Listings & Functions</h4>
                                                <span className="ml-auto px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 text-[9px] font-black">
                                                  {jobs.length}
                                                </span>
                                              </div>
                                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1 max-h-[250px] overflow-y-auto pr-1">
                                                {jobs.map((job, idx) => (
                                                  <div key={idx} className="flex flex-col gap-1 p-2.5 bg-neutral-50 hover:bg-neutral-100/75 rounded-lg border border-neutral-200/50 transition-colors">
                                                    <span className="text-xs font-extrabold text-slate-800 leading-snug">{job.title}</span>
                                                    <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider">{job.department}</span>
                                                  </div>
                                                ))}
                                              </div>
                                            </div>
                                          );
                                        }
                                      } catch (_) {}
                                      return null;
                                    })()}

                                    {/* Social Profiles Section */}
                                    {(socialProfiles.length > 0 || legacySocials.length > 0) && (
                                      <div className="bg-white border border-neutral-200/60 rounded-xl p-5 shadow-sm space-y-3">
                                        <div className="flex items-center gap-2 border-b border-neutral-100 pb-3 mb-1">
                                          <span className="material-symbols-outlined text-primary text-lg font-bold">share</span>
                                          <h4 className="text-xs font-extrabold text-[#0F172A] uppercase tracking-wider">Verified Social Profiles</h4>
                                          <span className="ml-auto px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 text-[9px] font-black">
                                            {socialProfiles.length || legacySocials.length}
                                          </span>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                          {(socialProfiles.length > 0 ? socialProfiles : legacySocials).map((s: any) => {
                                            const linkObj: LeadSocialLink = {
                                              id: s.id, leadId: s.leadId ?? lead.id,
                                              socialUrl: s.socialUrl, network: s.network,
                                              sourceUrl: s.sourceUrl, discoveryPage: s.discoveryPage,
                                              crawlTimestamp: s.crawlTimestamp, confidenceScore: s.confidenceScore,
                                              validationStatus: s.validationStatus ?? 'VALID',
                                            };
                                            return <PlatformLink key={s.id} link={linkObj} copiedUrl={copiedUrl} onCopy={handleCopy} />;
                                          })}
                                        </div>
                                      </div>
                                    )}

                                    {/* Web Pages Section — 5 categories */}
                                    {(contactPages.length + aboutPages.length + supportPages.length + careersPages.length + productPages.length) > 0 && (
                                      <div className="bg-white border border-neutral-200/60 rounded-xl p-5 shadow-sm space-y-4">
                                        <div className="flex items-center gap-2 border-b border-neutral-100 pb-3">
                                          <span className="material-symbols-outlined text-indigo-500 text-lg font-bold">web</span>
                                          <h4 className="text-xs font-extrabold text-[#0F172A] uppercase tracking-wider">Crawled Web Pages</h4>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                          {[
                                            { label: 'Contact Pages', icon: 'contact_mail', color: 'text-emerald-600', bg: 'bg-emerald-50', items: contactPages },
                                            { label: 'About Pages', icon: 'info', color: 'text-blue-600', bg: 'bg-blue-50', items: aboutPages },
                                            { label: 'Support Pages', icon: 'support_agent', color: 'text-amber-600', bg: 'bg-amber-50', items: supportPages },
                                            { label: 'Careers Pages', icon: 'work', color: 'text-violet-600', bg: 'bg-violet-50', items: careersPages },
                                            { label: 'Product Pages', icon: 'inventory_2', color: 'text-rose-600', bg: 'bg-rose-50', items: productPages },
                                          ].filter(g => g.items.length > 0).map(group => (
                                            <div key={group.label} className="space-y-2">
                                              <div className="flex items-center gap-1.5">
                                                <div className={`w-6 h-6 rounded-md ${group.bg} flex items-center justify-center flex-shrink-0`}>
                                                  <span className={`material-symbols-outlined text-xs ${group.color}`}>{group.icon}</span>
                                                </div>
                                                <span className="text-[10px] font-extrabold text-neutral-700 uppercase tracking-wider">{group.label}</span>
                                                <span className="ml-auto text-[9px] font-black text-neutral-400">{group.items.length}</span>
                                              </div>
                                              <div className="space-y-1">
                                                {group.items.map(p => {
                                                  const cleanUrl = (p as any).url.startsWith('http') ? (p as any).url : `https://${(p as any).url}`;
                                                  return (
                                                    <a
                                                      key={(p as any).id}
                                                      href={cleanUrl}
                                                      target="_blank"
                                                      rel="noopener noreferrer"
                                                      className="flex items-center gap-1 text-[10px] text-primary hover:underline font-mono truncate max-w-full"
                                                      title={(p as any).url}
                                                    >
                                                      <span className="material-symbols-outlined text-[10px] flex-shrink-0">open_in_new</span>
                                                      <span className="truncate">{(p as any).url.replace(/^https?:\/\/(www\.)?/, '')}</span>
                                                    </a>
                                                  );
                                                })}
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    )}

                                    {/* AI Crawler Audit Logs — all 6 categories */}
                                    <div className="bg-white border border-neutral-200/60 rounded-xl p-5 shadow-sm space-y-3">
                                      <div className="flex items-center justify-between border-b border-neutral-100 pb-3 mb-1">
                                        <div className="flex items-center gap-2">
                                          <span className="material-symbols-outlined text-violet-600 text-lg font-bold">receipt_long</span>
                                          <h4 className="text-xs font-extrabold text-[#0F172A] uppercase tracking-wider">AI Crawler Audit Logs</h4>
                                        </div>
                                        <span className="text-[10px] text-neutral-400 font-semibold italic">
                                          {auditEntries.length > 0
                                            ? `Last crawl: ${new Date(Math.max(...auditEntries.map(e => new Date(e.crawlTimestamp).getTime()))).toLocaleString()}`
                                            : 'Never crawled'}
                                        </span>
                                      </div>

                                      {hasAnyData ? (
                                        <div className="overflow-x-auto">
                                          <table className="w-full text-left border-collapse">
                                            <thead>
                                              <tr className="border-b border-neutral-100 text-[9px] font-black text-neutral-400 uppercase tracking-wider">
                                                <th className="py-2 pr-3">URL Discovered</th>
                                                <th className="py-2 px-3">Category</th>
                                                <th className="py-2 px-3">Source Page</th>
                                                <th className="py-2 px-3">Timestamp</th>
                                                <th className="py-2 pl-3 text-right">Validation</th>
                                              </tr>
                                            </thead>
                                            <tbody className="divide-y divide-neutral-100 text-[10px] font-bold text-neutral-600">
                                              {auditEntries.map(entry => {
                                                const isValid = entry.validationStatus !== 'INVALID';
                                                const cleanUrl = entry.url.startsWith('http') ? entry.url : `https://${entry.url}`;
                                                return (
                                                  <tr key={entry.id} className="hover:bg-neutral-50/50 transition-colors">
                                                    <td className="py-2.5 pr-3 truncate max-w-[180px]" title={entry.url}>
                                                      <a
                                                        href={cleanUrl}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-primary hover:underline flex items-center gap-0.5"
                                                      >
                                                        <span className="truncate">{entry.url}</span>
                                                        <span className="material-symbols-outlined text-[10px] flex-shrink-0">open_in_new</span>
                                                      </a>
                                                    </td>
                                                    <td className="py-2.5 px-3">
                                                      <span className="inline-flex px-1.5 py-0.5 rounded text-[8px] font-extrabold bg-slate-100 text-slate-600 uppercase tracking-wider">
                                                        {entry.category}
                                                      </span>
                                                    </td>
                                                    <td className="py-2.5 px-3 truncate max-w-[160px]" title={entry.discoveryPage || 'N/A'}>
                                                      {entry.discoveryPage && isValidUrl(entry.discoveryPage) ? (
                                                        <a
                                                          href={entry.discoveryPage.startsWith('http') ? entry.discoveryPage : `https://${entry.discoveryPage}`}
                                                          target="_blank"
                                                          rel="noopener noreferrer"
                                                          className="text-neutral-500 hover:text-primary hover:underline flex items-center gap-0.5"
                                                        >
                                                          <span className="truncate">{entry.discoveryPage.replace(/^https?:\/\/(www\.)?/, '')}</span>
                                                          <span className="material-symbols-outlined text-[10px] flex-shrink-0">open_in_new</span>
                                                        </a>
                                                      ) : (
                                                        <span className="text-neutral-400">{entry.discoveryPage || 'N/A'}</span>
                                                      )}
                                                    </td>
                                                    <td className="py-2.5 px-3 text-neutral-400 font-medium font-mono">
                                                      {new Date(entry.crawlTimestamp).toLocaleString()}
                                                    </td>
                                                    <td className="py-2.5 pl-3 text-right">
                                                      <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-black tracking-wider border ${
                                                        isValid
                                                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                                          : 'bg-red-50 text-[#DC2626] border-red-200'
                                                      }`}>
                                                        <span className="material-symbols-outlined text-[10px]">
                                                          {isValid ? 'check_circle' : 'cancel'}
                                                        </span>
                                                        {isValid ? 'VALID' : 'INVALID'}
                                                      </span>
                                                    </td>
                                                  </tr>
                                                );
                                              })}
                                            </tbody>
                                          </table>
                                        </div>
                                      ) : (
                                        <div className="flex flex-col items-center justify-center py-6 text-center">
                                          <span className="material-symbols-outlined text-slate-300 text-2xl">history</span>
                                          <span className="text-[10px] text-neutral-400 font-semibold italic mt-1">No crawl logs recorded yet</span>
                                        </div>
                                      )}
                                    </div>
                                  </>
                                );
                              })()}

                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))
                )}
              </tbody>
            </table>
            </div>{/* end overflow-x-auto */}
          </div>
        </main>
      </div>
    </div>
  );
};
export default LeadDiscoveryView;
