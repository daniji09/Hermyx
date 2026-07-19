import {
  useActionState,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  addVacanciesAction,
  editMissionAction,
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
import { Plus, Trash2, User, UserPlus } from 'lucide-react';
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
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getMissionByIdQueryOptions } from '../queries/MissionsQueries';
import {
  MISSION_LIFE_CYCLE,
  VACANCY_LIFE_CYCLE,
} from '@hermyx/shared/utils/missions.utils';
import { useAlert } from '../contexts/AlertContext';

export const EditMission = () => {
  // Mission id
  const { id } = useParams();

  // Initial data retrieving
  const enabledOption = !!id;
  const retryOption = (failureCount, error) => {
    if (error.response?.status === 404) return false; // So Axios won't try to search again the data if there is none
    return failureCount < 3;
  };

  // API call using React Query (if the same query is used in more than one componente it should be isolated)
  const {
    data: mission,
    isLoading,
    isError,
    error,
  } = useQuery(
    getMissionByIdQueryOptions(id, {
      enabled: enabledOption,
      retry: retryOption,
    }),
  );

  let errorMessage = error?.message;
  if (error?.response?.status === 404) {
    errorMessage = 'Oops! This mission does not exist or it has been deleted.';
  }
  // Form action handling
  const [state, editMissionFormAction, isPending] = useActionState(
    editMissionAction,
    initialStateUseStateAction,
  );

  // Effect for navigating to home
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  useEffect(() => {
    if (state.success) {
      queryClient.invalidateQueries({ queryKey: ['getMission', id] });

      const destination = state.redirectTo || '/';
      navigate(destination);
    }
  }, [state.success, state.redirectTo, navigate, id, queryClient]);

  return (
    <EditMissionPageContainer
      state={state}
      action={editMissionFormAction}
      isPending={isPending}
      isLoading={isLoading}
      isError={isError}
      error={errorMessage}
      mission={mission}
    ></EditMissionPageContainer>
  );
};

const EditMissionPageContainer = ({
  isLoading,
  isError,
  error,
  state,
  action,
  isPending,
  mission,
}) => {
  return (
    <main className='flex min-h-screen items-center justify-center p-4'>
      <EditMissionLoading isLoading={isLoading}>
        {'Seeking mission...'}
      </EditMissionLoading>

      <EditMissionError isError={isError}>{`${error}`}</EditMissionError>

      {!isLoading && !isError && mission && (
        <EditMissionForm
          state={state}
          action={action}
          isPending={isPending}
          mission={mission}
        ></EditMissionForm>
      )}
    </main>
  );
};

const EditMissionLoading = ({ isLoading, children }) => {
  return (
    <>
      {isLoading && (
        <div className='flex justify-center p-8 text-muted-foreground'>
          {children}
        </div>
      )}
    </>
  );
};

const EditMissionError = ({ isError, children }) => {
  return (
    <>
      {isError && (
        <div className='text-center p-8 text-destructive border border-destructive/20 rounded-lg bg-destructive/5'>
          {children}
        </div>
      )}
    </>
  );
};

