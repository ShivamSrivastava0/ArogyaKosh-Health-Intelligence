import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  HiOutlineUsers,
  HiOutlinePlus,
  HiOutlinePencilSquare,
  HiOutlineTrash,
  HiOutlineDocumentText,
  HiOutlineCloudArrowUp,
  HiOutlineMagnifyingGlass,
  HiOutlineFunnel,
  HiOutlineEye,
  HiOutlineHeart,
  HiOutlineExclamationTriangle,
  HiOutlineShieldCheck,
  HiOutlineXMark,
} from 'react-icons/hi2';
import { useAuth } from '../context/AuthContext';
import {
  getFamilyMembers,
  addFamilyMember,
  updateFamilyMember,
  deleteFamilyMember,
} from '../services/familyService';
import {
  getReports,
  uploadReport,
  deleteReport,
} from '../services/reportService';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import Avatar from '../components/ui/Avatar';
import Loader from '../components/ui/Loader';

const RELATIONS = ['SELF', 'SPOUSE', 'CHILD', 'PARENT', 'SIBLING', 'OTHER'];
const GENDERS = ['MALE', 'FEMALE', 'OTHER'];
const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const ACCESS_LEVELS = ['FULL_ACCESS', 'VIEW_ONLY', 'EMERGENCY_ONLY'];
const REPORT_CATEGORIES = [
  { value: 'LAB_REPORT', label: 'Lab Report' },
  { value: 'PRESCRIPTION', label: 'Prescription' },
  { value: 'SCAN', label: 'Scan' },
  { value: 'OTHER', label: 'Other' },
];

