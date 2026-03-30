import { useInfiniteQuery } from '@tanstack/react-query';
import { getMissionsInfiniteQueryOptions } from './../queries/MissionsQueries';
import { PAGINATION_LIMIT } from '../consts/consts';

export const SearchMission = () => {
  // Query options
  const retryOption = (failureCount, error) => {
    if (error.response?.status === 404) return false; // So Axios won't try to search again the data if there is none
    return failureCount < 3;
  };

  // API call using React Query (if the same query is used in more than one component it should be isolated)
  const { data, hasNextPage, isFetchNextPage, fetchNextPage } =
    useInfiniteQuery(
      getMissionsInfiniteQueryOptions(PAGINATION_LIMIT.MISSIONS, {
        retry: retryOption,
      }),
    );

  // Early returns for each state
  if (!data) return <p>It seems there is no missions yet. Add one!</p>;

  // Data destructure for cleaner code
  const missions = data?.pages.flatMap((page) => page.missions);

  return (
    <div className='flex flex-col gap-4'>
      {missions?.map((mission) => (
        <div key={mission.mid}>
          <p>Nombre:{mission.title}</p>
          <p>Fecha de publicación:</p>
          <p>Solicitante:{mission.owner_id}</p>
          <p>Gremios subidos: aún no.</p>
          <p>Descripción:{mission.description}</p>
          <p>Dificultad:</p>
          <p>Vacantes:{mission.vacancies}</p>
          <p>Geolocalización: aún no.</p>
          <p>Recompensa monetaria:{mission.monetary_reward}</p>
          <p>Otras recompensas: aún no.</p>
          <button>Ponerse en contacto con Solicitante</button>
        </div>
      ))}
      <button
        onClick={() => fetchNextPage()}
        className='rounded-lg p-2 hover:cursor-pointer'
        disabled={!hasNextPage || isFetchNextPage}
      >
        {hasNextPage
          ? isFetchNextPage
            ? 'Loading'
            : 'More missions'
          : 'No more missions to show'}
      </button>
    </div>
  );
};
