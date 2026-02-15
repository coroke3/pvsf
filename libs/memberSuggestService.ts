/**
 * Member Suggestion Service
 * メンバーID⇔名前の相互変換・サジェスト機能
 * Based on id-name.html logic with Levenshtein distance similarity
 */

import { adminDb } from './firebase-admin';

export interface MemberMatch {
  name: string;
  xid: string;
  similarity: number;
  source: 'creator' | 'member';
}

export interface SuggestionResult {
  input: string;
  matches: MemberMatch[];
  bestMatch: MemberMatch | null;
  confidence: number;
}

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(str1: string, str2: string): number {
  const matrix: number[][] = [];
  const s1 = str1.toLowerCase();
  const s2 = str2.toLowerCase();

  for (let i = 0; i <= s2.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= s1.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= s2.length; i++) {
    for (let j = 1; j <= s1.length; j++) {
      if (s2.charAt(i - 1) === s1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }

  return matrix[s2.length][s1.length];
}

/**
 * Calculate similarity percentage between two strings
 */
export function calculateSimilarity(str1: string, str2: string): number {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;

  if (longer.length === 0) return 100;

  const distance = levenshteinDistance(longer, shorter);
  return Math.round((1 - distance / longer.length) * 100);
}

/**
 * Normalize XID (remove @ prefix)
 */
function normalizeXid(xid: string): string {
  return xid.trim().replace(/^@/, '').toLowerCase();
}

/**
 * Build member database from videos collection
 * This creates a Map of unique name-xid pairs from all videos
 */
async function buildMemberDatabase(): Promise<Map<string, MemberMatch>> {
  const memberMap = new Map<string, MemberMatch>();

  try {
    // Fetch all videos with creator and member info
    const snapshot = await adminDb
      .collection('videos')
      .select('author', 'members')
      .get();

    for (const doc of snapshot.docs) {
      const data = doc.data();

      // Add creator as member
      if (data.author?.name && data.author?.xid) {
        const xid = normalizeXid(data.author.xid);
        const key = `${data.author.name.toLowerCase()}|${xid}`;
        if (!memberMap.has(key)) {
          memberMap.set(key, {
            name: data.author.name.trim(),
            xid: xid,
            similarity: 100,
            source: 'creator'
          });
        }
      }

      // Add members
      if (Array.isArray(data.members)) {
        for (const member of data.members) {
          if (member.name && member.xid) {
            const xid = normalizeXid(member.xid);
            const key = `${member.name.toLowerCase()}|${xid}`;
            if (!memberMap.has(key)) {
              memberMap.set(key, {
                name: member.name.trim(),
                xid: xid,
                similarity: 100,
                source: 'member'
              });
            }
          }
        }
      }
    }
  } catch (error) {
    console.error('Error building member database:', error);
  }

  return memberMap;
}

// Cache for member database
let memberDbCache: Map<string, MemberMatch> | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function getMemberDatabase(): Promise<Map<string, MemberMatch>> {
  const now = Date.now();
  if (!memberDbCache || now - cacheTimestamp > CACHE_TTL) {
    memberDbCache = await buildMemberDatabase();
    cacheTimestamp = now;
  }
  return memberDbCache;
}

/**
 * Search for members by XID (ID to Name conversion)
 */
export async function searchByXid(
  searchTerm: string,
  limit: number = 10
): Promise<MemberMatch[]> {
  const memberDb = await getMemberDatabase();
  const normalizedSearch = normalizeXid(searchTerm);
  const results: MemberMatch[] = [];

  for (const member of Array.from(memberDb.values())) {
    const similarity = calculateSimilarity(member.xid, normalizedSearch);
    if (similarity > 30) {
      results.push({
        ...member,
        similarity
      });
    }
  }

  // Sort by similarity descending, remove duplicates
  return results
    .sort((a, b) => b.similarity - a.similarity)
    .filter((item, index, self) =>
      index === self.findIndex(t => t.name === item.name && t.xid === item.xid)
    )
    .slice(0, limit);
}

/**
 * Search for members by name (Name to ID conversion)
 */
export async function searchByName(
  searchTerm: string,
  limit: number = 10
): Promise<MemberMatch[]> {
  const memberDb = await getMemberDatabase();
  const normalizedSearch = searchTerm.trim().toLowerCase();
  const results: MemberMatch[] = [];

  for (const member of Array.from(memberDb.values())) {
    const similarity = calculateSimilarity(member.name.toLowerCase(), normalizedSearch);
    if (similarity > 30) {
      results.push({
        ...member,
        similarity
      });
    }
  }

  // Sort by similarity descending, remove duplicates
  return results
    .sort((a, b) => b.similarity - a.similarity)
    .filter((item, index, self) =>
      index === self.findIndex(t => t.name === item.name && t.xid === item.xid)
    )
    .slice(0, limit);
}

/**
 * Auto-suggest members based on input (combined search)
 * Searches both name and XID fields
 */
export async function suggestMembers(
  searchTerm: string,
  limit: number = 10
): Promise<MemberMatch[]> {
  const memberDb = await getMemberDatabase();
  const normalizedSearch = searchTerm.trim().toLowerCase().replace(/^@/, '');
  const results: MemberMatch[] = [];

  for (const member of Array.from(memberDb.values())) {
    // Check both name and XID
    const nameSimilarity = calculateSimilarity(member.name.toLowerCase(), normalizedSearch);
    const xidSimilarity = calculateSimilarity(member.xid, normalizedSearch);
    const maxSimilarity = Math.max(nameSimilarity, xidSimilarity);

    if (maxSimilarity > 30) {
      results.push({
        ...member,
        similarity: maxSimilarity
      });
    }
  }

  // Sort by similarity descending, remove duplicates
  return results
    .sort((a, b) => b.similarity - a.similarity)
    .filter((item, index, self) =>
      index === self.findIndex(t => t.name === item.name && t.xid === item.xid)
    )
    .slice(0, limit);
}

/**
 * Batch convert IDs to names
 */
export async function batchIdToName(
  xids: string[]
): Promise<SuggestionResult[]> {
  const results: SuggestionResult[] = [];

  for (const xid of xids) {
    const matches = await searchByXid(xid);
    const bestMatch = matches.length > 0 ? matches[0] : null;

    // Calculate confidence
    let confidence = 0;
    if (bestMatch) {
      if (bestMatch.similarity === 100) {
        // Perfect match
        confidence = matches.filter(m => m.similarity >= 80).length >= 2 ? 90 : 50;
      } else if (bestMatch.similarity >= 80) {
        confidence = 45;
      } else if (bestMatch.similarity >= 50) {
        confidence = Math.min(40, Math.round(bestMatch.similarity / 2));
      }
    }

    results.push({
      input: xid,
      matches,
      bestMatch,
      confidence
    });
  }

  return results;
}

/**
 * Batch convert names to IDs
 */
export async function batchNameToId(
  names: string[]
): Promise<SuggestionResult[]> {
  const results: SuggestionResult[] = [];

  for (const name of names) {
    const matches = await searchByName(name);
    const bestMatch = matches.length > 0 ? matches[0] : null;

    // Calculate confidence
    let confidence = 0;
    if (bestMatch) {
      if (bestMatch.similarity === 100) {
        confidence = matches.filter(m => m.similarity >= 80).length >= 2 ? 90 : 50;
      } else if (bestMatch.similarity >= 80) {
        confidence = 45;
      } else if (bestMatch.similarity >= 50) {
        confidence = Math.min(40, Math.round(bestMatch.similarity / 2));
      }
    }

    results.push({
      input: name,
      matches,
      bestMatch,
      confidence
    });
  }

  return results;
}

/**
 * Clear the member database cache
 */
export function clearMemberCache(): void {
  memberDbCache = null;
  cacheTimestamp = 0;
}

/**
 * Get all unique members from database
 */
export async function getAllMembers(): Promise<MemberMatch[]> {
  const memberDb = await getMemberDatabase();
  return Array.from(memberDb.values());
}
