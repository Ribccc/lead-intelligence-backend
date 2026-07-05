import React, { lazy, Suspense } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './components/ProtectedRoute';

// High-fidelity pulsing dashboard skeleton loading fallback screen
const SkeletonLoader: React.FC = () => {
  return (
    <div className="flex h-screen bg-[#FAFBFD] font-sans">
      {/* Sidebar Skeleton */}
      <div className="w-64 border-r border-neutral-200/50 bg-white p-4 space-y-6 flex flex-col shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-slate-200 rounded-xl animate-pulse" />
          <div className="space-y-2 flex-1">
            <div className="h-4 bg-slate-200 rounded w-2/3 animate-pulse" />
            <div className="h-3 bg-slate-200 rounded w-1/2 animate-pulse" />
          </div>
        </div>
        <div className="space-y-3 flex-1 pt-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-8 bg-slate-100 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>

      {/* Main Content Skeleton */}
      <div className="flex-1 flex flex-col p-8 space-y-6 overflow-hidden">
        <div className="h-10 bg-white border border-neutral-200/50 rounded-xl p-4 flex justify-between items-center shadow-sm">
          <div className="h-4 bg-slate-200 rounded w-1/4 animate-pulse" />
          <div className="h-4 bg-slate-200 rounded w-12 animate-pulse" />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-white border border-neutral-200/50 rounded-xl p-6 space-y-3 shadow-sm">
              <div className="h-3 bg-slate-200 rounded w-1/2 animate-pulse" />
              <div className="h-6 bg-slate-200 rounded w-3/4 animate-pulse" />
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 overflow-hidden">
          <div className="lg:col-span-2 bg-white border border-neutral-200/50 rounded-2xl p-6 space-y-4 shadow-sm flex flex-col">
            <div className="h-4 bg-slate-200 rounded w-1/3 animate-pulse" />
            <div className="flex-1 bg-slate-50 rounded-xl animate-pulse" />
          </div>
          <div className="bg-white border border-neutral-200/50 rounded-2xl p-6 space-y-4 shadow-sm flex flex-col">
            <div className="h-4 bg-slate-200 rounded w-1/3 animate-pulse" />
            <div className="space-y-3 flex-1">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-16 bg-slate-50 rounded-xl animate-pulse" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Lazy load views for production-grade package bundles code-splitting
const LoginView = lazy(() => import('./views/LoginView').then(m => ({ default: m.LoginView })));
const DashboardView = lazy(() => import('./views/DashboardView').then(m => ({ default: m.DashboardView })));
const LeadsView = lazy(() => import('./views/LeadsView').then(m => ({ default: m.LeadsView })));
const PipelineView = lazy(() => import('./views/PipelineView').then(m => ({ default: m.PipelineView })));
const OutreachView = lazy(() => import('./views/OutreachView').then(m => ({ default: m.OutreachView })));
const CRMSyncView = lazy(() => import('./views/CRMSyncView').then(m => ({ default: m.CRMSyncView })));
const LeadDiscoveryView = lazy(() => import('./views/LeadDiscoveryView').then(m => ({ default: m.LeadDiscoveryView })));
const AnalyticsView = lazy(() => import('./views/AnalyticsView').then(m => ({ default: m.AnalyticsView })));

export const App: React.FC = () => {
  return (
    <Router>
      <Suspense fallback={<SkeletonLoader />}>
        <Routes>
          {/* Entry redirection */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          
          {/* Guest access portal */}
          <Route path="/login" element={<LoginView />} />
          
          {/* Protected enterprise console scopes */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardView />
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/leads"
            element={
              <ProtectedRoute>
                <LeadsView />
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/pipeline"
            element={
              <ProtectedRoute>
                <PipelineView />
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/outreach"
            element={
              <ProtectedRoute>
                <OutreachView />
              </ProtectedRoute>
            }
          />

          <Route
            path="/crm"
            element={
              <ProtectedRoute>
                <CRMSyncView />
              </ProtectedRoute>
            }
          />

          <Route
            path="/discovery"
            element={
              <ProtectedRoute>
                <LeadDiscoveryView />
              </ProtectedRoute>
            }
          />

          <Route
            path="/analytics"
            element={
              <ProtectedRoute>
                <AnalyticsView />
              </ProtectedRoute>
            }
          />

          {/* Fallback boundary */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Suspense>
    </Router>
  );
};
export default App;
