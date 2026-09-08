import { AppProviders } from './providers';
import { AppRoutes } from './routes';
import { ToastContainer } from '../components/notifications/ToastContainer';

export default function App() {
  return (
    <AppProviders>
      <AppRoutes />
      <ToastContainer />
    </AppProviders>
  );
}
