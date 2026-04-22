import React, { useState, useEffect, useRef } from 'react';
import api, { API_BASE_URL } from '../../config/api';
import Sidebar from '../../components/Sidebar';
import { showNotification } from '../../components/NotificationManager';
import { useIsMobile } from '../../hooks/useMediaQuery';
import { getVaultCache, setVaultCache } from '../../config/vaultCache';

const VaultLegacy = () => {
    const isMobile = useIsMobile();
    const user = JSON.parse(localStorage.getItem('user'));
    
    // State: init from cache so list shows immediately when revisiting
    const [files, setFiles] = useState(() => {
        try {
            const c = user?._id ? getVaultCache(user._id) : null;
            return c?.files ?? [];
        } catch (_) {
            return [];
        }
    });
    const [usedBytes, setUsedBytes] = useState(() => {
        try {
            const c = user?._id ? getVaultCache(user._id) : null;
            return typeof c?.usedBytes === 'number' ? c.usedBytes : 0;
        } catch (_) {
            return 0;
        }
    });
    const limitBytes = 1024 * 1024 * 1024; // 1GB
    const [activeFolder, setActiveFolder] = useState('All Files');
    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [uploading, setUploading] = useState(false);
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [uploadFolder, setUploadFolder] = useState('General Documents');
    const [uploadDocumentType, setUploadDocumentType] = useState('general');
    const [uploadPropertyId, setUploadPropertyId] = useState('');
    const [uploadPropertyTitle, setUploadPropertyTitle] = useState('');
    const [propertyOptions, setPropertyOptions] = useState([]);
    const [dragOver, setDragOver] = useState(false);
    const filesPerPage = 6;
    const fileInputRef = useRef(null);

    const userId = user?._id;
    const fetchFiles = async () => {
        if (!userId) return;
        try {
            const res = await api.get(`/api/vault?userId=${userId}`);
            const data = res.data;
            const fileList = Array.isArray(data) ? data : (data?.files || []);
            setFiles(fileList);
            const bytes = data && !Array.isArray(data) && typeof data.usedBytes === 'number' ? data.usedBytes : 0;
            setUsedBytes(bytes);
            setVaultCache(userId, { files: fileList, usedBytes: bytes });
        } catch (err) {
            console.error("Error loading files", err);
            showNotification('Failed to load files', 'error');
        }
    };
    useEffect(() => {
        if (!userId) return;
        const cached = getVaultCache(userId);
        if (cached) {
            setFiles(cached.files);
            setUsedBytes(cached.usedBytes);
        }
        fetchFiles();
    }, [userId]);

    // 2. Handle File Upload
    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (uploadDocumentType === 'property' && !uploadPropertyId) {
            showNotification('Please select a property when linking to a property.', 'error');
            return;
        }
        if (usedBytes + file.size > limitBytes) {
            showNotification(`Storage limit (1 GB) would be exceeded. You have ${(((limitBytes - usedBytes) / (1024 * 1024)).toFixed(2))} MB free.`, 'error');
            return;
        }
        const maxSize = 50 * 1024 * 1024; // 50MB
        if (file.size > maxSize) {
            showNotification(`File is too large. Maximum size is 50MB. Your file is ${(file.size / (1024 * 1024)).toFixed(2)}MB`, 'error');
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
            return;
        }

        console.log('📤 Starting file upload:', file.name, 'Size:', file.size, 'Type:', file.type);
        setUploading(true);
        
        // Convert file to base64 for Vercel serverless
        const reader = new FileReader();
        reader.onloadend = async () => {
            try {
                console.log('📦 File read successfully, size:', reader.result.length);
                console.log('📤 Sending to API...');
                
                const uploadData = {
                    userId: user._id,
                    name: file.name,
                    fileData: reader.result,
                    size: file.size,
                    type: file.type,
                    folder: uploadDocumentType === 'property' ? 'Property Files' : (uploadFolder || 'General Documents'),
                    propertyId: uploadDocumentType === 'property' && uploadPropertyId ? uploadPropertyId : undefined,
                    propertyTitle: uploadDocumentType === 'property' && uploadPropertyTitle ? uploadPropertyTitle : undefined
                };
                
                console.log('📋 Upload data:', {
                    userId: uploadData.userId,
                    name: uploadData.name,
                    size: uploadData.size,
                    type: uploadData.type,
                    folder: uploadData.folder,
                    fileDataLength: uploadData.fileData.length
                });

                const res = await api.post('/api/vault', uploadData);
                console.log('✅ Upload successful:', res.data);
                setFiles([res.data, ...files]);
                if (res.data && typeof res.data.sizeBytes === 'number') setUsedBytes((prev) => prev + res.data.sizeBytes);
                setUploading(false);
                setShowUploadModal(false);
                showNotification("File uploaded successfully!", 'success');
                fetchFiles();
                if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                }
            } catch (err) {
                console.error('❌ Upload error:', err);
                console.error('❌ Error response:', err.response?.data);
                console.error('❌ Error message:', err.message);
                
                const errorMessage = err.response?.data?.message || err.message || 'Upload failed. Please try again.';
                setUploading(false);
                showNotification(`Upload failed: ${errorMessage}`, 'error');
                
                // Reset file input on error
                if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                }
            }
        };
        reader.onerror = (error) => {
            console.error('❌ FileReader error:', error);
            setUploading(false);
            showNotification("Error reading file. Please try again.", 'error');
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        };
        reader.readAsDataURL(file);
    };

    // 3. Handle File Click (View/Download)
    const handleFileClick = (file) => {
        if (file.path && file.path.startsWith('data:')) {
            // Base64 data URL - open in new tab
            const newWindow = window.open();
            if (newWindow) {
                newWindow.document.write(`<img src="${file.path}" style="max-width:100%; height:auto;" />`);
            }
        } else {
            // Regular file path
            const cleanPath = file.path?.replace(/\\/g, "/");
            const fileUrl = API_BASE_URL ? `${API_BASE_URL}/${cleanPath}` : `/${cleanPath}`;
            window.open(fileUrl, '_blank');
        }
    };

    // Get unique property titles for property folders
    const propertyFolders = [...new Set(files.filter(f => f.propertyTitle).map(f => f.propertyTitle))];
    
    // Get general document folders (excluding property-related)
    const generalFolders = ['Bank Statements', 'Tax Documents', 'Legal Documents', 'Insurance', 'Contracts', 'Other'];
    
    // Filter files based on active folder and search
    const getFilteredFiles = () => {
        let filtered = files;

        // Filter by folder
        if (activeFolder === 'Property Files') {
            filtered = filtered.filter(f => f.propertyTitle);
        } else if (activeFolder === 'General Documents') {
            filtered = filtered.filter(f => !f.propertyTitle && (f.folder === 'General Documents' || f.folder === 'General' || !f.folder));
        } else if (activeFolder === 'Recent') {
            const weekAgo = new Date();
            weekAgo.setDate(weekAgo.getDate() - 7);
            filtered = filtered.filter(f => new Date(f.date) >= weekAgo);
        } else if (activeFolder === 'Property Folders') {
            // Show all property files grouped
            filtered = filtered.filter(f => f.propertyTitle);
        } else if (propertyFolders.includes(activeFolder)) {
            filtered = filtered.filter(f => f.propertyTitle === activeFolder);
        } else if (generalFolders.includes(activeFolder)) {
            filtered = filtered.filter(f => f.folder === activeFolder);
        }
        // 'All Files' shows everything

        // Filter by search query
        if (searchQuery) {
            filtered = filtered.filter(f => 
                f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (f.propertyTitle && f.propertyTitle.toLowerCase().includes(searchQuery.toLowerCase())) ||
                (f.folder && f.folder.toLowerCase().includes(searchQuery.toLowerCase()))
            );
        }

        return filtered.sort((a, b) => new Date(b.date) - new Date(a.date));
    };

    const filteredFiles = getFilteredFiles();
    
    // Pagination
    const totalPages = Math.ceil(filteredFiles.length / filesPerPage);
    const startIndex = (currentPage - 1) * filesPerPage;
    const paginatedFiles = filteredFiles.slice(startIndex, startIndex + filesPerPage);

    // Get file counts for folders
    const getFileCount = (folderName) => {
        if (folderName === 'Property Files') {
            return files.filter(f => f.propertyTitle).length;
        } else if (folderName === 'General Documents') {
            return files.filter(f => !f.propertyTitle && (f.folder === 'General Documents' || f.folder === 'General' || !f.folder)).length;
        } else if (folderName === 'Recent') {
            const weekAgo = new Date();
            weekAgo.setDate(weekAgo.getDate() - 7);
            return files.filter(f => new Date(f.date) >= weekAgo).length;
        } else if (propertyFolders.includes(folderName)) {
            return files.filter(f => f.propertyTitle === folderName).length;
        } else if (generalFolders.includes(folderName)) {
            return files.filter(f => f.folder === folderName).length;
        }
        return files.length;
    };

    const contentStyle = { flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' };

    return (
        <div className="dashboard-container" style={{ display: 'flex' }}>
            <Sidebar />
            <main className="dashboard-main" style={{ padding: isMobile ? '16px' : '30px', backgroundColor: '#f4f7f6', height: '100vh', maxHeight: '100vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                {/* Storage bar */}
                <div style={{ marginBottom: '16px', background: 'white', borderRadius: '12px', padding: '12px 16px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', fontSize: '13px', color: '#555' }}>
                        <span>Storage</span>
                        <span style={{ fontWeight: '600', color: '#11575C' }}>
                            {(usedBytes / (1024 * 1024)).toFixed(2)} MB / {(limitBytes / (1024 * 1024)).toFixed(0)} MB · {limitBytes ? Math.round((usedBytes / limitBytes) * 100) : 0}% used
                        </span>
                    </div>
                    <div style={{ height: '8px', background: '#e5e7eb', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${Math.min(100, limitBytes ? (usedBytes / limitBytes) * 100 : 0)}%`, background: usedBytes / limitBytes > 0.9 ? '#dc2626' : '#11575C', borderRadius: '4px', transition: 'width 0.3s ease' }} />
                    </div>
                    <div style={{ fontSize: '11px', color: '#888', marginTop: '4px' }}>{(limitBytes - usedBytes) / (1024 * 1024) > 0 ? `${((limitBytes - usedBytes) / (1024 * 1024)).toFixed(2)} MB free` : 'No space left'}</div>
                </div>
                <header className="dash-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                    <div className="welcome-text">
                        <h1 style={{ margin: 0, color: '#1f3a3d', fontSize: '28px', fontWeight: '700' }}>My Vault</h1>
                        <p style={{ margin: '5px 0 0 0', color: '#888' }}>Secure document storage</p>
                    </div>
                    <button
                        className="add-file-btn"
                        title="Upload a document"
                        style={{ background: '#11575C', border: 'none', padding: '12px 24px', borderRadius: '30px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px', color: 'white', fontSize: '14px', cursor: 'pointer' }}
                        onClick={() => {
                            setShowUploadModal(true);
                            setUploadDocumentType('general');
                            setUploadPropertyId('');
                            setUploadPropertyTitle('');
                            if (userId) api.get(`/api/users/${userId}?type=dashboard`).then((r) => {
                                const list = r.data?.listData || r.data?.agentProperties || [];
                                setPropertyOptions(list.map((p) => ({ id: p._id || p.details?._id, title: p.propertyTitle || p.title || p.details?.propertyTitle || 'Property' })));
                            }).catch(() => setPropertyOptions([]));
                        }}
                    >
                        <i className="fas fa-plus"></i> Upload Document
                    </button>
                </header>

                <div style={contentStyle}>
                <div className="vault-grid" style={{ display: 'flex', gap: '30px', flex: 1, minHeight: 0, overflow: 'hidden' }}>
                    
                    {/* LEFT COLUMN (Folders) - scrollable list */}
                    <div className="vault-left-col" style={{ width: '280px', minWidth: '280px', display: isMobile ? 'none' : 'flex', flexDirection: 'column', background: 'white', borderRadius: '16px', padding: '20px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
                        <h3 style={{ fontSize: '14px', color: '#888', marginBottom: '10px', textTransform: 'uppercase', fontWeight: '600', flexShrink: 0 }}>Folders</h3>
                        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'hidden', display: 'flex', flexDirection: 'column', gap: '20px', paddingRight: '6px', WebkitOverflowScrolling: 'touch' }}>
                        {/* Main Folders */}
                        <div style={{ marginBottom: '0' }}>
                            {['All Files', 'Property Files', 'General Documents', 'Recent'].map(folder => (
                                <div 
                                    key={folder}
                                    className="folder-item" 
                                    onClick={() => { setActiveFolder(folder); setCurrentPage(1); }}
                                    style={{
                                        ...folderItemStyle,
                                        background: activeFolder === folder ? 'rgba(17, 87, 92, 0.1)' : 'white',
                                        borderLeft: activeFolder === folder ? '3px solid #11575C' : '3px solid transparent'
                                    }}
                                >
                                    <div className="f-icon" style={{ ...folderIconStyle, background: getFolderColor(folder), color: '#11575C' }}>
                                        <i className={getFolderIcon(folder)}></i>
                                    </div>
                                    <div className="f-info" style={{ flex: 1 }}>
                                        <h4 style={{ margin: 0, fontSize: '14px', fontWeight: '600', color: '#1f3a3d' }}>{folder}</h4>
                                        <span style={{ fontSize: '12px', color: '#888' }}>{getFileCount(folder)} files</span>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Property Folders Section */}
                        {propertyFolders.length > 0 && (
                            <div style={{ marginBottom: '20px' }}>
                                <h4 style={{ fontSize: '12px', color: '#888', marginBottom: '10px', textTransform: 'uppercase', fontWeight: '600' }}>Property Folders</h4>
                                {propertyFolders.map(propertyTitle => (
                                    <div 
                                        key={propertyTitle}
                                        className="folder-item" 
                                        onClick={() => { setActiveFolder(propertyTitle); setCurrentPage(1); }}
                                        style={{
                                            ...folderItemStyle,
                                            background: activeFolder === propertyTitle ? 'rgba(17, 87, 92, 0.1)' : 'white',
                                            borderLeft: activeFolder === propertyTitle ? '3px solid #11575C' : '3px solid transparent',
                                            padding: '10px 12px',
                                            marginBottom: '5px'
                                        }}
                                    >
                                        <div className="f-icon" style={{ ...folderIconStyle, background: 'rgba(255, 200, 1, 0.2)', color: '#11575C', width: '32px', height: '32px', fontSize: '14px' }}>
                                            <i className="fas fa-home"></i>
                                        </div>
                                        <div className="f-info" style={{ flex: 1 }}>
                                            <h4 style={{ margin: 0, fontSize: '13px', fontWeight: '600', color: '#1f3a3d' }}>{propertyTitle}</h4>
                                            <span style={{ fontSize: '11px', color: '#888' }}>{getFileCount(propertyTitle)} files</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* General Document Folders */}
                        <div>
                            <h4 style={{ fontSize: '12px', color: '#888', marginBottom: '10px', textTransform: 'uppercase', fontWeight: '600' }}>General Folders</h4>
                            {generalFolders.map(folder => {
                                const count = getFileCount(folder);
                                if (count === 0 && activeFolder !== folder) return null; // Hide empty folders unless active
                                return (
                                    <div 
                                        key={folder}
                                        className="folder-item" 
                                        onClick={() => { setActiveFolder(folder); setCurrentPage(1); }}
                                        style={{
                                            ...folderItemStyle,
                                            background: activeFolder === folder ? 'rgba(17, 87, 92, 0.1)' : 'white',
                                            borderLeft: activeFolder === folder ? '3px solid #11575C' : '3px solid transparent',
                                            padding: '10px 12px',
                                            marginBottom: '5px'
                                        }}
                                    >
                                        <div className="f-icon" style={{ ...folderIconStyle, background: 'rgba(167, 171, 172, 0.3)', color: '#11575C', width: '32px', height: '32px', fontSize: '14px' }}>
                                            <i className="far fa-folder"></i>
                                        </div>
                                        <div className="f-info" style={{ flex: 1 }}>
                                            <h4 style={{ margin: 0, fontSize: '13px', fontWeight: '600', color: '#1f3a3d' }}>{folder}</h4>
                                            <span style={{ fontSize: '11px', color: '#888' }}>{count} files</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        </div>
                    </div>

                    {/* RIGHT COLUMN (Files List) */}
                    <div className="vault-right-col" style={{ flex: 1, minHeight: 0, background: 'white', borderRadius: '16px', padding: '20px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                        
                        {/* Search Bar - hidden for now */}
                        <div style={{ display: 'none', alignItems: 'center', gap: '10px', marginBottom: '20px', padding: '10px', background: '#f9fafb', borderRadius: '8px' }}>
                            <i className="fas fa-search" style={{ color: '#888' }}></i>
                            <input
                                type="text"
                                placeholder="Search files..."
                                value={searchQuery}
                                onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                                style={{
                                    border: 'none',
                                    outline: 'none',
                                    background: 'transparent',
                                    flex: 1,
                                    fontSize: '14px',
                                    color: '#333'
                                }}
                            />
                            {searchQuery && (
                                <button
                                    onClick={() => { setSearchQuery(''); setCurrentPage(1); }}
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#888' }}
                                >
                                    <i className="fas fa-times"></i>
                                </button>
                            )}
                        </div>

                        {/* Filter Tabs */}
                        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', borderBottom: '1px solid #eee', paddingBottom: '10px' }}>
                            <select
                                value={activeFolder}
                                onChange={(e) => { setActiveFolder(e.target.value); setCurrentPage(1); }}
                                style={{
                                    border: '1px solid #e5e7eb',
                                    borderRadius: '6px',
                                    padding: '6px 12px',
                                    fontSize: '13px',
                                    color: '#333',
                                    background: 'white',
                                    cursor: 'pointer'
                                }}
                            >
                                <option value="All Files">All Types</option>
                                <option value="Property Files">Property Files</option>
                                <option value="General Documents">General Documents</option>
                            </select>
                        </div>

                        {/* File List */}
                        <div className="file-list" style={{ overflowY: 'auto', flex: 1, marginBottom: '20px' }}>
                            
                            {paginatedFiles.length === 0 && (
                                <div style={{ textAlign: 'center', marginTop: '50px', color: '#aaa' }}>
                                    <i className="fas fa-cloud-upload-alt" style={{ fontSize: '40px', marginBottom: '10px' }}></i>
                                    <p>No files found.</p>
                                </div>
                            )}

                            {paginatedFiles.map(file => (
                                <div 
                                    key={file._id} 
                                    className="file-item" 
                                    onClick={() => handleFileClick(file)}
                                    style={{ 
                                        display: 'flex', 
                                        alignItems: 'center', 
                                        padding: '15px', 
                                        borderBottom: '1px solid #f9f9f9', 
                                        cursor: 'pointer', 
                                        transition: '0.2s',
                                        borderRadius: '8px',
                                        marginBottom: '5px'
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.background = '#f9fafb'}
                                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                >
                                    <div className="file-icon" style={{ ...fileIconStyle, background: getFileColor(file.type), overflow: 'hidden', padding: 0 }}>
                                        {(file.type && file.type.includes('image')) && file.path && String(file.path).startsWith('data:') ? (
                                            <img src={file.path} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        ) : (
                                            <i className={getFileIcon(file.type)}></i>
                                        )}
                                    </div>
                                    <div className="file-details" style={{ marginLeft: '15px', flex: 1 }}>
                                        <h4 style={{ margin: 0, color: '#333', fontSize: '14px', fontWeight: '600' }}>{file.name}</h4>
                                        <div className="file-meta" style={{ fontSize: '12px', color: '#888', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                                            {file.propertyTitle && (
                                                <span style={{ 
                                                    background: 'rgba(255, 200, 1, 0.2)', 
                                                    color: '#11575C', 
                                                    padding: '2px 8px', 
                                                    borderRadius: '4px',
                                                    fontSize: '11px',
                                                    fontWeight: '600'
                                                }}>
                                                    <i className="fas fa-home" style={{ marginRight: '4px' }}></i>
                                                    {file.propertyTitle}
                                                </span>
                                            )}
                                            {file.folder && !file.propertyTitle && (
                                                <span style={{ 
                                                    background: 'rgba(167, 171, 172, 0.35)', 
                                                    color: '#11575C', 
                                                    padding: '2px 8px', 
                                                    borderRadius: '4px',
                                                    fontSize: '11px',
                                                    fontWeight: '600'
                                                }}>
                                                    {file.folder}
                                                </span>
                                            )}
                                            <span>{file.size || 'N/A'}</span>
                                            <span>{new Date(file.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                                        </div>
                                    </div>
                                    <div className="file-actions">
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); handleFileClick(file); }}
                                            style={{ background: 'none', border: 'none', color: '#11575C', cursor: 'pointer', padding: '8px' }}
                                        >
                                            <i className="fas fa-download"></i>
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '15px', borderTop: '1px solid #eee' }}>
                                <div style={{ fontSize: '13px', color: '#888' }}>
                                    Showing {startIndex + 1}-{Math.min(startIndex + filesPerPage, filteredFiles.length)} of {filteredFiles.length} files
                                </div>
                                <div style={{ display: 'flex', gap: '10px' }}>
                                    <button
                                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                        disabled={currentPage === 1}
                                        style={{
                                            padding: '6px 12px',
                                            border: '1px solid #e5e7eb',
                                            borderRadius: '6px',
                                            background: currentPage === 1 ? '#f3f4f6' : 'white',
                                            cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                                            color: currentPage === 1 ? '#9ca3af' : '#333',
                                            fontSize: '13px'
                                        }}
                                    >
                                        Previous
                                    </button>
                                    <button
                                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                        disabled={currentPage === totalPages}
                                        style={{
                                            padding: '6px 12px',
                                            border: '1px solid #e5e7eb',
                                            borderRadius: '6px',
                                            background: currentPage === totalPages ? '#f3f4f6' : 'white',
                                            cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                                            color: currentPage === totalPages ? '#9ca3af' : '#333',
                                            fontSize: '13px'
                                        }}
                                    >
                                        Next
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
                </div>
            </main>

            {showUploadModal && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0, 0, 0, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }} onClick={(e) => e.target === e.currentTarget && setShowUploadModal(false)}>
                    <div style={{ background: 'white', borderRadius: '16px', padding: '30px', maxWidth: '500px', width: '90%', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
                        <h2 style={{ margin: '0 0 20px 0', color: '#1f3a3d', fontSize: '20px', fontWeight: '700' }}>Upload Document</h2>
                        <div style={{ marginBottom: '20px' }}>
                            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600', color: '#333' }}>Document type</label>
                            <select value={uploadDocumentType} onChange={(e) => { setUploadDocumentType(e.target.value); if (e.target.value === 'general') { setUploadPropertyId(''); setUploadPropertyTitle(''); } }} style={{ width: '100%', padding: '10px', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '14px', background: 'white' }}>
                                <option value="general">General document</option>
                                <option value="property">Linked to a property</option>
                            </select>
                        </div>
                        {uploadDocumentType === 'property' && (
                            <div style={{ marginBottom: '20px' }}>
                                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600', color: '#333' }}>Property</label>
                                <select value={uploadPropertyId} onChange={(e) => { const o = propertyOptions.find(p => String(p.id) === e.target.value); setUploadPropertyId(e.target.value); setUploadPropertyTitle(o ? o.title : ''); }} style={{ width: '100%', padding: '10px', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '14px', background: 'white' }}>
                                    <option value="">Select a property</option>
                                    {propertyOptions.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
                                </select>
                            </div>
                        )}
                        {uploadDocumentType === 'general' && (
                            <div style={{ marginBottom: '20px' }}>
                                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600', color: '#333' }}>Folder</label>
                                <select value={uploadFolder} onChange={(e) => setUploadFolder(e.target.value)} style={{ width: '100%', padding: '10px', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '14px', background: 'white' }}>
                                    <option value="General Documents">General Documents</option>
                                    {generalFolders.map(folder => <option key={folder} value={folder}>{folder}</option>)}
                                </select>
                            </div>
                        )}
                        <div style={{ marginBottom: '20px' }}>
                            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600', color: '#333' }}>File</label>
                            <input type="file" ref={fileInputRef} onChange={handleFileChange} style={{ display: 'none' }} />
                            <div
                                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                                onDragLeave={() => setDragOver(false)}
                                onDrop={(e) => { e.preventDefault(); setDragOver(false); const file = e.dataTransfer?.files?.[0]; if (!file) return; if (file.size > 50 * 1024 * 1024) { showNotification('File too large. Max 50MB.', 'error'); return; } if (usedBytes + file.size > limitBytes) { showNotification('Storage limit (1 GB) would be exceeded.', 'error'); return; } handleFileChange({ target: { files: [file] } }); }}
                                onClick={() => fileInputRef.current?.click()}
                                style={{ border: `2px dashed ${dragOver ? '#11575C' : '#e5e7eb'}`, borderRadius: '12px', padding: '28px', textAlign: 'center', background: dragOver ? 'rgba(17, 87, 92, 0.06)' : '#f9fafb', cursor: 'pointer' }}
                            >
                                <i className="fas fa-cloud-upload-alt" style={{ fontSize: '32px', color: '#11575C', marginBottom: '8px' }}></i>
                                <div style={{ fontSize: '14px', color: '#555' }}>Drag and drop here, or click to choose</div>
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                            <button onClick={() => { setShowUploadModal(false); setUploadFolder('General Documents'); setUploadDocumentType('general'); setUploadPropertyId(''); setUploadPropertyTitle(''); if (fileInputRef.current) fileInputRef.current.value = ''; }} style={{ padding: '10px 20px', border: '1px solid #e5e7eb', borderRadius: '8px', background: 'white', cursor: 'pointer', fontSize: '14px', fontWeight: '600', color: '#333' }}>Cancel</button>
                            <button onClick={() => fileInputRef.current?.click()} disabled={uploading} style={{ padding: '10px 20px', border: 'none', borderRadius: '8px', background: uploading ? '#A7ABAC' : '#11575C', cursor: uploading ? 'not-allowed' : 'pointer', fontSize: '14px', fontWeight: '600', color: 'white' }}>{uploading ? 'Uploading...' : 'Add from local'}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// --- HELPER FUNCTIONS & STYLES ---

const getFileIcon = (type) => {
    if (!type) return 'far fa-file-alt';
    if (type.includes('image')) return 'far fa-image';
    if (type.includes('pdf')) return 'far fa-file-pdf';
    if (type.includes('video')) return 'fas fa-video';
    if (type.includes('word') || type.includes('document')) return 'far fa-file-word';
    if (type.includes('excel') || type.includes('spreadsheet')) return 'far fa-file-excel';
    return 'far fa-file-alt';
};

const getFileColor = (type) => {
    if (!type) return '#f3f4f6';
    if (type.includes('image')) return 'rgba(255, 200, 1, 0.25)';
    if (type.includes('pdf')) return 'rgba(255, 200, 1, 0.2)';
    if (type.includes('video')) return 'rgba(167, 171, 172, 0.35)';
    if (type.includes('word') || type.includes('document')) return 'rgba(218, 218, 218, 0.9)';
    if (type.includes('excel') || type.includes('spreadsheet')) return 'rgba(255, 200, 1, 0.2)';
    return '#f3f4f6';
};

const getFolderIcon = (folder) => {
    if (folder === 'All Files') return 'fas fa-folder-open';
    if (folder === 'Property Files') return 'fas fa-home';
    if (folder === 'General Documents') return 'fas fa-folder';
    if (folder === 'Recent') return 'fas fa-clock';
    return 'far fa-folder';
};

const getFolderColor = (folder) => {
    if (folder === 'All Files') return 'rgba(255, 200, 1, 0.25)';
    if (folder === 'Property Files') return 'rgba(255, 200, 1, 0.2)';
    if (folder === 'General Documents') return 'rgba(167, 171, 172, 0.3)';
    if (folder === 'Recent') return 'rgba(255, 200, 1, 0.2)';
    return 'rgba(218, 218, 218, 0.8)';
};

const folderItemStyle = {
    background: 'white',
    padding: '12px 15px',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    cursor: 'pointer',
    transition: '0.2s',
    marginBottom: '8px'
};

const folderIconStyle = {
    width: '40px',
    height: '40px',
    borderRadius: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '18px'
};

const fileIconStyle = {
    width: '48px',
    height: '48px',
    borderRadius: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '20px',
    color: '#11575C'
};

export default VaultLegacy;
