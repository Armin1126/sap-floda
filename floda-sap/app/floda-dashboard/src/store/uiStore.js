import { create } from 'zustand'

/** Shared UI-only state. Server data remains in TanStack Query. */
export const useUiStore = create(set => ({
  activeSection: 'overview',
  dialogOpen: false,
  setActiveSection: activeSection => set({ activeSection }),
  setDialogOpen: dialogOpen => set({ dialogOpen })
}))
