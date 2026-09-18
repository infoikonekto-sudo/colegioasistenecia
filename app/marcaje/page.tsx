'use client';

import { Suspense } from 'react';
import dynamic from 'next/dynamic';

const MarcajeContent = dynamic(
  () => import('@/components/Marcaje/MarcajeContent'),
  { ssr: false }
);

function MarcajePageContent() {
  return <MarcajeContent />;
}

export default function MarcajePage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-screen">Cargando...</div>}>
      <MarcajePageContent />
    </Suspense>
  );
}
