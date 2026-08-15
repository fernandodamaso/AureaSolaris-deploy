import type { useGlobalContext } from '../../context/GlobalContext';
import { buildHermesTopicKey } from './threadModel';

export type HermesGlobalContext = ReturnType<typeof useGlobalContext>;

export function resolveHermesActiveScope(ctx: HermesGlobalContext) {
  const owner = ctx.agenda.activeProfile;
  const subject = ctx.agenda.mapSubjects?.find(candidate =>
    candidate.ownerProfileId === owner?.id && candidate.id === ctx.agenda.activeSubjectId
  );
  const source = subject?.source ?? owner;
  const name = subject?.name ?? owner?.name ?? 'Mapa não selecionado';
  const topicKey = owner
    ? buildHermesTopicKey(owner.id, subject?.id ?? null)
    : null;

  return { owner, subject, source, name, topicKey };
}

export type HermesActiveScope = ReturnType<typeof resolveHermesActiveScope>;
