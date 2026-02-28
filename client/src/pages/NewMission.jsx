import { useActionState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createMissionAction } from '../actions/MissionActions';
import { initialStateUseStateAction } from '../consts/consts';

export const NewMission = () => {
  const navigate = useNavigate();
  const [state, newMissionFormAction, isPending] = useActionState(
    createMissionAction,
    initialStateUseStateAction,
  );

  useEffect(() => {
    if (state.success) {
      const destination = state.redirectTo || '/';
      navigate(destination);
    }
  }, [state.success, state.redirectTo, navigate]);

  return (
    <form action={newMissionFormAction} noValidate className='space-y-4'>
      {state.success && (
        <p className='text-green-600 font-bold'>Mission saved successfully!</p>
      )}

      {state.errors?.general && (
        <p className='text-red-600'>{state.errors.general[0]}</p>
      )}

      <div>
        <label className='block font-medium'>Title:</label>
        <input
          className='border rounded w-full p-2'
          type='text'
          name='title'
          defaultValue={state.data?.title || ''}
        />
        {state.errors?.title && (
          <p className='text-red-600 text-sm'>{state.errors.title[0]}</p>
        )}
      </div>

      <div>
        <label className='block font-medium'>Description:</label>
        <textarea
          className='border rounded w-full p-2'
          name='description'
          defaultValue={state.data?.description || ''}
        />
        {state.errors?.description && (
          <p className='text-red-600 text-sm'>{state.errors.description[0]}</p>
        )}
      </div>

      <div>
        <label className='block font-medium'>Vacancies:</label>
        <input
          className='border rounded w-full p-2'
          type='number'
          name='vacancies'
          defaultValue={state.data?.vacancies || ''}
          min='1'
        />
        {state.errors?.vacancies && (
          <p className='text-red-600 text-sm'>{state.errors.vacancies[0]}</p>
        )}
      </div>

      <div>
        <label className='block font-medium'>Monetary Reward (€):</label>
        <input
          className='border rounded w-full p-2'
          type='number'
          name='reward'
          defaultValue={state.data?.reward || ''}
          min='0'
        />
        {state.errors?.reward && (
          <p className='text-red-600 text-sm'>{state.errors.reward[0]}</p>
        )}
      </div>

      {/* AQUI ESTÁ EL NUEVO CAMPO DE DIFICULTAD */}
      <div>
        <label className='block font-medium'>Difficulty (1-5):</label>
        <input
          className='border rounded w-full p-2'
          type='number'
          name='difficulty'
          defaultValue={state.data?.difficulty || ''}
          min='1'
          max='5'
        />
        {state.errors?.difficulty && (
          <p className='text-red-600 text-sm'>{state.errors.difficulty[0]}</p>
        )}
      </div>

      <div className='flex gap-4 mt-6'>
        <button
          className='bg-gray-200 px-4 py-2 rounded hover:bg-gray-300 transition'
          type='submit'
          name='intent'
          value='draft'
          disabled={isPending}
        >
          {isPending ? 'Saving...' : 'Save as Draft'}
        </button>

        <button
          className='bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition font-bold'
          type='submit'
          name='intent'
          value='publish'
          disabled={isPending}
        >
          {isPending ? 'Publishing...' : 'Publish & Pay'}
        </button>
      </div>
    </form>
  );
};
