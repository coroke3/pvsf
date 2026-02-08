import { EntryForm } from '@/components/entry/EntryForm';
import { NextPage } from 'next';
import Head from 'next/head';

const EntryPage: NextPage = () => {
    return (
        <div className="min-h-screen bg-gray-50 py-12">
            <Head>
                <title>作品登録 | PVSF</title>
            </Head>
            
            <div className="container mx-auto px-4">
                <div className="text-center mb-10">
                    <h1 className="text-3xl font-extrabold text-gray-900">作品登録フォーム</h1>
                    <p className="mt-2 text-gray-600">PVSF 2026 Spring への参加登録</p>
                </div>
                
                <EntryForm />
            </div>
        </div>
    );
};

export default EntryPage;
