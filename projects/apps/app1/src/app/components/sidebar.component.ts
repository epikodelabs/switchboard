import { Component, input } from '@angular/core';
import { RouterLink } from '@epikodelabs/switchboard';
import { ParamsInput } from './route-inputs';

@Component({
  standalone: true,
  imports: [RouterLink],
  template: `
    <section class="sidebar-stack">
      <article class="sidebar-card">
        <h3>Quick links</h3>
        <div class="sidebar-links">
          <a [routerLink]="'/'">Dashboard</a>
          <a [routerLink]="{ name: 'account', params: { accountId: 1 } }">Checking</a>
          <a [routerLink]="{ name: 'account', params: { accountId: 2 } }">Savings</a>
          <a [routerLink]="{ name: 'account', params: { accountId: 3 } }">Credit Card</a>
          <a [routerLink]="{ name: 'spending', params: { accountId: 1 } }">Spending</a>
        </div>
      </article>
    </section>
  `,
  styles: `
    .sidebar-stack { display: grid; gap: 0.75rem; }
    .sidebar-card {
      padding: 0.85rem;
      border: 1px solid var(--line-soft);
      border-radius: 0.35rem;
      background: linear-gradient(180deg, rgba(255,255,255,0.9), rgba(245,241,232,0.85));
    }
    .sidebar-card h3 {
      margin: 0 0 0.6rem;
      color: var(--ink-strong);
      font-size: 0.88rem;
      font-weight: 600;
    }
    .sidebar-links { display: grid; gap: 0.4rem; }
    .sidebar-links a {
      display: block;
      padding: 0.6rem 0.7rem;
      border: 1px solid var(--line-soft);
      border-left: 2px solid var(--line-strong);
      border-radius: 0.25rem;
      background: rgba(255,255,255,0.6);
      color: var(--ink-body);
      font-size: 0.84rem;
      font-weight: 500;
      text-decoration: none;
      transition: border-left-color 160ms ease, color 160ms ease;
    }
    .sidebar-links a:hover {
      border-left-color: var(--credit-green);
      color: var(--credit-green);
    }
  `,
})
export class SidebarComponent {
  protected readonly params = input<ParamsInput>({});
}