const EditMissionForm = ({ state, action, isPending, mission }) => {
  // State for map
  const [missionCoords, setMissionCoords] = useState({
    lat: mission.latitude || '',
    lng: mission.longitude || '',
  });

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
      <CardForm id='editMissionForm' action={action}>
        <CardForm.Header>
          <CardForm.Title>{messages.EDIT_MISSION.FORM_TITLE}</CardForm.Title>
        </CardForm.Header>

        <CardForm.Content
          legend='Application edit mission form.'
          className={'-mb-2'}
        >
          <FormInputField
            id='editMissionTitle'
            label='Title (required):'
            error={
              !clearedFields.title && state.errors?.title
                ? state.errors.title[0]
                : undefined
            }
            invalid={!clearedFields.title && !!state.errors?.title}
            type='text'
            name='title'
            defaultValue={state.data?.title || mission?.title || ''}
            autoComplete='off'
            required
            maxLength={consts.MISSION.TITLE_MAX_LENGTH}
            aria-invalid={!clearedFields.title && !!state.errors?.title}
            disabled={isPending}
            onChange={handleFieldChange}
          ></FormInputField>

          <FormTextareaField
            id='editMissionDescription'
            label='Description (required):'
            description={messages.EDIT_MISSION.DESCRIPTION_DESCRIPTION}
            error={
              !clearedFields.description && state.errors?.description
                ? state.errors.description[0]
                : undefined
            }
            invalid={!clearedFields.description && !!state.errors?.description}
            type='text'
            name='description'
            defaultValue={state.data?.description || mission?.description || ''}
            autoComplete='off'
            required
            maxLength={consts.MISSION.DESCRIPTION_MAX_LENGTH}
            aria-invalid={
              !clearedFields.description && !!state.errors?.description
            }
            disabled={isPending}
            onChange={handleFieldChange}
          ></FormTextareaField>

          <input type='hidden' name='mid' value={mission?.mid} />

          {missionCoords && (
            <>
              <input type='hidden' name='latitude' value={missionCoords.lat} />
              <input type='hidden' name='longitude' value={missionCoords.lng} />
            </>
          )}
        </CardForm.Content>
        <div className='px-8'>
          <MissionVacanciesCreator
            initialVacancies={mission?.participants || []}
            canDelete={
              MISSION_LIFE_CYCLE[mission.status].CAN_DELETE_ADVENTURERS
            }
          ></MissionVacanciesCreator>
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
            description={messages.EDIT_MISSION.LOCATION_DESCRIPTION}
            initialLocation={
              mission?.latitude &&
              mission?.longitude && {
                lat: mission?.latitude,
                lng: mission?.longitude,
              }
            }
          ></Map>
          {(state.errors?.latitude || state.errors?.longitude) &&
            !isAlertClosed && (
              <FormAlert onClose={() => setIsAlertClosed(true)}>
                {messages.EDIT_MISSION.LOCATION_ERROR}
              </FormAlert>
            )}
        </div>
        <CardForm.Footer>
          <Button
            id='sendEditMission'
            className='w-full'
            type='submit'
            form='editMissionForm'
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

const CreationVacancyCard = ({ vacancy, onDelete, onClick, canDelete }) => {
  const isAssigned = !!vacancy.adventurer_id;
  const handleKeyDown = (e) => {
    if (!VACANCY_LIFE_CYCLE[vacancy.status].CAN_EDIT) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick(vacancy.id);
    }
  };
  return (
    <Card
      role='button'
      tabIndex={0}
      className={`relative shrink-0 w-50 h-60 flex flex-col p-4 shadow-sm transition-all group ${
        VACANCY_LIFE_CYCLE[vacancy.status].CAN_EDIT
          ? 'hover:shadow-lg hover:cursor-pointer focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50'
          : 'opacity-70 cursor-default'
      }`}
      onKeyDown={handleKeyDown}
      onClick={() =>
        VACANCY_LIFE_CYCLE[vacancy.status].CAN_EDIT && onClick(vacancy.id)
      }
    >
      {canDelete && (
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
      )}

      <h3 className='font-semibold text-sm truncate min-h-5 mb-3 text-center mx-8'>
        {vacancy.title || 'Adventurer'}
      </h3>

      <div className='flex justify-center mb-4'>
        {isAssigned ? (
          // TODO: avatar del usuario
          <div className='w-16 h-16 rounded-full flex items-center justify-center bg-primary/10 text-primary border-2 border-primary'>
            <User size={24} />
          </div>
        ) : (
          <div className='w-16 h-16 rounded-full flex items-center justify-center border-2 border-dashed border-slate-300 text-slate-400'>
            <UserPlus size={24} />
          </div>
        )}
      </div>

      <div className='flex justify-between items-center text-xs font-medium mb-2'>
        <span
          className={`truncate w-2/3 ${isAssigned ? 'text-primary font-bold' : 'italic '}`}
        >
          {isAssigned ? vacancy.username : 'Unassigned'}
        </span>
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
  canDelete,
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
        status: VACANCY_LIFE_CYCLE.EMPTY.ID,
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
              canDelete={canDelete}
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
        id: vacancy.id,
        adventurer_id: vacancy.adventurer_id || undefined,
        username: vacancy.username || undefined,
        reward: state.data.vacanciesReward,
        title: state.data.vacanciesTitle,
        description: state.data.vacanciesDescription,
        status: vacancy.status,
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

export const MissionVacanciesCreator = ({ initialVacancies, canDelete }) => {
  const { showAlert } = useAlert();
  const formattedVacancies = initialVacancies.map((vac) => ({
    adventurer_id: vac.adventurer_id,
    avatar: vac.avatar,
    reward: vac.reward,
    username: vac.username,
    id: vac.vacancy_id,
    title: vac.vacancy_title,
    description: vac.vacancy_description,
    status: vac.status,
  }));

  const [vacancies, setVacancies] = useState(formattedVacancies);
  const [editingVacancyId, setEditingVacancyId] = useState(null);

  const handleAddVacancies = useCallback(
    ({ quantity, reward, title, description, status }) => {
      setVacancies((prevVacancies) => {
        const newVacancies = Array.from({ length: quantity }).map(() => ({
          id: crypto.randomUUID(),
          reward,
          title,
          description,
          status,
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

  const handleClickVacancy = useCallback(
    (id) => {
      const targetVacancy = vacancies.find((v) => v.id === id);
      if (targetVacancy && VACANCY_LIFE_CYCLE[targetVacancy.status].CAN_EDIT) {
        setEditingVacancyId(id);
      } else {
        showAlert({ title: messages.EDIT_MISSION.EDIT_FINISHED_VACANCIES });
      }
    },
    [vacancies, showAlert],
  );

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
        form='editMissionForm'
        value={vacancies.length}
      />

      <input
        type='hidden'
        name='vacanciesData'
        form='editMissionForm'
        value={JSON.stringify(vacancies)}
      />

      <CreateVacanciesDialog
        onConfirm={handleAddVacancies}
        handleDeleteVacancy={handleDeleteVacancy}
        handleClickVacancy={handleClickVacancy}
        vacancies={vacancies}
        canDelete={canDelete}
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
