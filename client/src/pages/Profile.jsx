import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  HiOutlineUser,
  HiOutlineExclamationTriangle,
  HiOutlineBeaker,
  HiOutlineHeart,
  HiOutlineShieldCheck,
  HiOutlinePhone,
  HiOutlineSun,
  HiOutlinePencilSquare,
  HiOutlinePlus,
  HiOutlineTrash,
  HiOutlineCheckCircle,
  HiOutlineXCircle,
} from 'react-icons/hi2';
import { useAuth } from '../context/AuthContext';
import { getProfile, createProfile, updateProfile } from '../services/profileService';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import Loader from '../components/ui/Loader';
import { calculateBMI, getBMICategory, getStatusColor } from '../utils';

// ─── Constants ───────────────────────────────────────────────────────────────
const TABS = [
  { key: 'personal', label: 'Personal Details', icon: HiOutlineUser },
  { key: 'allergies', label: 'Allergies', icon: HiOutlineExclamationTriangle },
  { key: 'medicines', label: 'Medicines', icon: HiOutlineBeaker },
  { key: 'diseases', label: 'Chronic Diseases', icon: HiOutlineHeart },
  { key: 'insurance', label: 'Insurance', icon: HiOutlineShieldCheck },
  { key: 'emergency', label: 'Emergency Contacts', icon: HiOutlinePhone },
  { key: 'lifestyle', label: 'Lifestyle', icon: HiOutlineSun },
];

const GENDERS = ['MALE', 'FEMALE', 'OTHER'];
const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const ALLERGY_SEVERITIES = ['MILD', 'MODERATE', 'SEVERE'];
const MEDICINE_FREQUENCIES = ['1/day', '2/day', '3/day', '4/day', 'As needed'];
const DISEASE_STATUSES = ['Active', 'Managed', 'Resolved'];
const INSURANCE_TYPES = ['Health', 'Life', 'Accident', 'Critical Illness', 'Other'];
const RELATIONS = ['SELF', 'SPOUSE', 'CHILD', 'PARENT', 'SIBLING', 'OTHER'];
const SMOKING_OPTIONS = ['Never', 'Former', 'Current'];
const ALCOHOL_OPTIONS = ['Never', 'Occasional', 'Regular'];
const EXERCISE_OPTIONS = ['Active', 'Moderate', 'Sedentary'];
const DIET_OPTIONS = ['Vegetarian', 'Non-Vegetarian', 'Vegan', 'Other'];

