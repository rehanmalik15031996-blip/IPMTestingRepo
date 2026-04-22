import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import api from '../config/api';
import { showNotification } from '../components/NotificationManager';
import PropdataImportFloatingBar from '../components/PropdataImportFloatingBar';

const STORAGE_KEY = 'ipm_propdata_import_job';

function readStoredJob() {
    try {
        const raw = sessionStorage.getItem(STORAGE_KEY);
        if (!raw) return null;
        const o = JSON.parse(raw);
        if (o && o.jobId && o.userId) return o;
    } catch {
        /* ignore */
    }
    return null;
}

function writeStoredJob(jobId, userId) {
    try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ jobId, userId }));
    } catch {
        /* ignore */
    }
}

function clearStoredJob() {
    try {
        sessionStorage.removeItem(STORAGE_KEY);
    } catch {
        /* ignore */
    }
}

function currentUserId() {
    try {
        const u = JSON.parse(localStorage.getItem('user') || 'null');
        return u && u._id ? String(u._id) : null;
    } catch {
        return null;
    }
}

const PropdataImportContext = createContext(null);

export function PropdataImportProvider({ children }) {
    const [jobId, setJobId] = useState(null);
    const [jobStatus, setJobStatus] = useState(null);
    /** After completion, keep a short "done" UI before hiding */
    const [phaseUi, setPhaseUi] = useState('idle'); // idle | running | done_ok | done_err
    const resumedRef = useRef(false);

    const beginPropdataImportJob = useCallback((newJobId) => {
        const uid = currentUserId();
        if (!newJobId || !uid) return;
        writeStoredJob(newJobId, uid);
        setJobStatus(null);
        setPhaseUi('running');
        setJobId(newJobId);
    }, []);

    const clearJob = useCallback((reason) => {
        setJobId(null);
        setJobStatus(null);
        setPhaseUi('idle');
        clearStoredJob();
        if (reason === 'forbidden') {
            showNotification('PropData import stopped — session changed or access denied.', 'error', 5000);
        }
    }, []);

    /** Resume after navigation / refresh */
    useEffect(() => {
        if (resumedRef.current) return;
        resumedRef.current = true;
        const stored = readStoredJob();
        const uid = currentUserId();
        if (stored && uid && stored.userId === uid && stored.jobId) {
            setJobId(stored.jobId);
            setPhaseUi('running');
        }
    }, []);

    /** Poll while jobId set */
    useEffect(() => {
        if (!jobId) return undefined;
        let cancelled = false;
        let intervalId = null;

        const finishOk = (data) => {
            const sum = data.summary;
            const topErr = data.error;
            const detail = sum
                ? ` Properties: ${sum.propertiesUpserted} (skipped ${sum.propertiesSkipped}). Leads: ${sum.leadsImported} (skipped ${sum.leadsSkipped}). Agents: ${sum.agentsCreated}.`
                : '';
            const errTail = sum?.errors?.length ? ` ${sum.errors.slice(0, 3).join(' ')}` : '';
            if (topErr || (sum?.errors && sum.errors.length)) {
                showNotification((topErr || 'PropData import finished with errors.') + detail + errTail, 'error', 12000);
                setPhaseUi('done_err');
            } else {
                showNotification(`PropData import finished.${detail}`, 'success', 10000);
                setPhaseUi('done_ok');
            }
            clearStoredJob();
            setTimeout(() => {
                setJobId(null);
                setJobStatus(null);
                setPhaseUi('idle');
            }, 4200);
        };

        const poll = async () => {
            const uid = currentUserId();
            if (!uid) {
                clearJob();
                return;
            }
            try {
                const res = await api.get(`/api/agency/migration/import/propdata-xlsx/status/${jobId}`);
                if (cancelled) return;
                setJobStatus(res.data);
                if (res.data?.done) {
                    if (intervalId) clearInterval(intervalId);
                    finishOk(res.data);
                }
            } catch (e) {
                if (cancelled) return;
                const code = e.response?.status;
                if (code === 401 || code === 403) {
                    if (intervalId) clearInterval(intervalId);
                    clearJob('forbidden');
                    return;
                }
                if (code === 404) {
                    if (intervalId) clearInterval(intervalId);
                    showNotification(
                        'PropData import job expired or was not found. Run the import again if it did not finish.',
                        'error',
                        8000,
                    );
                    clearJob();
                    return;
                }
                /* transient errors: keep polling */
            }
        };

        poll();
        intervalId = setInterval(poll, 600);
        return () => {
            cancelled = true;
            if (intervalId) clearInterval(intervalId);
        };
    }, [jobId, clearJob]);

    const value = useMemo(
        () => ({
            propdataJobId: jobId,
            propdataJobStatus: jobStatus,
            propdataImportPhaseUi: phaseUi,
            beginPropdataImportJob,
        }),
        [jobId, jobStatus, phaseUi, beginPropdataImportJob],
    );

    return (
        <PropdataImportContext.Provider value={value}>
            {children}
            <PropdataImportFloatingBar />
        </PropdataImportContext.Provider>
    );
}

export function usePropdataImport() {
    const ctx = useContext(PropdataImportContext);
    if (!ctx) {
        throw new Error('usePropdataImport must be used within PropdataImportProvider');
    }
    return ctx;
}
