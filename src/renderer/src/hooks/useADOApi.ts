import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
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

// ─── Clone Variable Group ────────────────────────────────────────────────────

export function useCloneVariableGroup() {
  const queryClient = useQueryClient()

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
      toast.success('Library cloned successfully')
    },
    onError: (err: Error) => {
      toast.error(`Failed to clone library: ${err.message}`)
    }
  })
}

// ─── Update Variable Group ───────────────────────────────────────────────────

export function useUpdateVariableGroup() {
  const queryClient = useQueryClient()

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
      toast.success('Variable group updated successfully')
    },
    onError: (err: Error) => {
      toast.error(`Failed to update: ${err.message}`)
    }
  })
}
