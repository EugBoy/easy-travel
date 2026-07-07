import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'routes' },
  {
    path: 'routes',
    loadComponent: () => import('./features/route-list/route-list.component').then((m) => m.RouteListComponent),
  },
  {
    path: 'routes/new',
    loadComponent: () => import('./features/route-form/route-form.component').then((m) => m.RouteFormComponent),
  },
  {
    path: 'routes/:routeId/segments/:segmentIndex',
    loadComponent: () =>
      import('./features/segment-view/segment-view.component').then((m) => m.SegmentViewComponent),
  },
  {
    path: 'routes/:routeId/plan',
    loadComponent: () => import('./features/plan-view/plan-view.component').then((m) => m.PlanViewComponent),
  },
  { path: '**', redirectTo: 'routes' },
];
