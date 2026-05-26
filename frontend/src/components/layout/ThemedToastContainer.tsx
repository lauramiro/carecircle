import { ToastContainer } from 'react-toastify';
import { Slide } from 'react-toastify';
import { useTheme } from '../../contexts/ThemeContext';

export default function ThemedToastContainer() {
  const { theme } = useTheme();

  return (
    <ToastContainer
      position="top-right"
      autoClose={3000}
      transition={Slide}
      theme={theme === 'dark' ? 'dark' : 'light'}
    />
  );
}
