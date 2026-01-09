import * as XLSX from 'xlsx';
import * as FileSaver from 'file-saver';
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ExcelExportService {

  exportToExcel(data: any[], fileName: string = 'reporte'): void {
    const worksheet: XLSX.WorkSheet = XLSX.utils.json_to_sheet(data);
    const workbook: XLSX.WorkBook = {
      Sheets: { 'data': worksheet },
      SheetNames: ['data']
    };

    const excelBuffer: any = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    this.saveAsExcelFile(excelBuffer, fileName);
  }

  private saveAsExcelFile(buffer: any, fileName: string): void {
    const blob: Blob = new Blob([buffer], {
      type:
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8'
    });
    FileSaver.saveAs(blob, `${fileName}_${new Date().getTime()}.xlsx`);
  }
}
