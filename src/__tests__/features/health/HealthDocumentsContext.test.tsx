import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { HealthDocumentsProvider, useHealthDocuments } from '../../../features/health/HealthDocumentsContext';
import type { HealthDocumentsStorage } from '../../../features/health/healthDocumentsStorage';
import type { AureaDocument } from '../../../features/health/types';

function Probe() {
  const { documents, addDocument } = useHealthDocuments();
  return (
    <div>
      <output data-testid="documents">{JSON.stringify(documents)}</output>
      <button type="button" onClick={() => addDocument({ name: 'Exame.pdf', type: 'pdf', size: '10 KB' })}>add</button>
    </div>
  );
}

describe('HealthDocumentsProvider', () => {
  it('removes only generated placeholder documents and prepends persisted additions', () => {
    let docs: AureaDocument[] = [
      { id: 'd1', name: 'generated', type: 'pdf', size: '1', path: '#' },
      { id: 'd2', name: 'real', type: 'pdf', size: '1', path: '/real' },
    ];
    const storage: HealthDocumentsStorage = {
      loadDocuments: () => structuredClone(docs),
      saveDocuments: (next) => { docs = structuredClone(next); },
    };

    render(
      <HealthDocumentsProvider storage={storage} now={() => new Date('2026-08-14T12:00:00.000Z')}>
        <Probe />
      </HealthDocumentsProvider>,
    );

    expect(screen.getByTestId('documents').textContent).not.toContain('generated');
    fireEvent.click(screen.getByRole('button', { name: 'add' }));
    expect(docs[0]).toMatchObject({
      id: 'doc_1786708800000',
      name: 'Exame.pdf',
      date: '2026-08-14',
    });
    expect(docs[1].id).toBe('d2');
  });
});
