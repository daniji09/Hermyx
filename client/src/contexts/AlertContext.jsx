import { createContext, useContext, useState } from 'react';
import { Alert } from '../components/custom/Alert';

const AlertContext = createContext(null);

// Dialog provider for managing dialogs
export const AlertProvider = ({ children }) => {
  // States for managing opening and content of the alert
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [alertConfig, setAlertConfig] = useState({});

  // Master function that is used on the entire app
  const showAlert = (config) => {
    setAlertConfig(config);
    setIsAlertOpen(true);
  };

  const closeAlert = () => {
    setIsAlertOpen(false);
  };

  return (
    <AlertContext.Provider value={{ showAlert, closeAlert }}>
      {children}
      <Alert
        isAlertOpen={isAlertOpen}
        setIsAlertOpen={setIsAlertOpen}
        alertConfig={alertConfig}
      />
    </AlertContext.Provider>
  );
};

export const useAlert = () => {
  const context = useContext(AlertContext);
  if (!context) {
    throw new Error('useAlert must be used inside a AlertProvider');
  }
  return context; // It returns { showAlert, closeAlert }
};
