import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MesaCriacao } from '../../components/MesaCriacao';
import { safeInvoke } from '../../utils/tauri';

const board = {
  id: 'board-test',
  name: 'Mapa de teste',
  updated_at: 1,
};

const nodes = [
  { id: 1, type: 'sticky', x: 20, y: 20, w: 200, h: 140, text: 'Primeiro', color: '#FFFDE7' },
  { id: 2, type: 'sticky', x: 280, y: 20, w: 200, h: 140, text: 'Segundo', color: '#E3F2FD' },
];

vi.mock('../../utils/tauri', () => ({
  safeInvoke: vi.fn(async (command: string) => {
    if (command === 'list_boards') return [board];
    if (command === 'load_board') return { nodes, edges: [] };
    if (command === 'save_board') return Date.now();
    return null;
  }),
}));

describe('MesaCriacao', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('creates, selects and explicitly removes a board connection', async () => {
    render(<MesaCriacao />);

    await screen.findByText('Mapa de teste');
    fireEvent.click(screen.getByText('Mapa de teste'));

    await screen.findByRole('button', { name: 'Conectar' });
    fireEvent.click(screen.getByRole('button', { name: 'Conectar' }));

    const firstCard = screen.getByDisplayValue('Primeiro').closest('.group');
    const secondCard = screen.getByDisplayValue('Segundo').closest('.group');
    expect(firstCard).not.toBeNull();
    expect(secondCard).not.toBeNull();

    fireEvent.pointerDown(firstCard!);
    fireEvent.pointerDown(secondCard!);

    await screen.findByText('Conexão selecionada');
    fireEvent.click(screen.getByRole('button', { name: 'Remover' }));

    await waitFor(() => {
      expect(screen.queryByText('Conexão selecionada')).toBeNull();
    });
  });

  it('edits the study attached to a card and can expand the board', async () => {
    render(<MesaCriacao />);

    fireEvent.click(await screen.findByRole('button', { name: 'Abrir caderno Mapa de teste' }));
    await screen.findByDisplayValue('Primeiro');
    fireEvent.click(screen.getAllByRole('button', { name: 'Abrir estudo deste card' })[0]);

    const study = await screen.findByLabelText('Desenvolvimento do estudo');
    fireEvent.change(study, { target: { value: 'Estudo aprofundado do primeiro card.' } });

    await waitFor(() => {
      expect(vi.mocked(safeInvoke)).toHaveBeenCalledWith('save_board', expect.objectContaining({
        nodes: expect.arrayContaining([
          expect.objectContaining({ id: 1, studyContent: 'Estudo aprofundado do primeiro card.' }),
        ]),
      }));
    }, { timeout: 2000 });

    fireEvent.click(screen.getByRole('button', { name: 'Expandir Board' }));
    expect(screen.queryByLabelText('Área de estudo do card selecionado')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Abrir estudo' }));
    expect(await screen.findByLabelText('Área de estudo do card selecionado')).toBeTruthy();
  });
});
