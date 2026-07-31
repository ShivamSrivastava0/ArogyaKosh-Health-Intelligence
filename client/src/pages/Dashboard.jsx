import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  HiOutlineDocumentText,
  HiOutlineUserPlus,
  HiOutlineLightBulb,
  HiOutlineQrCode,
  HiOutlineSparkles,
  HiOutlineClock,
  HiOutlineUsers,
  HiOutlineArrowRight,
  HiOutlineExclamationTriangle,
  HiOutlineCheckCircle,
} from 'react-icons/hi2';
import { useAuth } from '../context/AuthContext';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Avatar from '../components/ui/Avatar';

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
  };

  const quickActions = [
    {
      title: 'Upload Report',
      desc: 'Parse medical lab report or prescription',
      icon: HiOutlineDocumentText,
      color: 'bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100',
      action: () => navigate('/intelligence'),
    },
    {
      title: 'Family Member',
      desc: 'Add dependent or family profile',
      icon: HiOutlineUserPlus,
      color: 'bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100',
      action: () => navigate('/family'),
    },
    {
      title: 'Doctor Brief',
      desc: 'Generate 1-page pre-consultation brief',
      icon: HiOutlineLightBulb,
      color: 'bg-amber-50 text-amber-600 border-amber-200 hover:bg-amber-100',
      action: () => navigate('/doctor-brief'),
    },
    {
      title: 'Emergency QR',
      desc: 'View or share medical ID card',
      icon: HiOutlineQrCode,
      color: 'bg-purple-50 text-purple-600 border-purple-200 hover:bg-purple-100',
      action: () => navigate('/emergency-card'),
    },
  ];

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6 max-w-7xl mx-auto pb-10"
    >
      {/* Welcome Banner */}
      <motion.div
        variants={itemVariants}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-900 via-emerald-800 to-teal-900 text-white p-6 sm:p-8 shadow-xl"
      >
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute right-20 -top-10 w-48 h-48 bg-blue-500/20 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-700/50 backdrop-blur-md border border-emerald-500/30 text-emerald-200 text-xs font-medium mb-3">
              <HiOutlineSparkles className="w-3.5 h-3.5 text-amber-300" />
              Health Intelligence Portal
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Welcome back, {user?.name?.split(' ')[0] || 'User'}! 👋
            </h1>
            <p className="text-emerald-100/80 mt-1 text-sm max-w-xl">
              Your health portfolio is looking stable. Upload your latest medical reports to keep your AI health intelligence up to date.
            </p>
          </div>

          <Button
            variant="primary"
            onClick={() => navigate('/intelligence')}
            className="bg-white text-emerald-900 hover:bg-emerald-50 border-0 shadow-lg shadow-black/10 font-semibold"
          >
            Upload New Report
          </Button>
        </div>
      </motion.div>

      {/* Grid Layout — 6 Summary Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Card 1: ArogyaScore Summary */}
        <motion.div variants={itemVariants} className="lg:col-span-1">
          <Card className="h-full flex flex-col justify-between border-slate-200/80 hover:shadow-md transition-shadow">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Health Index
                </span>
                <Badge variant="success" size="sm">
                  Phase 5 AI
                </Badge>
              </div>

              <div className="text-center py-4">
                <div className="relative inline-flex items-center justify-center">
                  <svg className="w-36 h-36 transform -rotate-90">
                    <circle
                      cx="72"
                      cy="72"
                      r="60"
                      stroke="currentColor"
                      strokeWidth="10"
                      className="text-slate-100"
                      fill="transparent"
                    />
                    <circle
                      cx="72"
                      cy="72"
                      r="60"
                      stroke="currentColor"
                      strokeWidth="10"
                      strokeDasharray={376.8}
                      strokeDashoffset={376.8 * (1 - 78 / 100)}
                      strokeLinecap="round"
                      className="text-emerald-500 transition-all duration-1000"
                      fill="transparent"
                    />
                  </svg>
                  <div className="absolute flex flex-col items-center">
                    <span className="text-3xl font-extrabold text-slate-900">78</span>
                    <span className="text-xs text-slate-400 font-medium">out of 100</span>
                  </div>
                </div>

                <div className="mt-3">
                  <h3 className="text-lg font-bold text-slate-900">ArogyaScore™</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Based on mock baseline health data
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 mt-4 flex items-center justify-between text-xs">
              <span className="text-slate-600 font-medium">Risk Assessment:</span>
              <span className="inline-flex items-center gap-1 font-semibold text-emerald-600">
                <HiOutlineCheckCircle className="w-4 h-4" /> Low Risk
              </span>
            </div>
          </Card>
        </motion.div>

        {/* Card 2: Quick Actions */}
        <motion.div variants={itemVariants} className="lg:col-span-2">
          <Card className="h-full border-slate-200/80 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-slate-900">Quick Actions</h2>
              <span className="text-xs text-slate-400">4 Workflows</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {quickActions.map((act) => (
                <div
                  key={act.title}
                  onClick={act.action}
                  className={`p-4 rounded-xl border transition-all cursor-pointer group flex items-start gap-3.5 ${act.color}`}
                >
                  <div className="p-2.5 rounded-lg bg-white shadow-sm border border-slate-100 group-hover:scale-105 transition-transform">
                    <act.icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-slate-900 group-hover:text-emerald-700 transition-colors">
                      {act.title}
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">{act.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </motion.div>

        {/* Card 3: Recent Reports (Placeholder for Phase 4) */}
        <motion.div variants={itemVariants} className="lg:col-span-2">
          <Card className="border-slate-200/80 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <HiOutlineDocumentText className="w-5 h-5 text-emerald-600" />
                <h2 className="text-base font-bold text-slate-900">Recent Medical Reports</h2>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/intelligence')}
                className="text-xs text-emerald-600 hover:text-emerald-700"
              >
                View Vault <HiOutlineArrowRight className="w-3.5 h-3.5 ml-1 inline" />
              </Button>
            </div>

            <div className="space-y-3">
              <div className="p-3.5 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-100 text-emerald-700 rounded-lg font-bold text-xs">
                    PDF
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-800">Complete Blood Count (CBC)</p>
                    <p className="text-xs text-slate-400">Dr. Lal PathLabs • Jul 24, 2026</p>
                  </div>
                </div>
                <Badge variant="success" size="sm">Normal</Badge>
              </div>

              <div className="p-3.5 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 text-blue-700 rounded-lg font-bold text-xs">
                    PDF
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-800">Lipid Profile Report</p>
                    <p className="text-xs text-slate-400">Apollo Diagnostics • Jul 10, 2026</p>
                  </div>
                </div>
                <Badge variant="warning" size="sm">Slightly Elevated</Badge>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Card 4: Family Vault Summary */}
        <motion.div variants={itemVariants} className="lg:col-span-1">
          <Card className="border-slate-200/80 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <HiOutlineUsers className="w-5 h-5 text-blue-600" />
                <h2 className="text-base font-bold text-slate-900">Family Vault</h2>
              </div>
              <Badge variant="neutral" size="sm">2 Members</Badge>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between p-2.5 rounded-lg hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-3">
                  <Avatar name="Self" size="sm" />
                  <div>
                    <p className="text-sm font-medium text-slate-900">{user?.name || 'Primary User'}</p>
                    <p className="text-xs text-slate-400">Self (Primary)</p>
                  </div>
                </div>
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-lg hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-3">
                  <Avatar name="Anita Doe" size="sm" />
                  <div>
                    <p className="text-sm font-medium text-slate-900">Anita (Spouse)</p>
                    <p className="text-xs text-slate-400">Spouse</p>
                  </div>
                </div>
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Card 5: Recent Activity */}
        <motion.div variants={itemVariants} className="lg:col-span-1">
          <Card className="border-slate-200/80 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <HiOutlineClock className="w-5 h-5 text-purple-600" />
                <h2 className="text-base font-bold text-slate-900">Recent Activity</h2>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex gap-3">
                <div className="w-2 h-2 rounded-full bg-emerald-500 mt-1.5 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-slate-800">Account Logged In</p>
                  <p className="text-slate-400">Just now</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-slate-800">Profile Updated</p>
                  <p className="text-slate-400">2 days ago</p>
                </div>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Card 6: Upcoming Reminders */}
        <motion.div variants={itemVariants} className="lg:col-span-2">
          <Card className="border-slate-200/80 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <HiOutlineExclamationTriangle className="w-5 h-5 text-amber-600" />
                <h2 className="text-base font-bold text-slate-900">Upcoming Health Reminders</h2>
              </div>
              <Badge variant="warning" size="sm">1 Due Soon</Badge>
            </div>

            <div className="p-4 bg-amber-50/50 border border-amber-200/60 rounded-xl flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-amber-900">Annual Health Checkup</p>
                <p className="text-xs text-amber-700 mt-0.5">Recommended based on age profile</p>
              </div>
              <Button size="sm" variant="outline" className="border-amber-300 text-amber-800 hover:bg-amber-100">
                Schedule
              </Button>
            </div>
          </Card>
        </motion.div>

      </div>
    </motion.div>
  );
}
