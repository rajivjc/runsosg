'use client';

import { create } from 'zustand';
import { appSpec } from './spec';
import { getValueByPath, setValueByPath } from './paths';

export type RootState = {
  state: any;
  mockData: any;
  mockTemplates: any;
  controls: Record<string, string>;
  form: Record<string, any>;
  persistEnabled: boolean;
  initPersistence: () => void;
  getByPath: (path: string) => any;
  setByPath: (path: string, value: any) => void;
  setControl: (id: string, value: string) => void;
  setFormValue: (id: string, value: any) => void;
  mutateMock: (targetPath: string, operation: 'prepend' | 'prependMany', payload: any) => void;
};

const baseState = {
  state: structuredClone(appSpec.state),
  mockData: structuredClone(appSpec.mockData),
  mockTemplates: structuredClone(appSpec.mockTemplates),
  controls: {},
  form: {},
  persistEnabled: false
};

export const useAppStore = create<RootState>((set, get) => ({
  ...baseState,
  initPersistence: () => {
    if (typeof window === 'undefined') return;
    const enabled = new URLSearchParams(window.location.search).get('persist') === '1';
    set({ persistEnabled: enabled });
    if (!enabled) return;
    const raw = localStorage.getItem('sosg-store-v1');
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        set({ state: parsed.state ?? get().state, mockData: parsed.mockData ?? get().mockData });
      } catch {}
    }
    useAppStore.subscribe((s) => {
      localStorage.setItem('sosg-store-v1', JSON.stringify({ state: s.state, mockData: s.mockData }));
    });
  },
  getByPath: (path) => getValueByPath(get(), path),
  setByPath: (path, value) => {
    set((current) => {
      // Only clone the data parts, not the methods
      const next = {
        ...current,
        state: structuredClone(current.state),
        mockData: structuredClone(current.mockData),
        mockTemplates: structuredClone(current.mockTemplates),
        controls: { ...current.controls },
        form: { ...current.form }
      };
      setValueByPath(next, path, value);
      return next;
    });
  },
  setControl: (id, value) => set((s) => ({ controls: { ...s.controls, [id]: value } })),
  setFormValue: (id, value) => set((s) => ({ form: { ...s.form, [id]: value } })),
  mutateMock: (targetPath, operation, payload) => {
    set((current) => {
      // Only clone the data parts, not the methods
      const next = {
        ...current,
        state: structuredClone(current.state),
        mockData: structuredClone(current.mockData),
        mockTemplates: structuredClone(current.mockTemplates),
        controls: { ...current.controls },
        form: { ...current.form }
      };
      const arr = getValueByPath(next, targetPath) ?? [];
      if (operation === 'prepend') arr.unshift(payload);
      if (operation === 'prependMany') arr.unshift(...payload);
      setValueByPath(next, targetPath, arr);
      const selected = next.mockData.selectedAthlete;
      const full = next.mockData.athletesFull.map((a: any) => (a.id === selected.id ? selected : a));
      next.mockData.athletesFull = full;
      return next;
    });
  }
}));
