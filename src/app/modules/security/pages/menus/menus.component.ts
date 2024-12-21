import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, ElementRef, OnDestroy, OnInit, ViewChild, computed, inject, signal } from '@angular/core';
import { MatTreeNestedDataSource,   } from '@angular/material/tree';
import { SelectionModel } from '@angular/cdk/collections';
import { CdkDragDrop } from '@angular/cdk/drag-drop';
import { CdkTree } from '@angular/cdk/tree';
import { Subscription } from 'rxjs';
import { ReactiveFormsModule, UntypedFormBuilder, Validators } from '@angular/forms';
import { initFlowbite } from 'flowbite';

import { MenuService } from '../../services/menu.service';
import { AlertService } from '@shared/services/alert.service';
import { MaterialModule } from '@shared/material.module';
import { classPatt, fullTextPatt } from '@shared/helpers/regex.helper';
import { AppFlatMenu, AppMenu, MenuHandler } from './menu-handler';
import { InputErrorsDirective } from '@shared/directives/input-errors.directive';
import { SpinnerComponent } from '@shared/components/spinner/spinner.component';
import { MenuBody, MenuMoveBody } from '../../interfaces';
import { translatePatt } from '../../../../shared/helpers/regex.helper';


/**
 * Food data with nested structure.
 * Each node has a name and an optional list of children.
 */
