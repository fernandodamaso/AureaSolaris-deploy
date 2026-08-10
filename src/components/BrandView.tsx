import { useMemo } from 'react';

export const BrandView = () => {
  const src = useMemo(() => '/brand/aurea_solaris_brand_bible.html', []);

  return (
    <div className="w-full h-full bg-black/70">
      <iframe
        title="Aurea Solaris — Bíblia Visual da Marca"
        src={src}
        className="w-full h-full border-0"
        sandbox=""
      />
    </div>
  );
};
