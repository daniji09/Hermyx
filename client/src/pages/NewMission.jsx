import { useActionState, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createMissionAction } from '../actions/MissionActions';
import { initialStateUseStateAction } from '../consts/consts';
import { messages } from '../messages/messages';
import { Button } from '@/components/ui/button';
import { CardForm } from '../components/custom/form/CardForm';
import { FormInputField } from '../components/custom/form/FormInputField';
import { FormAlert } from '../components/custom/form/FormAlert';
import { FormTextareaField } from '../components/custom/form/FormTextareaField';
import { consts } from '@hermyx/shared';

export const NewMission = () => {
  // Form action handling
  const [state, newMissionFormAction, isPending] = useActionState(
    createMissionAction,
    initialStateUseStateAction,
  );

  // Effect for navigating to home
  const navigate = useNavigate();
  useEffect(() => {
    if (state.success) {
      navigate('/missions/mine');
    }
  }, [state.success, navigate]);

  return (
    <main className='flex min-h-screen items-center justify-center p-4'>
      <NewMissionForm
        state={state}
        action={newMissionFormAction}
        isPending={isPending}
      ></NewMissionForm>
    </main>
  );
};

const NewMissionForm = ({ state, action, isPending }) => {
  // Logic for cleaning errors in fields or alerts when modifications are done
  const [clearedFields, setClearedFields] = useState({});
  const [prevServerState, setPrevServerState] = useState(state);
  const [isAlertClosed, setIsAlertClosed] = useState(false);

  // If the state has changed, field errors should be cleared
  if (state !== prevServerState) {
    setPrevServerState(state);
    setClearedFields({});
    setIsAlertClosed(false);
  }

  // When user changes field's value, the error is not shown until the form is sent again
  const handleFieldChange = (e) => {
    const fieldName = e.target.name;
    setClearedFields((prev) => ({ ...prev, [fieldName]: true }));
  };
  return (
    <div className='flex flex-col w-full max-w-155 gap-4'>
      <CardForm id='newMissionForm' action={action}>
        <CardForm.Header>
          <CardForm.Title>{messages.NEW_MISSION.FORM_TITLE}</CardForm.Title>
        </CardForm.Header>

        <CardForm.Content legend='Application new mission form.'>
          <FormInputField
            id='newMissionTitle'
            label='Title (required):'
            error={
              !clearedFields.title && state.errors?.title
                ? state.errors.title[0]
                : undefined
            }
            invalid={!clearedFields.title && !!state.errors?.title}
            type='text'
            name='title'
            defaultValue={state.data?.title || ''}
            autoComplete='off'
            required
            maxLength={consts.MISSION.TITLE_MAX_LENGTH}
            aria-invalid={!clearedFields.title && !!state.errors?.title}
            disabled={isPending}
            onChange={handleFieldChange}
          ></FormInputField>

          <FormTextareaField
            id='newMissionDescription'
            label='Description (required):'
            description={messages.NEW_MISSION.DESCRIPTION_DESCRIPTION}
            error={
              !clearedFields.description && state.errors?.description
                ? state.errors.description[0]
                : undefined
            }
            invalid={!clearedFields.description && !!state.errors?.description}
            type='text'
            name='description'
            defaultValue={state.data?.description || ''}
            autoComplete='off'
            required
            maxLength={consts.MISSION.DESCRIPTION_MAX_LENGTH}
            aria-invalid={
              !clearedFields.description && !!state.errors?.description
            }
            disabled={isPending}
            onChange={handleFieldChange}
          ></FormTextareaField>

          <FormInputField
            id='newMissionVacancies'
            label='Vacancies (required):'
            description={messages.NEW_MISSION.VACANCIES_DESCRIPTION}
            error={
              !clearedFields.vacancies && state.errors?.vacancies
                ? state.errors.vacancies[0]
                : undefined
            }
            invalid={!clearedFields.vacancies && !!state.errors?.vacancies}
            type='number'
            name='vacancies'
            defaultValue={state.data?.vacancies || ''}
            autoComplete='off'
            required
            min={consts.MISSION.VACANCIES.MIN}
            step={consts.MISSION.VACANCIES.STEP}
            max={consts.MISSION.VACANCIES.MAX}
            aria-invalid={!clearedFields.vacancies && !!state.errors?.vacancies}
            disabled={isPending}
            onChange={handleFieldChange}
          ></FormInputField>

          <FormInputField
            id='newMissionReward'
            label='Reward (required):'
            error={
              !clearedFields.reward && state.errors?.reward
                ? state.errors.reward[0]
                : undefined
            }
            invalid={!clearedFields.reward && !!state.errors?.reward}
            type='number'
            name='reward'
            defaultValue={state.data?.reward || ''}
            autoComplete='off'
            required
            min={consts.MISSION.REWARD.MIN}
            step={consts.MISSION.REWARD.STEP}
            max={consts.MISSION.REWARD.MAX}
            aria-invalid={!clearedFields.reward && !!state.errors?.reward}
            disabled={isPending}
            onChange={handleFieldChange}
          ></FormInputField>

          <FormInputField
            id='newMissionDifficulty'
            label='Difficulty (required):'
            description={messages.NEW_MISSION.DIFFICULTY_DESCRIPTION}
            error={
              !clearedFields.difficulty && state.errors?.difficulty
                ? state.errors.difficulty[0]
                : undefined
            }
            invalid={!clearedFields.difficulty && !!state.errors?.difficulty}
            type='number'
            name='difficulty'
            defaultValue={state.data?.difficulty || ''}
            autoComplete='off'
            required
            min={consts.MISSION.DIFFICULTY.MIN}
            step={consts.MISSION.DIFFICULTY.STEP}
            max={consts.MISSION.DIFFICULTY.MAX}
            aria-invalid={
              !clearedFields.difficulty && !!state.errors?.difficulty
            }
            disabled={isPending}
            onChange={handleFieldChange}
          ></FormInputField>
        </CardForm.Content>

        <CardForm.Footer>
          <Button
            id='sendNewMission'
            className='w-full'
            type='submit'
            form='newMissionForm'
            disabled={isPending}
          >
            {isPending ? 'Publishing mission...' : 'Publish mission'}
          </Button>
        </CardForm.Footer>
      </CardForm>
      {state.errors?.general && !isAlertClosed && (
        <FormAlert onClose={() => setIsAlertClosed(true)}>
          {state.errors.general[0]}
        </FormAlert>
      )}
    </div>
  );
};
