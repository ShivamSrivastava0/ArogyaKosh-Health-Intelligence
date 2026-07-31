import React from 'react';
import { Outlet } from 'react-router-dom';
import { motion } from 'framer-motion';
import { APP_NAME, APP_TAGLINE } from '../constants';

export default function AuthLayout() {
  return (
    <div className="min-h-screen flex bg-slate-50">
      {/* Left Panel - Branding (Hidden on mobile) */}
      <div className="hidden lg:flex lg:w-1/2 bg-emerald-900 relative overflow-hidden flex-col justify-between p-12">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-800 to-emerald-950 opacity-90 z-0"></div>
        
        {/* Decorative elements */}
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-emerald-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20"></div>
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20"></div>

        <div className="relative z-10">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center">
              <span className="text-emerald-700 font-bold text-xl">A</span>
            </div>
            <h1 className="text-3xl font-bold text-white tracking-tight">{APP_NAME}</h1>
          </div>
        </div>

        <div className="relative z-10 text-emerald-50 max-w-md">
          <h2 className="text-4xl font-bold mb-4 leading-tight">Your Health,<br/>Intelligently Managed.</h2>
          <p className="text-emerald-200 text-lg">{APP_TAGLINE}</p>
        </div>
        
        <div className="relative z-10 text-emerald-400 text-sm">
          &copy; {new Date().getFullYear()} {APP_NAME}. All rights reserved.
        </div>
      </div>

      {/* Right Panel - Form Area */}
      <div className="flex-1 flex flex-col justify-center items-center p-8 sm:p-12 lg:p-24 relative">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-md"
        >
          {/* Mobile Logo */}
          <div className="flex lg:hidden items-center gap-2 mb-12 justify-center">
            <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold">A</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900">{APP_NAME}</h1>
          </div>

          <Outlet />
        </motion.div>
      </div>
    </div>
  );
}
