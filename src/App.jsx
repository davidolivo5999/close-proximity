import { Toaster } from "@/components/ui/toaster";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClientInstance } from "@/lib/query-client";
import { BrowserRouter as Router, Route, Routes, Navigate, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import PageNotFound from "./lib/PageNotFound";
import { AuthProvider, useAuth } from "@/lib/AuthContext";
import { TabHistoryProvider } from "@/lib/TabHistoryContext";
import UserNotRegisteredError from "@/components/UserNotRegisteredError";
import ProtectedRoute from "@/components/ProtectedRoute";

import Login from "@/pages/Login";
import Register from "@/pages/Register";
import ForgotPassword from "@/pages/ForgotPassword";
import ResetPassword from "@/pages/ResetPassword";

import AppLayout from "@/components/shared/AppLayout";
import Nearby from "@/pages/Nearby";
import Friends from "@/pages/Friends";
import Requests from "@/pages/Requests";
import Profile from "@/pages/Profile";
import Search from "@/pages/Search";
import UserProfile from "@/pages/UserProfile";
import Pro from "@/pages/Pro";
import Messages from "@/pages/Messages";
import Conversation from "@/pages/Conversation";

// Fade transition for tab switches
const PageWrapper = ({ children }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    transition={{ duration: 0.15 }}
  >
    {children}
  </motion.div>
);

// Slide-in transition for sub-pages like UserProfile
const SlideWrapper = ({ children }) => (
  <motion.div
    initial={{ x: "100%" }}
    animate={{ x: 0 }}
    exit={{ x: "100%" }}
    transition={{ type: "spring", stiffness: 380, damping: 40 }}
  >
    {children}
  </motion.div>
);

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();
  const routerLocation = useLocation();

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
      </div>
    );
  }

  if (authError) {
    if (authError.type === "user_not_registered") {
      return <UserNotRegisteredError />;
    } else if (authError.type === "auth_required") {
      navigateToLogin();
      return null;
    }
  }

  return (
    <AnimatePresence mode="wait" initial={false}>
      <Routes location={routerLocation} key={routerLocation.pathname}>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        <Route element={<AppLayout />}>
          <Route path="/" element={<PageWrapper><Nearby /></PageWrapper>} />
          <Route path="/friends" element={<PageWrapper><Friends /></PageWrapper>} />
          <Route path="/search" element={<PageWrapper><Search /></PageWrapper>} />
          <Route path="/requests" element={<PageWrapper><Requests /></PageWrapper>} />
          <Route path="/pro" element={<PageWrapper><Pro /></PageWrapper>} />
          <Route path="/profile" element={<PageWrapper><Profile /></PageWrapper>} />
          <Route path="/messages" element={<PageWrapper><Messages /></PageWrapper>} />
          <Route path="/messages/:peerId" element={<SlideWrapper><Conversation /></SlideWrapper>} />
          <Route path="/user/:userId" element={<SlideWrapper><UserProfile /></SlideWrapper>} />
        </Route>
        <Route path="*" element={<PageNotFound />} />
      </Routes>
    </AnimatePresence>
  );
};

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <TabHistoryProvider>
            <AuthenticatedApp />
          </TabHistoryProvider>
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  );
}

export default App;