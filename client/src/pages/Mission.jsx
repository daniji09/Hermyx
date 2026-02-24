import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import api from '../config/api';

// Function to call the API
const getMission = async (id) => {
  const { data } = await api.get(`/missions/${id}`);
  return data.mission;
};

export const Mission = () => {
  // Mission id
  const { id } = useParams();

  // API call using React Query (if the same query is used in more than one componente it should be isolated)
  const {
    data: mission,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ['getMission', id],
    queryFn: () => getMission(id),

    // Query is only executed if there truly is an id
    enable: !!id,

    // Refetching three times only when needed
    retry: (failureCount, error) => {
      if (error.response?.status === 404) return false;
      return failureCount < 3;
    },
  });

  // Early returns for each state
  if (isLoading) return <p>Seeking mission...</p>;

  if (isError) {
    if (error.response?.status === 404)
      return <p>Oops! This mission does not exist or it has been deleted.</p>;

    return <p>Error seeking mission: {error.message}.</p>;
  }

  if (!mission) return <p>Mission not found.</p>;

  // Data destructure for cleaner code
  const { title, owner_id, description, vacancies, monetary_reward } = mission;

  return (
    <div>
      <p>Nombre:{title}</p>
      <p>Fecha de publicación:</p>
      <p>Solicitante:{owner_id}</p>
      <p>Gremios subidos: aún no.</p>
      <p>Descripción:{description}</p>
      <p>Dificultad:</p>
      <p>Vacantes:{vacancies}</p>
      <p>Geolocalización: aún no.</p>
      <p>Recompensa monetaria:{monetary_reward}</p>
      <p>Otras recompensas: aún no.</p>
      <button>Ponerse en contacto con Solicitante</button>
    </div>
  );
};