function Select({ label, value, onChange, options, placeholder = 'Select...', className = '' }) {
  const opts = Array.isArray(options) && typeof options[0] === 'object' ? options : options.map(o => ({ value: o, label: o }));
  return (
    <div className={className}>
      {label && <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>}
      <select value={value} onChange={e => onChange(e.target.value)} className="block w-full rounded-lg border-slate-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm bg-white">
        <option value="">{placeholder}</option>
        {opts.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

function Field({ label, value, onChange, type = 'text', placeholder = '', className = '' }) {
  return (
    <div className={className}>
      {label && <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>}
      <input type={type} value={value || ''} onChange={e => onChange(type === 'number' ? (e.target.value ? Number(e.target.value) : '') : e.target.value)} placeholder={placeholder} className="block w-full rounded-lg border-slate-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm" />
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────
export default function FamilyVault() {
  const { user } = useAuth();
  const [activeView, setActiveView] = useState('family'); // 'family' | 'reports'
  const [loading, setLoading] = useState(true);

  // Family state
  const [members, setMembers] = useState([]);
  const [memberModalOpen, setMemberModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [memberForm, setMemberForm] = useState({ name: '', relation: '', gender: '', dateOfBirth: '', bloodGroup: '', allergies: '', chronicConditions: '', emergencyContact: '', accessPermission: 'FULL_ACCESS' });
  const [memberSaving, setMemberSaving] = useState(false);

  // Reports state
  const [reports, setReports] = useState([]);
  const [reportPagination, setReportPagination] = useState({ total: 0, page: 1, pages: 1 });
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [reportSaving, setReportSaving] = useState(false);
  const [reportForm, setReportForm] = useState({ title: '', category: 'LAB_REPORT', patientId: '', patientName: 'Self', reportDate: '', doctorName: '', facilityName: '', tags: '' });
  const [selectedFile, setSelectedFile] = useState(null);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const fileInputRef = useRef(null);

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true);
    await Promise.all([fetchMembers(), fetchReports()]);
    setLoading(false);
  };

  // ─── Family CRUD ───────────────────────────────────────────────────────────
  const fetchMembers = async () => {
    try {
      const res = await getFamilyMembers();
      if (res.success) setMembers(res.data?.members || []);
    } catch { /* silent */ }
  };

  const openAddMember = () => {
    setEditingMember(null);
    setMemberForm({ name: '', relation: '', gender: '', dateOfBirth: '', bloodGroup: '', allergies: '', chronicConditions: '', emergencyContact: '', accessPermission: 'FULL_ACCESS' });
    setMemberModalOpen(true);
  };

  const openEditMember = (m) => {
    setEditingMember(m);
    setMemberForm({
      name: m.name, relation: m.relation, gender: m.gender || '', dateOfBirth: m.dateOfBirth ? m.dateOfBirth.split('T')[0] : '', bloodGroup: m.bloodGroup || '',
      allergies: (m.allergies || []).join(', '), chronicConditions: (m.chronicConditions || []).join(', '), emergencyContact: m.emergencyContact || '', accessPermission: m.accessPermission || 'FULL_ACCESS',
    });
    setMemberModalOpen(true);
  };

  const handleSaveMember = async () => {
    if (!memberForm.name || !memberForm.relation) { toast.error('Name and relation are required'); return; }
    try {
      setMemberSaving(true);
      const payload = {
        ...memberForm,
        dateOfBirth: memberForm.dateOfBirth || null,
        allergies: memberForm.allergies ? memberForm.allergies.split(',').map(s => s.trim()).filter(Boolean) : [],
        chronicConditions: memberForm.chronicConditions ? memberForm.chronicConditions.split(',').map(s => s.trim()).filter(Boolean) : [],
      };
      if (editingMember) {
        await updateFamilyMember(editingMember._id, payload);
        toast.success('Family member updated');
      } else {
        await addFamilyMember(payload);
        toast.success('Family member added');
      }
      setMemberModalOpen(false);
      fetchMembers();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to save'); }
    finally { setMemberSaving(false); }
  };

  const handleDeleteMember = async (id) => {
    try {
      await deleteFamilyMember(id);
      toast.success('Family member removed');
      fetchMembers();
    } catch { toast.error('Failed to delete'); }
  };

  // ─── Reports CRUD ──────────────────────────────────────────────────────────
  const fetchReports = async (page = 1) => {
    try {
      const params = { page, limit: 20 };
      if (categoryFilter) params.category = categoryFilter;
      if (searchQuery) params.search = searchQuery;
      const res = await getReports(params);
      if (res.success) {
        setReports(res.data?.reports || []);
        setReportPagination(res.data?.pagination || { total: 0, page: 1, pages: 1 });
      }
    } catch { /* silent */ }
  };

  useEffect(() => { if (!loading) fetchReports(); }, [categoryFilter, searchQuery]);

  const openUploadModal = () => {
    setReportForm({ title: '', category: 'LAB_REPORT', patientId: user?._id || '', patientName: 'Self', reportDate: new Date().toISOString().split('T')[0], doctorName: '', facilityName: '', tags: '' });
    setSelectedFile(null);
    setUploadModalOpen(true);
  };

  const handleUploadReport = async () => {
    if (!reportForm.title) { toast.error('Report title is required'); return; }
    try {
      setReportSaving(true);
      const formData = new FormData();
      Object.entries(reportForm).forEach(([k, v]) => { if (v) formData.append(k, v); });
      if (!reportForm.patientId) { formData.set('patientId', user?._id); formData.set('patientModel', 'User'); }
      if (selectedFile) formData.append('file', selectedFile);
      await uploadReport(formData);
      toast.success('Report uploaded successfully');
      setUploadModalOpen(false);
      fetchReports();
    } catch (err) { toast.error(err.response?.data?.message || 'Upload failed'); }
    finally { setReportSaving(false); }
  };

  const handleDeleteReport = async (id) => {
    try { await deleteReport(id); toast.success('Report deleted'); fetchReports(); }
    catch { toast.error('Failed to delete report'); }
  };

  const getCategoryColor = (cat) => {
    switch (cat) { case 'LAB_REPORT': return 'info'; case 'PRESCRIPTION': return 'success'; case 'SCAN': return 'warning'; default: return 'neutral'; }
  };

  const getPatientOptions = () => {
    const opts = [{ value: user?._id || '', label: `${user?.name || 'Self'} (You)` }];
    members.forEach(m => opts.push({ value: m._id, label: `${m.name} (${m.relation})` }));
    return opts;
  };

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><Loader size="lg" text="Loading Family Vault..." /></div>;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-6xl mx-auto space-y-6 pb-10">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-900 via-blue-800 to-indigo-900 text-white p-6 sm:p-8 shadow-xl">
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-700/50 backdrop-blur-md border border-blue-500/30 text-blue-200 text-xs font-medium mb-3">
            <HiOutlineUsers className="w-3.5 h-3.5" /> Family Health Vault
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Family Health Vault</h1>
          <p className="text-blue-100/80 mt-1 text-sm">Manage your family's health profiles and medical records in one secure place.</p>
        </div>
      </div>

      {/* View Toggle */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit">
        <button onClick={() => setActiveView('family')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeView === 'family' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
          <HiOutlineUsers className="w-4 h-4 inline mr-1.5" />Family Members ({members.length})
        </button>
        <button onClick={() => setActiveView('reports')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeView === 'reports' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
          <HiOutlineDocumentText className="w-4 h-4 inline mr-1.5" />Medical Reports ({reportPagination.total})
        </button>
      </div>

      {/* ═══════════ FAMILY MEMBERS VIEW ═══════════ */}
      {activeView === 'family' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">Family Members</h2>
            <Button variant="primary" size="sm" onClick={openAddMember}><HiOutlinePlus className="w-4 h-4 mr-1.5" />Add Member</Button>
          </div>

          {members.length === 0 ? (
            <Card className="text-center py-12">
              <HiOutlineUsers className="w-12 h-12 mx-auto text-slate-300 mb-3" />
              <p className="text-slate-500 text-sm">No family members added yet.</p>
              <Button variant="outline" size="sm" className="mt-4" onClick={openAddMember}><HiOutlinePlus className="w-4 h-4 mr-1.5" />Add Your First Family Member</Button>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {members.map((m) => (
                <Card key={m._id} className="hover:shadow-md transition-shadow group">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <Avatar name={m.name} size="md" />
                      <div>
                        <h3 className="font-bold text-slate-900">{m.name}</h3>
                        <p className="text-xs text-slate-500">{m.relation}{m.gender ? ` • ${m.gender}` : ''}</p>
                      </div>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => openEditMember(m)} className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg"><HiOutlinePencilSquare className="w-4 h-4" /></button>
                      <button onClick={() => handleDeleteMember(m._id)} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg"><HiOutlineTrash className="w-4 h-4" /></button>
                    </div>
                  </div>

                  <div className="space-y-2 text-xs">
                    {m.bloodGroup && <div className="flex items-center gap-2"><HiOutlineHeart className="w-3.5 h-3.5 text-rose-500" /><span className="text-slate-600">Blood: <strong>{m.bloodGroup}</strong></span></div>}
                    {m.allergies?.length > 0 && <div className="flex items-start gap-2"><HiOutlineExclamationTriangle className="w-3.5 h-3.5 text-amber-500 mt-0.5" /><span className="text-slate-600">{m.allergies.join(', ')}</span></div>}
                    {m.chronicConditions?.length > 0 && <div className="flex items-start gap-2"><HiOutlineShieldCheck className="w-3.5 h-3.5 text-blue-500 mt-0.5" /><span className="text-slate-600">{m.chronicConditions.join(', ')}</span></div>}
                  </div>

                  <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <Badge variant={m.accessPermission === 'FULL_ACCESS' ? 'success' : m.accessPermission === 'VIEW_ONLY' ? 'info' : 'warning'} size="sm">{m.accessPermission.replace('_', ' ')}</Badge>
                    {m.dateOfBirth && <span className="text-[11px] text-slate-400">DOB: {new Date(m.dateOfBirth).toLocaleDateString()}</span>}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ═══════════ MEDICAL REPORTS VIEW ═══════════ */}
      {activeView === 'reports' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <h2 className="text-lg font-bold text-slate-900">Medical Reports</h2>
            <Button variant="primary" size="sm" onClick={openUploadModal}><HiOutlineCloudArrowUp className="w-4 h-4 mr-1.5" />Upload Report</Button>
          </div>

          {/* Search & Filter Bar */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <HiOutlineMagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input type="text" placeholder="Search reports by title, doctor, facility..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="block w-full pl-10 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-emerald-500 focus:border-emerald-500 bg-white" />
            </div>
            <div className="flex gap-2 items-center">
              <HiOutlineFunnel className="w-4 h-4 text-slate-400" />
              {REPORT_CATEGORIES.map(c => (
                <button key={c.value} onClick={() => setCategoryFilter(categoryFilter === c.value ? '' : c.value)} className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${categoryFilter === c.value ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {reports.length === 0 ? (
            <Card className="text-center py-12">
              <HiOutlineDocumentText className="w-12 h-12 mx-auto text-slate-300 mb-3" />
              <p className="text-slate-500 text-sm">{searchQuery || categoryFilter ? 'No reports match your filters.' : 'No medical reports uploaded yet.'}</p>
              <Button variant="outline" size="sm" className="mt-4" onClick={openUploadModal}><HiOutlineCloudArrowUp className="w-4 h-4 mr-1.5" />Upload Your First Report</Button>
            </Card>
          ) : (
            <div className="space-y-2">
              {reports.map((r) => (
                <div key={r._id} className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-xl hover:shadow-sm transition-shadow group">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className={`p-2.5 rounded-lg font-bold text-xs ${r.category === 'LAB_REPORT' ? 'bg-blue-100 text-blue-700' : r.category === 'PRESCRIPTION' ? 'bg-emerald-100 text-emerald-700' : r.category === 'SCAN' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-700'}`}>
                      {r.fileType?.includes('pdf') ? 'PDF' : 'IMG'}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900 truncate">{r.title}</p>
                      <p className="text-xs text-slate-400 truncate">
                        {r.patientName}{r.doctorName ? ` • Dr. ${r.doctorName}` : ''}{r.facilityName ? ` • ${r.facilityName}` : ''} • {new Date(r.reportDate).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-3">
                    <Badge variant={getCategoryColor(r.category)} size="sm">{REPORT_CATEGORIES.find(c => c.value === r.category)?.label || r.category}</Badge>
                    {r.tags?.length > 0 && <span className="text-[10px] text-slate-400 hidden sm:block">{r.tags.slice(0, 2).join(', ')}</span>}
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {r.fileUrl && <a href={r.fileUrl} target="_blank" rel="noopener noreferrer" className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"><HiOutlineEye className="w-4 h-4" /></a>}
                      <button onClick={() => handleDeleteReport(r._id)} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg"><HiOutlineTrash className="w-4 h-4" /></button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ═══════════ FAMILY MEMBER MODAL ═══════════ */}
      <Modal isOpen={memberModalOpen} onClose={() => setMemberModalOpen(false)} title={editingMember ? 'Edit Family Member' : 'Add Family Member'} size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Full Name *" value={memberForm.name} onChange={v => setMemberForm({ ...memberForm, name: v })} placeholder="Full name" />
            <Select label="Relation *" value={memberForm.relation} onChange={v => setMemberForm({ ...memberForm, relation: v })} options={RELATIONS} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Select label="Gender" value={memberForm.gender} onChange={v => setMemberForm({ ...memberForm, gender: v })} options={GENDERS} />
            <Field label="Date of Birth" type="date" value={memberForm.dateOfBirth} onChange={v => setMemberForm({ ...memberForm, dateOfBirth: v })} />
            <Select label="Blood Group" value={memberForm.bloodGroup} onChange={v => setMemberForm({ ...memberForm, bloodGroup: v })} options={BLOOD_GROUPS} />
          </div>
          <Field label="Allergies (comma-separated)" value={memberForm.allergies} onChange={v => setMemberForm({ ...memberForm, allergies: v })} placeholder="Peanuts, Penicillin" />
          <Field label="Chronic Conditions (comma-separated)" value={memberForm.chronicConditions} onChange={v => setMemberForm({ ...memberForm, chronicConditions: v })} placeholder="Diabetes, Hypertension" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Emergency Contact" value={memberForm.emergencyContact} onChange={v => setMemberForm({ ...memberForm, emergencyContact: v })} placeholder="Phone number" />
            <Select label="Access Permission" value={memberForm.accessPermission} onChange={v => setMemberForm({ ...memberForm, accessPermission: v })} options={ACCESS_LEVELS} />
          </div>
          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <Button variant="outline" onClick={() => setMemberModalOpen(false)}>Cancel</Button>
            <Button variant="primary" isLoading={memberSaving} onClick={handleSaveMember}>{editingMember ? 'Update' : 'Add Member'}</Button>
          </div>
        </div>
      </Modal>

      {/* ═══════════ UPLOAD REPORT MODAL ═══════════ */}
      <Modal isOpen={uploadModalOpen} onClose={() => setUploadModalOpen(false)} title="Upload Medical Report" size="lg">
        <div className="space-y-4">
          <Field label="Report Title *" value={reportForm.title} onChange={v => setReportForm({ ...reportForm, title: v })} placeholder="e.g. Complete Blood Count (CBC)" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Select label="Category" value={reportForm.category} onChange={v => setReportForm({ ...reportForm, category: v })} options={REPORT_CATEGORIES} />
            <Select label="Patient" value={reportForm.patientId} onChange={v => {
              const opt = getPatientOptions().find(o => o.value === v);
              setReportForm({ ...reportForm, patientId: v, patientName: opt?.label?.split(' (')[0] || 'Self', patientModel: members.find(m => m._id === v) ? 'FamilyMember' : 'User' });
            }} options={getPatientOptions()} placeholder="Select patient" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Field label="Report Date" type="date" value={reportForm.reportDate} onChange={v => setReportForm({ ...reportForm, reportDate: v })} />
            <Field label="Doctor Name" value={reportForm.doctorName} onChange={v => setReportForm({ ...reportForm, doctorName: v })} placeholder="Dr. Smith" />
            <Field label="Facility / Lab" value={reportForm.facilityName} onChange={v => setReportForm({ ...reportForm, facilityName: v })} placeholder="Apollo Labs" />
          </div>
          <Field label="Tags (comma-separated)" value={reportForm.tags} onChange={v => setReportForm({ ...reportForm, tags: v })} placeholder="blood, cholesterol, lipid" />

          {/* File Upload Area */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Upload File (PDF, JPG, PNG — max 10MB)</label>
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center cursor-pointer hover:border-emerald-400 hover:bg-emerald-50/30 transition-colors"
            >
              {selectedFile ? (
                <div className="flex items-center justify-center gap-2">
                  <HiOutlineDocumentText className="w-5 h-5 text-emerald-600" />
                  <span className="text-sm font-medium text-slate-700">{selectedFile.name}</span>
                  <span className="text-xs text-slate-400">({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)</span>
                  <button onClick={(e) => { e.stopPropagation(); setSelectedFile(null); }} className="p-1 hover:bg-slate-200 rounded"><HiOutlineXMark className="w-4 h-4" /></button>
                </div>
              ) : (
                <div>
                  <HiOutlineCloudArrowUp className="w-8 h-8 mx-auto text-slate-400 mb-2" />
                  <p className="text-sm text-slate-500">Click to browse or drag & drop</p>
                </div>
              )}
            </div>
            <input ref={fileInputRef} type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={e => setSelectedFile(e.target.files?.[0] || null)} className="hidden" />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <Button variant="outline" onClick={() => setUploadModalOpen(false)}>Cancel</Button>
            <Button variant="primary" isLoading={reportSaving} onClick={handleUploadReport}><HiOutlineCloudArrowUp className="w-4 h-4 mr-1.5" />Upload</Button>
          </div>
        </div>
      </Modal>
    </motion.div>
  );
}
