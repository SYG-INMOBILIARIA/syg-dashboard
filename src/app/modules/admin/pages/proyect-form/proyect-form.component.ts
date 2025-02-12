import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule, ReactiveFormsModule, UntypedFormBuilder, Validators } from '@angular/forms';
import { FlatpickrDirective } from 'angularx-flatpickr';
import { validate as ISUUID } from 'uuid';

import { environments } from '@envs/environments';
import { onValidImg } from '@shared/helpers/files.helper';
import { fullTextPatt } from '@shared/helpers/regex.helper';
import { InputErrorsDirective } from '@shared/directives/input-errors.directive';
import { PolygonMapHandlerComponent } from '../../components/polygon-map-handler/polygon-map-handler.component';
import { Coordinate, MapProps, ProyectBody } from '../../interfaces';
import { ProyectService } from '../../services/proyect.service';
import { UploadFileService } from '@shared/services/upload-file.service';
import { ActivatedRoute, Router } from '@angular/router';
import { AlertService } from '@shared/services/alert.service';
import { Subscription } from 'rxjs';
import { Store } from '@ngrx/store';
import { AppState } from '../../../../app.config';
import { WebUrlPermissionMethods } from '../../../../auth/interfaces';
import { apiProyect } from '@shared/helpers/web-apis.helper';

@Component({
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    FlatpickrDirective,
    InputErrorsDirective,
    PolygonMapHandlerComponent
  ],
  templateUrl: './proyect-form.component.html',
  styleUrl: './proyect-form.component.css'
})
export default class ProyectFormComponent implements OnInit, OnDestroy {

  private _authrx$?: Subscription;
  private _store = inject<Store<AppState>>( Store<AppState> );
  private _webUrlPermissionMethods: WebUrlPermissionMethods[] = [];

  private _router = inject( Router );
  private _alertService = inject( AlertService );
  private _activatedRoute = inject( ActivatedRoute );
  private _proyectService = inject( ProyectService );
  private _uploadService = inject( UploadFileService );

  maxBirthDate: Date = new Date();

  private _formBuilder = inject( UntypedFormBuilder );

  public proyectForm = this._formBuilder.group({
    id:                 [ '', [] ],
    name:               [ '', [ Validators.required, Validators.pattern( fullTextPatt ) ] ],
    description:        [ '', [ Validators.required, Validators.pattern( fullTextPatt ) ] ],
    adquisitionDate:    [ null, [ Validators.required ] ],
    centerCoords:       [ [], [] ],
    polygonCoords:      [ [], [ Validators.required, Validators.min(4) ] ],

    pitchMap:           [ 0, [] ],
    bearingMap:         [ 0, [] ],
    zoomMap:            [ 0, [] ],
  });

  public fileUrl = signal<string>( environments.defaultImgUrl );
  private _file?: File;
  private _isSaving = signal<boolean>( false );
  private _polygonCoords = signal<Coordinate[]>([]);
  private _mapProps = signal< MapProps | undefined>( undefined );
  public polygonCoords = computed( () => this._polygonCoords() );
  public mapProps = computed( () => this._mapProps() );

  proyectTitleForm = 'Crear nuevo proyecto';

  get isFormInvalid() { return this.proyectForm.invalid; }
  get proyectBody(): ProyectBody { return  this.proyectForm.value as ProyectBody; }

  inputErrors( field: string ) {
    return this.proyectForm.get(field)?.errors ?? null;
  }

  get formErrors() { return this.proyectForm.errors; }

  isTouched( field: string ) {
    return this.proyectForm.get(field)?.touched ?? false;
  }

  ngOnInit(): void {

    this.onListenAuthRx();

    const proyectId = this._activatedRoute.snapshot.params['proyectId'];
    if( ISUUID( proyectId ) ) {
      this._onLoadToUpdate( proyectId );
    }

  }

  onListenAuthRx() {
    this._authrx$ = this._store.select('auth')
    .subscribe( (state) => {
      const { webUrlPermissionMethods } = state;

      this._webUrlPermissionMethods = webUrlPermissionMethods;
    });
  }