// ─── Helper: Styled Select ──────────────────────────────────────────────────
function Select({ label, value, onChange, options, placeholder = 'Select...', className = '' }) {
  return (
    <div className={className}>
      {label && <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="block w-full rounded-lg border-slate-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm transition-colors bg-white"
      >
        <option value="">{placeholder}</option>
        {options.map((opt) => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
    </div>
  );
}

function Field({ label, value, onChange, type = 'text', placeholder = '', className = '' }) {
  return (
    <div className={className}>
      {label && <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>}
      <input
        type={type}
        value={value || ''}
        onChange={(e) => onChange(type === 'number' ? (e.target.value ? Number(e.target.value) : null) : e.target.value)}
        placeholder={placeholder}
        className="block w-full rounded-lg border-slate-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm transition-colors"
      />
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────
export default function Profile() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profileExists, setProfileExists] = useState(false);
  const [activeTab, setActiveTab] = useState('personal');

  // Profile state mirrors backend schema
  const [personalDetails, setPersonalDetails] = useState({
    dateOfBirth: '', gender: '', bloodGroup: '', height: null, weight: null, phone: '', address: '',
  });
  const [allergies, setAllergies] = useState([]);
  const [currentMedicines, setCurrentMedicines] = useState([]);
  const [chronicDiseases, setChronicDiseases] = useState([]);
  const [insurancePolicies, setInsurancePolicies] = useState([]);
  const [emergencyContacts, setEmergencyContacts] = useState([]);
  const [lifestyle, setLifestyle] = useState({
    smoking: '', alcohol: '', exercise: '', diet: '', sleepHours: null,
  });

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState(''); // 'allergy', 'medicine', 'disease', 'insurance', 'emergency'
  const [editIndex, setEditIndex] = useState(-1); // -1 = add new
  const [modalData, setModalData] = useState({});

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const res = await getProfile();
      if (res.success && res.data?.exists && res.data.profile) {
        const p = res.data.profile;
        setProfileExists(true);
        setPersonalDetails({
          dateOfBirth: p.personalDetails?.dateOfBirth ? p.personalDetails.dateOfBirth.split('T')[0] : '',
          gender: p.personalDetails?.gender || '',
          bloodGroup: p.personalDetails?.bloodGroup || '',
          height: p.personalDetails?.height || null,
          weight: p.personalDetails?.weight || null,
          phone: p.personalDetails?.phone || '',
          address: p.personalDetails?.address || '',
        });
        setAllergies(p.allergies || []);
        setCurrentMedicines(p.currentMedicines || []);
        setChronicDiseases(p.chronicDiseases || []);
        setInsurancePolicies(p.insurancePolicies || []);
        setEmergencyContacts(p.emergencyContacts || []);
        setLifestyle({
          smoking: p.lifestyle?.smoking || '',
          alcohol: p.lifestyle?.alcohol || '',
          exercise: p.lifestyle?.exercise || '',
          diet: p.lifestyle?.diet || '',
          sleepHours: p.lifestyle?.sleepHours ?? null,
        });
      }
    } catch (err) {
      toast.error('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSection = async (sectionKey, data) => {
    try {
      setSaving(true);
      const payload = { [sectionKey]: data };
      if (!profileExists) {
        await createProfile(payload);
        setProfileExists(true);
        toast.success('Profile created!');
      } else {
        await updateProfile(payload);
        toast.success('Profile updated!');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  // ─── Modal helpers ─────────────────────────────────────────────────────────
  const openAddModal = (type) => {
    setModalType(type);
    setEditIndex(-1);
    setModalData(getDefaultModalData(type));
    setModalOpen(true);
  };

  const openEditModal = (type, index, data) => {
    setModalType(type);
    setEditIndex(index);
    setModalData({ ...data });
    setModalOpen(true);
  };

  const getDefaultModalData = (type) => {
    switch (type) {
      case 'allergy': return { name: '', severity: 'MILD', notes: '' };
      case 'medicine': return { name: '', dosage: '', frequency: '1/day', prescribedBy: '', startDate: '', notes: '' };
      case 'disease': return { name: '', diagnosedDate: '', status: 'Active', notes: '' };
      case 'insurance': return { provider: '', policyNumber: '', validTill: '', coverageAmount: '', type: 'Health' };
      case 'emergency': return { name: '', relation: 'OTHER', phone: '', email: '' };
      default: return {};
    }
  };

  const handleModalSave = () => {
    let updated;
    const arrayMap = {
      allergy: { state: allergies, setter: setAllergies, key: 'allergies' },
      medicine: { state: currentMedicines, setter: setCurrentMedicines, key: 'currentMedicines' },
      disease: { state: chronicDiseases, setter: setChronicDiseases, key: 'chronicDiseases' },
      insurance: { state: insurancePolicies, setter: setInsurancePolicies, key: 'insurancePolicies' },
      emergency: { state: emergencyContacts, setter: setEmergencyContacts, key: 'emergencyContacts' },
    };

    const { state, setter, key } = arrayMap[modalType];

    if (editIndex >= 0) {
      updated = state.map((item, i) => (i === editIndex ? modalData : item));
    } else {
      updated = [...state, modalData];
    }

    setter(updated);
    setModalOpen(false);
    handleSaveSection(key, updated);
  };

  const handleDelete = (type, index) => {
    const arrayMap = {
      allergy: { state: allergies, setter: setAllergies, key: 'allergies' },
      medicine: { state: currentMedicines, setter: setCurrentMedicines, key: 'currentMedicines' },
      disease: { state: chronicDiseases, setter: setChronicDiseases, key: 'chronicDiseases' },
      insurance: { state: insurancePolicies, setter: setInsurancePolicies, key: 'insurancePolicies' },
      emergency: { state: emergencyContacts, setter: setEmergencyContacts, key: 'emergencyContacts' },
    };

    const { state, setter, key } = arrayMap[type];
    const updated = state.filter((_, i) => i !== index);
    setter(updated);
    handleSaveSection(key, updated);
  };

  // ─── BMI ───────────────────────────────────────────────────────────────────
  const bmi = calculateBMI(personalDetails.height, personalDetails.weight);
  const bmiCategory = getBMICategory(bmi);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader size="lg" text="Loading health profile..." />
      </div>
    );
  }

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-5xl mx-auto space-y-6 pb-10"
    >
      {/* Profile Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-900 via-emerald-800 to-teal-900 text-white p-6 sm:p-8 shadow-xl">
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-2xl font-bold shadow-lg">
            {user?.name?.[0]?.toUpperCase() || 'U'}
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold tracking-tight">{user?.name || 'Your Profile'}</h1>
            <p className="text-emerald-200/80 text-sm">{user?.email}</p>
            <div className="flex flex-wrap gap-2 mt-2">
              {personalDetails.bloodGroup && (
                <span className="px-2 py-0.5 bg-white/10 border border-white/20 rounded-full text-xs font-medium">{personalDetails.bloodGroup}</span>
              )}
              {bmi > 0 && (
                <span className="px-2 py-0.5 bg-white/10 border border-white/20 rounded-full text-xs font-medium">BMI {bmi} ({bmiCategory})</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="flex overflow-x-auto border-b border-slate-200 scrollbar-hide">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                activeTab === tab.key
                  ? 'border-emerald-500 text-emerald-700 bg-emerald-50/50'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="p-5 sm:p-6">
          {activeTab === 'personal' && (
            <PersonalDetailsTab
              data={personalDetails}
              setData={setPersonalDetails}
              onSave={() => handleSaveSection('personalDetails', personalDetails)}
              saving={saving}
              bmi={bmi}
              bmiCategory={bmiCategory}
            />
          )}

          {activeTab === 'allergies' && (
            <ArraySectionTab
              title="Allergies"
              items={allergies}
              type="allergy"
              onAdd={() => openAddModal('allergy')}
              onEdit={(i, item) => openEditModal('allergy', i, item)}
              onDelete={(i) => handleDelete('allergy', i)}
              renderItem={(item) => (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-slate-900">{item.name}</p>
                    {item.notes && <p className="text-xs text-slate-500 mt-0.5">{item.notes}</p>}
                  </div>
                  <Badge variant={item.severity === 'SEVERE' ? 'danger' : item.severity === 'MODERATE' ? 'warning' : 'success'} size="sm">
                    {item.severity}
                  </Badge>
                </div>
              )}
              emptyText="No allergies recorded. Add any known allergies."
            />
          )}

          {activeTab === 'medicines' && (
            <ArraySectionTab
              title="Current Medicines"
              items={currentMedicines}
              type="medicine"
              onAdd={() => openAddModal('medicine')}
              onEdit={(i, item) => openEditModal('medicine', i, item)}
              onDelete={(i) => handleDelete('medicine', i)}
              renderItem={(item) => (
                <div>
                  <p className="font-semibold text-slate-900">{item.name}</p>
                  <p className="text-xs text-slate-500">{item.dosage} • {item.frequency}{item.prescribedBy ? ` • by ${item.prescribedBy}` : ''}</p>
                </div>
              )}
              emptyText="No current medicines recorded."
            />
          )}

          {activeTab === 'diseases' && (
            <ArraySectionTab
              title="Chronic Diseases"
              items={chronicDiseases}
              type="disease"
              onAdd={() => openAddModal('disease')}
              onEdit={(i, item) => openEditModal('disease', i, item)}
              onDelete={(i) => handleDelete('disease', i)}
              renderItem={(item) => (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-slate-900">{item.name}</p>
                    {item.diagnosedDate && <p className="text-xs text-slate-500">Diagnosed: {new Date(item.diagnosedDate).toLocaleDateString()}</p>}
                  </div>
                  <Badge variant={item.status === 'Active' ? 'danger' : item.status === 'Managed' ? 'warning' : 'success'} size="sm">
                    {item.status}
                  </Badge>
                </div>
              )}
              emptyText="No chronic diseases recorded."
            />
          )}

          {activeTab === 'insurance' && (
            <ArraySectionTab
              title="Insurance Policies"
              items={insurancePolicies}
              type="insurance"
              onAdd={() => openAddModal('insurance')}
              onEdit={(i, item) => openEditModal('insurance', i, item)}
              onDelete={(i) => handleDelete('insurance', i)}
              renderItem={(item) => (
                <div>
                  <p className="font-semibold text-slate-900">{item.provider}</p>
                  <p className="text-xs text-slate-500">
                    {item.type} • {item.policyNumber}
                    {item.validTill ? ` • Valid till ${new Date(item.validTill).toLocaleDateString()}` : ''}
                    {item.coverageAmount ? ` • ₹${Number(item.coverageAmount).toLocaleString()}` : ''}
                  </p>
                </div>
              )}
              emptyText="No insurance policies recorded."
            />
          )}

          {activeTab === 'emergency' && (
            <ArraySectionTab
              title="Emergency Contacts"
              items={emergencyContacts}
              type="emergency"
              onAdd={() => openAddModal('emergency')}
              onEdit={(i, item) => openEditModal('emergency', i, item)}
              onDelete={(i) => handleDelete('emergency', i)}
              maxItems={5}
              renderItem={(item) => (
                <div>
                  <p className="font-semibold text-slate-900">{item.name}</p>
                  <p className="text-xs text-slate-500">{item.relation} • {item.phone}{item.email ? ` • ${item.email}` : ''}</p>
                </div>
              )}
              emptyText="No emergency contacts. Add up to 5 contacts."
            />
          )}

          {activeTab === 'lifestyle' && (
            <LifestyleTab
              data={lifestyle}
              setData={setLifestyle}
              onSave={() => handleSaveSection('lifestyle', lifestyle)}
              saving={saving}
            />
          )}
        </div>
      </div>

      {/* ─── CRUD Modal ────────────────────────────────────────────────────── */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={`${editIndex >= 0 ? 'Edit' : 'Add'} ${modalType.charAt(0).toUpperCase() + modalType.slice(1)}`}
      >
        <div className="space-y-4">
          {modalType === 'allergy' && (
            <>
              <Field label="Allergy Name" value={modalData.name} onChange={(v) => setModalData({ ...modalData, name: v })} placeholder="e.g. Peanuts" />
              <Select label="Severity" value={modalData.severity} onChange={(v) => setModalData({ ...modalData, severity: v })} options={ALLERGY_SEVERITIES} />
              <Field label="Notes" value={modalData.notes} onChange={(v) => setModalData({ ...modalData, notes: v })} placeholder="Additional notes" />
            </>
          )}
          {modalType === 'medicine' && (
            <>
              <Field label="Medicine Name" value={modalData.name} onChange={(v) => setModalData({ ...modalData, name: v })} placeholder="e.g. Metformin" />
              <div className="grid grid-cols-2 gap-3">
                <Field label="Dosage" value={modalData.dosage} onChange={(v) => setModalData({ ...modalData, dosage: v })} placeholder="e.g. 500mg" />
                <Select label="Frequency" value={modalData.frequency} onChange={(v) => setModalData({ ...modalData, frequency: v })} options={MEDICINE_FREQUENCIES} />
              </div>
              <Field label="Prescribed By" value={modalData.prescribedBy} onChange={(v) => setModalData({ ...modalData, prescribedBy: v })} placeholder="Doctor name" />
              <Field label="Start Date" value={modalData.startDate ? modalData.startDate.split('T')[0] : ''} onChange={(v) => setModalData({ ...modalData, startDate: v })} type="date" />
              <Field label="Notes" value={modalData.notes} onChange={(v) => setModalData({ ...modalData, notes: v })} placeholder="Additional notes" />
            </>
          )}
          {modalType === 'disease' && (
            <>
              <Field label="Disease Name" value={modalData.name} onChange={(v) => setModalData({ ...modalData, name: v })} placeholder="e.g. Type 2 Diabetes" />
              <div className="grid grid-cols-2 gap-3">
                <Field label="Diagnosed Date" value={modalData.diagnosedDate ? modalData.diagnosedDate.split('T')[0] : ''} onChange={(v) => setModalData({ ...modalData, diagnosedDate: v })} type="date" />
                <Select label="Status" value={modalData.status} onChange={(v) => setModalData({ ...modalData, status: v })} options={DISEASE_STATUSES} />
              </div>
              <Field label="Notes" value={modalData.notes} onChange={(v) => setModalData({ ...modalData, notes: v })} placeholder="Additional notes" />
            </>
          )}
          {modalType === 'insurance' && (
            <>
              <Field label="Provider" value={modalData.provider} onChange={(v) => setModalData({ ...modalData, provider: v })} placeholder="e.g. Star Health" />
              <div className="grid grid-cols-2 gap-3">
                <Field label="Policy Number" value={modalData.policyNumber} onChange={(v) => setModalData({ ...modalData, policyNumber: v })} placeholder="Policy #" />
                <Select label="Type" value={modalData.type} onChange={(v) => setModalData({ ...modalData, type: v })} options={INSURANCE_TYPES} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Valid Till" value={modalData.validTill ? modalData.validTill.split('T')[0] : ''} onChange={(v) => setModalData({ ...modalData, validTill: v })} type="date" />
                <Field label="Coverage Amount (₹)" value={modalData.coverageAmount} onChange={(v) => setModalData({ ...modalData, coverageAmount: v })} type="number" placeholder="500000" />
              </div>
            </>
          )}
          {modalType === 'emergency' && (
            <>
              <Field label="Contact Name" value={modalData.name} onChange={(v) => setModalData({ ...modalData, name: v })} placeholder="Full name" />
              <div className="grid grid-cols-2 gap-3">
                <Select label="Relation" value={modalData.relation} onChange={(v) => setModalData({ ...modalData, relation: v })} options={RELATIONS} />
                <Field label="Phone" value={modalData.phone} onChange={(v) => setModalData({ ...modalData, phone: v })} placeholder="+91 XXXXX XXXXX" />
              </div>
              <Field label="Email (optional)" value={modalData.email} onChange={(v) => setModalData({ ...modalData, email: v })} type="email" placeholder="email@example.com" />
            </>
          )}

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleModalSave}>{editIndex >= 0 ? 'Update' : 'Add'}</Button>
          </div>
        </div>
      </Modal>
    </motion.div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function PersonalDetailsTab({ data, setData, onSave, saving, bmi, bmiCategory }) {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-lg font-bold text-slate-900">Personal Details</h3>
        <Button variant="primary" size="sm" isLoading={saving} onClick={onSave}>
          <HiOutlineCheckCircle className="w-4 h-4 mr-1.5" /> Save
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Field label="Date of Birth" type="date" value={data.dateOfBirth} onChange={(v) => setData({ ...data, dateOfBirth: v })} />
        <Select label="Gender" value={data.gender} onChange={(v) => setData({ ...data, gender: v })} options={GENDERS} />
        <Select label="Blood Group" value={data.bloodGroup} onChange={(v) => setData({ ...data, bloodGroup: v })} options={BLOOD_GROUPS} />
        <Field label="Height (cm)" type="number" value={data.height} onChange={(v) => setData({ ...data, height: v })} placeholder="170" />
        <Field label="Weight (kg)" type="number" value={data.weight} onChange={(v) => setData({ ...data, weight: v })} placeholder="70" />
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">BMI</label>
          <div className="h-[38px] flex items-center">
            {bmi > 0 ? (
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-sm font-semibold border ${getStatusColor(bmiCategory)}`}>
                {bmi} — {bmiCategory}
              </span>
            ) : (
              <span className="text-sm text-slate-400">Enter height & weight</span>
            )}
          </div>
        </div>
        <Field label="Phone" value={data.phone} onChange={(v) => setData({ ...data, phone: v })} placeholder="+91 XXXXX XXXXX" />
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-slate-700 mb-1">Address</label>
          <textarea
            value={data.address}
            onChange={(e) => setData({ ...data, address: e.target.value })}
            rows={2}
            placeholder="Home address"
            className="block w-full rounded-lg border-slate-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm transition-colors"
          />
        </div>
      </div>
    </div>
  );
}

function ArraySectionTab({ title, items, type, onAdd, onEdit, onDelete, renderItem, emptyText, maxItems }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-slate-900">{title}</h3>
        {(!maxItems || items.length < maxItems) && (
          <Button variant="outline" size="sm" onClick={onAdd}>
            <HiOutlinePlus className="w-4 h-4 mr-1.5" /> Add
          </Button>
        )}
      </div>

      {items.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          <HiOutlineXCircle className="w-10 h-10 mx-auto mb-2 text-slate-300" />
          <p className="text-sm">{emptyText}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item, i) => (
            <div
              key={item._id || i}
              className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-100 rounded-xl hover:bg-slate-100/70 transition-colors group"
            >
              <div className="flex-1 min-w-0">{renderItem(item)}</div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-3">
                <button
                  onClick={() => onEdit(i, item)}
                  className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                >
                  <HiOutlinePencilSquare className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onDelete(i)}
                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                >
                  <HiOutlineTrash className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function LifestyleTab({ data, setData, onSave, saving }) {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-lg font-bold text-slate-900">Lifestyle</h3>
        <Button variant="primary" size="sm" isLoading={saving} onClick={onSave}>
          <HiOutlineCheckCircle className="w-4 h-4 mr-1.5" /> Save
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Select label="Smoking" value={data.smoking} onChange={(v) => setData({ ...data, smoking: v })} options={SMOKING_OPTIONS} />
        <Select label="Alcohol" value={data.alcohol} onChange={(v) => setData({ ...data, alcohol: v })} options={ALCOHOL_OPTIONS} />
        <Select label="Exercise Level" value={data.exercise} onChange={(v) => setData({ ...data, exercise: v })} options={EXERCISE_OPTIONS} />
        <Select label="Diet" value={data.diet} onChange={(v) => setData({ ...data, diet: v })} options={DIET_OPTIONS} />
        <Field label="Avg. Sleep Hours" type="number" value={data.sleepHours} onChange={(v) => setData({ ...data, sleepHours: v })} placeholder="7" />
      </div>
    </div>
  );
}
