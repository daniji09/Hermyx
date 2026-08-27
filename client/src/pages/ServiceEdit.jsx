import {
  useActionState,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import {
  addVacanciesAction,
  editMissionAction,
  editVacancyAction,
} from '../actions/ServiceActions';
import { initialStateUseStateAction } from '../consts/consts';
import { messages } from '../messages/messages';
import { Button } from '@/components/ui/button';
import { CardForm } from '../components/custom/form/CardForm';
import { FormInputField } from '../components/custom/form/FormInputField';
import { FormAlert } from '../components/custom/form/FormAlert';
import { FormTextareaField } from '../components/custom/form/FormTextareaField';
import {
  consts,
  MISSION_STATUS,
  MISSION_PARTICIPATION_STATUS,
} from '@hermyx/shared';
import { Map } from '../components/custom/Map';
import { Card } from '@/components/ui/card';
import {
  Plus,
  Trash2,
  UploadCloud,
  UserPlus,
  X,
  Map as MapIcon,
} from 'lucide-react';
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
import { getMissionByIdQueryOptions } from '../queries/ServicesQueries';
import { useAlert } from '../contexts/AlertContext';
import { useDropzone } from 'react-dropzone';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { getImageUrl } from '../utils/media';
import { getDisplayName, getInitials } from '../utils/avatar';
import { Separator } from '@/components/ui/separator';
import { AuthContext } from '../contexts/AuthContext';
import { NotFound } from './NotFound';

export const EditMission = () => {
// Service id
  const { id } = useParams();
  const { currentUser } = useContext(AuthContext);

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
    errorMessage = 'Oops! This service does not exist or it has been deleted.';
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

  if (isLoading) {
    return (
      <main className='container mx-auto max-w-6xl p-4 sm:p-6'>
        <div role='status' className='p-8 text-center text-muted-foreground'>
          Loading service...
        </div>
      </main>
    );
  }

  if (isError) {
    return <NotFound></NotFound>;
  }

  if (
    !MISSION_STATUS[mission?.status].CAN_EDIT ||
    currentUser.id !== mission.owner_id
  )
    return <Navigate to={`/missions/${id}`} replace={true} />;

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
    <>
      <title>{`Service edition | Hermyx`}</title>
      <meta
        name='description'
        content={`Service ${mission?.title} edition form.`}
      ></meta>
      <main className='flex container mx-auto max-w-6xl p-4 sm:p-6 min-h-screen items-center justify-center'>
        <EditMissionLoading isLoading={isLoading}>
          {'Loading service...'}
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
    </>
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
  // State for map and photos
  const [missionCoords, setMissionCoords] = useState({
    lat: mission.latitude || '',
    lng: mission.longitude || '',
  });

  const [missionPhotos, setMissionPhotos] = useState(() => {
    if (!mission?.photos) return [];

    return mission.photos.map((photo) => {
      const pathString =
        typeof photo === 'object'
          ? photo.url || photo.path || photo.name
          : photo;
      return {
        name: pathString,
        preview: getImageUrl(pathString),
        isExisting: true,
      };
    });
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

  // Handle for including photos
  const handleFormAction = (formData) => {
    const existing = [];
    missionPhotos.forEach((photo) => {
      if (photo.isExisting) existing.push(photo.name);
      else formData.append('photos', photo);
    });
    if (existing.length > 0) {
      formData.append('existingPhotos', JSON.stringify(existing));
    }
    action(formData);
  };
  return (
    <div className='flex flex-col w-full max-w-4xl gap-4'>
      <CardForm
        id='editMissionForm'
        action={handleFormAction}
        encType='multipart/form-data'
      >
        <CardForm.Header
          className={
            'flex flex-col items-start gap-4 sm:flex-row sm:items-center'
          }
        >
          <span className='hidden sm:flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground'>
            <MapIcon className='h-6 w-6' aria-hidden='true' />
          </span>
          <div className='min-w-0'>
            <CardForm.Title className={'min-w-0'}>
              {messages.EDIT_SERVICE.FORM_TITLE}
            </CardForm.Title>
            <CardForm.Description className={'ms-0.5'}>
              {messages.EDIT_SERVICE.FORM_DESCRIPTION}
            </CardForm.Description>
          </div>
        </CardForm.Header>
        <div className='px-8'>
          <Separator />
        </div>
        <CardForm.Content
          legend='Application edit service form.'
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
            maxLength={consts.SERVICE.TITLE.MAX_LENGTH}
            aria-invalid={!clearedFields.title && !!state.errors?.title}
            disabled={isPending}
            onChange={handleFieldChange}
          ></FormInputField>

          <FormTextareaField
            id='editMissionDescription'
            label='Description (required):'
            description={messages.EDIT_SERVICE.DESCRIPTION_DESCRIPTION}
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
            maxLength={consts.SERVICE.DESCRIPTION.MAX_LENGTH}
            aria-invalid={
              !clearedFields.description && !!state.errors?.description
            }
            disabled={isPending}
            onChange={handleFieldChange}
          ></FormTextareaField>

          <div className='pt-4 pb-2 space-y-2'>
            <span className='flex items-center gap-2 text-sm leading-none font-medium select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50'>
              Photos:
            </span>
            <MissionPhotoUpload
              files={missionPhotos}
              setFiles={setMissionPhotos}
            />
            <p className='text-left text-sm leading-normal font-normal text-muted-foreground group-has-data-horizontal/field:text-balance [[data-variant=legend]+&]:-mt-1.5'>
              {messages.NEW_SERVICE.PHOTOS_DESCRIPTION}
            </p>
            {state.errors?.photos && !isAlertClosed && (
              <FormAlert onClose={() => setIsAlertClosed(true)}>
                {state.errors.photos}
              </FormAlert>
            )}
          </div>

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
            mid={mission.mid}
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
            description={messages.EDIT_SERVICE.LOCATION_DESCRIPTION}
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
                {messages.EDIT_SERVICE.LOCATION_ERROR}
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
            {isPending ? 'Publishing service...' : 'Publish service'}
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
  const isAssigned = !!vacancy.adventurer_id;
  console.log(vacancy);
  const isDeletable =
    vacancy.status === MISSION_PARTICIPATION_STATUS.JOINED.ID ||
    vacancy.status === MISSION_PARTICIPATION_STATUS.EMPTY.ID;

  return (
    <Card
      className={`relative shrink-0 w-50 h-60 flex flex-col p-4 shadow-sm transition-all group ${
        MISSION_PARTICIPATION_STATUS[vacancy.status].CAN_EDIT
          ? 'hover:shadow-lg hover:cursor-pointer focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50'
          : 'opacity-70 cursor-default'
      }`}
      onClick={() =>
        MISSION_PARTICIPATION_STATUS[vacancy.status].CAN_EDIT &&
        onClick(vacancy.id)
      }
    >
      <button
        type='button'
        className='sr-only'
        onClick={() => onClick(vacancy.id)}
      >
        Edit vacancy {vacancy.title}
      </button>

      {isDeletable && (
        <Button
          id={`deleteVacancy${vacancy.id}`}
          type='button'
          variant='outline'
          onClick={(e) => {
            e.stopPropagation();
            onDelete(vacancy.id);
          }}
          className='absolute top-2 right-2 hover:text-red-500 transition-colors z-10'
          title='Delete vacancy'
          aria-label='Delete vacancy'
        >
          <Trash2 size={20} aria-hidden='true' />
        </Button>
      )}

      <h3 className='font-bold text-sm truncate min-h-5 mb-1 text-center mx-8'>
        {vacancy.title || 'Collaborator'}
      </h3>
      <div className='flex justify-center'>
        {isAssigned ? (
          <div className='w-16 h-16 rounded-full flex items-center justify-center bg-primary/10 text-primary border-2 border-primary'>
            <Avatar size='md' className='h-full w-full'>
              <AvatarImage
                src={getImageUrl(vacancy.avatar)}
                alt={`${vacancy.username} avatar`}
                className='h-full w-full object-cover'
              />
              <AvatarFallback>
                {getInitials(getDisplayName(vacancy))}
              </AvatarFallback>
            </Avatar>
          </div>
        ) : (
          <div className='w-16 h-16 rounded-full flex items-center justify-center border-2 border-dashed border-muted-foreground text-muted-foreground'>
            <UserPlus
              size={24}
              aria-hidden='true'
              className='text-muted-foreground'
            />
          </div>
        )}
      </div>
      <div className='text-center -mt-3'>
        <span
          className={`truncate w-2/3 ${isAssigned ? 'text-primary font-semibold' : 'italic '}`}
        >
          {isAssigned ? vacancy.username : 'Unassigned'}
        </span>

        <div className='flex justify-between items-center font-medium mt-4 mb-3'>
          <span className='text-primary truncate text-sm'>
            {MISSION_PARTICIPATION_STATUS[vacancy.status].LABEL}
          </span>
          <span className='text-primary text-sm'>{vacancy.reward}€</span>
        </div>
        <p className='text-xs wrap-break-words wrap-anywhere line-clamp-2 leading-relaxed grow text-left'>
          {vacancy.description || 'No additional description.'}
        </p>
      </div>
    </Card>
  );
};

const CreateVacanciesDialog = ({
  vacancies,
  handleDeleteVacancy,
  handleClickVacancy,
  handleReportVacancy,
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
        status: MISSION_PARTICIPATION_STATUS.EMPTY.ID,
      });
      processedState.current = state;
    }
  }, [state, onConfirm]);

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <div className='flex overflow-x-auto gap-4 py-3 snap-x snap-mandatory hide-scrollbar items-center '>
        <DialogTrigger asChild>
          <Button
            id='addVacanciesButton'
            type='button'
            disabled={isPending}
            className='snap-start shrink-0 w-50 h-60 flex flex-col items-center justify-center p-4 rounded-xl border-2 border-dashed border-primary/20 bg-background hover:bg-secondary hover:border-primary/50 hover:text-primary transition-all text-primary group cursor-pointer'
          >
            <div className='w-16 h-16 rounded-full flex items-center justify-center mb-2 shadow-sm group-hover:scale-110 transition-transform dark:border-2'>
              <Plus
                size={32}
                aria-hidden='true'
                className='text-muted-foreground'
              />
            </div>
            <span className='text-sm text-muted-foreground text-center'>
              Add vacancies
            </span>
          </Button>
        </DialogTrigger>

        {vacancies.map((vac) => (
          <div key={vac.id} className='snap-start'>
            <CreationVacancyCard
              vacancy={vac}
              onDelete={handleDeleteVacancy}
              onReport={handleReportVacancy}
              onClick={handleClickVacancy}
            />
          </div>
        ))}
      </div>

      <DialogContent className='max-h-[80vh] overflow-y-auto'>
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
                description='Add as many collaborators as you like, up to 100 in total!'
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
        ...vacancy,
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
      <DialogContent className='max-h-[80vh] overflow-y-auto'>
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
export const MissionVacanciesCreator = ({ initialVacancies }) => {
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
      if (
        targetVacancy &&
        MISSION_PARTICIPATION_STATUS[targetVacancy.status].CAN_EDIT
      ) {
        setEditingVacancyId(id);
      } else {
        showAlert({ title: messages.EDIT_SERVICE.EDIT_FINISHED_VACANCIES });
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
      <span className='flex items-center gap-2 text-sm leading-none font-medium select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50'>
        Vacancies (required):
      </span>
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
      />

      <EditVacancyDialog
        key={selectedVacancy ? selectedVacancy.id : 'empty'}
        vacancy={selectedVacancy}
        isOpen={!!editingVacancyId}
        onClose={() => setEditingVacancyId(null)}
        onConfirm={handleConfirmEdit}
      />

      <p className='text-left text-sm leading-normal font-normal text-muted-foreground group-has-data-horizontal/field:text-balance [[data-variant=legend]+&]:-mt-1.5'>
        You have added {vacancies.length} vacancies.
      </p>
    </div>
  );
};

export function MissionPhotoUpload({ files, setFiles }) {
  // States for errors and alert
  const [uploadError, setUploadError] = useState(null);
  const [isAlertClosed, setIsAlertClosed] = useState(false);

  // Handle accepted files
  const onDrop = useCallback(
    (acceptedFiles) => {
      setUploadError(null);

      // Filter duplicates images
      const duplicates = acceptedFiles.filter((newFile) =>
        files.some((existingFile) => existingFile.name === newFile.name),
      );

      if (duplicates.length > 0) {
        const duplicateNames = duplicates.map((f) => f.name).join(', ');
        setUploadError(messages.NEW_SERVICE.PHOTOS_ERROR(duplicateNames));
        setIsAlertClosed(false);
      }

      const newUniqueFiles = acceptedFiles.filter(
        (newFile) =>
          !files.some((existingFile) => existingFile.name === newFile.name),
      );

      const remainingSlots = 5 - files.length;
      const filesToAdd = newUniqueFiles.slice(0, remainingSlots);

      const newFiles = filesToAdd.map((file) =>
        Object.assign(file, {
          preview: URL.createObjectURL(file),
        }),
      );

      setFiles((prevFiles) => [...prevFiles, ...newFiles]);
    },
    [files, setFiles],
  );

  // Handles incorrect photos by type or weight
  const onDropRejected = useCallback((fileRejections) => {
    const errorMessages = fileRejections.map(({ file, errors }) => {
      if (errors[0].code === 'file-too-large') {
        return `${file.name} (Exceeds 5MB limit)`;
      }
      return `${file.name} (${errors[0].message})`;
    });

    setUploadError(`Could not upload: ${errorMessages.join(', ')}`);
    setIsAlertClosed(false);
  }, []);

  const removeFile = (name) => {
    setFiles((files) => files.filter((file) => file.name !== name));
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    onDropRejected,
    accept: {
      'image/jpeg': [],
      'image/png': [],
      'image/webp': [],
    },
    maxSize: 5242880, // 5MB
    maxFiles: 5,
    disabled: files.length >= 5,
  });

  return (
    <div className='space-y-4'>
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer transition-colors
          ${isDragActive ? 'border-primary bg-primary/10' : 'border-muted-foreground/25 hover:border-primary/50'}
          ${files.length >= 5 ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        <input {...getInputProps()} />
        <UploadCloud
          className='w-10 h-10 text-muted-foreground mb-4'
          aria-hidden='true'
        />
        <p className='text-sm text-muted-foreground text-center'>
          {isDragActive
            ? messages.NEW_SERVICE.PHOTOS_DRAGGING_DESCRIPTION
            : messages.NEW_SERVICE.PHOTOS_DRAG_AND_DROP_DESCRIPTION}
        </p>
      </div>

      {uploadError && !isAlertClosed && (
        <FormAlert onClose={() => setIsAlertClosed(true)}>
          {uploadError}
        </FormAlert>
      )}

      {files.length > 0 && (
        <div className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 mt-4'>
          {files.map((file, index) => (
            <div
              key={file.name}
              className='relative group aspect-square rounded-md overflow-hidden border'
            >
              <img
                src={file.preview}
                alt={`Service - Photo ${index + 1}`}
                className='object-cover w-full h-full'
                onLoad={() => {
                  URL.revokeObjectURL(file.preview);
                }}
              />
              <Button
                type='button'
                variant='destructive'
                size='icon'
                aria-label={`Remove photo ${index + 1}`}
                className='absolute top-1 right-1 w-6 h-6 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity'
                onClick={() => removeFile(file.name)}
              >
                <X className='w-4 h-4' aria-hidden='true' />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
