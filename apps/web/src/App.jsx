import { Navigate, Route, Routes } from "react-router-dom";

import AppLayout from "./components/AppLayout";
import CertificateViewPage from "./pages/CertificateViewPage";
import CreateCertificatePage from "./pages/CreateCertificatePage";
import LogsPage from "./pages/LogsPage";
import VerifyPage from "./pages/VerifyPage";
import VerificationDataPage from "./pages/VerificationDataPage";

export default function App() {
  return (
    <AppLayout>
      <Routes>
        <Route path="/" element={<CreateCertificatePage />} />
        <Route path="/verify" element={<VerifyPage />} />
        <Route path="/logs" element={<LogsPage />} />
        <Route path="/data" element={<VerificationDataPage />} />
        <Route path="/c/:certificate_id" element={<CertificateViewPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppLayout>
  );
}
