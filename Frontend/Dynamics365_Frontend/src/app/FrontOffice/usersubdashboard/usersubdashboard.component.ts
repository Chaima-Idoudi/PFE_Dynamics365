import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { UserCases } from '../user-cases/user-cases.service';
import { Case } from '../../BackOffice/case-details/Models/case.model';
import { Subscription, interval } from 'rxjs';
import { NotificationService } from '../../Notifications/notification.service';
import Chart from 'chart.js/auto';  // Use this import instead

@Component({
  selector: 'app-usersubdashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './usersubdashboard.component.html',
  styleUrls: ['./usersubdashboard.component.css']
})
export class UsersubdashboardComponent implements OnInit, OnDestroy, AfterViewInit {
  cases: Case[] = [];
  isLoading = true;
  lastUpdated: Date = new Date();
  
  // Dashboard metrics
  totalCases = 0;
  activeCases = 0;
  resolvedCases = 0;
  proposedCases = 0;
  cancelledCases = 0;
  
  // Priority metrics for pie chart
  highPriorityCases = 0;
  mediumPriorityCases = 0;
  lowPriorityCases = 0;
  
  // Chart reference
  priorityChart: Chart | null = null;
  @ViewChild('priorityChartCanvas') priorityChartCanvas!: ElementRef<HTMLCanvasElement>;
  
  // Chart colors
  chartColors = {
    high: '#d13438',
    medium: '#ffb900',
    low: '#107c10',
    background: [
      'rgba(209, 52, 56, 0.7)',
      'rgba(255, 185, 0, 0.7)',
      'rgba(16, 124, 16, 0.7)'
    ],
    hoverBackground: [
      'rgba(209, 52, 56, 0.9)',
      'rgba(255, 185, 0, 0.9)',
      'rgba(16, 124, 16, 0.9)'
    ]
  };
  
  // For auto-refresh
  private refreshSubscription?: Subscription;
  private casesSubscription?: Subscription;
  private notificationSubscription?: Subscription;
  
  constructor(
    private userCasesService: UserCases,
    private notificationService: NotificationService,
    private router: Router
  ) {}
  
  ngOnInit(): void {
    // Start SignalR connection
    this.notificationService.startConnection();
    
    // Initial load
    this.loadCases();
    
    // Subscribe to case updates from service
    this.casesSubscription = this.userCasesService.cases$.subscribe(cases => {
      if (cases && cases.length > 0) {
        this.cases = cases;
        this.calculateMetrics();
        this.isLoading = false;
        this.lastUpdated = new Date();
        
        // Update chart after data changes
        setTimeout(() => {
          this.updatePriorityChart();
        }, 100);
      }
    });
    
    // Auto-refresh every 5 minutes
    this.refreshSubscription = interval(300000).subscribe(() => {
      this.loadCases();
    });
    
    // Listen for notifications
    this.notificationSubscription = this.notificationService.notification$.subscribe(message => {
      if (message) {
        // Refresh data when notification is received
        this.loadCases();
      }
    });
  }
  
  ngAfterViewInit(): void {
    // Initialize charts after view is initialized
    setTimeout(() => {
      this.createPriorityChart();
    }, 100);
  }
  
  ngOnDestroy(): void {
    // Clean up subscriptions
    if (this.refreshSubscription) {
      this.refreshSubscription.unsubscribe();
    }
    if (this.casesSubscription) {
      this.casesSubscription.unsubscribe();
    }
    if (this.notificationSubscription) {
      this.notificationSubscription.unsubscribe();
    }
    
    // Destroy chart
    if (this.priorityChart) {
      this.priorityChart.destroy();
    }
  }
  
  loadCases(): void {
    this.isLoading = true;
    this.userCasesService.getMyCases().subscribe({
      next: (cases) => {
        this.cases = cases;
        this.calculateMetrics();
        this.isLoading = false;
        this.lastUpdated = new Date();
        
        // Update chart after a small delay to ensure the DOM is ready
        setTimeout(() => {
          this.updatePriorityChart();
        }, 100);
      },
      error: (error) => {
        console.error('Error loading cases:', error);
        this.isLoading = false;
      }
    });
  }
  
  calculateMetrics(): void {
    this.totalCases = this.cases.length;
    this.activeCases = this.cases.filter(c => c.Stage?.toLowerCase() === 'active').length;
    this.resolvedCases = this.cases.filter(c => c.Stage?.toLowerCase() === 'resolved').length;
    this.proposedCases = this.cases.filter(c => c.Stage?.toLowerCase() === 'proposed').length;
    this.cancelledCases = this.cases.filter(c => c.Stage?.toLowerCase() === 'cancelled').length;
    
    // Calculate priority metrics
    this.highPriorityCases = this.cases.filter(c => c.Priority?.toLowerCase() === 'high').length;
    this.mediumPriorityCases = this.cases.filter(c => c.Priority?.toLowerCase() === 'medium').length;
    this.lowPriorityCases = this.cases.filter(c => c.Priority?.toLowerCase() === 'low').length;
  }
  
  createPriorityChart(): void {
    if (!this.priorityChartCanvas) return;
    
    const ctx = this.priorityChartCanvas.nativeElement.getContext('2d');
    if (!ctx) return;
    
    this.priorityChart = new Chart(ctx, {
      type: 'pie',
      data: {
        labels: ['High', 'Medium', 'Low'],
        datasets: [{
          data: [this.highPriorityCases, this.mediumPriorityCases, this.lowPriorityCases],
          backgroundColor: this.chartColors.background,
          hoverBackgroundColor: this.chartColors.hoverBackground,
          borderWidth: 1,
          borderColor: '#fff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'right',
            labels: {
              boxWidth: 12,
              padding: 15,
              font: {
                family: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
                size: 12
              }
            }
          },
          tooltip: {
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
            titleColor: '#323130',
            bodyColor: '#323130',
            borderColor: '#edebe9',
            borderWidth: 1,
            padding: 10,
            callbacks: {
              label: function(context) {
                const label = context.label || '';
                const value = context.raw as number;
                const total = (context.dataset.data as number[]).reduce((acc, data) => acc + data, 0);
                const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
                return `${label}: ${value} (${percentage}%)`;
              }
            }
          }
        }
      }
    });
  }
  
  updatePriorityChart(): void {
    if (!this.priorityChart) {
      if (this.priorityChartCanvas) {
        this.createPriorityChart();
      }
      return;
    }
    
    // Update chart data
    this.priorityChart.data.datasets[0].data = [
      this.highPriorityCases,
      this.mediumPriorityCases,
      this.lowPriorityCases
    ];
    
    this.priorityChart.update();
  }
  
  viewCaseDetails(caseItem: Case): void {
    this.userCasesService.setSelectedCase(caseItem);
    this.router.navigate(['/user-cases']);
  }
  
  getStatusPercentage(status: string): number {
    if (this.totalCases === 0) return 0;
    
    switch (status.toLowerCase()) {
      case 'proposed': return (this.proposedCases / this.totalCases) * 100;
      case 'active': return (this.activeCases / this.totalCases) * 100;
      case 'resolved': return (this.resolvedCases / this.totalCases) * 100;
      case 'cancelled': return (this.cancelledCases / this.totalCases) * 100;
      default: return 0;
    }
  }
}