@Component({
  selector: 'app-menus',
  standalone: true,
  imports: [
    CommonModule,
    MaterialModule,
    ReactiveFormsModule,
    InputErrorsDirective,
    SpinnerComponent
  ],
  providers: [
    MenuHandler
  ],
  templateUrl: './menus.component.html',
  styles: ``,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export default class MenusComponent implements OnInit, OnDestroy {

  private _menuHandler$?: Subscription;
  @ViewChild('btnCloseMenuModal') btnCloseMenuModal!: ElementRef<HTMLButtonElement>;
  @ViewChild('btnShowMenuModal') btnShowMenuModal!: ElementRef<HTMLButtonElement>;
  @ViewChild('tree') tree!: CdkTree<AppMenu>;

  dataSource = new MatTreeNestedDataSource<AppMenu>();

  private _menuService = inject( MenuService );
  private _alertService = inject( AlertService );

  private _formBuilder = inject( UntypedFormBuilder );
  private _menuHandler = inject( MenuHandler );
  private _haveTranslate = signal( false );
  private _haveBadge = signal( false );
  private _parentOfChildren = signal<AppMenu | null>( null )

  public menuForm = this._formBuilder.group({
    id:               [ null, [] ],
    label:            [ '', [ Validators.required, Validators.pattern( fullTextPatt ) ] ],
    iconClass:        [ 'ni-circle', [ Validators.required, Validators.pattern( classPatt ) ] ],
    webUrl:           [ '', [ Validators.required ] ],
    apiUrl:           [ '', [ Validators.required ] ],
    parentId:         [ null, [ ] ],
    level:            [ 1, [ Validators.required ] ],
    order:            [ 0, [ Validators.required ] ],
    isHidden:         [ false, [ ] ],
    haveTranslate:    [ false, [ ] ],
    haveBadge:        [ false, [ ] ],
    labelTranslate:   [ null, [ ] ],
    badgeClass:       [ null, [ ] ],
    badgeText:        [ null, [ ] ],
  });

  private _menuMoveForm = this._formBuilder.group({
    id:       [ '', [ Validators.required ] ],
    parentId: [ null, [] ],
    level:    [ 0, [ Validators.min(1), Validators.max(2) ] ],
    order:    [ 0, [ Validators.min(0), Validators.max(100) ] ],
  });

  public childrenAccessor = ( node: AppMenu ) => node.children ?? [];

  public hasChild = ( _: number, node: AppMenu) => !!node.children && node.children.length > 0;
  hasNoAdd = ( _nodeData: AppMenu) => !_nodeData.parentId ;
  public haveTranslate = computed( () => this._haveTranslate() );
  public haveBadge = computed( () => this._haveBadge() );

  public menuModalTitle = 'Crear nuevo menú';
  private _isRecording = false;
  private _isRemoving = false;

  levelNode( node: AppMenu ) { return this.tree._getLevel( node ) ?? 0; }
  get isInvalidForm() { return this.menuForm.invalid; }
  get isRecording() { return this._isRecording };
  get menuBody(): MenuBody { return this.menuForm.value; }
  get moveBody(): MenuMoveBody { return this._menuMoveForm.value; }
  public inputErrors( field: string ) { return this.menuForm.get( field )?.errors ?? null; };
  public isTouched( field: string ) { return this.menuForm.get( field )?.touched ?? false; }
  expansionModel = new SelectionModel<string>(true);

  transformer = (node: AppMenu, level: number) => {
    return new AppFlatMenu(!!node.children, node.label, level, node.type, node.id);
  }

  ngOnInit(): void {

    initFlowbite();

    this._menuHandler$ = this._menuHandler.dataChange.subscribe( (appMenu) => {
      this.rebuildTreeForData(appMenu);
    });
  }

  rebuildTreeForData( data: AppMenu[] ) {
    this.menuForm.get('order')?.setValue( data.length );
    this.dataSource.data = data;

    this.expansionModel.selected.forEach((id) => {
      const node = data.find((n) => n.id === id);
      if( node ) {
        this.tree.collapse(node);
        this.tree.expand(node);
      }
    });
  }

  onResetForm() {
    this.menuForm.reset({
      iconClass: 'ni-circle',
      level: 1,
      order: this.dataSource.data.length,
      isHidden: false,
      haveTranslate: false
  });
    this._parentOfChildren.set( null );
    this._haveTranslate.set( false );
    this._haveBadge.set( false );
    this.menuModalTitle = 'Crear nuevo menú';
  }

  onLoadMenuToUpdate( menu: AppMenu ) {

    this._alertService.showLoading();

    this._menuService.getMenuById( menu.idDB )
    .subscribe({
      next: (menu) => {

        const { isActive, userCreate, createAt, badge, ...restMenu } = menu;

        this.btnShowMenuModal.nativeElement.click();
        // this._nodeUoUpdated = menu;
        this.menuModalTitle = 'Actualizar menú';

        let badgeClass: string | null = null;
        let badgeText: string | null = null;
        if( badge ) {
          badgeClass = badge.variant;
          badgeText = badge.text;
        }

        this.menuForm.reset( {...restMenu, badgeClass, badgeText} );

        this.onChangeHaveTranslate();
        this.onChangeHaveBadge();

        this._alertService.close();

      }, error: (err) => {

        this._alertService.close();
      }
    })
  }

  addSubItem( menu: AppMenu ) {
    this.btnShowMenuModal.nativeElement.click();
    let order = 0;

    if( menu.children && menu.children?.length > 0 ) {
      order = menu.children.length;
    }

    this.menuForm.get('parentId')?.setValue( menu.idDB );
    this.menuForm.get('level')?.setValue( 2  );
    this.menuForm.get('order')?.setValue( order );
    this.menuModalTitle = 'Crear nuevo submenú';
    this._parentOfChildren.set( menu );

  }

  /**
   * This constructs an array of nodes that matches the DOM
   */
  visibleNodes(): AppMenu[] {
    const result: any[] = [];

    function addExpandedChildren(node: AppMenu, expanded: string[]) {
      result.push(node);
      if (expanded.includes(node.id)) {
        node.children?.map( (child) => addExpandedChildren(child, expanded) );
      }
    }
    this.dataSource.data.forEach((node) => {
      addExpandedChildren( node, this.expansionModel.selected );
    });
    return result;
  }

  /**
   * Handle the drop - here we rearrange the data based on the drop event,
   * then rebuild the tree.
   * */
  drop( event: CdkDragDrop<AppMenu[]> ) {
    console.log('origin/destination', event.previousIndex, event.currentIndex);

    // ignore drops outside of the tree
    if (!event.isPointerOverContainer) return;

    // construct a list of visible nodes, this will match the DOM.
    // the cdkDragDrop event.currentIndex jives with visible nodes.
    // it calls rememberExpandedTreeNodes to persist expand state
    const visibleNodes = this.visibleNodes();

    // deep clone the data source so we can mutate it
    const changedData = this.dataSource.data;

    // recursive find function to find siblings of node
    function findNodeSiblings(arr: Array<AppMenu>, id: string): Array<any> | undefined {
      let result, subResult;

      arr.forEach((item, i) => {

        if (item.id == id) {
          result = arr;
        } else if (item.children && item.children.length > 0) {
          subResult = findNodeSiblings(item.children, id);
          if (subResult) result = subResult;
        }
      });

      return result;

    }

    // determine where to insert the node
    const nodeAtDest = visibleNodes[event.currentIndex];

    const newLevel = nodeAtDest.parentId ? 2 : 1;
    this._menuMoveForm.get('parentId')?.setValue( nodeAtDest.parentId );
    this._menuMoveForm.get('level')?.setValue( newLevel );

    const newSiblings = findNodeSiblings(changedData, nodeAtDest.id);

    if (!newSiblings) return;

    const insertIndex = newSiblings.findIndex(s => s.id === nodeAtDest.id);

    // remove the node from its old place
    const node = event.item.data as AppMenu;

    if( !node.parentId && node.children && node.children.length > 0 && node.level != newLevel ) {
      this._alertService.showAlert('La app solo admite dos niveles', undefined, 'warning');
      return;
    }

    const siblings = findNodeSiblings(changedData, node.id);
    const siblingIndex = siblings?.findIndex(n => n.id === node.id);
    const nodeToInsert: AppMenu = siblings?.splice(siblingIndex!, 1)[0];

    this._menuMoveForm.get('id')?.setValue( nodeToInsert.idDB );
    this._menuMoveForm.get('order')?.setValue( nodeAtDest.parentId ? insertIndex : event.currentIndex );

    if (nodeAtDest.id === nodeToInsert.id) return;

    // insert node
    newSiblings.splice( insertIndex, 0, nodeToInsert);

    // rebuild tree with mutated data
    this.rebuildTreeForData(changedData);

    this._moveMenu( nodeToInsert );
  }

  onSubmit() {

    if( this.isInvalidForm || this._isRecording ) return;

    this._isRecording = true;

    const { id, ...body } = this.menuBody;

    if( !id ) {
      this._menuService.createMenu( body )
      .subscribe({
        next: (menuCreated) => {

          this._isRecording = false;
          this._menuHandler.onGetListMenus( );
          this.btnCloseMenuModal.nativeElement.click();

          this._alertService.showAlert('Menú creado exitosamente', undefined, 'success');

        }, error: (err) => {

          this._isRecording = false;
        }
      });

      return;
    }

    this._menuService.updateMenu( id, body )
    .subscribe({
      next: (menuUpdated) => {
        this._isRecording = false;
        this._menuHandler.onGetListMenus();
        this.btnCloseMenuModal.nativeElement.click();

        this._alertService.showAlert('Menú actualizado exitosamente', undefined, 'success');
      }, error: ( err ) => {
        this._isRecording = false;
      }
    })

  }

  onChangeHaveTranslate() {
    const { haveTranslate } = this.menuBody;

    this._haveTranslate.set( haveTranslate );
    const newValidators = [ Validators.required, Validators.pattern( translatePatt ) ];

    if( haveTranslate ) {
      this.menuForm.get('labelTranslate')?.addValidators( newValidators );
      return;
    }
    this.menuForm.get('labelTranslate')?.setValue(null);
    this.menuForm.get('labelTranslate')?.removeValidators( newValidators );
  }

  onChangeHaveBadge() {
    const { haveBadge } = this.menuBody;

    this._haveBadge.set( haveBadge );
    const newTextValidators = [ Validators.required, Validators.pattern( fullTextPatt ) ];
    const newClassValidators = [ Validators.required, Validators.pattern( classPatt ) ];

    if( haveBadge ) {

      this.menuForm.get('badgeText')?.addValidators( newTextValidators );
      this.menuForm.get('badgeClass')?.addValidators( newClassValidators );
      return;
    }
    this.menuForm.get('badgeText')?.setValue(null);
    this.menuForm.get('badgeClass')?.setValue(null);
    this.menuForm.get('badgeText')?.removeValidators( newTextValidators );
    this.menuForm.get('badgeClass')?.removeValidators( newClassValidators );
  }

  async onRemoveConfirm( menu: AppMenu ) {
    const responseConfirm = await this._alertService.showConfirmAlert(
      'Verifique que no hayan roles relacionados con este menú',
      `¿Está seguro de eliminar menú "${ menu.label }"?`
    );

    if( responseConfirm.isConfirmed ) {
      this._removeMenu( menu.idDB );
    }
  }

  private _removeMenu( menuId: string ) {

    if( this._isRemoving ) return;

    this._isRemoving = true;

    this._alertService.showLoading();

    this._menuService.removeMenu( menuId )
    .subscribe({
      next: (menuDeleted) => {

        this._alertService.close();
        this._isRemoving = false;
        this._menuHandler.onGetListMenus();
        this._alertService.showAlert('Menú eliminado exitosamente', undefined, 'success');
      }, complete: () => {

        this._isRemoving = false;
        this._alertService.close();
      }
    });
  }

  private _moveMenu( menu: AppMenu ) {

    // menu.isLoading = true;

    this._menuService.moveMenu( this.moveBody )
    .subscribe({
      next: (menuMoveed) => {

        const { id, parentId } = menuMoveed;

        // this.dataSource.data.forEach( (menu) => {

        //   if( !parentId ) {

        //     if( menu.id == id ) {
        //       menu.isLoading = false;
        //     }

        //   } else {
        //     if( menu.id == parentId ){

        //       menu.children.forEach( (children) => {

        //         if( children.id == id ) {
        //           children.isLoading = false;
        //         }

        //       } )

        //     }
        //   }

        // } );

        // console.log({menuMoveed});
        // menu.isLoading = false;

      }, error: (err) => {

        // menu.isLoading = false;
      }
    })
  }

  ngOnDestroy(): void {
    this._menuHandler$?.unsubscribe();
  }

}
