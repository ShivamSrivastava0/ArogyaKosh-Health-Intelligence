import { lazy, Suspense } from 'react';
import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { FamilyProvider } from './context/FamilyContext';
import { HouseholdProvider } from './context/HouseholdContext';
import { QuickAddProvider } from './context/QuickAddContext';
import AppShell from './components/layout/AppShell';
import { PageSkeleton } from './components/ui/Display';
import { Spinner } from './components/ui/Button';

const Landing = lazy(() => import('./pages/Landing'));
const Login = lazy(() => import('./pages/auth/Login'));
const Register = lazy(() => import('./pages/auth/Register'));
const ForgotPassword = lazy(() => import('./pages/auth/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/auth/ResetPassword'));
const VerifyEmail = lazy(() => import('./pages/auth/VerifyEmail'));
const Today = lazy(() => import('./pages/app/Today'));
const Predict = lazy(() => import('./pages/app/Predict'));
const Circle = lazy(() => import('./pages/app/Circle'));
const FamilyTree = lazy(() => import('./pages/app/FamilyTree'));
const Admission = lazy(() => import('./pages/app/Admission'));
const WhatsApp = lazy(() => import('./pages/app/WhatsApp'));
const Abha = lazy(() => import('./pages/app/Abha'));
const AcceptInvite = lazy(() => import('./pages/public/AcceptInvite'));
const Family = lazy(() => import('./pages/app/Family'));
const MemberDetail = lazy(() => import('./pages/app/MemberDetail'));
const Brief = lazy(() => import('./pages/app/Brief'));
const Medicines = lazy(() => import('./pages/app/Medicines'));
const Vitals = lazy(() => import('./pages/app/Vitals'));
const Records = lazy(() => import('./pages/app/Records'));
const Appointments = lazy(() => import('./pages/app/Appointments'));
const Vaccines = lazy(() => import('./pages/app/Vaccines'));
const Expenses = lazy(() => import('./pages/app/Expenses'));
const Emergency = lazy(() => import('./pages/app/Emergency'));
const Assistant = lazy(() => import('./pages/app/Assistant'));
const Settings = lazy(() => import('./pages/app/Settings'));
const PublicEmergency = lazy(() => import('./pages/public/PublicEmergency'));
const PublicShare = lazy(() => import('./pages/public/PublicShare'));
const NotFound = lazy(() => import('./pages/NotFound'));

const FullScreenLoader = () => (
  <div className="grid min-h-dvh place-items-center"><Spinner className="h-6 w-6 text-ink-3" /></div>
);

function RequireAuth() {
  const { status } = useAuth();
  const location = useLocation();
  if (status === 'loading') return <FullScreenLoader />;
  if (status !== 'authed') return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return (
    <HouseholdProvider>
    <FamilyProvider>
      <QuickAddProvider>
        <AppShell />
      </QuickAddProvider>
    </FamilyProvider>
    </HouseholdProvider>
  );
}

function GuestOnly() {
  const { status } = useAuth();
  if (status === 'loading') return <FullScreenLoader />;
  if (status === 'authed') return <Navigate to="/app" replace />;
  return <Outlet />;
}

export default function App() {
  return (
    <Suspense fallback={<FullScreenLoader />}>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route element={<GuestOnly />}>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password/:token" element={<ResetPassword />} />
        </Route>
        <Route path="/verify-email/:token" element={<VerifyEmail />} />
        <Route path="/e/:token" element={<PublicEmergency />} />
        <Route path="/s/:token" element={<PublicShare />} />
        <Route path="/invite/:token" element={<AcceptInvite />} />

        <Route path="/app" element={<RequireAuth />}>
          <Route element={<Suspense fallback={<PageSkeleton />}><Outlet /></Suspense>}>
            <Route index element={<Today />} />
            <Route path="predict" element={<Predict />} />
            <Route path="circle" element={<Circle />} />
            <Route path="family-tree" element={<FamilyTree />} />
            <Route path="admission" element={<Admission />} />
            <Route path="whatsapp" element={<WhatsApp />} />
            <Route path="abha" element={<Abha />} />
            <Route path="admission/:memberId" element={<Admission />} />
            <Route path="family" element={<Family />} />
            <Route path="family/:id" element={<MemberDetail />} />
            <Route path="family/:id/brief" element={<Brief />} />
            <Route path="medicines" element={<Medicines />} />
            <Route path="vitals" element={<Vitals />} />
            <Route path="records" element={<Records />} />
            <Route path="appointments" element={<Appointments />} />
            <Route path="vaccines" element={<Vaccines />} />
            <Route path="expenses" element={<Expenses />} />
            <Route path="emergency" element={<Emergency />} />
            <Route path="assistant" element={<Assistant />} />
            <Route path="settings" element={<Settings />} />
            <Route path="*" element={<NotFound inApp />} />
          </Route>
        </Route>
        <Route path="/dashboard" element={<Navigate to="/app" replace />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}
