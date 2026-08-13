import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { HermesChat } from '../../components/HermesChat';

const ctxHolder: { current: ReturnType<typeof makeCtx> } = {
  current: null as unknown as ReturnType<typeof makeCtx>,
};

function makeCtx(overrides: { loading?: boolean } = {}) {
  return {
    agenda: {
      activeProfile: { id: 'owner-1', name: 'Titular' },
      activeSubjectId: 'owner-1',
      mapSubjects: [{
        id: 'owner-1',
        ownerProfileId: 'owner-1',
        kind: 'profile',
        name: 'Titular',
        source: { id: 'owner-1', name: 'Titular' },
      }],
    },
    astro: { liveData: null, loading: overrides.loading ?? false },
    system: { status: 'Stable' },
  };
}

vi.mock('../../context/GlobalContext', () => ({
  useGlobalContext: () => ctxHolder.current,
}));

vi.mock('../../services/chat', () => ({
  openHermesThread: vi.fn(),
  getHermesThreadContext: vi.fn(),
  appendHermesMessage: vi.fn(),
  proposeHermesMemory: vi.fn(),
  sendChatMessage: vi.fn(),
  sendChatMessageStream: vi.fn(),
}));

import { getHermesThreadContext, openHermesThread } from '../../services/chat';

describe('HermesChat thread open', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Element.prototype.scrollIntoView = vi.fn();
    ctxHolder.current = makeCtx();
    vi.mocked(openHermesThread).mockResolvedValue({
      thread: { id: 'thread-1' },
    } as Awaited<ReturnType<typeof openHermesThread>>);
    vi.mocked(getHermesThreadContext).mockResolvedValue({
      messages: [],
    } as Awaited<ReturnType<typeof getHermesThreadContext>>);
  });

  it('does not reopen the thread when global context refreshes', async () => {
    const { rerender } = render(<HermesChat isOpen onClose={() => undefined} />);

    await waitFor(() => {
      expect(openHermesThread).toHaveBeenCalledTimes(1);
    });

    ctxHolder.current = makeCtx({ loading: true });
    rerender(<HermesChat isOpen onClose={() => undefined} />);

    await Promise.resolve();
    await Promise.resolve();
    expect(openHermesThread).toHaveBeenCalledTimes(1);
  });
});
