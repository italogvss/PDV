import type { Permission } from './employee.types'
import type { OperationModule } from '../constants/modules'

// Metadados do eixo de Access Control vindos do backend (GET /api/access/metadata).
// Fonte única da relação módulo↔permissão (backend ModuleCatalog). O frontend mantém só os
// rótulos PT-BR (OPERATION_MODULES / PERMISSIONS).
export interface AccessMetadata {
  modules: OperationModule[]
  permissions: Permission[]
  // Chave = módulo (lowercase, ex.: "sales"); valor = permissões daquele módulo.
  modulePermissions: Record<string, Permission[]>
  // Permissões sem módulo — sempre visíveis (ex.: gestão de equipe).
  corePermissions: Permission[]
}
