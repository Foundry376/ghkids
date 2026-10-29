import { Route, Routes } from "react-router-dom";
import App from "./components/app";
import ChangelogPage from "./components/changelog-page";
import DashboardPage from "./components/dashboard-page";
import EditorPage from "./components/editor-page";
import ExplorePage from "./components/explore-page";
import FAQPage from "./components/faq-page";
import HowItWorksPage from "./components/how-it-works-page";
import ForgotPasswordPage from "./components/forgot-password-page";
import JoinPage from "./components/join-page";
import JoinSendWorldsPage from "./components/join-send-worlds-page";
import KidHomePage from "./components/kid-home-page";
import KidLayout from "./components/layouts/kid-layout";
import ParentsLayout from "./components/layouts/parents-layout";
import LearnPage from "./components/learn-page";
import LoginPage from "./components/login-page";
import NotFoundPage from "./components/not-found-page";
import ParentsHomePage from "./components/parents-home-page";
import PlayPage from "./components/play-page";
import PrivacyPolicyPage from "./components/privacy-policy-page";
import ProfilePage from "./components/profile-page";
import ResearchPage from "./components/research-page";
import ResetPasswordPage from "./components/reset-password-page";
import TermsOfUsePage from "./components/terms-of-use-page";
import WhyCodakoAIPage from "./components/why-codako-ai-page";

export default (
  <Routes>
    <Route path="/" element={<App />}>
      {/* The kid side: pixel canvas, header with who's signed in. */}
      <Route element={<KidLayout />}>
        <Route index element={<KidHomePage />} />
        <Route path="learn" element={<LearnPage />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="explore" element={<ExplorePage />} />
        <Route path="u/:username" element={<ProfilePage />} />
        <Route path="login" element={<LoginPage />} />
        <Route path="join" element={<JoinPage />} />
        <Route path="join-send-world" element={<JoinSendWorldsPage />} />
        <Route path="forgot-password" element={<ForgotPasswordPage />} />
        <Route path="reset-password" element={<ResetPasswordPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>

      {/* For grown-ups: Bootstrap site nav and footer. */}
      <Route path="parents" element={<ParentsLayout />}>
        <Route index element={<ParentsHomePage />} />
        <Route path="research" element={<ResearchPage />} />
        <Route path="how-it-works" element={<HowItWorksPage />} />
        <Route path="ai" element={<WhyCodakoAIPage />} />
        <Route path="faq" element={<FAQPage />} />
        <Route path="changelog" element={<ChangelogPage />} />
      </Route>
      <Route element={<ParentsLayout />}>
        <Route path="privacy-policy" element={<PrivacyPolicyPage />} />
        <Route path="terms-of-use" element={<TermsOfUsePage />} />
      </Route>

      {/* Full window, no chrome: these pages bring their own controls. */}
      <Route path="play/:worldId" element={<PlayPage />} />
      <Route path="editor/:worldId" element={<EditorPage />} />
    </Route>
  </Routes>
);
