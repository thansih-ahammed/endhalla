import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import AppModal, { AppModalButton, AppModalTone } from './AppModal';

export interface ShowAlertOptions {
  title: string;
  message?: string;
  tone?: AppModalTone;
  buttons?: AppModalButton[];
  /** false makes the modal non-dismissable by backdrop/back press. Default true. */
  dismissable?: boolean;
}

interface AlertContextValue {
  /** Drop-in replacement for Alert.alert, themed per app. */
  showAlert: (options: ShowAlertOptions) => void;
  /** Convenience for a yes/no question. Resolves true when confirmed. */
  confirm: (options: {
    title: string;
    message?: string;
    confirmText?: string;
    cancelText?: string;
    tone?: AppModalTone;
    destructive?: boolean;
  }) => Promise<boolean>;
  hideAlert: () => void;
}

const AlertContext = createContext<AlertContextValue | null>(null);

/**
 * Wraps the app so any screen can raise the shared themed modal instead of the
 * platform `Alert`. Mounted once per app, above the navigator.
 */
export function AlertProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<ShowAlertOptions | null>(null);

  const hideAlert = useCallback(() => setState(null), []);
  const showAlert = useCallback((options: ShowAlertOptions) => setState(options), []);

  const confirm = useCallback(
    (options: {
      title: string;
      message?: string;
      confirmText?: string;
      cancelText?: string;
      tone?: AppModalTone;
      destructive?: boolean;
    }) =>
      new Promise<boolean>((resolve) => {
        setState({
          title: options.title,
          message: options.message,
          tone: options.tone ?? (options.destructive ? 'warning' : 'info'),
          buttons: [
            {
              text: options.confirmText || 'Confirm',
              style: options.destructive ? 'destructive' : 'primary',
              onPress: () => resolve(true),
            },
            { text: options.cancelText || 'Cancel', style: 'cancel', onPress: () => resolve(false) },
          ],
        });
      }),
    [],
  );

  const value = useMemo(() => ({ showAlert, confirm, hideAlert }), [showAlert, confirm, hideAlert]);

  return (
    <AlertContext.Provider value={value}>
      {children}
      <AppModal
        visible={!!state}
        title={state?.title || ''}
        message={state?.message}
        tone={state?.tone}
        buttons={state?.buttons}
        onDismiss={state?.dismissable === false ? undefined : hideAlert}
      />
    </AlertContext.Provider>
  );
}

export function useAppAlert(): AlertContextValue {
  const ctx = useContext(AlertContext);
  if (!ctx) throw new Error('useAppAlert must be used inside <AlertProvider>');
  return ctx;
}
