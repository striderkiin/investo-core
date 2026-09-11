import { AppProviders } from './providers';
import { AppRoutes } from './routes';
import { ToastContainer } from '../components/notifications/ToastContainer';
import { DemoActivityTicker } from '../features/socialProof/DemoActivityTicker';

export default function App() {
  return (
    <AppProviders>
      <AppRoutes />
      <ToastContainer />
      <DemoActivityTicker />
    </AppProviders>
  );
}
