import { useState } from 'react'
import {
  Box,
  Card,
  CardContent,
  Typography,
  Checkbox,
  FormControlLabel,
  Button,
  CircularProgress,
  Divider,
} from '@mui/material'
import SaveRounded from '@mui/icons-material/SaveRounded'
import { useEmployeePermissions, useSetEmployeePermissions } from '../../../../hooks/useEmployees'
import {
  ALL_PERMISSIONS,
  PERMISSION_LABELS,
  EMPLOYEE_TYPE_LABELS,
} from '../../../../types/employee.types'
import type { EmployeeType, Permission } from '../../../../types/employee.types'

function PermissionSection({ employeeType }: { employeeType: EmployeeType }) {
  const { data, isLoading } = useEmployeePermissions(employeeType)
  const setPermissions = useSetEmployeePermissions()
  const [selected, setSelected] = useState<Permission[]>([])
  const [initialized, setInitialized] = useState(false)

  if (!initialized && data) {
    setSelected(data.permissions)
    setInitialized(true)
  }

  const toggle = (permission: Permission) => {
    setSelected((prev) =>
      prev.includes(permission) ? prev.filter((p) => p !== permission) : [...prev, permission],
    )
  }

  const handleSave = () => {
    setPermissions.mutate({ employeeType, permissions: selected })
  }

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="subtitle1" fontWeight={600}>
            {EMPLOYEE_TYPE_LABELS[employeeType]}
          </Typography>
          <Button
            variant="contained"
            color="success"
            size="small"
            onClick={handleSave}
            disabled={setPermissions.isPending}
            startIcon={
              setPermissions.isPending ? (
                <CircularProgress size={14} color="inherit" />
              ) : (
                <SaveRounded />
              )
            }
          >
            Salvar
          </Button>
        </Box>

        <Divider sx={{ mb: 2 }} />

        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
            <CircularProgress size={24} />
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            {ALL_PERMISSIONS.map((permission) => (
              <FormControlLabel
                key={permission}
                control={
                  <Checkbox
                    size="small"
                    checked={selected.includes(permission)}
                    onChange={() => toggle(permission)}
                  />
                }
                label={
                  <Typography variant="body2">{PERMISSION_LABELS[permission]}</Typography>
                }
              />
            ))}
          </Box>
        )}
      </CardContent>
    </Card>
  )
}

export default function PermissionsTab() {
  return (
    <Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Configure quais ações cada tipo de funcionário pode realizar neste tenant.
      </Typography>
      <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' } }}>
        <PermissionSection employeeType="Manager" />
        <PermissionSection employeeType="Employee" />
      </Box>
    </Box>
  )
}
