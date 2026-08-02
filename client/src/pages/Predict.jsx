import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  HiOutlineHeart,
  HiOutlineBeaker,
  HiOutlineChartBar,
  HiOutlineClipboardDocumentList,
  HiOutlineCheckCircle,
  HiOutlineArrowPath
} from 'react-icons/hi2';
import { getProfile } from '../services/profileService';
import {
  predictHeartDisease,
  predictDiabetes,
  predictHypertension
} from '../services/predictService';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';

const TABS = [
  { id: 'heart', label: 'Heart Disease', icon: HiOutlineHeart },
  { id: 'diabetes', label: 'Diabetes', icon: HiOutlineBeaker },
  { id: 'hypertension', label: 'Hypertension', icon: HiOutlineChartBar },
];

function Field({ label, value, onChange, type = 'number', placeholder = '', min, max }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        min={min}
        max={max}
        step="any"
        className="block w-full rounded-lg border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm bg-white p-2 border"
      />
    </div>
  );
}

function Select({ label, value, onChange, options }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="block w-full rounded-lg border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm bg-white p-2 border"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
  );
}

export default function Predict() {
  const [activeTab, setActiveTab] = useState('heart');
  const [loading, setLoading] = useState(false);
  const [profileData, setProfileData] = useState(null);
  const [result, setResult] = useState(null);

  // Form states
  const [heartForm, setHeartForm] = useState({ age: '', sex: '1', cp: '0', trestbps: '', chol: '', fbs: '0', thalach: '', exang: '0' });
  const [diabetesForm, setDiabetesForm] = useState({ pregnancies: '0', glucose: '', bloodpressure: '', skinthickness: '20', insulin: '80', bmi: '', pedigree: '0.5', age: '' });
  const [hypertensionForm, setHypertensionForm] = useState({ age: '', sex: '1', bmi: '', smoking: '0', alcohol: '0', physical_activity: '1', sodium_intake: '1', stress_level: '5' });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await getProfile();
      if (res.success && res.data?.exists) {
        setProfileData(res.data.profile);
      }
    } catch {
      // silent
    }
  };

  const autoFillProfile = () => {
    if (!profileData) {
      toast.error('No health profile found. Please fill your profile first.');
      return;
    }
    
    const pd = profileData.personalDetails || {};
    const ls = profileData.lifestyle || {};
    
    // Extract values
    const age = pd.dateOfBirth ? Math.floor((new Date() - new Date(pd.dateOfBirth).getTime()) / 3.15576e+10) : '';
    const sex = pd.gender === 'MALE' ? '1' : pd.gender === 'FEMALE' ? '0' : '1';
    
    let bmi = '';
    if (pd.height && pd.weight) {
      bmi = (pd.weight / ((pd.height / 100) ** 2)).toFixed(1);
    }
    
    const smoking = ls.smoking === 'Current' ? '1' : '0';
    const alcohol = ls.alcohol === 'Regular' || ls.alcohol === 'Occasional' ? '1' : '0';
    const activity = ls.exercise === 'Sedentary' ? '0' : '1';

    if (activeTab === 'heart') {
      setHeartForm(prev => ({ ...prev, age, sex }));
    } else if (activeTab === 'diabetes') {
      setDiabetesForm(prev => ({ ...prev, age, bmi }));
    } else if (activeTab === 'hypertension') {
      setHypertensionForm(prev => ({ ...prev, age, sex, bmi, smoking, alcohol, physical_activity: activity }));
    }
    
    toast.success('Fields auto-filled from profile!');
  };

  const handlePredict = async () => {
    setLoading(true);
    setResult(null);
    try {
      let res;
      if (activeTab === 'heart') {
        const payload = Object.fromEntries(Object.entries(heartForm).map(([k, v]) => [k, Number(v)]));
        res = await predictHeartDisease(payload);
      } else if (activeTab === 'diabetes') {
        const payload = Object.fromEntries(Object.entries(diabetesForm).map(([k, v]) => [k, Number(v)]));
        res = await predictDiabetes(payload);
      } else if (activeTab === 'hypertension') {
        const payload = Object.fromEntries(Object.entries(hypertensionForm).map(([k, v]) => [k, Number(v)]));
        res = await predictHypertension(payload);
      }

      if (res.success) {
        setResult(res.data);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Prediction failed');
    } finally {
      setLoading(false);
    }
  };

  const renderResult = () => {
    if (!result) return null;

    const probPercent = (result.probability * 100).toFixed(1);
    const getRiskColor = (level) => {
      if (level === 'High') return 'text-rose-600 bg-rose-50 border-rose-200';
      if (level === 'Medium') return 'text-amber-600 bg-amber-50 border-amber-200';
      return 'text-emerald-600 bg-emerald-50 border-emerald-200';
    };

    return (
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="mt-6">
        <Card className={`border-2 text-center py-8 ${getRiskColor(result.risk_level)}`}>
          <h3 className="text-xl font-bold mb-2">Prediction Result</h3>
          <div className="text-5xl font-black mb-4">{probPercent}%</div>
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white font-bold uppercase tracking-wider text-sm shadow-sm">
            Risk Level: {result.risk_level}
          </div>
          <p className="mt-4 text-sm opacity-80 max-w-md mx-auto">
            Note: This is an AI-based prediction and should not replace professional medical advice. Please consult a doctor for clinical diagnosis.
          </p>
        </Card>
      </motion.div>
    );
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-4xl mx-auto pb-10">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-900 via-blue-900 to-indigo-800 text-white p-6 sm:p-8 shadow-xl mb-6">
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-700/50 backdrop-blur-md border border-blue-500/30 text-blue-200 text-xs font-medium mb-3">
              <HiOutlineChartBar className="w-3.5 h-3.5 text-blue-300" />
              Machine Learning Models
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">ArogyaPredict</h1>
            <p className="text-blue-100/80 mt-1 text-sm">
              Assess your risk for common chronic diseases using predictive ML models.
            </p>
          </div>
          <Button variant="outline" className="bg-white/10 text-white border-white/20 hover:bg-white/20" onClick={autoFillProfile}>
            <HiOutlineClipboardDocumentList className="w-4 h-4 mr-1.5" />
            Auto-fill from Profile
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-slate-100 rounded-xl p-1 mb-6">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => { setActiveTab(tab.id); setResult(null); }}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab.id ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      <Card>
        {activeTab === 'heart' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Age (years)" value={heartForm.age} onChange={v => setHeartForm({ ...heartForm, age: v })} />
            <Select label="Sex" value={heartForm.sex} onChange={v => setHeartForm({ ...heartForm, sex: v })} options={[{ label: 'Male', value: '1' }, { label: 'Female', value: '0' }]} />
            <Select label="Chest Pain Type (0-3)" value={heartForm.cp} onChange={v => setHeartForm({ ...heartForm, cp: v })} options={[{ label: 'Typical Angina (0)', value: '0' }, { label: 'Atypical Angina (1)', value: '1' }, { label: 'Non-anginal Pain (2)', value: '2' }, { label: 'Asymptomatic (3)', value: '3' }]} />
            <Field label="Resting Blood Pressure (mm Hg)" value={heartForm.trestbps} onChange={v => setHeartForm({ ...heartForm, trestbps: v })} placeholder="e.g. 130" />
            <Field label="Cholesterol (mg/dl)" value={heartForm.chol} onChange={v => setHeartForm({ ...heartForm, chol: v })} placeholder="e.g. 240" />
            <Select label="Fasting Blood Sugar > 120 mg/dl" value={heartForm.fbs} onChange={v => setHeartForm({ ...heartForm, fbs: v })} options={[{ label: 'False (0)', value: '0' }, { label: 'True (1)', value: '1' }]} />
            <Field label="Max Heart Rate Achieved" value={heartForm.thalach} onChange={v => setHeartForm({ ...heartForm, thalach: v })} placeholder="e.g. 150" />
            <Select label="Exercise Induced Angina" value={heartForm.exang} onChange={v => setHeartForm({ ...heartForm, exang: v })} options={[{ label: 'No (0)', value: '0' }, { label: 'Yes (1)', value: '1' }]} />
          </div>
        )}

        {activeTab === 'diabetes' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Pregnancies" value={diabetesForm.pregnancies} onChange={v => setDiabetesForm({ ...diabetesForm, pregnancies: v })} />
            <Field label="Glucose Level" value={diabetesForm.glucose} onChange={v => setDiabetesForm({ ...diabetesForm, glucose: v })} placeholder="e.g. 120" />
            <Field label="Blood Pressure (Diastolic)" value={diabetesForm.bloodpressure} onChange={v => setDiabetesForm({ ...diabetesForm, bloodpressure: v })} placeholder="e.g. 70" />
            <Field label="Skin Thickness" value={diabetesForm.skinthickness} onChange={v => setDiabetesForm({ ...diabetesForm, skinthickness: v })} />
            <Field label="Insulin Level" value={diabetesForm.insulin} onChange={v => setDiabetesForm({ ...diabetesForm, insulin: v })} />
            <Field label="BMI" value={diabetesForm.bmi} onChange={v => setDiabetesForm({ ...diabetesForm, bmi: v })} placeholder="e.g. 25.5" />
            <Field label="Diabetes Pedigree Function" value={diabetesForm.pedigree} onChange={v => setDiabetesForm({ ...diabetesForm, pedigree: v })} placeholder="e.g. 0.5" />
            <Field label="Age" value={diabetesForm.age} onChange={v => setDiabetesForm({ ...diabetesForm, age: v })} />
          </div>
        )}

        {activeTab === 'hypertension' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Age" value={hypertensionForm.age} onChange={v => setHypertensionForm({ ...hypertensionForm, age: v })} />
            <Select label="Sex" value={hypertensionForm.sex} onChange={v => setHypertensionForm({ ...hypertensionForm, sex: v })} options={[{ label: 'Male', value: '1' }, { label: 'Female', value: '0' }]} />
            <Field label="BMI" value={hypertensionForm.bmi} onChange={v => setHypertensionForm({ ...hypertensionForm, bmi: v })} placeholder="e.g. 26.5" />
            <Select label="Smoking" value={hypertensionForm.smoking} onChange={v => setHypertensionForm({ ...hypertensionForm, smoking: v })} options={[{ label: 'No', value: '0' }, { label: 'Yes', value: '1' }]} />
            <Select label="Alcohol" value={hypertensionForm.alcohol} onChange={v => setHypertensionForm({ ...hypertensionForm, alcohol: v })} options={[{ label: 'No', value: '0' }, { label: 'Yes', value: '1' }]} />
            <Select label="Physical Activity" value={hypertensionForm.physical_activity} onChange={v => setHypertensionForm({ ...hypertensionForm, physical_activity: v })} options={[{ label: 'Low', value: '0' }, { label: 'High', value: '1' }]} />
            <Select label="Sodium Intake" value={hypertensionForm.sodium_intake} onChange={v => setHypertensionForm({ ...hypertensionForm, sodium_intake: v })} options={[{ label: 'Low', value: '0' }, { label: 'Medium', value: '1' }, { label: 'High', value: '2' }]} />
            <Field label="Stress Level (0-10)" value={hypertensionForm.stress_level} onChange={v => setHypertensionForm({ ...hypertensionForm, stress_level: v })} max="10" />
          </div>
        )}

        <div className="mt-6 flex justify-end">
          <Button variant="primary" className="bg-indigo-600 hover:bg-indigo-700 w-full sm:w-auto" onClick={handlePredict} isLoading={loading}>
            <HiOutlineCheckCircle className="w-5 h-5 mr-1.5" />
            Predict Risk
          </Button>
        </div>
      </Card>

      {renderResult()}
    </motion.div>
  );
}
