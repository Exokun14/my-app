'use client';

import React, { useState, useEffect } from 'react';
import { POSDevice, Client, getBranchLicense, isAlohaType, isRetailType } from './dashboard_overview_func';
import {
  MBtnS, MBtnP, MBtnXS,
  POSFormFields, POSFormData, BLANK_POS_FORM,
  PeripheralItem, PeripheralsViewModal, makePeripheralItem,
} from './popup_shared';
import POSDetailPopup from './pos_detail_popup';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost';

interface Props {
  branch: string;
  client: Client;
  posDevices: POSDevice[];
  branchMsaStart?: string;
  branchMsaEnd?: string;
  branchDbId?: number;
  onClose: () => void;
  onAddPOS: (branch: string, posData: Omit<POSFormData, never>) => void;
  onEditPOS: (posId: string, posData: Omit<POSFormData, never>) => void;
  onRemovePOS: (posId: string) => void;
  onDeleteBranch?: (branch: string) => void;
}

interface DBBranch {
  id:                  number;
  company_id:          number;
  branch_name:         string;
  license_number:      string | null;
  msa_start_date:      string | null;
  msa_end_date:        string | null;
  implementation_date: string | null;
}

interface DBPosMachineRow {
  id: number;
  branch_id: number;
  model: string;
  serial_number: string;
  operating_system: string;
  warranty_date: string | null;
  created_at: string;
  updated_at: string;
}

/* ── DB shape of a pos_peripherals row ── */
interface DBPeripheralRow {
  id:            number;
  pos_id:        number;
  company_id:    number;
  branch_id:     number;
  model_name:    string;
  serial_number: string | null;
  warranty_date: string | null;
  created_at:    string;
  updated_at:    string;
}

/* ── Map a DB peripheral row → UI PeripheralItem ── */
function dbRowToPeripheralItem(row: DBPeripheralRow): PeripheralItem {
  return {
    id:           String(row.id),
    dbId:         row.id,
    model:        row.model_name    ?? '',
    serial:       row.serial_number ?? '',
    warrantyDate: row.warranty_date ?? '',
  };
}

function resolveBranchLicense(client: Client, branch: string, posDevices: POSDevice[]): string {
  const fromMap = client.branchLicenses?.[branch]?.trim();
  if (fromMap) return fromMap;
  if (!isAlohaType(client.cat) && client.branchLicenses) {
    const anyShared = Object.values(client.branchLicenses).find(v => v?.trim());
    if (anyShared) return anyShared.trim();
  }
  if (client.licenseId?.trim()) return client.licenseId.trim();
  const fromPOS = posDevices.find(p => p.branch === branch && p.licenseNumber?.trim());
  if (fromPOS) return fromPOS.licenseNumber.trim();
  return '';
}

