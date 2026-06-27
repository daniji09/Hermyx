import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../ui/alert-dialog';

export const Alert = ({ isAlertOpen, setIsAlertOpen, alertConfig }) => {
  return (
    <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{alertConfig?.title}</AlertDialogTitle>
          <AlertDialogDescription>
            {alertConfig?.description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          {(alertConfig?.variant === 'warning' ||
            alertConfig?.variant === 'danger') && (
            <AlertDialogCancel onClick={alertConfig?.onCancel}>
              {alertConfig?.cancelText || 'Cancel'}
            </AlertDialogCancel>
          )}
          <AlertDialogAction
            onClick={alertConfig?.onConfirm}
            variant={alertConfig?.variant === 'danger' ? 'destructive' : ''}
          >
            {alertConfig?.confirmText || 'OK'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
