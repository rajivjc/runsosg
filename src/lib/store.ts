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
  computeFilteredAthletes: (pageNum?: number) => void;
  loadMoreAthletes: () => void;
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
  },
  computeFilteredAthletes: () => {
    set((current) => {
      const next = {
        ...current,
        state: structuredClone(current.state),
        mockData: structuredClone(current.mockData)
      };
      const search = next.state.athleteListSearch || '';
      const sortBy = next.state.athleteListSort || 'active';
      let filtered = filterAndSortAthletes(next.mockData.athletes, search, sortBy);
      const pageSize = next.state.athleteListPageSize || 20;
      const page = Math.max(0, next.state.athleteListPage || 0);
      const end = (page + 1) * pageSize;
      // For infinite scroll, load all items up to the current page
      next.mockData.filteredAthletes = filtered.slice(0, end);
      return next;
    });
  },
  loadMoreAthletes: () => {
    set((current) => ({
      state: {
        ...current.state,
        athleteListPage: (current.state.athleteListPage || 0) + 1
      }
    }));
  }
}));

// Helper: Filter and sort athletes
export function filterAndSortAthletes(athletes: any[], search: string, sortBy: string) {
  let filtered = athletes;
  
  // Search filter (case-insensitive name matching)
  if (search.trim()) {
    const query = search.toLowerCase();
    filtered = filtered.filter((a: any) => a.name.toLowerCase().includes(query));
  }
  
  // Sort
  if (sortBy === 'name') {
    filtered = filtered.sort((a: any, b: any) => a.name.localeCompare(b.name));
  } else if (sortBy === 'active' || sortBy === 'Active') {
    // Sort by: active first (by most recent activity date), then inactive
    filtered = filtered.sort((a: any, b: any) => {
      const aActive = a.status === 'active' ? 0 : 1;
      const bActive = b.status === 'active' ? 0 : 1;
      if (aActive !== bActive) return aActive - bActive;
      // Within active/inactive, sort by date
      return new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime();
    });
  }
  
  return filtered;
}
