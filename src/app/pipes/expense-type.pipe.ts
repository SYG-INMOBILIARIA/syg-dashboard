import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'expenseType',
  standalone: true
})

export class ExpenseTypePipe implements PipeTransform {
  transform(value: any, ...args: any[]): string {

    let expenseTypeName = 'Otros';

    switch (value) {
      case 'SUPPLIES':
        expenseTypeName = 'Compra se insumos';
        break;
        case 'SERVICES':
          expenseTypeName = 'Pago de servicios';
          break;
          case 'TRAVEL_EXPENSES':
            expenseTypeName = 'Viáticos';
            break;
            case 'OTHER':
              expenseTypeName = 'Otros';
              break;

      default:
        break;
    }

    return expenseTypeName;

  }
}
