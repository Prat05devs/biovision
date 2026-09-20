import { Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import LegalDoc from './pages/LegalDoc';
import NotFound from './pages/NotFound';
import Support from './pages/Support';

const PRIVACY_DESCRIPTION =
  'How BioVision handles your data: everything is analysed on your iPhone, with no accounts, uploads, ads or tracking.';
const TERMS_DESCRIPTION = 'Terms of Use for the BioVision health-information app.';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="privacy" element={<LegalDoc doc="privacy" description={PRIVACY_DESCRIPTION} />} />
        <Route path="terms" element={<LegalDoc doc="terms" description={TERMS_DESCRIPTION} />} />
        <Route path="support" element={<Support />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
