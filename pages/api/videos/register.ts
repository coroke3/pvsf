// Video registration API endpoint
import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import { adminDb } from '@/libs/firebase-admin';
import { extractYouTubeId } from '@/libs/videoConverter';
import { checkSlotRegistration, checkNonSlotRegistration, reserveSlots } from '@/libs/registrationLogic';
import type { EntryFormValues } from '@/components/entry/schema';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const session = await getServerSession(req, res, authOptions);
  const user = session?.user as any;

  if (!user) {
    return res.status(401).json({ error: 'ログインが必要です' });
  }

  try {
    const formData = req.body as EntryFormValues;

    // Determine if slot-linked
    const isSlotLinked = !!(formData.slotEventId && formData.slotDateTimes && formData.slotDateTimes.length > 0);

    // Registration checks
    if (isSlotLinked) {
      const check = await checkSlotRegistration(
        formData.slotDateTimes!,
        formData.slotEventId!,
      );
      if (!check.allowed) {
        return res.status(400).json({ error: check.reason });
      }
    } else {
      const startTime = formData.startTime ? new Date(formData.startTime) : new Date();
      const check = await checkNonSlotRegistration(
        formData.authorXid,
        formData.eventIds || [],
        startTime,
      );
      if (!check.allowed) {
        return res.status(400).json({ error: check.reason });
      }
    }

    // Normalize X ID
    let authorXid = (formData.authorXid || '').trim().replace(/^@/, '');
    const twitterMatch = authorXid.match(/(?:twitter\.com|x\.com)\/([a-zA-Z0-9_]+)/);
    if (twitterMatch) authorXid = twitterMatch[1];

    // Normalize video URL
    let videoUrl = formData.videoUrl || '';
    if (videoUrl) {
      const ytId = extractYouTubeId(videoUrl);
      if (ytId) {
        videoUrl = `https://youtu.be/${ytId}`;
      }
    }

    // Determine start time
    let startTime: Date;
    if (isSlotLinked) {
      // Use earliest slot time
      const sortedSlots = [...(formData.slotDateTimes || [])].sort();
      startTime = new Date(sortedSlots[0]);
    } else {
      startTime = formData.startTime ? new Date(formData.startTime) : new Date();
    }

    // Build document
    const docId = videoUrl ? (extractYouTubeId(videoUrl) || `reg_${Date.now()}`) : `reg_${Date.now()}`;

    const videoDoc: Record<string, any> = {
      id: docId,
      videoUrl,
      title: formData.title,
      description: formData.description || '',
      startTime,
      eventIds: formData.eventIds || [],

      // Author
      authorXid,
      authorXidLower: authorXid.toLowerCase(),
      authorName: formData.authorName,
      authorIconUrl: formData.authorIconUrl || null,
      authorChannelUrl: formData.authorChannelUrl || '',

      // Metadata
      music: formData.music,
      credit: formData.credit,
      type: formData.type,
      type2: formData.type2,
      musicUrl: formData.musicUrl || '',
      movieYear: formData.movieYear || '',
      otherSns: (formData.snsPlans || []).map(p => p.platform).join(','),
      rightType: formData.agreedToTerms ? '同意する' : '',
      data: '',
      software: formData.software || '',
      beforeComment: formData.beforeComment || '',
      afterComment: formData.afterComment || '',
      listen: formData.listen || '',
      episode: formData.episode || '',
      endMessage: formData.endMessage || '',
      ywatch: formData.wantsLive ? 'する' : 'しない',
      timestamp: new Date(),

      // New fields
      snsPlans: formData.snsPlans || [],
      snsLinks: formData.snsLinks || [],
      homepageComment: formData.description || '',
      link: '',
      agreedToTerms: formData.agreedToTerms,

      // Members
      members: (formData.members || []).map(m => ({
        name: m.name || '',
        xid: (m.xid || '').replace(/^@/, ''),
        role: m.role || '',
        editApproved: m.editApproved || false,
      })),

      // Live/Screening
      wantsStage: formData.wantsStage || false,
      preScreeningComment: formData.preScreeningComment || '',
      postScreeningComment: formData.postScreeningComment || '',
      usedSoftware: formData.usedSoftware || '',
      stageQuestions: formData.stageQuestions || '',
      finalNote: formData.finalNote || '',

      // Approval
      isApproved: isSlotLinked ? false : true, // Slot-linked needs admin approval
      approvedAt: isSlotLinked ? null : new Date(),
      approvedBy: isSlotLinked ? null : 'auto',

      // YouTube stats (initialized)
      viewCount: 0,
      likeCount: 0,
      videoScore: 0,
      deterministicScore: 0,
      largeThumbnail: '',
      smallThumbnail: '',
      privacyStatus: 'public',
      daysSincePublished: 0,
      lastStatsFetch: null,

      // Slot
      slotId: isSlotLinked ? formData.slotEventId : null,

      // System
      createdBy: user.discordId || user.id,
      createdAt: new Date(),
      updatedAt: new Date(),
      isDeleted: false,
      deletedAt: null,
      deletedBy: null,
    };

    // Save to Firestore
    await adminDb.collection('videos').doc(docId).set(videoDoc);

    // Reserve slots if slot-linked
    if (isSlotLinked) {
      await reserveSlots(formData.slotEventId!, formData.slotDateTimes!, docId);
    }

    // Handle XID claim if needed (new XID not yet approved)
    if (!formData.authorXidIsApproved && authorXid) {
      const userDocRef = adminDb.collection('users').doc(user.discordId || user.id);
      const userDoc = await userDocRef.get();

      if (userDoc.exists) {
        const userData = userDoc.data()!;
        const existingClaims = userData.xidClaims || [];
        const alreadyClaimed = existingClaims.some(
          (c: any) => c.xid.toLowerCase() === authorXid.toLowerCase()
        );

        if (!alreadyClaimed) {
          existingClaims.push({
            xid: authorXid,
            status: 'pending',
            requestedAt: new Date(),
          });
          await userDocRef.update({ xidClaims: existingClaims });
        }
      }
    }

    return res.status(200).json({
      success: true,
      videoId: docId,
      isApproved: videoDoc.isApproved,
      message: isSlotLinked
        ? '作品が登録されました。運営の承認後に公開されます。'
        : '作品が登録されました。',
    });

  } catch (error: any) {
    console.error('Video registration error:', error);
    return res.status(500).json({ error: error.message || '登録に失敗しました' });
  }
}
