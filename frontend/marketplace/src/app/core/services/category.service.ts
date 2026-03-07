import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, map, shareReplay } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Category } from '../models/category.model';
import { TreeNode } from 'primeng/api';

@Injectable({ providedIn: 'root' })
export class CategoryService {
  private readonly apiUrl = `${environment.apiUrl}/api/categories`;
  private cache$?: Observable<Category[]>;

  constructor(private http: HttpClient) {}

  getAll(): Observable<Category[]> {
    if (!this.cache$) {
      this.cache$ = this.http.get<Category[]>(this.apiUrl).pipe(shareReplay(1));
    }
    return this.cache$;
  }

  getCategoryMap(): Observable<Map<number, string>> {
    return this.getAll().pipe(
      map(categories => {
        const result = new Map<number, string>();
        this.flatten(categories, result);
        return result;
      })
    );
  }

  getTreeNodes(): Observable<TreeNode[]> {
    return this.getAll().pipe(
      map(categories => this.toTreeNodes(categories))
    );
  }

  private flatten(categories: Category[], result: Map<number, string>): void {
    for (const cat of categories) {
      result.set(cat.id, cat.name);
      if (cat.children?.length) {
        this.flatten(cat.children, result);
      }
    }
  }

  private toTreeNodes(categories: Category[]): TreeNode[] {
    return categories.map(cat => ({
      key: String(cat.id),
      label: cat.name,
      data: cat.id,
      selectable: !cat.children?.length,
      children: cat.children?.length ? this.toTreeNodes(cat.children) : undefined
    }));
  }
}
