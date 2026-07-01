import { Component, EventEmitter, Output, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

import { PaginationComponent } from '@shared/components/pagination/pagination.component';
import { SpinnerComponent } from '@shared/components/spinner/spinner.component';
import { PipesModule } from '@pipes/pipes.module';
import { CobranzaService } from '@modules/admin/services/cobranza.service';
import { PortfolioContract, PortfolioStatus, PortfolioSummary } from '@modules/admin/pages/paid-quotes/interfaces';

@Component({
  selector: 'app-collections-portfolio',
  standalone: true,
  imports: [CommonModule, PaginationComponent, SpinnerComponent, PipesModule],
  templateUrl: './collections-portfolio.component.html',
})
export class CollectionsPortfolioComponent {

  private _cobranzaService = inject(CobranzaService);

  @Output() contractSelected = new EventEmitter<{ id: string; code: string; name: string }>();

  private _status = signal<PortfolioStatus>('overdue');
  private _contracts = signal<PortfolioContract[]>([]);
  private _summary = signal<PortfolioSummary>({});
  private _total = signal<number>(0);
  private _isLoading = signal<boolean>(true);
  private _page = 1;

  public status = computed(() => this._status());
  public contracts = computed(() => this._contracts());
  public summary = computed(() => this._summary());
  public total = computed(() => this._total());
  public isLoading = computed(() => this._isLoading());

  ngOnInit(): void {
    this.load();
  }

  setStatus(status: PortfolioStatus): void {
    if (this._status() === status) return;
    this._status.set(status);
    this._page = 1;
    this.load();
  }

  load(page = 1): void {
    this._page = page;
    this._isLoading.set(true);
    this._cobranzaService.getPortfolio(this._status(), page).subscribe({
      next: (res) => {
        this._contracts.set(res.contracts);
        this._summary.set(res.summary);
        this._total.set(res.total);
        this._isLoading.set(false);
      },
      error: () => {
        this._contracts.set([]);
        this._total.set(0);
        this._isLoading.set(false);
      },
    });
  }

  onSelect(c: PortfolioContract): void {
    this.contractSelected.emit({
      id: c.id,
      code: c.code,
      name: c.clients?.[0]?.fullname ?? 'Sin cliente',
    });
  }
}
