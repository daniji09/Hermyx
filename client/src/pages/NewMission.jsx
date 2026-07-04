import {
  useActionState,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { useNavigate } from 'react-router-dom';
import {
  addVacanciesAction,
  createMissionAction,
  editVacancyAction,
} from '../actions/MissionActions';
import { initialStateUseStateAction } from '../consts/consts';
import { messages } from '../messages/messages';
import { Button } from '@/components/ui/button';
import { CardForm } from '../components/custom/form/CardForm';
import { FormInputField } from '../components/custom/form/FormInputField';
import { FormAlert } from '../components/custom/form/FormAlert';
import { FormTextareaField } from '../components/custom/form/FormTextareaField';
import { consts } from '@hermyx/shared';
import { Map } from '../components/custom/Map';
import { Card } from '@/components/ui/card';
import { Plus, Trash2, UserPlus } from 'lucide-react';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';

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
      const destination = state.redirectTo || '/';
      navigate(destination);
    }
  }, [state.success, state.redirectTo, navigate]);

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
  // State for map
  const [missionCoords, setMissionCoords] = useState(null);

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
    <div className='flex flex-col w-full max-w-4xl gap-4'>
      <CardForm id='newMissionForm' action={action}>
        <CardForm.Header>
          <CardForm.Title>{messages.NEW_MISSION.FORM_TITLE}</CardForm.Title>
        </CardForm.Header>

        <CardForm.Content
          legend='Application new mission form.'
          className={'-mb-2'}
        >
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
          {/*
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
*/}
          {missionCoords && (
            <>
              <input type='hidden' name='latitude' value={missionCoords.lat} />
              <input type='hidden' name='longitude' value={missionCoords.lng} />
            </>
          )}
        </CardForm.Content>
        <div className='px-8'>
          <MissionVacanciesCreator></MissionVacanciesCreator>
          {state.errors?.vacanciesData && !isAlertClosed && (
            <FormAlert onClose={() => setIsAlertClosed(true)}>
              {state.errors.vacanciesData[0]}
            </FormAlert>
          )}
          {state.errors?.vacancies && !isAlertClosed && (
            <FormAlert onClose={() => setIsAlertClosed(true)}>
              {state.errors.vacancies[0]}
            </FormAlert>
          )}
        </div>
        <div className='px-8 py-2'>
          <Map
            onLocationSelected={(coords) => setMissionCoords(coords)}
            description={messages.NEW_MISSION.LOCATION_DESCRIPTION}
          ></Map>
          {(state.errors?.latitude || state.errors?.longitude) &&
            !isAlertClosed && (
              <FormAlert onClose={() => setIsAlertClosed(true)}>
                {messages.NEW_MISSION.LOCATION_ERROR}
              </FormAlert>
            )}
        </div>
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

const CreationVacancyCard = ({ vacancy, onDelete, onClick }) => {
  return (
    <Card
      className='relative shrink-0 w-50 h-60 flex flex-col p-4 shadow-sm transition-all hover:shadow-lg hover:cursor-pointer'
      onClick={() => onClick(vacancy.id)}
    >
      <Button
        id={`deleteVacancy${vacancy.id}`}
        type='button'
        variant='outline'
        onClick={(e) => {
          e.stopPropagation(); //
          onDelete(vacancy.id);
        }}
        className='absolute top-2 right-2 hover:text-red-500 transition-colors'
        title='Delete vacancy'
        aria-label='Delete vacancy'
      >
        <Trash2 size={24} />
      </Button>

      <h3 className='font-semibold text-sm truncate min-h-5 mb-3 text-center mx-8'>
        {vacancy.title || 'Adventurer'}
      </h3>

      <div className='flex justify-center mb-4'>
        <div className='w-16 h-16 rounded-full flex items-center justify-center border-2 border-dashed'>
          <UserPlus size={24} />
        </div>
      </div>

      <div className='flex justify-between items-center text-xs font-medium mb-2'>
        <span className='truncate w-2/3 italic'>Unassigned</span>
        <span className='w-1/3 text-right text-primary font-bold text-sm'>
          {vacancy.reward}€
        </span>
      </div>

      <p className='text-xs line-clamp-3 leading-relaxed grow'>
        {vacancy.description || 'No additional description.'}
      </p>
    </Card>
  );
};

