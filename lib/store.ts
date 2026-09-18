import { create } from 'zustand';
import { Empleado, Marcaje } from '@/types';

interface AsistenciaStore {
  empleados: Empleado[];
  marcajes: Marcaje[];
  filtroFecha: string;
  empleadoBuscado: string;
  setEmpleados: (empleados: Empleado[]) => void;
  setMarcajes: (marcajes: Marcaje[]) => void;
  addMarcaje: (marcaje: Marcaje) => void;
  setFiltroFecha: (fecha: string) => void;
  setEmpleadoBuscado: (cedula: string) => void;
  getEmpleadoById: (id: string) => Empleado | undefined;
  getMarcajeHoy: (empleadoId: string) => Marcaje | undefined;
  adminSede: string | null;
  adminTheme: string;
  setAdminProfile: (sede: string | null) => void;
}

export const useAsistenciaStore = create<AsistenciaStore>((set, get) => ({
  empleados: [],
  marcajes: [],
  filtroFecha: new Date().toISOString().split('T')[0],
  empleadoBuscado: '',
  adminSede: null,
  adminTheme: 'navy',

  setEmpleados: (empleados: Empleado[]) => set({ empleados }),

  setMarcajes: (marcajes: Marcaje[]) => set({ marcajes }),

  addMarcaje: (marcaje: Marcaje) =>
    set((state) => ({
      marcajes: [...state.marcajes, marcaje],
    })),

  setFiltroFecha: (fecha: string) => set({ filtroFecha: fecha }),

  setEmpleadoBuscado: (cedula: string) => set({ empleadoBuscado: cedula }),

  getEmpleadoById: (id: string) => {
    const { empleados } = get();
    return empleados.find((e) => e.id === id);
  },

  getMarcajeHoy: (empleadoId: string) => {
    const { marcajes } = get();
    return marcajes.find((m) => m.empleado_id === empleadoId && m.tipo === 'entrada');
  },

  setAdminProfile: (sede: string | null) => {
    const theme = sede === 'CAES' ? 'emerald' : 'navy';
    set({ adminSede: sede, adminTheme: theme });
  },
}));
