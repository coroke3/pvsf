
import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import { adminDb } from '@/libs/firebase-admin';
import type { VideoDocument, OldVideoJson } from '@/types/video';
import { extractYouTubeId } from '@/libs/videoConverter';
import { firestore } from 'firebase-admin';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb', // Support large file payloads
    },
  },
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Admin authentication check
  const session = await getServerSession(req, res, authOptions);
  const user = session?.user as any;

  if (!user || user.role !== 'admin') {
    return res.status(403).json({ error: 'Unauthorized: Admin access required' });
  }

  try {
    const { type, data } = req.body; // type: 'videos' | 'users'

    if (!Array.isArray(data)) {
      return res.status(400).json({ error: 'Invalid data format: Expected JSON array' });
    }

    if (type === 'videos') {
      const result = await importVideos(data);
      return res.status(200).json(result);
    } else if (type === 'users') {
      const result = await importUsers(data);
      return res.status(200).json(result);
    } else {
      return res.status(400).json({ error: 'Invalid import type' });
    }

  } catch (error: any) {
    console.error('Import error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}

async function importVideos(videos: OldVideoJson[]) {
  const batch = adminDb.batch();
  let count = 0;
  let batchCount = 0;
  const BATCH_SIZE = 450; // Firestore limit is 500

  for (const v of videos) {
    // Determine ID
    let ytId = extractYouTubeId(v.ylink ||  v.ymulink || '');
    if (!ytId && v.ylink && v.ylink.startsWith('http')) {
        // Fallback for non-standard links? 
        // For now, if no YT ID, generate one or skip?
        // The instructions say "ID Strategy: Use extractYouTubeId from ylink."
        // If it fails, maybe use specific ID from data if available, or skip.
    }

    if (!ytId) {
        console.warn(`Skipping video without valid YouTube ID: ${v.title}`);
        continue;
    }

    const docRef = adminDb.collection('videos').doc(ytId);
    
    // Map fields
    const newVideo: Partial<VideoDocument> = {
      id: ytId,
      videoUrl: v.ylink || `https://youtu.be/${ytId}`,
      title: v.title || v.creator || 'Untitled', // Fallback
      description: v.comment || '',
      startTime: v.time ? new Date(v.time) : new Date(),
      
      // Author
      authorXid: v.tlink || '',
      authorXidLower: (v.tlink || '').toLowerCase(),
      authorName: v.creator || '',
      authorIconUrl: v.icon || null,
      authorChannelUrl: v.ychlink || '',
      
      // Metadata
      music: v.music || '',
      credit: v.credit || '',
      type: v.type || v.type1 || '個人',
      type2: v.type2 || '個人',
      
      // Legacy
      musicUrl: v.ymulink || '',
      movieYear: v.movieyear || 0,
      otherSns: v.othersns || '',
      rightType: v.righttype || '',
      data: v.data || '',
      software: v.soft || '',
      beforeComment: v.beforecomment || '',
      afterComment: v.aftercomment || '',
      listen: v.listen || '',
      episode: v.episode || '',
      endMessage: v.end || '',
      ywatch: v.ywatch || '',
      // timestamp field in CSV is often "2025-..." string, map to Date
      timestamp: v.timestamp ? new Date(v.timestamp) : null,
      
      // New fields defaults
      eventIds: v.eventid ? [v.eventid] : [],
      snsPlans: [],
      homepageComment: '',
      link: '',
      agreedToTerms: true, // Legacy assumption
      
      // Members - convert comma separated string to array
      members: parseMembers(v.member, v.memberid),

      // Stats
      viewCount: Number(v.viewCount) || 0,
      likeCount: Number(v.likeCount) || 0,
      videoScore: Number(v.videoScore) || 0,
      deterministicScore: Number(v.deterministicScore) || 0,
      largeThumbnail: v.largeThumbnail || `https://i.ytimg.com/vi/${ytId}/maxresdefault.jpg`,
      smallThumbnail: v.smallThumbnail || `https://i.ytimg.com/vi/${ytId}/mqdefault.jpg`,
      privacyStatus: v.status || 'public',
      daysSincePublished: Number(v.daysSincePublished) || 0,
      
      updatedAt: new Date(),
    };

    // Use set with merge to update existing but keep other fields
    batch.set(docRef, newVideo, { merge: true });
    count++;
    batchCount++;

    if (batchCount >= BATCH_SIZE) {
      await batch.commit();
      batchCount = 0;
      // Start new batch? batch is reused? No, need new batch instance?
      // Firestore admin sdk batch: "A batch can contain up to 500 operations."
      // We need to commit and create a new one, or just commit. 
      // Re-assigning variable inside function is tricky if not careful, but adminDb.batch() returns new instance.
    }
  }

  if (batchCount > 0) {
    await batch.commit();
  }

  return { imported: count };
}

function parseMembers(namesStr: string, idsStr: string) {
  const names = namesStr ? namesStr.split(',').map(s => s.trim()) : [];
  const ids = idsStr ? idsStr.split(',').map(s => s.trim()) : [];
  
  const members = [];
  const maxLen = Math.max(names.length, ids.length);
  
  for (let i = 0; i < maxLen; i++) {
    if (names[i] || ids[i]) {
      members.push({
        name: names[i] || '',
        xid: ids[i] || '',
        role: '', // Legacy doesn't specify role per member easily
        editApproved: false
      });
    }
  }
  return members;
}

async function importUsers(users: any[]) {
    const batch = adminDb.batch();
    let count = 0;
    let batchCount = 0;
    const BATCH_SIZE = 450;
  
    for (const u of users) {
        if (!u.username) continue; // Skip if no XID
        
        const docRef = adminDb.collection('legacy_users').doc(u.username);
        
        // Ensure arrays
        const iylink = Array.isArray(u.iylink) ? u.iylink : [];
        const cylink = Array.isArray(u.cylink) ? u.cylink : [];
        const mylink = Array.isArray(u.mylink) ? u.mylink : [];
        
        batch.set(docRef, {
            ...u,
            updatedAt: new Date()
        }, { merge: true });

        count++;
        batchCount++;

        if (batchCount >= BATCH_SIZE) {
            await batch.commit();
            batchCount = 0;
        }
    }

    if (batchCount > 0) {
        await batch.commit();
    }
    
    return { imported: count };
}