const CreateVacanciesDialog = ({
  vacancies,
  handleDeleteVacancy,
  handleClickVacancy,
  onConfirm,
}) => {
  // Action handling for create vacancy form
  const [state, addVacanciesFormAction, isPending] = useActionState(
    addVacanciesAction,
    initialStateUseStateAction,
  );

  // Logic for cleaning errors in fields or alerts when modifications are done
  const [clearedFields, setClearedFields] = useState({});
  const [prevServerState, setPrevServerState] = useState(state);
  const [isAlertClosed, setIsAlertClosed] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  // If the state has changed, field errors should be cleared
  if (state !== prevServerState) {
    setPrevServerState(state);
    setClearedFields({});
    setIsAlertClosed(false);
    if (state.success) {
      setIsOpen(false);
    }
  }

  // When user changes field's value, the error is not shown until the form is sent again
  const handleFieldChange = (e) => {
    const fieldName = e.target.name;
    setClearedFields((prev) => ({ ...prev, [fieldName]: true }));
  };

  // Handle manual dialog close to reset visual errors
  const handleOpenChange = (open) => {
    setIsOpen(open);
    if (!open) {
      setIsAlertClosed(true);
    }
  };

  // This ref prevents the effect for executing twice, since the state success would have been the same
  const processedState = useRef(null);

  // Effect for success handling
  useEffect(() => {
    if (state.success && processedState.current !== state) {
      onConfirm({
        quantity: state.data.vacanciesQuantity,
        reward: state.data.vacanciesReward,
        title: state.data.vacanciesTitle,
        description: state.data.vacanciesDescription,
      });
      processedState.current = state;
    }
  }, [state, onConfirm]);

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <div className='flex overflow-x-auto gap-4 py-4 snap-x snap-mandatory hide-scrollbar items-center '>
        <DialogTrigger asChild>
          <Button
            id='addVacanciesButton'
            type='button'
            disabled={isPending}
            className='snap-start shrink-0 w-50 h-60 flex flex-col items-center justify-center p-4 rounded-xl border-2 border-dashed border-primary/20 bg-background hover:bg-secondary hover:border-primary/50 hover:text-primary transition-all text-primary group cursor-pointer'
          >
            <div className='w-16 h-16 rounded-full flex items-center justify-center mb-2 shadow-sm group-hover:scale-110 transition-transform'>
              <Plus size={32} />
            </div>
            <span className='font-medium text-sm'>Add vacancies</span>
          </Button>
        </DialogTrigger>

        {vacancies.map((vac) => (
          <div key={vac.id} className='snap-start'>
            <CreationVacancyCard
              vacancy={vac}
              onDelete={handleDeleteVacancy}
              onClick={handleClickVacancy}
            />
          </div>
        ))}
      </div>

      <DialogContent>
        <form action={addVacanciesFormAction} id='addVacanciesForm' noValidate>
          <DialogHeader>
            <DialogTitle>Add new vacancies</DialogTitle>
            <DialogDescription>
              You can add various vacancies with the same specifications
              simultaneously.
            </DialogDescription>
          </DialogHeader>
          <div className='space-y-4 py-4'>
            <div className='space-y-2'>
              <FormInputField
                id='vacanciesQuantity'
                name='vacanciesQuantity'
                label='Quantity to add (required):'
                type='number'
                description='Add as many adventurers as you like, up to 100 in total!'
                error={
                  !clearedFields.vacanciesQuantity &&
                  state.errors?.vacanciesQuantity
                    ? state.errors.vacanciesQuantity[0]
                    : undefined
                }
                invalid={
                  !clearedFields.vacanciesQuantity &&
                  !!state.errors?.vacanciesQuantity
                }
                min='1'
                max={
                  100 - vacancies.length > 0 ? `${100 - vacancies.length}` : '1'
                }
                required
                autoComplete='off'
                defaultValue={state.data?.vacanciesQuantity || ''}
                aria-invalid={
                  !clearedFields.vacanciesQuantity &&
                  !!state.errors?.vacanciesQuantity
                }
                disabled={isPending}
                onChange={handleFieldChange}
              />
            </div>

            {/* Hidden input so vacancies maximum quantity is not surpassed */}
            <input
              type='hidden'
              name='vacanciesTotalQuantity'
              value={vacancies.length}
            />

            <div className='space-y-2'>
              <FormInputField
                id='vacanciesReward'
                name='vacanciesReward'
                label='Reward (€) (required):'
                type='number'
                min='10'
                max='10000'
                error={
                  !clearedFields.vacanciesReward &&
                  state.errors?.vacanciesReward
                    ? state.errors.vacanciesReward[0]
                    : undefined
                }
                invalid={
                  !clearedFields.vacanciesReward &&
                  !!state.errors?.vacanciesReward
                }
                required
                autoComplete='off'
                defaultValue={state.data?.vacanciesReward || ''}
                aria-invalid={
                  !clearedFields.vacanciesReward &&
                  !!state.errors?.vacanciesReward
                }
                disabled={isPending}
                onChange={handleFieldChange}
              />
            </div>

            <div className='space-y-2'>
              <FormInputField
                id='vacanciesTitle'
                name='vacanciesTitle'
                label='Title:'
                type='text'
                maxLength='50'
                error={
                  !clearedFields.vacanciesTitle && state.errors?.vacanciesTitle
                    ? state.errors.vacanciesTitle[0]
                    : undefined
                }
                invalid={
                  !clearedFields.vacanciesTitle &&
                  !!state.errors?.vacanciesTitle
                }
                autoComplete='off'
                defaultValue={state.data?.vacanciesTitle || ''}
                aria-invalid={
                  !clearedFields.vacanciesTitle &&
                  !!state.errors?.vacanciesTitle
                }
                disabled={isPending}
                onChange={handleFieldChange}
              />
            </div>
            <div className='space-y-2'>
              <FormTextareaField
                id='vacanciesDescription'
                name='vacanciesDescription'
                label='Description:'
                type='text'
                maxLength='500'
                error={
                  !clearedFields.vacanciesDescription &&
                  state.errors?.vacanciesDescription
                    ? state.errors.vacanciesDescription[0]
                    : undefined
                }
                invalid={
                  !clearedFields.vacanciesDescription &&
                  !!state.errors?.vacanciesDescription
                }
                autoComplete='off'
                defaultValue={state.data?.vacanciesDescription || ''}
                aria-invalid={
                  !clearedFields.vacanciesDescription &&
                  !!state.errors?.vacanciesDescription
                }
                disabled={isPending}
                onChange={handleFieldChange}
              />
            </div>
            {state.errors?.general && !isAlertClosed && (
              <FormAlert onClose={() => setIsAlertClosed(true)}>
                {state.errors.general[0]}
              </FormAlert>
            )}
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant='outline' type='button'>
                Cancel
              </Button>
            </DialogClose>
            <Button type='submit' form='addVacanciesForm' disabled={isPending}>
              {isPending ? 'Adding...' : 'Add to group'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

const EditVacancyDialog = ({ vacancy, isOpen, onClose, onConfirm }) => {
  // Action handling for edit vacancy form
  const [state, editVacancyFormAction, isPending] = useActionState(
    editVacancyAction,
    initialStateUseStateAction,
  );

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

  // This ref prevents the effect for executing twice, since the state success would have been the same
  const processedState = useRef(null);

  // Effect for success handling
  useEffect(() => {
    if (state.success && processedState.current !== state) {
      onConfirm({
        id: vacancy.id, // Pasamos el ID para saber cuál editar
        reward: state.data.vacanciesReward,
        title: state.data.vacanciesTitle,
        description: state.data.vacanciesDescription,
      });
      processedState.current = state;
      onClose();
    }
  }, [state, onConfirm, vacancy, onClose]);

  // If there is no vacancy selected, it return nothing
  if (!vacancy) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <form action={editVacancyFormAction} id='editVacancyForm' noValidate>
          <DialogHeader>
            <DialogTitle>Edit vacancy</DialogTitle>
            <DialogDescription>
              Modify the details of this specific vacancy.
            </DialogDescription>
          </DialogHeader>

          <div className='space-y-4 py-4'>
            <div className='space-y-2'>
              <FormInputField
                id='editVacanciesReward'
                name='vacanciesReward'
                label='Reward (€) (required):'
                type='number'
                min='10'
                max='10000'
                error={
                  !clearedFields.vacanciesReward &&
                  state.errors?.vacanciesReward
                    ? state.errors.vacanciesReward[0]
                    : undefined
                }
                invalid={
                  !clearedFields.vacanciesReward &&
                  !!state.errors?.vacanciesReward
                }
                required
                autoComplete='off'
                defaultValue={state.data?.vacanciesReward ?? vacancy.reward}
                aria-invalid={
                  !clearedFields.vacanciesReward &&
                  !!state.errors?.vacanciesReward
                }
                disabled={isPending}
                onChange={handleFieldChange}
              />
            </div>

            <div className='space-y-2'>
              <FormInputField
                id='editVacanciesTitle'
                name='vacanciesTitle'
                label='Title:'
                type='text'
                maxLength='50'
                error={
                  !clearedFields.vacanciesTitle && state.errors?.vacanciesTitle
                    ? state.errors.vacanciesTitle[0]
                    : undefined
                }
                invalid={
                  !clearedFields.vacanciesTitle &&
                  !!state.errors?.vacanciesTitle
                }
                autoComplete='off'
                defaultValue={state.data?.vacanciesTitle ?? vacancy.title}
                aria-invalid={
                  !clearedFields.vacanciesTitle &&
                  !!state.errors?.vacanciesTitle
                }
                disabled={isPending}
                onChange={handleFieldChange}
              />
            </div>

            <div className='space-y-2'>
              <FormTextareaField
                id='editVacanciesDescription'
                name='vacanciesDescription'
                label='Description:'
                type='text'
                maxLength='500'
                error={
                  !clearedFields.vacanciesDescription &&
                  state.errors?.vacanciesDescription
                    ? state.errors.vacanciesDescription[0]
                    : undefined
                }
                invalid={
                  !clearedFields.vacanciesDescription &&
                  !!state.errors?.vacanciesDescription
                }
                autoComplete='off'
                defaultValue={
                  state.data?.vacanciesDescription ?? vacancy.description
                }
                aria-invalid={
                  !clearedFields.vacanciesDescription &&
                  !!state.errors?.vacanciesDescription
                }
                disabled={isPending}
                onChange={handleFieldChange}
              />
            </div>

            {state.errors?.general && !isAlertClosed && (
              <FormAlert onClose={() => setIsAlertClosed(true)}>
                {state.errors.general[0]}
              </FormAlert>
            )}
          </div>
          <DialogFooter>
            <Button variant='outline' type='button' onClick={onClose}>
              Cancel
            </Button>
            <Button type='submit' form='editVacancyForm' disabled={isPending}>
              {isPending ? 'Saving...' : 'Save changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export const MissionVacanciesCreator = () => {
  const [vacancies, setVacancies] = useState([]);
  const [editingVacancyId, setEditingVacancyId] = useState(null);

  const handleAddVacancies = useCallback(
    ({ quantity, reward, title, description }) => {
      setVacancies((prevVacancies) => {
        const newVacancies = Array.from({ length: quantity }).map(() => ({
          id: crypto.randomUUID(),
          reward,
          title,
          description,
        }));

        return [...prevVacancies, ...newVacancies];
      });
    },
    [],
  );

  const handleDeleteVacancy = useCallback(
    (idToRemove) => {
      setVacancies((prevVacancies) =>
        prevVacancies.filter((v) => v.id !== idToRemove),
      );
      if (editingVacancyId === idToRemove) setEditingVacancyId(null);
    },
    [editingVacancyId],
  );

  const handleClickVacancy = useCallback((id) => {
    setEditingVacancyId(id);
  }, []);

  const handleConfirmEdit = useCallback((updatedVacancy) => {
    setVacancies((prevVacancies) =>
      prevVacancies.map((v) =>
        v.id === updatedVacancy.id ? updatedVacancy : v,
      ),
    );
  }, []);

  const selectedVacancy = vacancies.find((v) => v.id === editingVacancyId);

  return (
    <div className='w-full space-y-2'>
      <Label>Vacancies ({vacancies.length})</Label>
      <input
        type='hidden'
        name='vacancies'
        form='newMissionForm'
        value={vacancies.length}
      />

      <input
        type='hidden'
        name='vacanciesData'
        form='newMissionForm'
        value={JSON.stringify(vacancies)}
      />

      <CreateVacanciesDialog
        onConfirm={handleAddVacancies}
        handleDeleteVacancy={handleDeleteVacancy}
        handleClickVacancy={handleClickVacancy}
        vacancies={vacancies}
      />

      <EditVacancyDialog
        key={selectedVacancy ? selectedVacancy.id : 'empty'}
        vacancy={selectedVacancy}
        isOpen={!!editingVacancyId}
        onClose={() => setEditingVacancyId(null)}
        onConfirm={handleConfirmEdit}
      />
    </div>
  );
};
