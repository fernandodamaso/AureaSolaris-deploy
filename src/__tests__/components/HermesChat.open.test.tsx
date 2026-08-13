import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, waitFor } from '@testing-library/react';
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
        source: { id: 'owner-1', name: 'Titular', certifiedNatalCalculation: undefined as unknown },
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
  appendHermesMessage: vi.fn(async () => ({})),
  proposeHermesMemory: vi.fn(),
  sendChatMessage: vi.fn(),
  sendChatMessageStream: vi.fn(),
}));

import { getHermesThreadContext, openHermesThread, sendChatMessageStream } from '../../services/chat';

describe('HermesChat thread open', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Element.prototype.scrollIntoView = vi.fn();
    ctxHolder.current = makeCtx();
    vi.mocked(openHermesThread).mockResolvedValue({
      thread: { id: 'thread-1' },
    } as unknown as Awaited<ReturnType<typeof openHermesThread>>);
    vi.mocked(getHermesThreadContext).mockResolvedValue({
      thread: { id: 'thread-1' },
      messages: [],
    } as unknown as Awaited<ReturnType<typeof getHermesThreadContext>>);
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

  it('sends a prompt built from the latest natal receipt without reopening the thread', async () => {
    vi.mocked(sendChatMessageStream).mockImplementation(async (_messages, _context, _onChunk, onComplete) => {
      onComplete();
    });

    const { rerender, getByLabelText, getByRole } = render(<HermesChat isOpen onClose={() => undefined} />);

    await waitFor(() => {
      expect(openHermesThread).toHaveBeenCalledTimes(1);
    });

    const natal = {
      planets: { Sun: { degree: 10 } },
      meta: {
        receipt: {
          schema_version: 'calculation-receipt.v1',
          kind: 'natal',
          input_hash: 'natal-after-open-hash',
          engine: { name: 'aurea-solaris-astro-engine', version: '2026.08.audit-1' },
          resolved_time: { utc: '2026-08-10T12:00:00Z', iana_timezone: 'UTC' },
        },
      },
    };
    const base = makeCtx();
    ctxHolder.current = {
      ...base,
      agenda: {
        ...base.agenda,
        mapSubjects: [{
          ...base.agenda.mapSubjects[0],
          source: {
            id: 'owner-1',
            name: 'Titular',
            certifiedNatalCalculation: natal,
          },
        }],
      },
    };
    rerender(<HermesChat isOpen onClose={() => undefined} />);

    fireEvent.click(getByRole('checkbox'));
    fireEvent.change(getByLabelText('Pergunte ao Hermes'), { target: { value: 'Qual é o Sol?' } });
    fireEvent.click(getByLabelText('Enviar mensagem ao Hermes'));

    await waitFor(() => {
      expect(sendChatMessageStream).toHaveBeenCalled();
    });
    expect(openHermesThread).toHaveBeenCalledTimes(1);
    expect(vi.mocked(sendChatMessageStream).mock.calls[0][1]).toContain('natal-after-open-hash');
  });
});
