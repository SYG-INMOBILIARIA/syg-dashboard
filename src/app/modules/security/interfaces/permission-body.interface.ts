export interface PermissionBody {
  roleId:      string;
  permissions: PermissionItem[];
}

export interface PermissionItem {
  id?:     string | null;
  menuId: string;
  methods: string[];
}
