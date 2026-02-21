import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import type { AdoProject, AdoVariableGroup } from '../types'

// ─── Projects ───────────────────────────────────────────────────────────────

export function useProjects() {
  return useQuery<AdoProject[]>({
    queryKey: ['projects'],
    queryFn: async () => {
      const res = await window.api.getProjects()
      if (!res.ok) throw new Error(res.error)
      return res.data
    }
  })
}

// ─── Variable Groups ─────────────────────────────────────────────────────────

export function useVariableGroups(projectId: string | null) {
  return useQuery<AdoVariableGroup[]>({
    queryKey: ['variableGroups', projectId],
    queryFn: async () => {
      const res = await window.api.getVariableGroups(projectId!)
      if (!res.ok) throw new Error(res.error)
      return res.data
    },
    enabled: !!projectId
  })
}

export function useVariableGroup(projectId: string | null, groupId: number | null) {
  return useQuery<AdoVariableGroup>({
    queryKey: ['variableGroup', projectId, groupId],
    queryFn: async () => {
      const res = await window.api.getVariableGroup(projectId!, groupId!)
      if (!res.ok) throw new Error(res.error)
      return res.data
    },
    enabled: !!projectId && !!groupId
  })
}

// ─── Clone Variable Group ────────────────────────────────────────────────────

export function useCloneVariableGroup() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      projectId,
      groupId,
      newName
    }: {
      projectId: string
      groupId: number
      newName: string
    }) => {
      const res = await window.api.cloneVariableGroup(projectId, groupId, newName)
      if (!res.ok) throw new Error((res as { ok: false; error: string }).error)
      return res.data
    },
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
    mutationFn: async ({
      projectId,
      groupId,
      variables
    }: {
      projectId: string
      groupId: number
      variables: Record<string, { value: string; isSecret: boolean }>
    }) => {
      const res = await window.api.updateVariableGroup(projectId, groupId, variables)
      if (!res.ok) throw new Error(res.error)
    },
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