  private _onLoadToUpdate( proyectId: string ) {

    this._alertService.showLoading();

    this._proyectService.getProyectById( proyectId )
    .subscribe( ( proyect ) => {

      const { polygonCoords, centerCoords, pitchMap, bearingMap, zoomMap, flatImage, ...body } = proyect;

      this._mapProps.set( { centerCoords, pitch: pitchMap, bearing: bearingMap, zoom: zoomMap } );
      this._polygonCoords.set( polygonCoords );

      this.proyectForm.reset({
        ...body,
        centerCoords,
        pitchMap,
        bearingMap,
        zoomMap
      });

      if( flatImage ) {
        this.fileUrl.set( flatImage.urlImg );
      }

      this.proyectTitleForm = 'Actualizar proyecto';

      this._alertService.close();

    });

  }

  onCurrentPolygonCoords( coords: number[][] ) {

    const polygonCoords = coords.reduce( (acc: any[], coord) => {

      acc.push({
        lng: coord[0],
        lat: coord[1],
        id: null
      });

      return acc;
    }, [])

    this.proyectForm.get('polygonCoords')?.setValue( polygonCoords );
  }

  onCurrentMapProps( papProps: MapProps ) {

    const { centerCoords, pitch, bearing, zoom } = papProps;

    this.proyectForm.get('centerCoords')?.setValue( centerCoords );
    this.proyectForm.get('pitchMap')?.setValue( pitch );
    this.proyectForm.get('bearingMap')?.setValue( bearing );
    this.proyectForm.get('zoomMap')?.setValue( zoom );

  }

  onChangeFile( event?: any ) {

    if( !event ) return;

    const nombre = event.files.item(0).name.toUpperCase();
    const size = event.files.item(0).size;
    const extension = nombre.split('.').pop();

    this._file = event.files.item(0);

    if ( !onValidImg(extension, size) ) {
      event.target.value = '';
      this._file = undefined;
      return
    }

    const reader = new FileReader();
    reader.onload = (event: any) => {
      this.fileUrl.set( event.target.result );
    };
    reader.readAsDataURL( event.files.item(0) );

  }

  onSubmit() {

    if( this.isFormInvalid || this._isSaving() ) {
      this.proyectForm.markAllAsTouched();
      return;
    }

    this._alertService.showLoading();

    const { id = 'xD', ...body } = this.proyectBody;

    if( !id && !ISUUID( id ) ) {

      const allowCreate = this._webUrlPermissionMethods.some(
        (permission) => permission.webApi == apiProyect && permission.methods.includes( 'POST' )
      );

      if( !allowCreate ) {
        this._alertService.showAlert( undefined, 'No tiene permiso para crear un proyecto inmobiliario', 'warning');
        return;
      }

      this._isSaving.set( true );

      this._proyectService.createProyect( body )
      .subscribe( async (proyectCreated) => {

        if( this._file ) {
          await this._uploadService.uploadFile( this._file, proyectCreated.id, 'flat-proyects' );
        }

        this._isSaving.set( false );
        this._alertService.showAlert('Proyecto creado exitosamente', undefined, 'success');

        this._router.navigateByUrl('/dashboard/proyects');

      } );

      return;

    }

    const allowUpdate = this._webUrlPermissionMethods.some(
      (permission) => permission.webApi == apiProyect && permission.methods.includes( 'PATCH' )
    );

    if( !allowUpdate ) {
      this._alertService.showAlert( undefined, 'No tiene permiso para actualizar un proyecto inmobiliario', 'warning');
      return;
    }

    this._isSaving.set( true );

    this._proyectService.updateProyect( id, body )
    .subscribe( async (proyectUpdated) => {

      if( this._file ) {
        await this._uploadService.uploadFile( this._file, proyectUpdated.id, 'flat-proyects' );
      }

      this._isSaving.set( false );
      this._alertService.showAlert('Proyecto actualizado exitosamente', undefined, 'success');
      this._router.navigateByUrl('/dashboard/proyects');

    } );
  }

  ngOnDestroy(): void {
    this._authrx$?.unsubscribe();
  }

}
