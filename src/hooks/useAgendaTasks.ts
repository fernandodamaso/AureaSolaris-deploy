import { useAgendaContext } from '../context/AgendaContext';

export const useAgendaTasks = () => {
  return useAgendaContext();
};
