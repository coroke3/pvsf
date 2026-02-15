import { useState, useEffect } from 'react';
import { useForm, useFieldArray, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { entryFormSchema, EntryFormValues, SNS_PLATFORMS, ROLE_OPTIONS, TERMS_TEXT } from './schema';
import { MemberParser } from './MemberParser';
import { useAuth } from '@/contexts/AuthContext';
import { uploadIcon, compressAndResizeImage } from '@/libs/storage';
import Image from 'next/image';

// ---- UI Helpers ----
const Section = ({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) => (
    <div className="space-y-4 mb-8">
        <div className="border-b pb-2">
            <h2 className="text-xl font-bold text-gray-800">{title}</h2>
            {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
        </div>
        {children}
    </div>
);

const Label = ({ children, required }: { children: React.ReactNode; required?: boolean }) => (
    <label className="block text-sm font-medium text-gray-700 mb-1">
        {children} {required && <span className="text-red-500">*</span>}
    </label>
);

const ErrorMsg = ({ msg }: { msg?: string }) =>
    msg ? <p className="text-red-500 text-xs mt-1">{msg}</p> : null;

export const EntryForm = () => {
    const { user, approvedXids, isAuthenticated } = useAuth();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState('');
    const [submitSuccess, setSubmitSuccess] = useState(false);
    const [iconPreview, setIconPreview] = useState('');
    const [pastIcons, setPastIcons] = useState<string[]>([]);
    const [availableSlots, setAvailableSlots] = useState<any[]>([]);
    const [slotEvents, setSlotEvents] = useState<any[]>([]);

    const methods = useForm<EntryFormValues>({
        resolver: zodResolver(entryFormSchema),
        defaultValues: {
            type2: '個人',
            type: '個人',
            authorName: '',
            movieYear: '',
            authorXid: approvedXids?.[0] || '',
            authorXidIsApproved: approvedXids?.length > 0,
            authorChannelUrl: '',
            authorIconUrl: '',
            members: [],
            title: '',
            music: '',
            credit: '',
            musicUrl: '',
            snsPlans: [],
            wantsLive: false,
            description: '',
            agreedToTerms: false,
            videoUrl: '',
            eventIds: [],
            slotEventId: '',
            slotDateTimes: [],
            startTime: '',
        },
    });

    const { register, control, handleSubmit, watch, setValue, formState: { errors } } = methods;
    const { fields: memberFields, append: appendMember, remove: removeMember } = useFieldArray({
        control,
        name: 'members',
    });

    const type2 = watch('type2');
    const isGroup = type2 === '複数人';
    const wantsLive = watch('wantsLive');
    const selectedSlotEvent = watch('slotEventId');
    const authorXid = watch('authorXid');

    // Load available slots
    useEffect(() => {
        if (isAuthenticated) {
            fetch('/api/slots?listEvents=true')
                .then(r => r.ok ? r.json() : [])
                .then(data => setSlotEvents(Array.isArray(data) ? data : []))
                .catch(() => setSlotEvents([]));
        }
    }, [isAuthenticated]);

    // Load slots when event selected
    useEffect(() => {
        if (selectedSlotEvent) {
            fetch(`/api/slots?eventId=${selectedSlotEvent}&includeAll=true`)
                .then(r => r.ok ? r.json() : [])
                .then(data => setAvailableSlots(Array.isArray(data) ? data : []))
                .catch(() => setAvailableSlots([]));
        } else {
            setAvailableSlots([]);
        }
    }, [selectedSlotEvent]);

    // Load past icons
    useEffect(() => {
        if (isAuthenticated && authorXid) {
            fetch(`/api/user/icons?xid=${encodeURIComponent(authorXid)}`)
                .then(r => r.ok ? r.json() : { icons: [] })
                .then(data => setPastIcons(data.icons || []))
                .catch(() => setPastIcons([]));
        }
    }, [isAuthenticated, authorXid]);

    // Icon upload handler
    const handleIconUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            // Preview
            const reader = new FileReader();
            reader.onload = (ev) => setIconPreview(ev.target?.result as string);
            reader.readAsDataURL(file);

            // Upload
            if (user?.discordId) {
                const url = await uploadIcon(user.discordId, file);
                setValue('authorIconUrl', url);
            }
        } catch (err: any) {
            setSubmitError(`アイコンアップロード失敗: ${err.message}`);
        }
    };

    // XID normalization on blur
    const handleXidBlur = () => {
        let val = (watch('authorXid') || '').trim().replace(/^@/, '');
        const match = val.match(/(?:twitter\.com|x\.com)\/([a-zA-Z0-9_]+)/);
        if (match) val = match[1];
        setValue('authorXid', val);
    };

    // Submit
    const onSubmit = async (data: EntryFormValues) => {
        if (!isAuthenticated) {
            setSubmitError('ログインが必要です');
            return;
        }

        setIsSubmitting(true);
        setSubmitError('');

        try {
            const res = await fetch('/api/videos/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });

            const result = await res.json();

            if (!res.ok) {
                throw new Error(result.error || '登録に失敗しました');
            }

            setSubmitSuccess(true);
        } catch (err: any) {
            setSubmitError(err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isAuthenticated) {
        return (
            <div className="max-w-3xl mx-auto p-6 bg-white shadow-lg rounded-xl text-center">
                <h2 className="text-xl font-bold mb-4">ログインが必要です</h2>
                <p className="text-gray-600">作品を登録するにはDiscordでログインしてください。</p>
            </div>
        );
    }

    if (submitSuccess) {
        return (
            <div className="max-w-3xl mx-auto p-6 bg-white shadow-lg rounded-xl text-center">
                <div className="text-green-600 text-5xl mb-4">&#10003;</div>
                <h2 className="text-xl font-bold mb-2">登録完了</h2>
                <p className="text-gray-600">作品の登録が完了しました。マイページから詳細を確認・編集できます。</p>
            </div>
        );
    }

    return (
        <FormProvider {...methods}>
            <form onSubmit={handleSubmit(onSubmit)} className="max-w-3xl mx-auto p-6 bg-white shadow-lg rounded-xl">

                {/* ===== Section 1: Time / Slot ===== */}
                <Section title="1. 投稿時間について教えてください" subtitle="枠を確保するか、手動で投稿時間を入力してください">
                    {slotEvents.length > 0 && (
                        <div>
                            <Label>イベント枠を使用する</Label>
                            <select
                                {...register('slotEventId')}
                                className="w-full p-2 border rounded"
                            >
                                <option value="">枠なし（手動入力）</option>
                                {slotEvents.map((ev: any) => (
                                    <option key={ev.eventId} value={ev.eventId}>
                                        {ev.eventName} (空き: {ev.availableCount}枠)
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    {selectedSlotEvent && availableSlots.length > 0 && (
                        <div>
                            <Label required>枠を選択 (最大3枠連続)</Label>
                            <div className="max-h-60 overflow-y-auto border rounded p-2 space-y-1">
                                {availableSlots.map((slot: any, idx: number) => (
                                    <label key={idx} className={`flex items-center gap-2 p-1.5 rounded text-sm ${slot.isAvailable ? 'hover:bg-blue-50 cursor-pointer' : 'opacity-50'}`}>
                                        <input
                                            type="checkbox"
                                            disabled={!slot.isAvailable}
                                            value={slot.dateTime}
                                            onChange={(e) => {
                                                const current = watch('slotDateTimes') || [];
                                                if (e.target.checked) {
                                                    setValue('slotDateTimes', [...current, slot.dateTime]);
                                                } else {
                                                    setValue('slotDateTimes', current.filter((d: string) => d !== slot.dateTime));
                                                }
                                            }}
                                        />
                                        <span>{new Date(slot.dateTime).toLocaleString('ja-JP')}</span>
                                        {!slot.isAvailable && <span className="text-red-500 text-xs">予約済</span>}
                                    </label>
                                ))}
                            </div>
                        </div>
                    )}

                    {!selectedSlotEvent && (
                        <div>
                            <Label required>投稿時間</Label>
                            <input type="datetime-local" {...register('startTime')} className="w-full p-2 border rounded" />
                        </div>
                    )}
                </Section>

                {/* ===== Section 2-3: Type ===== */}
                <Section title="2-3. あなたについて教えてください">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <Label required>制作形態</Label>
                            <select {...register('type2')} className="w-full p-2 border rounded">
                                <option value="個人">個人での制作</option>
                                <option value="複数人">複数人での制作</option>
                            </select>
                        </div>
                        <div>
                            <Label required>参加部門</Label>
                            <select {...register('type')} className="w-full p-2 border rounded">
                                <option value="個人">個人の部 / 個人での二次創作作品など</option>
                                <option value="団体">団体の部 / 複数人での二次創作作品など</option>
                                <option value="混合">混合の部 / 映像クリエイター以外が加わった一次創作作品等</option>
                            </select>
                        </div>
                    </div>
                </Section>

                {/* ===== Section 4-8: Creator Info ===== */}
                <Section title="4-8. クリエイター情報">
                    <div className="space-y-4">
                        {/* 4. Creator name */}
                        <div>
                            <Label required>活動名またはチーム名</Label>
                            <input {...register('authorName')} className="w-full p-2 border rounded" placeholder="活動名を入力" />
                            <ErrorMsg msg={errors.authorName?.message} />
                        </div>

                        {/* 5. Movie year */}
                        <div>
                            <Label required>映像歴</Label>
                            <input {...register('movieYear')} className="w-full p-2 border rounded" placeholder="例: 3 / 伏せる / 複数人である" />
                            <ErrorMsg msg={errors.movieYear?.message} />
                        </div>

                        {/* 6. X ID */}
                        <div>
                            <Label required>X(Twitter) ID</Label>
                            {approvedXids.length > 0 && (
                                <div className="mb-2">
                                    <p className="text-xs text-gray-500 mb-1">承認済みのXIDから選択:</p>
                                    <div className="flex flex-wrap gap-2">
                                        {approvedXids.map((xid: string) => (
                                            <button
                                                key={xid}
                                                type="button"
                                                onClick={() => {
                                                    setValue('authorXid', xid);
                                                    setValue('authorXidIsApproved', true);
                                                }}
                                                className={`px-3 py-1 text-sm rounded-full border transition-colors ${
                                                    watch('authorXid') === xid
                                                        ? 'bg-blue-600 text-white border-blue-600'
                                                        : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400'
                                                }`}
                                            >
                                                @{xid}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                            <div className="flex items-center">
                                <span className="px-3 bg-gray-100 border border-r-0 rounded-l py-2 text-gray-500">@</span>
                                <input
                                    {...register('authorXid')}
                                    onBlur={handleXidBlur}
                                    className="flex-1 p-2 border rounded-r"
                                    placeholder="username"
                                />
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                                {approvedXids.length === 0
                                    ? '送信時にXID承認申請が同時に送信されます'
                                    : '新しいXIDを入力した場合は承認申請が送信されます'}
                            </p>
                            <ErrorMsg msg={errors.authorXid?.message} />
                        </div>

                        {/* 7. YouTube Channel */}
                        <div>
                            <Label required>YouTubeチャンネルURL</Label>
                            <input {...register('authorChannelUrl')} className="w-full p-2 border rounded" placeholder="https://www.youtube.com/@..." />
                            <ErrorMsg msg={errors.authorChannelUrl?.message} />
                        </div>

                        {/* 8. Icon */}
                        <div>
                            <Label>アイコン</Label>
                            <div className="flex items-start gap-4">
                                <div className="flex-shrink-0">
                                    {(iconPreview || watch('authorIconUrl')) && (
                                        <div className="w-[100px] h-[100px] relative rounded-lg overflow-hidden border">
                                            <Image
                                                src={iconPreview || watch('authorIconUrl')}
                                                alt="アイコンプレビュー"
                                                fill
                                                className="object-cover"
                                                unoptimized
                                            />
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1 space-y-2">
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleIconUpload}
                                        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                                    />
                                    <p className="text-xs text-gray-500">100x100に自動圧縮されます</p>

                                    {pastIcons.length > 0 && (
                                        <div>
                                            <p className="text-xs text-gray-500 mb-1">過去のアイコン:</p>
                                            <div className="flex flex-wrap gap-2">
                                                {pastIcons.map((url, i) => (
                                                    <button
                                                        key={i}
                                                        type="button"
                                                        onClick={() => {
                                                            setValue('authorIconUrl', url);
                                                            setIconPreview(url);
                                                        }}
                                                        className="w-10 h-10 relative rounded overflow-hidden border hover:ring-2 ring-blue-400"
                                                    >
                                                        <Image src={url} alt="" fill className="object-cover" unoptimized />
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </Section>

                {/* ===== Section 9: Members (Group only) ===== */}
                {isGroup && (
                    <Section title="9. メンバー情報" subtitle="複数人参加の方のみ">
                        <MemberParser onParsed={(parsed) => {
                            parsed.forEach(m => appendMember(m));
                        }} />

                        {memberFields.length > 0 && (
                            <div className="mt-4 space-y-2">
                                <div className="grid grid-cols-12 gap-2 text-xs font-medium text-gray-500 px-1">
                                    <div className="col-span-3">名前</div>
                                    <div className="col-span-3">X ID</div>
                                    <div className="col-span-2">役職</div>
                                    <div className="col-span-2">編集権限</div>
                                    <div className="col-span-2"></div>
                                </div>
                                {memberFields.map((field, index) => (
                                    <div key={field.id} className="grid grid-cols-12 gap-2 items-center p-2 bg-gray-50 rounded">
                                        <input
                                            {...register(`members.${index}.name`)}
                                            className="col-span-3 p-1.5 border rounded text-sm"
                                            placeholder="名前"
                                        />
                                        <input
                                            {...register(`members.${index}.xid`)}
                                            className="col-span-3 p-1.5 border rounded text-sm"
                                            placeholder="@ID"
                                        />
                                        <select
                                            {...register(`members.${index}.role`)}
                                            className="col-span-2 p-1.5 border rounded text-sm"
                                        >
                                            <option value="">-</option>
                                            {ROLE_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}
                                        </select>
                                        <label className="col-span-2 flex items-center gap-1 text-sm">
                                            <input
                                                type="checkbox"
                                                {...register(`members.${index}.editApproved`)}
                                            />
                                            <span className="text-xs">許可</span>
                                        </label>
                                        <button
                                            type="button"
                                            onClick={() => removeMember(index)}
                                            className="col-span-2 px-2 py-1 text-xs text-red-600 hover:bg-red-50 rounded"
                                        >
                                            削除
                                        </button>
                                    </div>
                                ))}
                                <button
                                    type="button"
                                    onClick={() => appendMember({ name: '', xid: '', role: '', editApproved: false })}
                                    className="text-sm text-blue-600 hover:text-blue-800"
                                >
                                    + メンバーを手動追加
                                </button>
                            </div>
                        )}
                    </Section>
                )}

                {/* ===== Section 10-13: Work Info ===== */}
                <Section title="10-13. 作品と楽曲について教えてください">
                    <div className="space-y-4">
                        <div>
                            <Label required>作品名</Label>
                            <input {...register('title')} className="w-full p-2 border rounded" placeholder="作品名" />
                            <ErrorMsg msg={errors.title?.message} />
                        </div>
                        <div>
                            <Label required>楽曲名</Label>
                            <input {...register('music')} className="w-full p-2 border rounded" placeholder="楽曲名" />
                            <ErrorMsg msg={errors.music?.message} />
                        </div>
                        <div>
                            <Label required>作曲者</Label>
                            <input {...register('credit')} className="w-full p-2 border rounded" placeholder="作曲者" />
                            <ErrorMsg msg={errors.credit?.message} />
                        </div>
                        <div>
                            <Label>楽曲URL</Label>
                            <input {...register('musicUrl')} className="w-full p-2 border rounded" placeholder="https://..." />
                        </div>
                    </div>
                </Section>

                {/* ===== Section 14: SNS ===== */}
                <Section title="14. SNS投稿予定">
                    <p className="text-sm text-gray-600 mb-2">TikTok、ニコニコ動画等での投稿予定がありましたら教えてください。</p>
                    <div className="flex flex-wrap gap-3">
                        {SNS_PLATFORMS.map(platform => {
                            const currentPlans = watch('snsPlans') || [];
                            const isChecked = currentPlans.some(p => p.platform === platform.id);
                            return (
                                <label key={platform.id} className="flex items-center gap-2 text-sm">
                                    <input
                                        type="checkbox"
                                        checked={isChecked}
                                        onChange={(e) => {
                                            if (e.target.checked) {
                                                setValue('snsPlans', [...currentPlans, { platform: platform.id, url: '' }]);
                                            } else {
                                                setValue('snsPlans', currentPlans.filter(p => p.platform !== platform.id));
                                            }
                                        }}
                                    />
                                    {platform.label}
                                </label>
                            );
                        })}
                    </div>
                </Section>

                {/* ===== Section 15: Live ===== */}
                <Section title="15. 公式ライブ">
                    <Label>公式ライブにて登壇しますか？</Label>
                    <div className="flex gap-4">
                        <label className="flex items-center gap-2">
                            <input type="radio" value="true" checked={wantsLive === true}
                                onChange={() => setValue('wantsLive', true)} />
                            <span>する</span>
                        </label>
                        <label className="flex items-center gap-2">
                            <input type="radio" value="false" checked={wantsLive === false}
                                onChange={() => setValue('wantsLive', false)} />
                            <span>しない</span>
                        </label>
                    </div>
                </Section>

                {/* ===== Section 16: Comment ===== */}
                <Section title="16. 最後に一言！！" subtitle="HPに掲載します。（任意）">
                    <textarea
                        {...register('description')}
                        className="w-full p-2 border rounded min-h-[80px]"
                        placeholder="一言コメント"
                    />
                </Section>

                {/* ===== Section 17: Terms ===== */}
                <Section title="17. 免責事項">
                    <div className="bg-gray-50 p-4 rounded border text-sm whitespace-pre-wrap mb-4">
                        {TERMS_TEXT}
                    </div>
                    <label className="flex items-start gap-2">
                        <input
                            type="checkbox"
                            {...register('agreedToTerms')}
                            className="mt-1"
                        />
                        <span className="text-sm">上記の免責事項に同意します</span>
                    </label>
                    <ErrorMsg msg={errors.agreedToTerms?.message} />
                </Section>

                {/* ===== Section 18: Video URL (optional) ===== */}
                <Section title="18. YouTubeリンク（任意）" subtitle="後からマイページでも入力できます">
                    <input
                        {...register('videoUrl')}
                        className="w-full p-2 border rounded"
                        placeholder="https://youtu.be/... または https://www.youtube.com/watch?v=..."
                    />
                    <p className="text-xs text-gray-500 mt-1">入力に関わらず https://youtu.be/[id] 形式に変換されます</p>
                </Section>

                {/* ===== Submit ===== */}
                {submitError && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
                        {submitError}
                    </div>
                )}

                <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-3 px-6 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    {isSubmitting ? '送信中...' : '作品を登録する'}
                </button>
            </form>
        </FormProvider>
    );
};
