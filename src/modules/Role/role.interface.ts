export type TCreateRolePayload = {
  name: string;
  permissionIds?: string[];
};

export type TUpdateRolePermissionsPayload = {
  permissionIds: string[];
};

export type TPermissionGroup = {
  module: string;
  permissions: {
    id: string;
    name: string;
    description: string | null;
  }[];
};
