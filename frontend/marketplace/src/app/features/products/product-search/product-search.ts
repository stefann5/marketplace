import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DataViewModule } from 'primeng/dataview';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { SelectModule } from 'primeng/select';
import { SelectButtonModule } from 'primeng/selectbutton';
import { SliderModule } from 'primeng/slider';
import { TreeModule } from 'primeng/tree';
import { InputNumberModule } from 'primeng/inputnumber';
import { TreeNode } from 'primeng/api';
import { ProductService } from '../../../core/services/product.service';
import { CategoryService } from '../../../core/services/category.service';
import { Product } from '../../../core/models/product.model';

interface SortOption {
  label: string;
  value: string;
}

@Component({
  selector: 'app-product-search',
  standalone: true,
  imports: [
    CommonModule, FormsModule, DataViewModule, ButtonModule, TagModule,
    SelectModule, SelectButtonModule, SliderModule, TreeModule, InputNumberModule
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './product-search.html'
})
export class ProductSearchComponent implements OnInit {
  products: Product[] = [];
  totalRecords = 0;
  rows = 20;
  page = 0;
  layout: 'list' | 'grid' = 'grid';
  layoutOptions: string[] = ['list', 'grid'];
  categoryMap = new Map<number, string>();

  searchName = '';
  selectedCategoryNode: TreeNode | null = null;
  priceRange: [number, number] = [0, 10000];
  minRating: number | null = null;

  sortOptions: SortOption[] = [
    { label: 'Rating (High to Low)', value: 'rating_desc' },
    { label: 'Rating (Low to High)', value: 'rating_asc' },
    { label: 'Price (Low to High)', value: 'price_asc' },
    { label: 'Price (High to Low)', value: 'price_desc' },
    { label: 'Newest First', value: 'date_desc' },
    { label: 'Oldest First', value: 'date_asc' }
  ];
  selectedSort: SortOption = this.sortOptions[0];

  categoryNodes: TreeNode[] = [];
  ratingOptions = [
    { label: 'Any', value: null },
    { label: '4+ Stars', value: 4 },
    { label: '3+ Stars', value: 3 },
    { label: '2+ Stars', value: 2 },
    { label: '1+ Stars', value: 1 }
  ];

  constructor(
    private productService: ProductService,
    private categoryService: CategoryService,
    private route: ActivatedRoute,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.categoryService.getCategoryMap().subscribe(map => {
      this.categoryMap = map;
      this.cdr.markForCheck();
    });
    this.categoryService.getTreeNodes().subscribe(nodes => {
      this.categoryNodes = this.makeAllSelectable(nodes);
      this.cdr.markForCheck();

      this.route.queryParams.subscribe(params => {
        if (params['name']) this.searchName = params['name'];
        if (params['categoryId']) {
          const catId = Number(params['categoryId']);
          this.selectedCategoryNode = this.findNodeByKey(this.categoryNodes, String(catId));
        }
        this.loadProducts();
      });
    });
  }

  loadProducts(): void {
    const [sortBy, sortDirection] = this.selectedSort.value.split('_');
    this.productService.search({
      name: this.searchName || undefined,
      categoryId: this.selectedCategoryNode?.data ?? undefined,
      minPrice: this.priceRange[0] > 0 ? this.priceRange[0] : undefined,
      maxPrice: this.priceRange[1] < 10000 ? this.priceRange[1] : undefined,
      minRating: this.minRating ?? undefined,
      sortBy,
      sortDirection,
      page: this.page,
      size: this.rows
    }).subscribe(res => {
      this.products = res.content;
      this.totalRecords = res.totalElements;
      this.cdr.markForCheck();
    });
  }

  onPageChange(event: any): void {
    this.page = event.first / this.rows;
    this.loadProducts();
  }

  onSortChange(): void {
    this.page = 0;
    this.loadProducts();
  }

  applyFilters(): void {
    this.page = 0;
    this.loadProducts();
  }

  clearFilters(): void {
    this.selectedCategoryNode = null;
    this.priceRange = [0, 10000];
    this.minRating = null;
    this.page = 0;
    this.loadProducts();
  }

  onCategorySelect(event: any): void {
    this.selectedCategoryNode = event.node;
    this.applyFilters();
  }

  onCategoryUnselect(): void {
    this.selectedCategoryNode = null;
    this.applyFilters();
  }

  viewProduct(id: string): void {
    this.router.navigate(['/products', id]);
  }

  getCategoryName(categoryId: number | null): string {
    if (categoryId === null) return '';
    return this.categoryMap.get(categoryId) ?? '';
  }

  getStockSeverity(stock: number): 'success' | 'warn' | 'danger' {
    if (stock > 10) return 'success';
    if (stock > 0) return 'warn';
    return 'danger';
  }

  getStockLabel(stock: number): string {
    if (stock > 10) return 'In Stock';
    if (stock > 0) return 'Low Stock';
    return 'Out of Stock';
  }

  get resultStart(): number {
    return this.totalRecords === 0 ? 0 : this.page * this.rows + 1;
  }

  get resultEnd(): number {
    return Math.min((this.page + 1) * this.rows, this.totalRecords);
  }

  private findNodeByKey(nodes: TreeNode[], key: string): TreeNode | null {
    for (const node of nodes) {
      if (node.key === key) return node;
      if (node.children) {
        const found = this.findNodeByKey(node.children, key);
        if (found) return found;
      }
    }
    return null;
  }

  private makeAllSelectable(nodes: TreeNode[]): TreeNode[] {
    return nodes.map(node => ({
      ...node,
      selectable: true,
      children: node.children ? this.makeAllSelectable(node.children) : undefined
    }));
  }
}
