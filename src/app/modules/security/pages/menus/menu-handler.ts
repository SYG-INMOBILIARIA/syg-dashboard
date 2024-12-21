import { Injectable, inject } from "@angular/core";
import { Badge, Menu } from "../../interfaces";
import { BehaviorSubject } from "rxjs";
import { MenuService } from "../../services/menu.service";

export class AppMenu {

  id!:         string;
  idDB!:         string;
  label!:      string;
  level!:      number;
  parentId!:   null | string;
  children!: AppMenu[];
  type: any;
  isLoading!: boolean;
  iconClass!: string;

  badge?: Badge;
}

/** Flat node with expandable and level information */
export class AppFlatMenu {
  constructor(
    public expandable: boolean,
    public label: string,
    public level: number,
    public type: any,
    public id: string,
  ) {}
}

/**
 * File database, it can build a tree structured Json object from string.
 * Each node in Json object represents a file or a directory. For a file, it has filename and type.
 * For a directory, it has filename and children (a list of files or directories).
 * The input will be a json object string, and the output is a list of `FileNode` with nested
 * structure.
 */
@Injectable()
export class MenuHandler {

  private _menuService = inject( MenuService );
  dataChange = new BehaviorSubject<AppMenu[]>([]);

  get data(): AppMenu[] { return this.dataChange.value; }

  constructor() {
    this.onGetListMenus();
  }

  onGetListMenus() {

    this._menuService.getMenus()
    .subscribe({
      next: ( menus ) => {

        const data = this.buildItemsTree( menus, 1);

        this.dataChange.next(data);

      }, error: (e) => {
        console.log('Error al listar menú ::: ', e );
      }
    });

  }

  /**
   * Build the file structure tree. The `value` is the Json object, or a sub-tree of a Json object.
   * The return value is the list of `FileNode`.
   */
  buildItemsTree(obj: {[key: string]: any}, level: number, parentId: string = '0'): AppMenu[] {

    return Object.keys(obj).reduce<AppMenu[]>((accumulator, key, idx) => {
      const value = obj[key] as Menu;
      const node = new AppMenu();

      if( value ) {

        if( typeof value === 'object' ) {

          node.label = value.label;
          node.level = value.level;
          node.parentId = value.parentId;
          node.idDB = value.id;
          node.isLoading = false;
          node.iconClass = value.iconClass;
          node.badge = value.badge ?? undefined;
          /**
           * Make sure your node has an id so we can properly rearrange the tree during drag'n'drop.
           * By passing parentId to buildFileTree, it constructs a path of indexes which make
           * it possible find the exact sub-array that the node was grabbed from when dropped.
           */
          node.id = `${parentId}/${idx}`;

          if( value.children && value.children.length > 0 ) {
            node.children = this.buildItemsTree(value.children, level + 1, node.id);
          } else {
            node.children = [];
          }

        } else {
          node.type = value;
        }

      }

      return accumulator.concat(node);
    }, []);
  }

  /** Add an item to to-do list */
  insertItem(parent: AppMenu, name: string): AppMenu {
    if (!parent.children) {
      parent.children = [];
    }
    const newItem = { label: name } as AppMenu;
    parent.children.push(newItem);
    this.dataChange.next(this.data);
    return newItem;
  }

  /** Add an item to to-do list */
  insertItemToFrm( menuCreated: Menu, parent: AppMenu | null ): AppMenu {

    const newAppMenu = new AppMenu();
    newAppMenu.id = menuCreated.id;
    newAppMenu.label = menuCreated.label;
    newAppMenu.level = menuCreated.level;
    newAppMenu.parentId = menuCreated.parentId;

    // if( parent ) {
    //   if (!parent.children) {
    //     parent.children = [];
    //   }
    //   parent.children.push(newAppMenu);
    // } else {
    //   this.data.push( newAppMenu );
    // }

    this.dataChange.next( this.data );

    this.onGetListMenus();

    return newAppMenu;
  }

  updateItem(node: AppMenu, name: string) {
    node.label = name;
    this.dataChange.next(this.data);
  }

  updateItemToFrm( node: AppMenu, menuUpdated: Menu) {

    node.label = menuUpdated.label;

    // node.level = menuUpdated.level;
    // node.order = menuUpdated.order;
    // node.parentId = menuUpdated.parentId;
    this.dataChange.next(this.data);
  }

  deleteItem( node: AppMenu ) {
    this.deleteNode(this.data, node);
    this.dataChange.next(this.data);
  }

  deleteNode(nodes: AppMenu[], nodeToDelete: AppMenu) {

    const index = nodes.indexOf(nodeToDelete, 0);
    if (index > -1) {
      nodes.splice(index, 1);
    } else {
      nodes.forEach(node => {
        if (node.children && node.children.length > 0) {
          this.deleteNode(node.children, nodeToDelete);
        }
      });
    }
  }

}
