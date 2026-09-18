import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export function useCatalogos() {
  const [departamentos, setDepartamentos] = useState<string[]>([]);
  const [subareas, setSubareas] = useState<string[]>([]);
  const [cargos, setCargos] = useState<string[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function loadCatalogos() {
      try {
        const { data, error } = await supabase
          .from('empleados')
          .select('departamento, subarea, cargo')
          .eq('activo', true);

        if (error) throw error;

        if (mounted && data) {
          const uniqueDepartamentos = [...new Set(data.map(d => d.departamento).filter(Boolean))].sort();
          const uniqueSubareas = [...new Set(data.map(d => d.subarea).filter(Boolean))].sort();
          const uniqueCargos = [...new Set(data.map(d => d.cargo).filter(Boolean))].sort();
          
          setDepartamentos(uniqueDepartamentos);
          setSubareas(uniqueSubareas);
          setCargos(uniqueCargos);
        }
      } catch (err) {
        console.error('Error cargando catálogos:', err);
      } finally {
        if (mounted) {
          setCargando(false);
        }
      }
    }

    loadCatalogos();

    return () => {
      mounted = false;
    };
  }, []);

  return { departamentos, subareas, cargos, cargando };
}
