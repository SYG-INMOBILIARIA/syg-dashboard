import { CdkStepper, CdkStepperModule } from "@angular/cdk/stepper";
import { CommonModule, NgTemplateOutlet } from "@angular/common";
import { Component, Input, computed, signal } from "@angular/core";

/** Custom CDK stepper component */
@Component({
  selector: 'custom-stepper',
  templateUrl: './custom-stepper.component.html',
  styleUrl: './custom-stepper.component.css',
  providers: [{provide: CdkStepper, useExisting: CustomStepper}],
  standalone: true,
  imports: [
    CommonModule,
    NgTemplateOutlet, CdkStepperModule
  ],
})
export class CustomStepper extends CdkStepper {

  @Input() set disabledHeaderChangeStep( disabled: boolean ) {
    this._disabled.set( disabled );
  }

  private _disabled = signal<boolean>( false );

  public disabled = computed( () => this._disabled() );

  selectStepByIndex(index: number): void {

    if( this.disabled() ) return;

    this.selectedIndex = index;
  }


}
