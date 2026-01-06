import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { PipesModule } from '@pipes/pipes.module';

@Component({
  selector: 'card-indicator',
  standalone: true,
  imports: [
    CommonModule,
    PipesModule
  ],
  templateUrl: './card-indicator.component.html',
  styles: ``
})
export default class CardIndicatorComponent {

  @Input() title: string = '';
  @Input() value: string = '';
  @Input() changeType: 'increase' | 'decrease' | 'now-datetime' = 'increase';
  @Input() percentDifference: number = 0;
  @Input() icon: string = '';
  @Input() nowDate?: Date;
  @Input() showPercentage: boolean = false;

}
