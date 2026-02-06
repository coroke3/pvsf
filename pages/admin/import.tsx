
import React, { useState } from 'react';
import Head from 'next/head';
import { useSession } from 'next-auth/react';
import useAdminCheck from '@/hooks/useAdminCheck';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCloudUploadAlt, faSpinner, faCheck, faTimes } from '@fortawesome/free-solid-svg-icons';
import Footer from '@/components/Footer';

export default function AdminImport() {
  const { data: session } = useSession();
  const { isAdmin, isLoading: isAdminLoading } = useAdminCheck();
  
  const [videoJson, setVideoJson] = useState('');
  const [userJson, setUserJson] = useState('');
  
  const [videoStatus, setVideoStatus] = useState<'idle' | 'importing' | 'success' | 'error'>('idle');
  const [userStatus, setUserStatus] = useState<'idle' | 'importing' | 'success' | 'error'>('idle');
  
  const [videoMessage, setVideoMessage] = useState('');
  const [userMessage, setUserMessage] = useState('');

  const handleImport = async (type: 'videos' | 'users', jsonStr: string, setStatus: any, setMessage: any) => {
    try {
      setStatus('importing');
      setMessage('Parsing JSON...');
      
      let data;
      try {
        data = JSON.parse(jsonStr);
      } catch (e) {
        throw new Error('Invalid JSON format. Please check your input.');
      }
      
      if (!Array.isArray(data)) {
        throw new Error('Data must be a JSON array.');
      }
      
      setMessage(`Importing ${data.length} ${type}...`);
      
      const res = await fetch('/api/admin/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, data })
      });
      
      const result = await res.json();
      
      if (res.ok) {
        setStatus('success');
        setMessage(`Successfully imported ${result.imported} ${type}.`);
      } else {
        throw new Error(result.error || 'Import failed.');
      }
    } catch (err: any) {
      setStatus('error');
      setMessage(err.message || 'Unknown error occurred.');
    }
  };

  if (isAdminLoading) return <div className="page-container">Loading...</div>;
  if (!isAdmin) return <div className="page-container">Access Denied</div>;

  return (
    <>
      <Head>
        <title>Data Import - PVSF Admin</title>
      </Head>
      
      <div className="page-container">
        <div className="import-container">
          <h1>Legacy Data Import</h1>
          <p className="help-text">
            Legacy "CSV" files are actually JSON arrays. Paste the content of the files below.
          </p>
          
          {/* Video Import Section */}
          <div className="import-section">
            <h2>
               <FontAwesomeIcon icon={faCloudUploadAlt} /> Import Videos
            </h2>
            <p>Paste content from <code>videos_data.csv</code> or similar.</p>
            
            <textarea
              className="json-input"
              value={videoJson}
              onChange={(e) => setVideoJson(e.target.value)}
              placeholder='[ { "title": "...", "ylink": "..." }, ... ]'
              rows={10}
            />
            
            <div className="action-row">
              <button 
                onClick={() => handleImport('videos', videoJson, setVideoStatus, setVideoMessage)}
                disabled={videoStatus === 'importing' || !videoJson.trim()}
                className="btn btn-primary"
              >
                {videoStatus === 'importing' ? (
                  <><FontAwesomeIcon icon={faSpinner} spin /> Importing...</>
                ) : 'Import Videos'}
              </button>
              
              {videoStatus === 'success' && <span className="status success"><FontAwesomeIcon icon={faCheck} /> {videoMessage}</span>}
              {videoStatus === 'error' && <span className="status error"><FontAwesomeIcon icon={faTimes} /> {videoMessage}</span>}
              {videoStatus === 'importing' && <span className="status loading">{videoMessage}</span>}
            </div>
          </div>
          
          <hr className="divider" />
          
           {/* User Import Section */}
           <div className="import-section">
            <h2>
               <FontAwesomeIcon icon={faCloudUploadAlt} /> Import Users
            </h2>
            <p>Paste content from <code>users_data.csv</code>.</p>
            
            <textarea
              className="json-input"
              value={userJson}
              onChange={(e) => setUserJson(e.target.value)}
              placeholder='[ { "username": "...", "icon": "..." }, ... ]'
              rows={10}
            />
            
            <div className="action-row">
              <button 
                onClick={() => handleImport('users', userJson, setUserStatus, setUserMessage)}
                disabled={userStatus === 'importing' || !userJson.trim()}
                className="btn btn-primary"
              >
                {userStatus === 'importing' ? (
                  <><FontAwesomeIcon icon={faSpinner} spin /> Importing...</>
                ) : 'Import Users'}
              </button>
              
              {userStatus === 'success' && <span className="status success"><FontAwesomeIcon icon={faCheck} /> {userMessage}</span>}
              {userStatus === 'error' && <span className="status error"><FontAwesomeIcon icon={faTimes} /> {userMessage}</span>}
              {userStatus === 'importing' && <span className="status loading">{userMessage}</span>}
            </div>
          </div>
          
        </div>
      </div>
      
      <Footer />
      
      <style jsx>{`
        .import-container {
            max-width: 800px;
            margin: 0 auto;
            padding: 2rem;
        }
        
        .import-section {
            background: var(--bg-surface-2);
            padding: 1.5rem;
            border-radius: 12px;
            margin-bottom: 2rem;
            border: 1px solid var(--border-main);
        }
        
        .json-input {
            width: 100%;
            background: rgba(0,0,0,0.3);
            border: 1px solid var(--border-main);
            color: var(--text-main);
            padding: 1rem;
            font-family: monospace;
            border-radius: 8px;
            margin: 1rem 0;
            resize: vertical;
        }
        
        .action-row {
            display: flex;
            align-items: center;
            gap: 1rem;
        }
        
        .divider {
            border: 0;
            border-top: 1px solid var(--border-main);
            margin: 2rem 0;
        }
        
        .status {
            font-size: 0.9rem;
        }
        .status.success { color: var(--accent-success); }
        .status.error { color: var(--accent-error); }
        .status.loading { color: var(--text-muted); }
      `}</style>
    </>
  );
}
