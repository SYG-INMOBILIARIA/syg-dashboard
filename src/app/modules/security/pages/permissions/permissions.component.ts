import { ChangeDetectionStrategy, Component, OnInit, ViewChild, computed, inject, signal } from '@angular/core';

import { MenuService } from '../../services/menu.service';
import { RoleService } from '../../services/role.service';
import { MenuMethod, MenuPermissionsMethod, Permission, PermissionBody, PermissionItem, Role } from '../../interfaces';
import { CommonModule } from '@angular/common';
import { MaterialModule } from '@shared/material.module';
import { MatTreeNestedDataSource } from '@angular/material/tree';
import { CdkTree } from '@angular/cdk/tree';
import { Menu } from '../../interfaces/menu.interface';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { PermissionService } from '../../services/permission.service';
import { SelectionModel } from '@angular/cdk/collections';
import { AlertService } from '@shared/services/alert.service';
import { NomenclatureService } from '@shared/services/nomenclature.service';
import { Nomenclature } from '@shared/interfaces';

@Component({
  selector: 'app-permissions',
  standalone: true,
  imports: [
    CommonModule,
    MaterialModule,
    ReactiveFormsModule
  ],
  templateUrl: './permissions.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: `
    .example-list-section {
      width: 350px;
    }
  `
})
export default class PermissionsComponent implements OnInit {

  private _alertService = inject( AlertService );
  private _menuService = inject( MenuService );
  private _permissionService = inject( PermissionService );
  private _roleService = inject( RoleService );
  private _nomenclatureService = inject( NomenclatureService );

  private _methods = signal<Nomenclature[]>( [] );
  private _menuPermission = signal<MenuPermissionsMethod[]>( [] );
  private _roles = signal<Role[]>( [] );
  private _lockedTree = signal<boolean>( true );
  private _isLoading = signal<boolean>( false );


  public methods = computed( () => this._methods() );
  public roles = computed( () => this._roles() );
  public lockedTree = computed( () => this._lockedTree() );
  public isLoading = computed( () => this._isLoading() );

  public roleControl = new FormControl<string | null>( null, [ Validators.required ] );

  @ViewChild('tree') tree!: CdkTree<MenuPermissionsMethod>;
  dataSource = new MatTreeNestedDataSource<MenuPermissionsMethod>();

  childrenAccessor = (node: MenuPermissionsMethod) => node.children ?? [];
  hasChild = (_: number, node: MenuPermissionsMethod) => !!node.children && node.children.length > 0;

  get isValidForm() { return this.roleControl.valid; }
  get isPartialSelectedMenu() { return this.dataSource.data.some( (menu) => menu.selected ); }

  readonly partiallyComplete = ( node: MenuPermissionsMethod ) => {
    const childrenList = node.children ?? [];

    if( childrenList.length == 0 ) return false;

    return childrenList.some( (children) => children.selected ) && !childrenList.every( (children) => children.selected );

  }

  ngOnInit(): void {

    this.onLoadMenu();
    this.onLoadRoles();
    this.onLoadPermissionsMethods();

  }

  onLoadMenu() {
    this._menuService.getMenus()
    .subscribe({
      next: (listMenu) => {

        // console.log({listMenu});
        // this._menus.set( listMenu );

        this.dataSource.data = this._buildMenu( listMenu );
        this._menuPermission.set( this.dataSource.data );

        this.tree.expandAll();

      }, error: (err) => {
        console.log({err});
      }
    });
  }

  rebuildTreeForData( data: MenuPermissionsMethod[] ) {
    this.dataSource.data = data;

    this._menuPermission.set( data );

    this.tree.expandAll();
  }

  private _buildMenu( menus: Menu[] ): MenuPermissionsMethod[] {

    let result: MenuPermissionsMethod[] = [];

    result = menus.map(menu => {

      const { id, label, iconClass, parentId, haveBadge, badge, level, children = [] } = menu;

      return {
        id, label, iconClass, parentId, haveBadge, badge, level,
        children: this._buildMenu( children ),
        menuMethods: [],
        selected: false
      }

    });

    return result;
  }

  private _buildMenuByRolePermissions( menus: MenuPermissionsMethod[], permissions: Permission[] = [] ): MenuPermissionsMethod[] {

    const permissionMethods = this._methods();

    let result = menus.map( (menu) => {

      const permissionMenu = permissions.find( (permission) => permission.menu.id == menu.id );

      return {
        ...menu,
        permissionId: permissionMenu?.id,
        selected: permissions.some( (permission) => permission.menu.id == menu.id ),
        menuMethods: permissionMethods.map( (nomenclature) => {

          const permissionMenuMehod = permissions.find( (permission) => permission.menu.id == menu.id && permission.methods.includes( nomenclature.value ) );

          if( permissionMenuMehod ) {
            return {
              // id: permissionMenu.id,
              method: nomenclature.value,
              label: nomenclature.label,
              selected: true
            };
          }

          return {
            // id: null,
            method: nomenclature.value,
            label: nomenclature.label,
            selected: false
          };

        }),
        children: this._buildMenuByRolePermissions( menu.children, permissions )
      };

    } );

    return result;

  }

  onLoadRoles() {
    this._roleService.getRoles( 1, '', 100 )
    .subscribe({
      next: (response) => {

        const { roles } = response;
        this._roles.set( roles );

      }, error: (err) => {

      }
    })
  }

  onLoadPermissionsMethods() {
    this._nomenclatureService.getPermissionsNomenclature()
    .subscribe({
      next: (response) => {

        const { nomenclatures } = response;
        this._methods.set( nomenclatures );

      }, error: (err) => {
        console.log({err});
      }
    });
  }

  onChangeRol( roleId: string ) {

    this._lockedTree.set( true );
    this._isLoading.set( true );

    this._permissionService.getPermissionsByRoleId( roleId )
    .subscribe({
      next: ({ permissions }) => {

        let menuData = this.dataSource.data;

        const menuBuilded = this._buildMenuByRolePermissions( menuData, permissions );

        this.rebuildTreeForData( menuBuilded );

        this._isLoading.set( false );
        this._lockedTree.set( false );
      }, error: (err) => {

        this._isLoading.set( false );
      }
    })

  }

  updateCheckedMenu( selected: boolean, node: MenuPermissionsMethod ) {

    node.selected = selected;

    node.menuMethods.forEach((method) => {
      method.selected = selected;
    });

    node.children.forEach((children) => {
      children.selected = selected;

      children.menuMethods.forEach((method) => {
        method.selected = selected;
      });

    });

    const dataUpdated = this.dataSource.data;

    if( node.parentId && node.level > 1 ) {

      let parent = dataUpdated.find( (menu) => menu.id == node.parentId );

      if( parent ) {
        parent.selected = parent.children.some( (children) => children.selected );

        if( parent.children.some( (children) => children.selected ) ) {
          parent.menuMethods.forEach((method) => {
            method.selected = true;
          });
        }
      }

    }

  }

  updateCheckedMethod( selected: boolean, menuMethod: MenuMethod, node: MenuPermissionsMethod ) {

    menuMethod.selected = selected;
    node.selected = node.menuMethods.some( (method) => method.selected );

    const dataUpdated = this.dataSource.data;

    if( node.parentId && node.level > 1 ) {

      let parent = dataUpdated.find( (menu) => menu.id == node.parentId );

      if( parent ) {
        parent.selected = parent.children.some( (children) => children.selected );

        if( parent.children.some( (children) => children.selected ) ) {
          parent.menuMethods.forEach((method) => {
            method.selected = true;
          });
        }
      }

    }

  }

  onSubmit() {

    if( !this.isValidForm && !this.isPartialSelectedMenu ) return;

    const menuSelected = this.dataSource.data.filter( (menu) => menu.selected );

    const permissionBody: PermissionBody = {
      roleId: this.roleControl.value!,
      permissions: []
    };

    const permissions: PermissionItem[] = [];

    menuSelected.forEach((menu) => {

      permissions.push({
        id: menu.permissionId,
        menuId: menu.id,
        methods: menu.menuMethods.reduce<string[]>( (acc, current) => {
          if( current.selected ) acc.push( current.method );
          return acc;
        }, [])
      });

      menu.children.forEach( (children) => {

        permissions.push({
          id: children.permissionId,
          menuId: children.id,
          methods: children.menuMethods.reduce<string[]>( (acc, current) => {
            if( current.selected ) acc.push( current.method );
            return acc;
          }, [])
        })
      });

    });

    permissionBody.permissions = permissions;

    this._lockedTree.set( true );
    this._isLoading.set( true );

    this._alertService.showLoading();

    // this._permissionService.
    this._permissionService.updatePermission( permissionBody )
    .subscribe({
      next: (response) => {

        this._lockedTree.set( false );
        this._isLoading.set( false );
        this._alertService.close();
        this._alertService.showAlert(
          'Permisos actualizados correctamente',
          undefined,
          'success'
        );

      }, error: (err) => {
        this._lockedTree.set( false );
        this._isLoading.set( false );
        // this._alertService.close();

      }
    });

  }

}