export default function BranchDetailPopup({
  branch, client, posDevices,
  branchMsaStart, branchMsaEnd,
  branchDbId,
  onClose, onAddPOS, onEditPOS, onRemovePOS, onDeleteBranch,
}: Props) {
  const isAloha  = isAlohaType(client.cat);
  const isRetail = isRetailType(client.cat);

  /* ── License state ── */
  const [branchLicense, setBranchLicense] = useState<string>(
    () => resolveBranchLicense(client, branch, posDevices),
  );
  const [licenseLoading, setLicenseLoading] = useState<boolean>(
    () => !resolveBranchLicense(client, branch, posDevices),
  );

  /* ── Implementation date (Active/Inactive status) ── */
  const [implementationDate, setImplementationDate] = useState<string | null>(null);

  useEffect(() => {
    const local = resolveBranchLicense(client, branch, posDevices);
    if (local) {
      setBranchLicense(local);
      setLicenseLoading(false);
    } else {
      setLicenseLoading(true);
    }

    fetch(`${API_BASE}/api/branches?company_id=${client.id}`, {
      headers: { 'Accept': 'application/json' },
    })
      .then(res => res.json())
      .then(data => {
        if (!data.success) return;
        /* Resolve implementation_date for this branch */
        const thisBranch = data.branches.find((b: any) => b.branch_name === branch);
        if (thisBranch) {
          setImplementationDate(thisBranch.implementation_date ?? null);
        }
        if (!local) {
          const target = isAloha
            ? data.branches.find((b: any) => b.branch_name === branch && b.license_number?.trim())
            : [...data.branches].reverse().find((b: any) => b.license_number?.trim());
          if (target?.license_number) setBranchLicense(target.license_number.trim());
          setLicenseLoading(false);
        }
      })
      .catch(err => { console.error('[BranchDetailPopup] license fetch failed:', err); setLicenseLoading(false); });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client.id, branch]);

  const derivedMsaStart = branchMsaStart
    ?? (() => {
      const starts = posDevices.filter(p => p.branch === branch && p.msaStart).map(p => p.msaStart!);
      return starts.length ? starts.sort()[0] : '';
    })();
  const derivedMsaEnd = branchMsaEnd
    ?? (() => {
      const ends = posDevices.filter(p => p.branch === branch && p.msaEnd).map(p => p.msaEnd!);
      return ends.length ? ends.sort().at(-1)! : '';
    })();

  const getInitialPosForm = (): POSFormData => ({
    ...BLANK_POS_FORM,
    licenseNumber: branchLicense,
    msaStart: derivedMsaStart,
    msaEnd:   derivedMsaEnd,
  });

  /* ── Add form ── */
  const [showAddForm,  setShowAddForm]  = useState(false);
  const [posForm,      setPosForm]      = useState<POSFormData>({
    ...BLANK_POS_FORM,
    licenseNumber: resolveBranchLicense(client, branch, posDevices),
    msaStart: derivedMsaStart,
    msaEnd:   derivedMsaEnd,
  });
  const [formError,    setFormError]    = useState('');
  const [isSavingPos,  setIsSavingPos]  = useState(false);

  useEffect(() => {
    if (branchLicense && !posForm.licenseNumber) {
      setPosForm(prev => ({ ...prev, licenseNumber: branchLicense }));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branchLicense]);

  /* ── Edit form ── */
  const [editingPosId,   setEditingPosId]   = useState<string | null>(null);
  const [editForm,       setEditForm]       = useState<POSFormData>(BLANK_POS_FORM);
  const [editError,      setEditError]      = useState('');
  const [isSavingEdit,   setIsSavingEdit]   = useState(false);

  /* ── Remove / delete ── */
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);
  const [removingPosId,   setRemovingPosId]   = useState<string | null>(null);
  const [removeError,     setRemoveError]     = useState<Record<string, string>>({});

  const [confirmDeleteBranch, setConfirmDeleteBranch] = useState(false);
  const [isDeletingBranch,    setIsDeletingBranch]    = useState(false);
  const [deleteError,         setDeleteError]         = useState('');

  /* ── POS detail popup ── */
  const [posDetailTarget, setPosDetailTarget] = useState<POSDevice | null>(null);

  /* ── DB POS devices ── */
  const [dbPosDevices,      setDbPosDevices]      = useState<POSDevice[]>([]);
  const [posLoading,        setPosLoading]        = useState(true);
  const [companyTotalPos,   setCompanyTotalPos]   = useState<number | null>(null);
  const [companyPosLoading, setCompanyPosLoading] = useState(true);

  /* ── Peripherals ── */
  const [peripheralsMap,     setPeripheralsMap]     = useState<Record<string, PeripheralItem[]>>({});
  const [peripheralsLoading, setPeripheralsLoading] = useState(false);

  /* ── Peripherals view modal ── */
  const [viewPeripherals, setViewPeripherals] = useState<{
    posId: string;
    posModel: string;
    peripherals: PeripheralItem[];
  } | null>(null);

  /* ── Helpers ── */
  const resolveBranchDbId = async (): Promise<number | null> => {
    if (branchDbId) return branchDbId;
    try {
      const res  = await fetch(`${API_BASE}/api/branches?company_id=${client.id}`, { headers: { 'Accept': 'application/json' } });
      const data = await res.json();
      if (!res.ok || !data.success) return null;
      const found = data.branches.find((b: { branch_name: string; id: number }) => b.branch_name === branch);
      return found ? found.id : null;
    } catch { return null; }
  };

  /* ── Fetch peripherals for a list of POS ids ── */
  const fetchPeripheralsForPos = async (posIds: string[]) => {
    if (posIds.length === 0) return;
    setPeripheralsLoading(true);
    try {
      const results = await Promise.all(
        posIds.map(async posId => {
          const res  = await fetch(`${API_BASE}/api/peripherals?pos_id=${posId}`, { headers: { 'Accept': 'application/json' } });
          const data = await res.json();
          if (!res.ok || !data.success) return { posId, items: [] as PeripheralItem[] };
          const items: PeripheralItem[] = (data.peripherals ?? []).map((row: DBPeripheralRow) => dbRowToPeripheralItem(row));
          return { posId, items };
        }),
      );
      setPeripheralsMap(prev => {
        const next = { ...prev };
        results.forEach(({ posId, items }) => { next[posId] = items; });
        return next;
      });
    } catch (err) {
      console.error('[BranchDetailPopup] fetchPeripherals failed:', err);
    } finally {
      setPeripheralsLoading(false);
    }
  };

  /* ── Save peripherals to DB ── */
  const savePeripheralsToDb = async (
    posId: number,
    branchId: number,
    peripherals: PeripheralItem[],
    existingItems: PeripheralItem[] = [],
  ): Promise<PeripheralItem[]> => {
    const saved: PeripheralItem[] = [];

    for (const p of peripherals) {
      if (!p.model.trim()) continue;

      if (p.dbId !== null) {
        try {
          const body = new FormData();
          body.append('model_name',    p.model.trim());
          body.append('serial_number', p.serial.trim());
          if (p.warrantyDate) body.append('warranty_date', p.warrantyDate);
          body.append('_method', 'PUT');

          const res  = await fetch(`${API_BASE}/api/peripherals/${p.dbId}`, {
            method:  'POST',
            headers: { 'Accept': 'application/json' },
            body,
          });
          const data = await res.json();
          if (res.ok && data.success) {
            saved.push({ ...p, dbId: p.dbId });
          } else {
            console.error('[BranchDetailPopup] peripheral update failed:', data.message);
            saved.push(p);
          }
        } catch (err) {
          console.error('[BranchDetailPopup] peripheral update error:', err);
          saved.push(p);
        }
      } else {
        try {
          const body = new FormData();
          body.append('pos_id',        String(posId));
          body.append('company_id',    String(client.id));
          body.append('branch_id',     String(branchId));
          body.append('model_name',    p.model.trim());
          body.append('serial_number', p.serial.trim());
          if (p.warrantyDate) body.append('warranty_date', p.warrantyDate);

          const res  = await fetch(`${API_BASE}/api/peripherals`, {
            method:  'POST',
            headers: { 'Accept': 'application/json' },
            body,
          });
          const data = await res.json();
          if (res.ok && data.success) {
            saved.push({ ...p, dbId: data.id, id: String(data.id) });
          } else {
            console.error('[BranchDetailPopup] peripheral create failed:', data.message);
            saved.push(p);
          }
        } catch (err) {
          console.error('[BranchDetailPopup] peripheral create error:', err);
          saved.push(p);
        }
      }
    }

    /* ── DELETE removed peripherals ── */
    const savedDbIds = new Set(saved.map(p => p.dbId).filter(Boolean));
    for (const existing of existingItems) {
      if (existing.dbId !== null && !savedDbIds.has(existing.dbId)) {
        try {
          await fetch(`${API_BASE}/api/peripherals/${existing.dbId}`, {
            method:  'DELETE',
            headers: { 'Accept': 'application/json' },
          });
        } catch (err) {
          console.error('[BranchDetailPopup] peripheral delete error:', err);
        }
      }
    }

    return saved;
  };

  /* ── Shared mapper: DB row → POSDevice ── */
  const mapPosRow = (row: DBPosMachineRow): POSDevice => ({
    id:            String(row.id),
    model:         row.model            ?? 'Unknown',
    licenseNumber: branchLicense        || '',
    serial:        row.serial_number    ?? '—',
    os:            row.operating_system ?? '—',
    branch,
    status:        'online' as const,
    msaStart:      derivedMsaStart || undefined,
    msaEnd:        derivedMsaEnd   || undefined,
    warrantyDate:  row.warranty_date ?? undefined,
  });

  const fetchBranchPos = async (bId: number) => {
    const res  = await fetch(`${API_BASE}/api/pos?branch_id=${bId}`, { headers: { 'Accept': 'application/json' } });
    const data = await res.json();
    if (!res.ok || !data.success) return;
    const mapped: POSDevice[] = (data.pos_machines ?? []).map(mapPosRow);
    setDbPosDevices(mapped);
    await fetchPeripheralsForPos(mapped.map(p => p.id));
  };

  const fetchBranchPosSkipPeripherals = async (
    bId: number,
    knownPosId: string,
    knownPeripherals: PeripheralItem[],
  ) => {
    const res  = await fetch(`${API_BASE}/api/pos?branch_id=${bId}`, { headers: { 'Accept': 'application/json' } });
    const data = await res.json();
    if (!res.ok || !data.success) return;
    const mapped: POSDevice[] = (data.pos_machines ?? []).map(mapPosRow);
    setDbPosDevices(mapped);
    const otherIds = mapped.map(p => p.id).filter(id => id !== knownPosId);
    if (otherIds.length > 0) await fetchPeripheralsForPos(otherIds);
    setPeripheralsMap(prev => ({ ...prev, [knownPosId]: knownPeripherals }));
  };

  /* ════════════════════════════════════════════════
     ADD POS
     FIX: Removed the onAddPOS(branch, posForm) call that was causing
     duplicate entries. The parent's posDevices state is updated via
     fetchCompanyTotalPos, and the popup's own display is driven
     entirely by dbPosDevices (populated by fetchBranchPosSkipPeripherals).
     Calling onAddPOS here was redundant and resulted in a second DB
     insert because the parent's handleAddPOSFromBranch also POSTs to
     /api/pos when invoked.
  ════════════════════════════════════════════════ */
  const handleSaveAdd = async () => {
    if (!posForm.serial.trim())        { setFormError('Serial number is required.'); return; }
    if (!posForm.licenseNumber.trim()) { setFormError('License number is required.'); return; }
    setFormError('');
    setIsSavingPos(true);

    try {
      const dbBranchId = await resolveBranchDbId();
      if (!dbBranchId) {
        setFormError('Could not resolve branch record. Please try again.');
        setIsSavingPos(false);
        return;
      }

      const posBody = new FormData();
      posBody.append('branch_id',        String(dbBranchId));
      posBody.append('model',            posForm.model);
      posBody.append('serial_number',    posForm.serial);
      posBody.append('operating_system', posForm.os);
      if (posForm.warrantyDate) posBody.append('warranty_date', posForm.warrantyDate);

      const posRes  = await fetch(`${API_BASE}/api/pos`, {
        method:  'POST',
        headers: { 'Accept': 'application/json' },
        body:    posBody,
      });
      const posData = await posRes.json();

      if (!posRes.ok || !posData.success) {
        const msg = posData.errors
          ? Object.values(posData.errors as Record<string, string[]>).flat().join(' ')
          : posData.message ?? `Server error ${posRes.status}`;
        setFormError(msg);
        setIsSavingPos(false);
        return;
      }

      const newPosId: number = posData.id;

      let savedPeripherals: PeripheralItem[] = [];
      if ((posForm.peripherals ?? []).filter(p => p.model.trim()).length > 0) {
        savedPeripherals = await savePeripheralsToDb(
          newPosId,
          dbBranchId,
          posForm.peripherals,
          [],
        );
      }

      // NOTE: onAddPOS is intentionally NOT called here.
      // The popup manages its own display via dbPosDevices (set below).
      // Calling onAddPOS would trigger a second POST in the parent,
      // causing a duplicate record in pos_machines.

      setPosLoading(true);
      await fetchBranchPosSkipPeripherals(dbBranchId, String(newPosId), savedPeripherals);
      setPosLoading(false);
      await fetchCompanyTotalPos();

      setPosForm(getInitialPosForm());
      setShowAddForm(false);

    } catch (err: any) {
      setFormError(err?.message ?? 'Network error — could not reach the server.');
    } finally {
      setIsSavingPos(false);
    }
  };

  const fetchCompanyTotalPos = async () => {
    setCompanyPosLoading(true);
    try {
      const brRes  = await fetch(`${API_BASE}/api/branches?company_id=${client.id}`, { headers: { 'Accept': 'application/json' } });
      const brData = await brRes.json();
      if (!brRes.ok || !brData.success) return;
      let total = 0;
      await Promise.all(
        brData.branches.map(async (b: any) => {
          try {
            const pRes  = await fetch(`${API_BASE}/api/pos?branch_id=${b.id}`, { headers: { 'Accept': 'application/json' } });
            const pData = await pRes.json();
            if (pRes.ok && pData.success) total += (pData.pos_machines ?? []).length;
          } catch { /* skip */ }
        })
      );
      setCompanyTotalPos(total);
    } catch (err) {
      console.error('[BranchDetailPopup] company POS total fetch failed:', err);
    } finally {
      setCompanyPosLoading(false);
    }
  };

  useEffect(() => {
    if (!client.id) { setPosLoading(false); setCompanyPosLoading(false); return; }
    const init = async () => {
      const bId = await resolveBranchDbId();
      if (bId) {
        try { await fetchBranchPos(bId); }
        catch (err) { console.error('[BranchDetailPopup] POS fetch failed:', err); }
      }
      setPosLoading(false);
      await fetchCompanyTotalPos();
    };
    init();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branchDbId, client.id, branch, branchLicense]);

  const branchPOS = posLoading
    ? []
    : dbPosDevices.length > 0
      ? dbPosDevices
      : posDevices.filter(d => d.branch === branch);

  const companyPosStat = companyPosLoading ? '…' : companyTotalPos !== null ? companyTotalPos : client.posCount;
  const branchPosStat  = posLoading ? '…' : branchPOS.length;
  const totalBranches  = (client.branches || []).length;

  const headerGrad = isAloha
    ? 'linear-gradient(135deg,#d97706,#f59e0b)'
    : isRetail
    ? 'linear-gradient(135deg,#0284c7,#0ea5e9)'
    : 'linear-gradient(135deg,#0d9488,#14b8a6)';

  const licenseReadOnly = !isAloha;

  /* ════════════════════════════════════════════════
     EDIT POS — open form
  ════════════════════════════════════════════════ */
  const startEdit = (pos: POSDevice) => {
    const existing = peripheralsMap[pos.id] ?? [];
    setEditingPosId(pos.id);
    setEditForm({
      model:         pos.model,
      licenseNumber: pos.licenseNumber || branchLicense,
      serial:        pos.serial,
      os:            pos.os,
      msaStart:      pos.msaStart || '',
      msaEnd:        pos.msaEnd   || '',
      warrantyDate:  pos.warrantyDate || '',
      peripherals:   existing.length > 0 ? existing : [],
    });
    setEditError('');
    setConfirmRemoveId(null);
    setRemoveError({});
    setShowAddForm(false);
    setConfirmDeleteBranch(false);
  };

  /* ════════════════════════════════════════════════
     EDIT POS — save
  ════════════════════════════════════════════════ */
  const handleSaveEdit = async () => {
    if (!editForm.serial.trim())        { setEditError('Serial number is required.'); return; }
    if (!editForm.licenseNumber.trim()) { setEditError('License number is required.'); return; }
    setEditError('');
    setIsSavingEdit(true);

    try {
      const posId      = editingPosId!;
      const dbBranchId = await resolveBranchDbId();

      const body = new FormData();
      body.append('model',            editForm.model);
      body.append('serial_number',    editForm.serial);
      body.append('operating_system', editForm.os);
      if (editForm.warrantyDate) body.append('warranty_date', editForm.warrantyDate);
      body.append('_method', 'PUT');

      const res  = await fetch(`${API_BASE}/api/pos/${posId}`, {
        method:  'POST',
        headers: { 'Accept': 'application/json' },
        body,
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        const msg = data.errors
          ? Object.values(data.errors as Record<string, string[]>).flat().join(' ')
          : data.message ?? `Server error ${res.status}`;
        setEditError(msg);
        setIsSavingEdit(false);
        return;
      }

      const existingPeripherals = peripheralsMap[posId] ?? [];
      if (dbBranchId) {
        const saved = await savePeripheralsToDb(
          Number(posId),
          dbBranchId,
          editForm.peripherals ?? [],
          existingPeripherals,
        );
        setPeripheralsMap(prev => ({ ...prev, [posId]: saved }));
      }

      setDbPosDevices(prev =>
        prev.map(p =>
          p.id === posId
            ? { ...p, model: editForm.model, serial: editForm.serial, os: editForm.os, warrantyDate: editForm.warrantyDate || undefined }
            : p,
        ),
      );

      onEditPOS(posId, editForm);
      setEditingPosId(null);

    } catch (err: any) {
      setEditError(err?.message ?? 'Network error — could not reach the server.');
    } finally {
      setIsSavingEdit(false);
    }
  };

  /* ════════════════════════════════════════════════
     REMOVE POS
  ════════════════════════════════════════════════ */
  const handleRemove = async (posId: string) => {
    setRemovingPosId(posId);
    setRemoveError(prev => { const n = { ...prev }; delete n[posId]; return n; });

    try {
      const existingPeripherals = peripheralsMap[posId] ?? [];
      for (const p of existingPeripherals) {
        if (p.dbId !== null) {
          try {
            await fetch(`${API_BASE}/api/peripherals/${p.dbId}`, {
              method:  'DELETE',
              headers: { 'Accept': 'application/json' },
            });
          } catch (err) {
            console.error('[BranchDetailPopup] peripheral delete on POS remove failed:', err);
          }
        }
      }

      const res  = await fetch(`${API_BASE}/api/pos/${posId}`, {
        method: 'DELETE', headers: { 'Accept': 'application/json' },
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setRemoveError(prev => ({ ...prev, [posId]: data.message ?? `Server error ${res.status}` }));
        setRemovingPosId(null);
        return;
      }

      setDbPosDevices(prev => prev.filter(p => p.id !== posId));
      setPeripheralsMap(prev => { const n = { ...prev }; delete n[posId]; return n; });
      setConfirmRemoveId(null);
      if (editingPosId === posId) setEditingPosId(null);
      setCompanyTotalPos(prev => prev !== null ? Math.max(0, prev - 1) : null);
      onRemovePOS(posId);

    } catch (err: any) {
      console.error('[BranchDetailPopup] remove POS failed:', err);
      setRemoveError(prev => ({ ...prev, [posId]: err?.message ?? 'Network error.' }));
    } finally {
      setRemovingPosId(null);
    }
  };

  /* ── Delete Branch ── */
  const handleDeleteBranch = async () => {
    setDeleteError('');
    setIsDeletingBranch(true);
    try {
      const dbId = await resolveBranchDbId();
      if (dbId !== null) {
        const res  = await fetch(`${API_BASE}/api/branches/${dbId}`, {
          method: 'DELETE', headers: { 'Accept': 'application/json' },
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          setDeleteError(data.message ?? `Server error ${res.status}`);
          setIsDeletingBranch(false);
          return;
        }
      }
      onDeleteBranch?.(branch);
      onClose();
    } catch (err: any) {
      setDeleteError(err?.message ?? 'Network error.');
      setIsDeletingBranch(false);
    }
  };

  const catLabel          = isAloha ? 'Aloha' : client.cat;
  const licenseBadgeStyle: React.CSSProperties = isAloha
    ? { background: 'rgba(217,119,6,0.15)', color: '#92400e', border: '1px solid rgba(217,119,6,0.3)' }
    : { background: 'rgba(124,58,237,0.12)', color: '#4c1d95', border: '1px solid rgba(124,58,237,0.22)' };

  /* ── Active / Inactive toggle ── */
  const [isTogglingStatus, setIsTogglingStatus] = useState(false);
  const [statusError,      setStatusError]      = useState('');

  const handleToggleStatus = async () => {
    setIsTogglingStatus(true);
    setStatusError('');
    try {
      const dbId = await resolveBranchDbId();
      if (!dbId) { setStatusError('Could not resolve branch record.'); setIsTogglingStatus(false); return; }

      const newDate = implementationDate
        ? null  /* toggle OFF — set to null */
        : new Date().toISOString().split('T')[0]; /* toggle ON — today */

      const res  = await fetch(`${API_BASE}/api/branches/${dbId}`, {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ implementation_date: newDate }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setStatusError(data.message ?? `Server error ${res.status}`);
      } else {
        setImplementationDate(newDate);
      }
    } catch (err: any) {
      setStatusError(err?.message ?? 'Network error.');
    } finally {
      setIsTogglingStatus(false);
    }
  };

  /* ══════════════════════════════════════════════
     RENDER
  ══════════════════════════════════════════════ */
  return (
    <>
      <div
        onClick={e => { if (e.target === e.currentTarget) onClose(); }}
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(15,7,36,0.45)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000, padding: 20,
        }}
      >
        <div style={{
          width: 660, maxWidth: '96vw', maxHeight: '92vh',
          background: '#fff', borderRadius: 18,
          boxShadow: '0 20px 60px rgba(0,0,0,0.22)',
          overflow: 'hidden', fontFamily: "'DM Sans',sans-serif",
          display: 'flex', flexDirection: 'column',
        }}>

          {/* ── Header ── */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 14, padding: '16px 20px',
            background: headerGrad, flexShrink: 0,
          }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="white" strokeWidth="1.5">
                <path d="M9 2C6.2 2 4 4.2 4 7c0 4.5 5 9 5 9s5-4.5 5-9c0-2.8-2.2-5-5-5z"/>
                <circle cx="9" cy="7" r="1.8"/>
              </svg>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>{branch}</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.75)', marginTop: 2 }}>
                {client.name} · {catLabel}
              </div>
            </div>

            {/* ── Active / Inactive status badge ── */}
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'flex-end',
              gap: 2, flexShrink: 0,
            }}>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                padding: '4px 10px', borderRadius: 20,
                background: implementationDate
                  ? 'rgba(22,163,74,0.25)'
                  : 'rgba(220,38,38,0.25)',
                border: `1px solid ${implementationDate ? 'rgba(22,163,74,0.5)' : 'rgba(220,38,38,0.5)'}`,
              }}>
                <span style={{
                  width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
                  background: implementationDate ? '#4ade80' : '#f87171',
                  boxShadow: implementationDate
                    ? '0 0 5px rgba(74,222,128,0.7)'
                    : '0 0 5px rgba(248,113,113,0.7)',
                }} />
                <span style={{ fontSize: 10.5, fontWeight: 700, color: '#fff', letterSpacing: '0.04em' }}>
                  {implementationDate ? 'Active' : 'Inactive'}
                </span>
              </div>
              {implementationDate && (
                <span style={{ fontSize: 9.5, color: 'rgba(255,255,255,0.7)', fontWeight: 500 }}>
                  since {new Date(implementationDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
              )}
            </div>

            <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(255,255,255,0.2)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
              <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M1 1l9 9M10 1L1 10"/>
              </svg>
            </button>
          </div>

          {/* ── Body ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, overflowY: 'auto', flex: 1, padding: '18px 20px' }}>

            {/* Stat Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: isAloha ? '1fr' : '1fr 1fr 1fr', gap: 10 }}>
              <StatCard value={companyPosStat} label="POS Machines" color="#0d9488" bg="rgba(13,148,136,0.07)" border="rgba(13,148,136,0.18)" loading={companyPosLoading} />
              {!isAloha && (
                <>
                  <StatCard value={branchPosStat} label="Seats" color="#0284c7" bg="rgba(2,132,199,0.07)" border="rgba(2,132,199,0.18)" loading={posLoading} />
                  <StatCard value={totalBranches} label="Total Branches" color="#7c3aed" bg="#ede9fe" border="rgba(124,58,237,0.18)" />
                </>
              )}
            </div>

            {/* License Banner */}
            <div style={{
              display: 'flex', alignItems: 'flex-start', gap: 12,
              background: isAloha ? 'rgba(217,119,6,0.05)' : 'rgba(124,58,237,0.05)',
              border: `1.5px solid ${isAloha ? 'rgba(217,119,6,0.22)' : 'rgba(124,58,237,0.18)'}`,
              borderRadius: 12, padding: '12px 16px',
            }}>
              <div style={{ width: 36, height: 36, borderRadius: 9, flexShrink: 0, background: isAloha ? 'rgba(217,119,6,0.12)' : 'rgba(124,58,237,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="16" height="16" viewBox="0 0 14 14" fill="none" stroke={isAloha ? '#d97706' : '#7c3aed'} strokeWidth="1.5">
                  <circle cx="5.5" cy="8" r="3.5"/><path d="M8.5 8h4M11 6.5V8"/>
                </svg>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: isAloha ? '#92400e' : '#4c1d95' }}>
                    Active License
                  </span>
                  <span style={{ ...licenseBadgeStyle, fontSize: 8.5, fontWeight: 700, padding: '2px 8px', borderRadius: 5, letterSpacing: '0.06em' }}>
                    {isAloha ? 'Unique per branch' : 'Shared — all branches'}
                  </span>
                </div>
                {licenseLoading ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 2 }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={isAloha ? '#d97706' : '#7c3aed'} strokeWidth="2.5" style={{ animation: 'spin 0.75s linear infinite', flexShrink: 0 }}>
                      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
                    </svg>
                    <span style={{ fontSize: 12, color: '#8e7ec0', fontStyle: 'italic' }}>Fetching license…</span>
                  </div>
                ) : branchLicense ? (
                  <div style={{ fontSize: 15, fontWeight: 800, color: isAloha ? '#d97706' : '#7c3aed', letterSpacing: '0.02em', wordBreak: 'break-all' }}>
                    {branchLicense}
                  </div>
                ) : (
                  <div style={{ fontSize: 12, fontStyle: 'italic', color: '#b8aed8', fontWeight: 400 }}>No license assigned yet.</div>
                )}
                <div style={{ fontSize: 10, color: '#8e7ec0', marginTop: 4, lineHeight: 1.5 }}>
                  {isAloha
                    ? `This license is exclusively assigned to the ${branch} branch.`
                    : `This shared license applies to all branches under ${client.name}.`}
                </div>
              </div>
              {(derivedMsaStart || derivedMsaEnd) && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0, borderLeft: `1px solid ${isAloha ? 'rgba(217,119,6,0.22)' : 'rgba(124,58,237,0.18)'}`, paddingLeft: 16, marginLeft: 4 }}>
                  {derivedMsaStart && (
                    <div>
                      <div style={{ fontSize: 8.5, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 3, color: isAloha ? '#b45309' : '#7c3aed', opacity: 0.8 }}>MSA Start</div>
                      <div style={{ fontSize: 11.5, fontWeight: 700, color: '#18103a', whiteSpace: 'nowrap' }}>
                        {new Date(derivedMsaStart).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </div>
                    </div>
                  )}
                  {derivedMsaEnd && (
                    <div>
                      <div style={{ fontSize: 8.5, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 3, color: isAloha ? '#b45309' : '#7c3aed', opacity: 0.8 }}>MSA End</div>
                      <div style={{ fontSize: 11.5, fontWeight: 700, color: '#18103a', whiteSpace: 'nowrap' }}>
                        {new Date(derivedMsaEnd).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* POS Devices */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <span style={{ fontSize: 9.5, fontWeight: 700, color: '#8e7ec0', letterSpacing: '0.13em', textTransform: 'uppercase' }}>
                  POS Devices at this Branch
                </span>
                <span style={{ background: '#ede9fe', color: '#5b21b6', fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 10 }}>
                  {posLoading ? '…' : branchPOS.length}
                </span>
                <div style={{ flex: 1 }} />
                {!showAddForm && !editingPosId && (
                  <button
                    onClick={() => {
                      setPosForm({ ...BLANK_POS_FORM, licenseNumber: branchLicense, msaStart: derivedMsaStart, msaEnd: derivedMsaEnd });
                      setShowAddForm(true);
                      setConfirmRemoveId(null);
                      setConfirmDeleteBranch(false);
                    }}
                    style={{ ...MBtnP, fontSize: 10.5, padding: '6px 12px', gap: 5 }}
                  >
                    <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" width="9" height="9"><path d="M6 1v10M1 6h10"/></svg>
                    Add POS
                  </button>
                )}
              </div>

              {/* ── Add POS Form ── */}
              {showAddForm && (
                <div style={{ background: 'rgba(124,58,237,0.04)', border: '1.5px solid rgba(124,58,237,0.18)', borderRadius: 14, padding: 16, marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <span style={{ fontSize: 11.5, fontWeight: 700, color: '#7c3aed' }}>New POS Device — {branch}</span>
                    <button style={{ ...MBtnXS, background: '#f2f0fb', color: '#4a3870' }}
                      onClick={() => { setShowAddForm(false); setFormError(''); setPosForm(getInitialPosForm()); }}
                      disabled={isSavingPos}>
                      ✕ Cancel
                    </button>
                  </div>
                  <POSFormFields form={posForm} onChange={setPosForm} error={formError} licenseReadOnly={licenseReadOnly} />
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 4 }}>
                    <button style={MBtnS} onClick={() => { setShowAddForm(false); setFormError(''); setPosForm(getInitialPosForm()); }} disabled={isSavingPos}>
                      Cancel
                    </button>
                    <button
                      style={{ ...MBtnP, boxShadow: '0 2px 10px rgba(124,58,237,0.3)', opacity: isSavingPos ? 0.7 : 1, cursor: isSavingPos ? 'not-allowed' : 'pointer' }}
                      onClick={handleSaveAdd}
                      disabled={isSavingPos}
                    >
                      {isSavingPos ? (
                        <><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ animation: 'spin 0.75s linear infinite' }}><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>Saving…</>
                      ) : (
                        <><svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.7" width="11" height="11"><path d="M2 7.5l3.5 3.5 6.5-7"/></svg>Save POS</>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Loading skeleton */}
              {posLoading && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 8 }}>
                  {[1, 2].map(i => (
                    <div key={i} style={{ borderRadius: 12, border: '1px solid rgba(124,58,237,0.1)', padding: '14px', display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 40, height: 40, borderRadius: 10, background: 'linear-gradient(90deg,#ede9fe 25%,#f5f3ff 50%,#ede9fe 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.4s infinite', flexShrink: 0 }} />
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 7 }}>
                        <div style={{ width: '40%', height: 12, borderRadius: 5, background: 'linear-gradient(90deg,#ede9fe 25%,#f5f3ff 50%,#ede9fe 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.4s infinite' }} />
                        <div style={{ width: '65%', height: 10, borderRadius: 5, background: 'linear-gradient(90deg,#ede9fe 25%,#f5f3ff 50%,#ede9fe 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.4s infinite' }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {!posLoading && branchPOS.length === 0 && !showAddForm && (
                <div style={{ textAlign: 'center', padding: '24px', color: '#8e7ec0', fontSize: 12, background: '#f2f0fb', borderRadius: 12, border: '1.5px dashed rgba(124,58,237,0.22)' }}>
                  No POS machines assigned to this branch yet.
                </div>
              )}

              {/* ── POS rows ── */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {branchPOS.map(pos => {
                  const isRemoving      = removingPosId === pos.id;
                  const thisRemoveError = removeError[pos.id];
                  const posPeripherals  = peripheralsMap[pos.id] ?? [];
                  const pCount          = posPeripherals.length;

                  return (
                    <div key={pos.id}>
                      {editingPosId === pos.id ? (
                        /* ── Edit form ── */
                        <div style={{ background: 'rgba(13,148,136,0.04)', border: '1.5px solid rgba(13,148,136,0.22)', borderRadius: 14, padding: 16 }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                            <span style={{ fontSize: 11.5, fontWeight: 700, color: '#0d9488' }}>Edit {pos.model}</span>
                            <button style={{ ...MBtnXS, background: '#f2f0fb', color: '#4a3870' }} onClick={() => { setEditingPosId(null); setEditError(''); }} disabled={isSavingEdit}>
                              ✕ Cancel
                            </button>
                          </div>
                          <POSFormFields form={editForm} onChange={setEditForm} error={editError} licenseReadOnly={licenseReadOnly} />
                          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 4 }}>
                            <button style={MBtnS} onClick={() => { setEditingPosId(null); setEditError(''); }} disabled={isSavingEdit}>Cancel</button>
                            <button
                              style={{ ...MBtnP, background: 'linear-gradient(135deg,#0d9488,#0284c7)', boxShadow: '0 2px 10px rgba(13,148,136,0.3)', opacity: isSavingEdit ? 0.7 : 1, cursor: isSavingEdit ? 'not-allowed' : 'pointer' }}
                              onClick={handleSaveEdit}
                              disabled={isSavingEdit}
                            >
                              {isSavingEdit ? (
                                <><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ animation: 'spin 0.75s linear infinite' }}><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>Saving…</>
                              ) : (
                                <><svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.7" width="11" height="11"><path d="M2 7.5l3.5 3.5 6.5-7"/></svg>Save Changes</>
                              )}
                            </button>
                          </div>
                        </div>
                      ) : (
                        /* ── POS card row ── */
                        <div style={{
                          borderRadius: 12,
                          border: confirmRemoveId === pos.id ? '1.5px solid #dc2626' : '1px solid rgba(124,58,237,0.1)',
                          overflow: 'hidden', background: '#fff', transition: 'all 0.15s',
                          opacity: isRemoving ? 0.7 : 1,
                        }}>
                          <div
                            onClick={e => {
                              if ((e.target as HTMLElement).closest('[data-action-zone]')) return;
                              setConfirmRemoveId(null);
                              setShowAddForm(false);
                              setEditingPosId(null);
                              setPosDetailTarget(pos);
                            }}
                            style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px', cursor: 'pointer' }}
                            onMouseEnter={e => { if (!(e.target as HTMLElement).closest('[data-action-zone]')) (e.currentTarget as HTMLDivElement).style.background = '#f8f7ff'; }}
                            onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = '#fff'; }}
                          >
                            {/* POS icon */}
                            <div style={{ width: 40, height: 40, borderRadius: 10, background: '#ccfbf1', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0d9488" strokeWidth="1.5">
                                <rect x="2" y="3" width="20" height="13" rx="2"/><path d="M2 10h20M12 16v3M8 19h8"/>
                              </svg>
                            </div>

                            {/* Info */}
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 12.5, fontWeight: 700, color: '#18103a', marginBottom: 4 }}>
                                {pos.model}
                              </div>
                              <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'center' }}>
                                {[
                                  { label: 'S/N', val: pos.serial || '—' },
                                  { label: 'OS',  val: pos.os     || '—' },
                                ].map(({ label, val }) => (
                                  <span key={label} style={{ fontSize: 10.5, color: '#8e7ec0' }}>
                                    <span style={{ fontWeight: 600, color: '#4a3870' }}>{label}: </span>{val}
                                  </span>
                                ))}
                              </div>
                            </div>

                            {/* ── Action zone ── */}
                            <div
                              data-action-zone="true"
                              style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}
                              onClick={e => e.stopPropagation()}
                            >
                              {/* Peripherals button */}
                              <button
                                onClick={() => setViewPeripherals({ posId: pos.id, posModel: pos.model, peripherals: posPeripherals })}
                                title="View Peripherals & Accessories"
                                style={{
                                  display: 'inline-flex', alignItems: 'center', gap: 5,
                                  padding: '5px 10px', borderRadius: 8, fontSize: 10.5, fontWeight: 600,
                                  color: pCount > 0 ? '#5b21b6' : '#8e7ec0',
                                  background: pCount > 0 ? '#ede9fe' : '#f2f0fb',
                                  border: `1px solid ${pCount > 0 ? 'rgba(124,58,237,0.28)' : 'rgba(124,58,237,0.14)'}`,
                                  cursor: 'pointer',
                                  fontFamily: "'DM Sans',sans-serif",
                                  transition: 'all 0.14s',
                                }}
                                onMouseEnter={e => { const el = e.currentTarget; el.style.background = '#ede9fe'; el.style.borderColor = 'rgba(124,58,237,0.35)'; el.style.color = '#5b21b6'; }}
                                onMouseLeave={e => { const el = e.currentTarget; el.style.background = pCount > 0 ? '#ede9fe' : '#f2f0fb'; el.style.borderColor = pCount > 0 ? 'rgba(124,58,237,0.28)' : 'rgba(124,58,237,0.14)'; el.style.color = pCount > 0 ? '#5b21b6' : '#8e7ec0'; }}
                              >
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9">
                                  <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
                                </svg>
                                Peripherals
                              </button>

                              {/* Divider */}
                              <div style={{ width: 1, height: 24, background: 'rgba(124,58,237,0.12)', flexShrink: 0 }} />

                              {/* Edit */}
                              <button
                                onClick={() => startEdit(pos)}
                                disabled={isRemoving}
                                style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 8, fontSize: 11, fontWeight: 600, color: '#4a3870', background: '#f2f0fb', border: '1px solid rgba(124,58,237,0.18)', cursor: isRemoving ? 'not-allowed' : 'pointer', fontFamily: "'DM Sans',sans-serif", transition: 'all 0.14s', opacity: isRemoving ? 0.5 : 1 }}
                                onMouseEnter={e => { if (!isRemoving) { const el = e.currentTarget; el.style.background = '#ede9fe'; el.style.borderColor = 'rgba(124,58,237,0.35)'; } }}
                                onMouseLeave={e => { const el = e.currentTarget; el.style.background = '#f2f0fb'; el.style.borderColor = 'rgba(124,58,237,0.18)'; }}
                              >
                                <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6" width="10" height="10"><path d="M8 1l3 3L4 11H1V8z"/></svg>
                                Edit
                              </button>

                              {/* Remove */}
                              <button
                                onClick={() => { setRemoveError(prev => { const n = { ...prev }; delete n[pos.id]; return n; }); setConfirmRemoveId(confirmRemoveId === pos.id ? null : pos.id); }}
                                disabled={isRemoving}
                                style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 8, fontSize: 11, fontWeight: 600, color: '#dc2626', background: '#fee2e2', border: '1px solid rgba(220,38,38,0.2)', cursor: isRemoving ? 'not-allowed' : 'pointer', fontFamily: "'DM Sans',sans-serif", transition: 'all 0.14s', opacity: isRemoving ? 0.5 : 1 }}
                                onMouseEnter={e => { if (!isRemoving) { const el = e.currentTarget; el.style.background = '#fecaca'; el.style.borderColor = 'rgba(220,38,38,0.4)'; } }}
                                onMouseLeave={e => { const el = e.currentTarget; el.style.background = '#fee2e2'; el.style.borderColor = 'rgba(220,38,38,0.2)'; }}
                              >
                                <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6" width="10" height="10"><path d="M2 3h8M5 3V2h2v1M10 3l-.8 7H2.8L2 3"/></svg>
                                Remove
                              </button>
                            </div>
                          </div>

                          {/* Confirm remove banner */}
                          {confirmRemoveId === pos.id && (
                            <div style={{ background: '#fee2e2', borderTop: '1px solid rgba(220,38,38,0.18)', padding: '9px 14px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="#dc2626" strokeWidth="1.6"><circle cx="7" cy="7" r="5.5"/><path d="M7 4.5v3M7 9.5v.5"/></svg>
                                <span style={{ fontSize: 11, fontWeight: 600, color: '#dc2626', flex: 1 }}>
                                  Remove <strong>{pos.model}</strong> from the database?
                                  {pCount > 0 && <span style={{ color: '#b91c1c' }}> This will also delete {pCount} peripheral{pCount !== 1 ? 's' : ''}.</span>}
                                  {' '}This cannot be undone.
                                </span>
                                <button style={{ ...MBtnXS, background: '#fff', color: '#4a3870', opacity: isRemoving ? 0.5 : 1 }} onClick={() => { setConfirmRemoveId(null); setRemoveError({}); }} disabled={isRemoving}>Cancel</button>
                                <button
                                  style={{ ...MBtnXS, background: '#dc2626', color: '#fff', border: 'none', boxShadow: '0 1px 6px rgba(220,38,38,0.3)', opacity: isRemoving ? 0.7 : 1, cursor: isRemoving ? 'not-allowed' : 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                                  onClick={() => handleRemove(pos.id)}
                                  disabled={isRemoving}
                                >
                                  {isRemoving ? (
                                    <><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ animation: 'spin 0.75s linear infinite' }}><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>Removing…</>
                                  ) : 'Confirm Remove'}
                                </button>
                              </div>
                              {thisRemoveError && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', background: 'rgba(220,38,38,0.08)', borderRadius: 7, border: '1px solid rgba(220,38,38,0.25)' }}>
                                  <svg width="11" height="11" viewBox="0 0 14 14" fill="none" stroke="#dc2626" strokeWidth="1.6"><circle cx="7" cy="7" r="5.5"/><path d="M7 4.5v3M7 9.5v.5"/></svg>
                                  <span style={{ fontSize: 11, color: '#dc2626', fontWeight: 600 }}>{thisRemoveError}</span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ── Footer ── */}
          <div style={{ flexShrink: 0, borderTop: '1px solid rgba(124,58,237,0.1)', background: '#f8f7ff', overflow: 'hidden' }}>
            {confirmDeleteBranch && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '12px 20px', background: '#fee2e2', borderBottom: '1px solid rgba(220,38,38,0.18)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="#dc2626" strokeWidth="1.6"><circle cx="7" cy="7" r="5.5"/><path d="M7 4.5v3M7 9.5v.5"/></svg>
                  <span style={{ fontSize: 11.5, fontWeight: 600, color: '#dc2626', flex: 1 }}>
                    Delete <strong>"{branch}"</strong>? This will also remove all {branchPOS.length} POS device{branchPOS.length !== 1 ? 's' : ''} and their peripherals. Cannot be undone.
                  </span>
                  <button style={{ ...MBtnXS, background: '#fff', color: '#4a3870', flexShrink: 0, opacity: isDeletingBranch ? 0.5 : 1 }} onClick={() => { setConfirmDeleteBranch(false); setDeleteError(''); }} disabled={isDeletingBranch}>Cancel</button>
                  <button
                    style={{ ...MBtnXS, flexShrink: 0, background: '#dc2626', color: '#fff', border: 'none', boxShadow: '0 1px 6px rgba(220,38,38,0.3)', fontWeight: 700, opacity: isDeletingBranch ? 0.7 : 1, cursor: isDeletingBranch ? 'not-allowed' : 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5 }}
                    onClick={handleDeleteBranch}
                    disabled={isDeletingBranch}
                  >
                    {isDeletingBranch ? (
                      <><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ animation: 'spin 0.75s linear infinite' }}><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>Deleting…</>
                    ) : 'Confirm Delete'}
                  </button>
                </div>
                {deleteError && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 10px', background: 'rgba(220,38,38,0.08)', borderRadius: 7, border: '1px solid rgba(220,38,38,0.25)' }}>
                    <svg width="11" height="11" viewBox="0 0 14 14" fill="none" stroke="#dc2626" strokeWidth="1.6"><circle cx="7" cy="7" r="5.5"/><path d="M7 4.5v3M7 9.5v.5"/></svg>
                    <span style={{ fontSize: 11, color: '#dc2626', fontWeight: 600 }}>{deleteError}</span>
                  </div>
                )}
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px' }}>
              {/* Left side: Delete Branch + Active/Inactive toggle */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {onDeleteBranch && !confirmDeleteBranch ? (
                  <button
                    onClick={() => { setConfirmDeleteBranch(true); setDeleteError(''); setConfirmRemoveId(null); setRemoveError({}); setShowAddForm(false); setEditingPosId(null); }}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, background: '#fee2e2', color: '#dc2626', border: '1px solid rgba(220,38,38,0.25)', fontSize: 11.5, fontWeight: 700, cursor: 'pointer', fontFamily: "'DM Sans',sans-serif", transition: 'all 0.15s' }}
                    onMouseEnter={e => { const el = e.currentTarget; el.style.background = '#fecaca'; el.style.borderColor = 'rgba(220,38,38,0.45)'; }}
                    onMouseLeave={e => { const el = e.currentTarget; el.style.background = '#fee2e2'; el.style.borderColor = 'rgba(220,38,38,0.25)'; }}
                  >
                    <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.7" width="11" height="11"><path d="M2 3h8M5 3V2h2v1M10 3l-.8 7H2.8L2 3"/></svg>
                    Delete Branch
                  </button>
                ) : <div />}

                {/* ── Active / Inactive toggle ── */}
                {!confirmDeleteBranch && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <button
                      onClick={handleToggleStatus}
                      disabled={isTogglingStatus || isDeletingBranch}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 8,
                        padding: '6px 12px', borderRadius: 8, cursor: isTogglingStatus || isDeletingBranch ? 'not-allowed' : 'pointer',
                        border: `1.5px solid ${implementationDate ? 'rgba(22,163,74,0.3)' : 'rgba(220,38,38,0.28)'}`,
                        background: implementationDate ? 'rgba(22,163,74,0.07)' : 'rgba(220,38,38,0.05)',
                        fontFamily: "'DM Sans',sans-serif", transition: 'all 0.18s',
                        opacity: isTogglingStatus || isDeletingBranch ? 0.6 : 1,
                      }}
                    >
                      {/* Toggle track */}
                      <span style={{
                        position: 'relative', display: 'inline-block',
                        width: 32, height: 17, borderRadius: 9, flexShrink: 0,
                        background: implementationDate ? '#16a34a' : '#dc2626',
                        transition: 'background 0.2s',
                      }}>
                        {isTogglingStatus ? (
                          <span style={{ position: 'absolute', top: 3, left: '50%', transform: 'translateX(-50%)' }}>
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" style={{ animation: 'spin 0.75s linear infinite' }}>
                              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
                            </svg>
                          </span>
                        ) : (
                          <span style={{
                            position: 'absolute', top: 2,
                            left: implementationDate ? 14 : 2,
                            width: 13, height: 13, borderRadius: '50%',
                            background: '#fff',
                            boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
                            transition: 'left 0.18s',
                          }} />
                        )}
                      </span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', flexShrink: 0, background: implementationDate ? '#16a34a' : '#dc2626' }} />
                        <span style={{ fontSize: 11.5, fontWeight: 700, color: implementationDate ? '#15803d' : '#b91c1c' }}>
                          {implementationDate ? 'Active' : 'Inactive'}
                        </span>
                      </span>
                    </button>
                    {statusError && (
                      <span style={{ fontSize: 10, color: '#dc2626', paddingLeft: 4 }}>{statusError}</span>
                    )}
                  </div>
                )}
              </div>

              <button style={MBtnS} onClick={onClose} disabled={isDeletingBranch}>Close</button>
            </div>
          </div>
        </div>

        <style>{`
          @keyframes spin    { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
          @keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
        `}</style>
      </div>

      {/* POS Detail popup */}
      {posDetailTarget && (
        <POSDetailPopup
          pos={posDetailTarget}
          client={client}
          posIndex={branchPOS.findIndex(p => p.id === posDetailTarget.id) + 1}
          onClose={() => setPosDetailTarget(null)}
        />
      )}

      {/* Peripherals View Modal */}
      {viewPeripherals && (
        <PeripheralsViewModal
          posModel={viewPeripherals.posModel}
          peripherals={viewPeripherals.peripherals}
          onClose={() => setViewPeripherals(null)}
        />
      )}
    </>
  );
}

/* ── helper sub-components ── */
function StatCard({ value, label, color, bg, border, loading }: {
  value: number | string; label: string;
  color: string; bg: string; border: string; loading?: boolean;
}) {
  return (
    <div style={{ background: bg, borderRadius: 14, padding: '14px 16px', border: `1px solid ${border}`, textAlign: 'center' }}>
      <div style={{ fontSize: 28, fontWeight: 900, color, lineHeight: 1 }}>
        {loading ? <span style={{ fontSize: 16, opacity: 0.5 }}>…</span> : value}
      </div>
      <div style={{ fontSize: 10.5, color: '#8e7ec0', marginTop: 4, fontWeight: 500 }}>{label}</div>
    </div>
  );
}