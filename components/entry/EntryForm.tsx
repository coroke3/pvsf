import { useState } from 'react';
import { useForm, useFieldArray, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { entryFormSchema, EntryFormValues } from './schema';
import { MemberParser } from './MemberParser';

// Simple UI Components (Inline for portability)
const Section = ({ title, children }: { title: string, children: React.ReactNode }) => (
    <div className="space-y-4 mb-8">
        <h2 className="text-xl font-bold border-b pb-2 text-gray-800">{title}</h2>
        {children}
    </div>
);

const Label = ({ children, required }: { children: React.ReactNode, required?: boolean }) => (
    <label className="block text-sm font-medium text-gray-700 mb-1">
        {children} {required && <span className="text-red-500">*</span>}
    </label>
);

const Input = ({ ...props }) => (
    <input className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" {...props} />
);

export const EntryForm = () => {
    const methods = useForm<EntryFormValues>({
        resolver: zodResolver(entryFormSchema),
        defaultValues: {
            productionType: 'individual',
            members: [],
            wantsLive: false,
            agreed: undefined
        }
    });

    const { register, control, handleSubmit, watch, setValue, formState: { errors } } = methods;
    const { fields, append, remove } = useFieldArray({
        control,
        name: "members"
    });

    const productionType = watch('productionType');
    const isGroup = productionType !== 'individual';

    const onSubmit = async (data: EntryFormValues) => {
        if (!confirm('送信しますか？')) return;
        console.log('Submitting', data);
        // Implement Firestore submission here
        alert('送信処理は未実装です。コンソールを確認してください。');
    };

    return (
        <FormProvider {...methods}>
            <form onSubmit={handleSubmit(onSubmit)} className="max-w-3xl mx-auto p-6 bg-white shadow-lg rounded-xl">
                <Section title="1. 基本情報">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <Label required>制作形態</Label>
                            <select {...register('productionType')} className="w-full p-2 border rounded">
                                <option value="individual">個人</option>
                                <option value="group">合作 (複数人)</option>
                                <option value="mixed">混合 (個人+支援など)</option>
                            </select>
                        </div>
                        <div>
                            <Label required>参加部門</Label>
                            <select {...register('division')} className="w-full p-2 border rounded">
                                <option value="individual">個人の部</option>
                                <option value="group">団体の部</option>
                                <option value="mixed">混合の部</option>
                            </select>
                        </div>
                        <div className="md:col-span-2">
                            <Label required>活動名 / チーム名</Label>
                            <Input {...register('authorName')} placeholder="活動名を入力" />
                            {errors.authorName && <p className="text-red-500 text-xs mt-1">{errors.authorName.message}</p>}
                        </div>
                        <div>
                            <Label required>代表者 X(Twitter) ID</Label>
                            <div className="flex items-center">
                                <span className="px-3 bg-gray-100 border border-r-0 rounded-l py-2 text-gray-500">@</span>
                                <Input {...register('authorXid')} placeholder="username" className="rounded-l-none" />
                            </div>
                            {errors.authorXid && <p className="text-red-500 text-xs mt-1">{errors.authorXid.message}</p>}
                        </div>
                        <div>
                            <Label required>映像歴</Label>
                            <Input {...register('career')} placeholder="例: 3年" />
                        </div>
                    </div>
                </Section>

                {isGroup && (
                    <Section title="メンバー情報">
                        <MemberParser onParsed={(parsed) => {
                            parsed.forEach(m => append(m));
                        }} />
                        
                        <div className="mt-4 space-y-2">
                            {fields.map((field, index) => (
                                <div key={field.id} className="flex gap-2 items-center">
                                    <Input {...register(`members.${index}.name`)} placeholder="名前" />
                                    <div className="flex items-center w-1/3">
                                        <span className="px-2 text-gray-500">@</span>
                                        <Input {...register(`members.${index}.xid`)} placeholder="ID (任意)" />
                                    </div>
                                    <button type="button" onClick={() => remove(index)} className="text-red-500 px-2">×</button>
                                </div>
                            ))}
                        </div>
                    </Section>
                )}

                <Section title="2. 作品詳細">
                     <div className="space-y-4">
                        <div>
                            <Label required>作品タイトル</Label>
                            <Input {...register('title')} />
                            {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title.message}</p>}
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                             <div>
                                <Label required>楽曲名</Label>
                                <Input {...register('musicTitle')} />
                            </div>
                            <div>
                                <Label required>お借りした楽曲の作曲者</Label>
                                <Input {...register('musicArtist')} />
                            </div>
                        </div>
                        <div>
                            <Label>公式放送でのライブ登壇 (希望する場合のみ)</Label>
                             <div className="flex items-center gap-2 mt-1">
                                <input type="checkbox" {...register('wantsLive')} className="w-4 h-4" />
                                <span className="text-sm">希望する</span>
                            </div>
                        </div>
                     </div>
                </Section>

                <div className="pt-6 border-t mt-8">
                     <div className="mb-6">
                        <label className="flex items-center gap-2">
                            <input type="checkbox" {...register('agreed')} className="w-5 h-5 text-blue-600" />
                            <span className="font-bold">応募要項および免責事項に同意します</span>
                        </label>
                        {errors.agreed && <p className="text-red-500 text-xs mt-1">{errors.agreed.message}</p>}
                     </div>

                    <button 
                        type="submit" 
                        className="w-full py-4 bg-blue-600 text-white font-bold text-lg rounded-lg hover:bg-blue-700 transition"
                    >
                        登録する
                    </button>
                </div>
            </form>
        </FormProvider>
    );
};
