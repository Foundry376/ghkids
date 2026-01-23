import { Route, Routes } from "react-router-dom";
import App from "./components/app";
import ChangelogPage from "./components/changelog-page";
import DashboardPage from "./components/dashboard-page";
import EditorPage from "./components/editor-page";
import ExplorePage from "./components/explore-page";
import FAQPage from "./components/faq-page";
import HomePage from "./components/home-page";
import JoinPage from "./components/join-page";
import JoinSendWorldsPage from "./components/join-send-worlds-page";
import LoginPage from "./components/login-page";
import NotFoundPage from "./components/not-found-page";
import PlayPage from "./components/play-page";
import ProfilePage from "./components/profile-page";

export default (
  <Routes>
    <Route path="/" element={<App />}>
      <Route path="/" element={<HomePage />} />
      <Route path="explore" element={<ExplorePage />} />
      <Route path="faq" element={<FAQPage />} />
      <Route path="changelog" element={<ChangelogPage />} />
      <Route path="login" element={<LoginPage />} />
      <Route path="join" element={<JoinPage />} />
      <Route path="join-send-world" element={<JoinSendWorldsPage />} />

      <Route path="play/:worldId" element={<PlayPage />} />
      <Route path="editor/:worldId" element={<EditorPage />} />
      <Route path="u/:username" element={<ProfilePage />} />

      <Route path="dashboard" element={<DashboardPage />} />

      <Route path="*" element={<NotFoundPage />} />
    </Route>
  </Routes>
);
