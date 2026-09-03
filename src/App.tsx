import { createBrowserRouter, Navigate } from "react-router-dom";
import { AppShell } from "./components/layout/AppShell";
import { DashboardPage } from "./features/dashboard/DashboardPage";
import { ReadingHub } from "./features/simulation/ReadingHub";
import { WritingHub } from "./features/writing/WritingHub";
import { ListeningPage } from "./features/simulation/ListeningPage";
import { SpeakingPage } from "./features/simulation/SpeakingPage";
import { FullExamPage } from "./features/simulation/FullExamPage";
import { ReadingRunnerPage } from "./features/exam-runner/ReadingRunnerPage";
import { ReadingResultsPage } from "./features/exam-runner/ReadingResultsPage";
import { WritingEditorPage } from "./features/writing/WritingEditorPage";
import { WritingResultsPage } from "./features/writing/WritingResultsPage";
import { MockExamsPage } from "./features/mock-exams/MockExamsPage";
import { ProgressPage } from "./features/progress/ProgressPage";
import { CoachPage } from "./features/coach/CoachPage";
import { LessonsPage } from "./features/lessons/LessonsPage";
import { AchievementsPage } from "./features/achievements/AchievementsPage";
import { CertificatesPage } from "./features/certificates/CertificatesPage";
import { CheckoutPage } from "./features/checkout/CheckoutPage";
import { SettingsAccountPage } from "./features/settings/SettingsAccountPage";
import { HelpPage } from "./features/help/HelpPage";
import { LoginPage } from "./features/auth/LoginPage";

export const router = createBrowserRouter([
  {
    element: <AppShell />,
    children: [
      { path: "/", element: <DashboardPage /> },
      { path: "/simulation", element: <Navigate to="/simulation/reading" replace /> },
      { path: "/simulation/reading", element: <ReadingHub /> },
      { path: "/simulation/writing", element: <WritingHub /> },
      { path: "/simulation/listening", element: <ListeningPage /> },
      { path: "/simulation/speaking", element: <SpeakingPage /> },
      { path: "/simulation/full-exam", element: <FullExamPage /> },
      { path: "/mock-exams", element: <MockExamsPage /> },
      { path: "/progress", element: <ProgressPage /> },
      { path: "/lessons", element: <LessonsPage /> },
      { path: "/achievements", element: <AchievementsPage /> },
      { path: "/certificates", element: <CertificatesPage /> },
      { path: "/coach", element: <CoachPage /> },
      { path: "/checkout", element: <CheckoutPage /> },
      { path: "/settings/account", element: <SettingsAccountPage /> },
      { path: "/help", element: <HelpPage /> },
      { path: "/results/reading/:id", element: <ReadingResultsPage /> },
      { path: "/results/writing/:id", element: <WritingResultsPage /> },
      { path: "/results/:skill/:id", element: <Navigate to="/progress" replace /> },
    ],
  },
  // full-screen (no shell) exam + auth routes
  { path: "/login", element: <LoginPage /> },
  { path: "/exam/reading/:id", element: <ReadingRunnerPage /> },
  { path: "/exam/writing/:id", element: <WritingEditorPage /> },
  // graceful fallbacks for the not-yet-playable skills
  { path: "/exam/:skill/:id", element: <Navigate to="/progress" replace /> },
  { path: "*", element: <Navigate to="/" replace /> },
]);
