import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import QRCode from 'react-qr-code';
import {
  HiOutlineIdentification,
  HiOutlinePhone,
  HiOutlineHeart,
  HiOutlineExclamationTriangle
} from 'react-icons/hi2';
import { getProfile } from '../services/profileService';
import Button from '../components/ui/Button';
import Loader from '../components/ui/Loader';

export default function EmergencyCard() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await getProfile();
      if (res.success && res.data?.exists) {
        setProfile(res.data.profile);
      } else {
        toast('No health profile found. Please create one first.', { icon: 'ℹ️' });
      }
    } catch (err) {
      toast.error('Failed to load profile for emergency card');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return <Loader message="Loading Emergency Card..." />;
  }

  if (!profile) {
    return (
      <div className="max-w-md mx-auto p-6 text-center bg-white rounded-xl shadow-sm border border-slate-200">
        <HiOutlineIdentification className="w-16 h-16 text-slate-300 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-slate-700">Profile Required</h2>
        <p className="text-slate-500 mt-2 text-sm">You need a completed health profile to generate an Emergency Card.</p>
      </div>
    );
  }

  const pd = profile.personalDetails || {};
  const ec = profile.emergencyContacts || [];
  const allergies = profile.allergies || [];
  const chronic = profile.chronicDiseases || [];
  
  const userName = profile.userId?.name || pd.name || 'User';

  // Construct QR Payload (Plain Text for Offline Scanning)
  let qrPayload = `EMERGENCY MEDICAL INFO\nName: ${userName}\nBlood Type: ${pd.bloodGroup || 'Unknown'}\n`;
  if (allergies.length > 0) {
    qrPayload += `Allergies: ${allergies.map(a => a.name).join(', ')}\n`;
  }
  if (chronic.length > 0) {
    qrPayload += `Conditions: ${chronic.map(c => c.name).join(', ')}\n`;
  }
  if (ec.length > 0) {
    qrPayload += `Emergency Contact: ${ec[0].name} (${ec[0].phone})`;
  }

  return (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="max-w-3xl mx-auto pb-10 flex flex-col items-center">
      
      <div className="w-full flex justify-between items-center mb-8 print:hidden px-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Emergency Medical Card</h1>
          <p className="text-slate-500 text-sm">Keep this printed in your wallet or saved on your phone.</p>
        </div>
        <Button variant="primary" onClick={handlePrint} className="bg-rose-600 hover:bg-rose-700">
          Print Card
        </Button>
      </div>

      {/* The Physical Card Container */}
      <div className="w-full max-w-[85.6mm] aspect-[1.586/1] bg-rose-600 rounded-xl shadow-2xl overflow-hidden flex flex-col text-white print:shadow-none print:w-[85.6mm] print:h-[53.98mm] print:break-inside-avoid relative">
        
        {/* Card Header */}
        <div className="bg-rose-700/50 p-3 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <HiOutlineHeart className="w-5 h-5 text-white" />
            <span className="font-bold tracking-wider text-xs">MEDICAL ID</span>
          </div>
          <div className="text-[10px] opacity-80 font-mono tracking-widest">AROGYAKOSH</div>
        </div>

        {/* Card Body */}
        <div className="p-4 flex-1 flex gap-4">
          
          {/* Left Side (Text) */}
          <div className="flex-1 flex flex-col justify-between">
            <div>
              <h2 className="text-lg font-black leading-tight truncate">{userName}</h2>
              <div className="text-rose-200 text-xs mt-0.5">Blood Type: <span className="font-bold text-white text-sm">{pd.bloodGroup || 'N/A'}</span></div>
            </div>

            <div className="space-y-2">
              {allergies.length > 0 && (
                <div className="flex gap-1.5 items-start">
                  <HiOutlineExclamationTriangle className="w-3.5 h-3.5 text-rose-300 mt-0.5 flex-shrink-0" />
                  <div className="text-[10px] leading-tight text-rose-100">
                    <span className="font-bold text-white">ALLERGIES: </span>
                    {allergies.map(a => a.name).join(', ')}
                  </div>
                </div>
              )}
              {ec.length > 0 && (
                <div className="flex gap-1.5 items-start">
                  <HiOutlinePhone className="w-3.5 h-3.5 text-rose-300 mt-0.5 flex-shrink-0" />
                  <div className="text-[10px] leading-tight text-rose-100">
                    <span className="font-bold text-white">ICE: </span>
                    {ec[0].name} • {ec[0].phone}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Side (QR Code) */}
          <div className="w-24 h-24 bg-white rounded-lg p-1.5 flex-shrink-0 self-center shadow-inner">
            <QRCode
              value={qrPayload}
              size={256}
              style={{ height: "auto", maxWidth: "100%", width: "100%" }}
              viewBox={`0 0 256 256`}
              level="M"
            />
          </div>

        </div>
      </div>

      <div className="mt-8 text-center max-w-sm text-sm text-slate-500 print:hidden">
        <p>This QR code can be scanned by any smartphone camera. It contains your critical data as raw text, meaning first responders <strong>do not need internet or an app</strong> to read it in an emergency.</p>
      </div>

    </motion.div>
  );
}
