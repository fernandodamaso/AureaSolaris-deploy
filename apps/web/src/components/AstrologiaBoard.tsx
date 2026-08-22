import { MandalaPage } from './MandalaPage';

export const AstrologiaPage = () => (
  <div className="flex h-full flex-col overflow-hidden">
    <div id="painel-mandala" role="tabpanel" className="flex-1 overflow-hidden">
      <MandalaPage />
    </div>
  </div>
);
