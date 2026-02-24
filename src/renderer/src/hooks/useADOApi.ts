import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import * as api from '../lib/api'
import type { AdoProject, AdoVariableGroup } from '../types'

// ─── Projects ───────────────────────────────────────────────────────────────

export function useProjects() {
  return useQuery<AdoProject[]>({
    queryKey: ['projects'],
    queryFn: () => api.getProjects()
  })
}

// ─── Variable Groups ─────────────────────────────────────────────────────────

export function useVariableGroups(projectId: string | null) {
  return useQuery<AdoVariableGroup[]>({
    queryKey: ['variableGroups', projectId],
    queryFn: () => api.getVariableGroups(projectId!),
    enabled: !!projectId
  })
}

export function useVariableGroup(projectId: string | null, groupId: number | null) {
  return useQuery<AdoVariableGroup>({
    queryKey: ['variableGroup', projectId, groupId],
    queryFn: () => api.getVariableGroup(projectId!, groupId!),
    enabled: !!projectId && !!groupId
  })
}

// ─── Add Variable Group ──────────────────────────────────────────────────────

export function useAddVariableGroup() {
  const queryClient = useQueryClient()
  const { t } = useTranslation()

  return useMutation({
    mutationFn: ({
      projectId,
      name,
      description
    }: {
      projectId: string
      name: string
      description: string | null
    }) => api.addVariableGroup(projectId, name, description),
    onSuccess: (_data, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: ['variableGroups', projectId] })
      toast.success(t('modals.addLibrary.toastSuccess'))
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : String(err)
      toast.error(t('modals.addLibrary.toastError', { message: msg }))
    }
  })
}

// ─── Clone Variable Group ────────────────────────────────────────────────────

export function useCloneVariableGroup() {
  const queryClient = useQueryClient()
  const { t } = useTranslation()

  return useMutation({
    mutationFn: ({
      projectId,
      groupId,
      newName
    }: {
      projectId: string
      groupId: number
      newName: string
    }) => api.cloneVariableGroup(projectId, groupId, newName),
    onSuccess: (_data, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: ['variableGroups', projectId] })
      toast.success(t('modals.addLibrary.toastSuccess'))
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : String(err)
      // Only show "choose a different name" when the error clearly indicates a duplicate variable group name
      const isDuplicateName = /already\s+exists/i.test(msg) && /variable\s*group|library/i.test(msg)
      toast.error(
        isDuplicateName
          ? t('modals.clone.errorAlreadyExists')
          : t('modals.clone.errorFailed', { message: msg })
      )
    }
  })
}

// ─── Update Variable Group ───────────────────────────────────────────────────

export function useUpdateVariableGroup() {
  const queryClient = useQueryClient()
  const { t } = useTranslation()

  return useMutation({
    mutationFn: ({
      projectId,
      groupId,
      variables
    }: {
      projectId: string
      groupId: number
      variables: Record<string, { value: string; isSecret: boolean }>
    }) => api.updateVariableGroup(projectId, groupId, variables),
    onSuccess: (_data, { projectId, groupId }) => {
      queryClient.invalidateQueries({ queryKey: ['variableGroup', projectId, groupId] })
      queryClient.invalidateQueries({ queryKey: ['variableGroups', projectId] })
      toast.success(t('modals.updateLibrary.toastSuccess'))
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : String(err)
      toast.error(t('modals.updateLibrary.toastError', { message: msg }))
    }
  })
}
