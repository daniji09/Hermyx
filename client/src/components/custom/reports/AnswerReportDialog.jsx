import { useActionState, useEffect, useId, useRef, useState } from 'react';
import { consts } from '@hermyx/shared';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { answerReportAction } from '@/actions/ReportActions';
import { initialStateUseStateAction } from '@/consts/consts';
import { FormAlert } from '@/components/custom/form/FormAlert';
import { FormTextareaField } from '@/components/custom/form/FormTextareaField';

export const AnswerReportDialog = ({
  children,
  title,
  description,
  confirmText,
  isPending: isMutationPending,
  onConfirm,
  open: controlledOpen,
  onOpenChange,
}) => {
  const [state, answerReportFormAction, isFormPending] = useActionState(
    answerReportAction,
    initialStateUseStateAction,
  );
  const [clearedFields, setClearedFields] = useState({});
  const [prevServerState, setPrevServerState] = useState(state);
  const [isAlertClosed, setIsAlertClosed] = useState(false);
  const [internalOpen, setInternalOpen] = useState(false);
  const processedState = useRef(null);
  const generatedId = useId();
  const formId = `answer-report-form-${generatedId.replaceAll(':', '')}`;
  const fieldId = `answer-report-reason-${generatedId.replaceAll(':', '')}`;
  const isControlled = controlledOpen !== undefined;
  const isOpen = isControlled ? controlledOpen : internalOpen;

  if (state !== prevServerState) {
    setPrevServerState(state);
    setClearedFields({});
    setIsAlertClosed(false);
    if (state.success && !isControlled) {
      setInternalOpen(false);
    }
  }

  const handleFieldChange = (event) => {
    const fieldName = event.target.name;
    setClearedFields((previous) => ({
      ...previous,
      [fieldName]: true,
    }));
  };

  useEffect(() => {
    if (state.success && processedState.current !== state) {
      processedState.current = state;
      onConfirm(state.data.data.reason);
    }
  }, [state, onConfirm]);

  const handleOpenChange = (open) => {
    if (isFormPending || isMutationPending) return;

    if (isControlled) {
      onOpenChange?.(open);
    } else {
      setInternalOpen(open);
    }

    if (!open) setIsAlertClosed(true);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      {children && <DialogTrigger asChild>{children}</DialogTrigger>}
      <DialogContent className='max-h-[80vh] overflow-y-auto sm:max-w-sm'>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <form action={answerReportFormAction} id={formId} noValidate>
          <div className='space-y-4 py-4'>
            <FormTextareaField
              id={fieldId}
              name='reason'
              label='Reason (required):'
              type='text'
              maxLength={consts.REPORT.REASON_MESSAGE.MAX}
              defaultValue={state.data?.reason || ''}
              error={
                !clearedFields.reason && state.errors?.reason
                  ? state.errors.reason[0]
                  : undefined
              }
              invalid={!clearedFields.reason && !!state.errors?.reason}
              aria-invalid={!clearedFields.reason && !!state.errors?.reason}
              required
              autoComplete='off'
              disabled={isFormPending || isMutationPending}
              onChange={handleFieldChange}
            />
            {state.errors?.general && !isAlertClosed && (
              <FormAlert onClose={() => setIsAlertClosed(true)}>
                {state.errors.general[0]}
              </FormAlert>
            )}
          </div>
        </form>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant='outline' type='button'>
              Cancel
            </Button>
          </DialogClose>
          <Button
            type='submit'
            disabled={isFormPending || isMutationPending}
            form={formId}
          >
            {isFormPending || isMutationPending ? 'Processing...' : confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
