import { Component, OnInit, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CasesService } from '../cases/cases.service';
import { Case } from '../case-details/Models/case.model';
import Chart from 'chart.js/auto';  // Use this import instead

@Component({
  selector: 'app-subdashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './subdashboard.component.html',
  styleUrl: './subdashboard.component.css'
})
export class SubdashboardComponent implements OnInit, AfterViewInit {
  @ViewChild('typeChart') typeChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('priorityChart') priorityChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('stageChart') stageChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('topClientsChart') topClientsChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('topTechniciansChart') topTechniciansChartRef!: ElementRef<HTMLCanvasElement>;
  
  cases: Case[] = [];
  isLoading = true;
  error: string | null = null;
  
  // Dashboard metrics
  caseStats = [
    { 
      title: 'Total Cases', 
      value: '0', 
      icon: 'fas fa-ticket-alt',
      trend: '0% change',
      trendIcon: 'fas fa-minus',
      trendColor: 'text-gray-400'
    },
    { 
      title: 'Open Cases', 
      value: '0', 
      icon: 'fas fa-folder-open',
      trend: '0% change',
      trendIcon: 'fas fa-minus',
      trendColor: 'text-gray-400'
    },
    { 
      title: 'High Priority', 
      value: '0', 
      icon: 'fas fa-exclamation-circle',
      trend: '0% change',
      trendIcon: 'fas fa-minus',
      trendColor: 'text-gray-400'
    },
    { 
      title: 'Resolved Cases', 
      value: '0', 
      icon: 'fas fa-check-circle',
      trend: '0% change',
      trendIcon: 'fas fa-minus',
      trendColor: 'text-gray-400'
    }
  ];
  
  recentCases: Case[] = [];
  casesByType: {type: string, count: number}[] = [];
  casesByPriority: {priority: string, count: number}[] = [];
  casesByStatus: {status: string, count: number}[] = [];
  casesByStage: {stage: string, count: number}[] = [];
  topClients: { name: string, count: number }[] = [];
  topTechnicians: { name: string, count: number }[] = [];
  
  constructor(private casesService: CasesService) {}

  ngOnInit(): void {
    this.loadCases();
  }
  
  ngAfterViewInit(): void {
    // We'll initialize charts after data is loaded
  }

  loadCases(): void {
    this.isLoading = true;
    this.casesService.getCases().subscribe({
      next: (data) => {
        this.cases = data;
        this.isLoading = false;
        this.updateDashboard();
        
        // Initialize charts after a short delay to ensure DOM is ready
        setTimeout(() => {
          this.initCharts();
        }, 100);
      },
      error: (err) => {
        this.error = 'Failed to load cases: ' + err.message;
        this.isLoading = false;
      }
    });
  }

  updateDashboard(): void {
    // Update stats
    this.caseStats[0].value = this.cases.length.toString();
    
    const openCases = this.cases.filter(c => 
      c.Status === 'Active' || c.Status === 'In Progress' || c.Status === 'On Hold');
    this.caseStats[1].value = openCases.length.toString();
    
    const highPriorityCases = this.cases.filter(c => c.Priority === 'High');
    this.caseStats[2].value = highPriorityCases.length.toString();
    
    const resolvedCases = this.cases.filter(c => c.Status === 'Resolved' || c.Status === 'Closed');
    this.caseStats[3].value = resolvedCases.length.toString();
    
    // Get recent cases (last 5)
    this.recentCases = [...this.cases]
      .sort((a, b) => new Date(b.CreatedOn || 0).getTime() - new Date(a.CreatedOn || 0).getTime())
      .slice(0, 5);
    
    // Calculate cases by type
    const typeMap = new Map<string, number>();
    this.cases.forEach(c => {
      const type = c.CaseType || 'Unknown';
      typeMap.set(type, (typeMap.get(type) || 0) + 1);
    });
    this.casesByType = Array.from(typeMap.entries()).map(([type, count]) => ({ type, count }));
    
    // Calculate cases by priority
    const priorityMap = new Map<string, number>();
    this.cases.forEach(c => {
      const priority = c.Priority || 'Unknown';
      priorityMap.set(priority, (priorityMap.get(priority) || 0) + 1);
    });
    this.casesByPriority = Array.from(priorityMap.entries()).map(([priority, count]) => ({ priority, count }));

     // Calculate cases by status
    const statusMap = new Map<string, number>();
    this.cases.forEach(c => {
      const status = c.Status || 'Unknown';
      statusMap.set(status, (statusMap.get(status) || 0) + 1);
    });
    this.casesByStatus = Array.from(statusMap.entries()).map(([status, count]) => ({ status, count }));
    // Calculate cases by Stage
      const stageMap = new Map<string, number>();
      this.cases.forEach(c => {
        const stage = c.Stage || 'Unknown';
        stageMap.set(stage, (stageMap.get(stage) || 0) + 1);
      });
      this.casesByStage = Array.from(stageMap.entries()).map(([stage, count]) => ({ stage, count }));
       // Comptage des cas par client
      const clientMap = new Map<string, number>();
      this.cases.forEach(c => {
        const name = c.Customer?.Name || 'Inconnu';
        clientMap.set(name, (clientMap.get(name) || 0) + 1);
      });

      // Trie et prend les 5 premiers
      this.topClients = Array.from(clientMap.entries())
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      // Comptage des cas par technicien (Owner)
  const technicianMap = new Map<string, number>();
  this.cases.forEach(c => {
    const name = c.Owner || 'Inconnu';
    technicianMap.set(name, (technicianMap.get(name) || 0) + 1);
  });

  // Trie et prend les 5 premiers
  this.topTechnicians = Array.from(technicianMap.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
  }
  
  initCharts(): void {
    console.log('Initializing charts...');
    this.initTypeChart();
    this.initPriorityChart(); 
    this.initStageChart(); 
    this.initTopClientsChart();
    this.initTopTechniciansChart(); 
  }
  
  initTypeChart(): void {
    if (!this.typeChartRef) {
      console.error('Type chart reference not found');
      return;
    }
    
    console.log('Type chart element:', this.typeChartRef.nativeElement);
    
    const ctx = this.typeChartRef.nativeElement.getContext('2d');
    if (!ctx) {
      console.error('Could not get 2D context for type chart');
      return;
    }
    
    const labels = this.casesByType.map(item => item.type);
    const data = this.casesByType.map(item => item.count);
    
    console.log('Type chart data:', { labels, data });
    
    try {
      new Chart(ctx, {
        type: 'pie',
        data: {
          labels: labels,
          datasets: [{
            data: data,
            backgroundColor: [
              '#0078D4', '#50E6FF', '#00B7C3', '#005B70', '#004E8C', 
              '#8764B8', '#5C2E91', '#0099BC'
            ],
            borderWidth: 1
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false
        }
      });
      console.log('Type chart created successfully');
    } catch (error) {
      console.error('Error creating type chart:', error);
    }
  }
  
  initPriorityChart(): void {
    if (!this.priorityChartRef) {
      console.error('Priority chart reference not found');
      return;
    }
    
    console.log('Priority chart element:', this.priorityChartRef.nativeElement);
    
    const ctx = this.priorityChartRef.nativeElement.getContext('2d');
    if (!ctx) {
      console.error('Could not get 2D context for priority chart');
      return;
    }
    
    const labels = this.casesByPriority.map(item => item.priority);
    const data = this.casesByPriority.map(item => item.count);
    
    console.log('Priority chart data:', { labels, data });
    
    try {
      new Chart(ctx, {
        type: 'bar',
        data: {
          labels: labels,
          datasets: [{
            label: 'Cases by Priority',
            data: data,
            backgroundColor: [
              'rgba(209, 52, 56, 0.7)',
              'rgba(0, 120, 212, 0.7)',
              'rgba(16, 124, 16, 0.7)',
              'rgba(96, 94, 92, 0.7)'
            ],
            borderWidth: 1
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: {
              beginAtZero: true
            }
          }
        }
      });
      console.log('Priority chart created successfully');
    } catch (error) {
      console.error('Error creating priority chart:', error);
    }
  }

  // Other methods remain the same...
  getStatusClass(status: string | null | undefined): string {
    if (!status) return 'bg-gray-500/20 text-gray-500';
    
    const statusClasses: Record<string, string> = {
      'Active': 'bg-blue-500/20 text-blue-500',
      'In Progress': 'bg-yellow-500/20 text-yellow-500',
      'On Hold': 'bg-orange-500/20 text-orange-500',
      'Resolved': 'bg-green-500/20 text-green-500',
      'Closed': 'bg-gray-500/20 text-gray-500',
      'Canceled': 'bg-red-500/20 text-red-500'
    };
    return statusClasses[status] || 'bg-gray-500/20 text-gray-500';
  }

  getPriorityClass(priority: string | null | undefined): string {
    if (!priority) return 'bg-gray-500/20 text-gray-500';
    
    const priorityClasses: Record<string, string> = {
      'High': 'bg-red-500/20 text-red-500',
      'Normal': 'bg-blue-500/20 text-blue-500',
      'Low': 'bg-green-500/20 text-green-500'
    };
    return priorityClasses[priority] || 'bg-gray-500/20 text-gray-500';
  }

  getPriorityBarClass(priority: string | null | undefined): string {
    if (!priority) return 'bg-gray-400';
    
    const priorityClasses: Record<string, string> = {
      'High': 'bg-red-500',
      'Normal': 'bg-blue-500',
      'Low': 'bg-green-500'
    };
    return priorityClasses[priority] || 'bg-gray-400';
  }

  getPriorityBadgeClass(priority: string | null | undefined): string {
    if (!priority) return 'bg-gray-100 text-gray-800';
    
    const priorityClasses: Record<string, string> = {
      'High': 'bg-red-100 text-red-800',
      'Normal': 'bg-blue-100 text-blue-800',
      'Low': 'bg-green-100 text-green-800'
    };
    return priorityClasses[priority] || 'bg-gray-100 text-gray-800';
  }

  getStatusBadgeClass(status: string | null | undefined): string {
    if (!status) return 'bg-gray-100 text-gray-800';
    
    const statusClasses: Record<string, string> = {
      'Active': 'bg-blue-100 text-blue-800',
      'In Progress': 'bg-yellow-100 text-yellow-800',
      'On Hold': 'bg-orange-100 text-orange-800',
      'Resolved': 'bg-green-100 text-green-800',
      'Closed': 'bg-gray-100 text-gray-800',
      'Canceled': 'bg-red-100 text-red-800'
    };
    return statusClasses[status] || 'bg-gray-100 text-gray-800';
  }

  

initStageChart(): void {
  if (!this.stageChartRef) {
    console.error('Stage chart reference not found');
    return;
  }
  
  console.log('Stage chart element:', this.stageChartRef.nativeElement);
  
  const ctx = this.stageChartRef.nativeElement.getContext('2d');
  if (!ctx) {
    console.error('Could not get 2D context for stage chart');
    return;
  }
  
  const labels = this.casesByStage.map(item => item.stage);
  const data = this.casesByStage.map(item => item.count);
  
  console.log('Stage chart data:', { labels, data });
  
  // Fonction pour obtenir la couleur en fonction du stage
  const getColorForStage = (stage: string) => {
  if (!stage) return 'rgba(156, 163, 175, 0.7)'; // Gris par défaut
  
  switch(stage.toLowerCase()) {
    case 'proposed': 
      return 'rgba(59, 130, 246, 1)'; // Bleu - correspondant à bg-blue-100
    case 'active': 
      return 'rgba(251, 191, 36, 1)'; // Jaune - correspondant à bg-yellow-100
    case 'resolved': 
      return 'rgba(168, 85, 247, 1)'; // Violet - correspondant à bg-purple-100
    case 'cancelled': 
      return 'rgba(99, 102, 241, 1)'; // Indigo - correspondant à bg-indigo-100
    default: 
      return 'rgba(156, 163, 175, 1)'; // Gris - correspondant à bg-gray-100
  }
};
  
  try {
    new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: labels,
        datasets: [{
          data: data,
          backgroundColor: labels.map(label => getColorForStage(label)),
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'right'
          },
          tooltip: {
            callbacks: {
              title: function(tooltipItems) {
                return tooltipItems[0].label;
              },
              label: function(context) {
                const label = context.label || '';
                // Conversion explicite en nombre pour éviter l'erreur de type
                const value = Number(context.raw) || 0;
                // Calculer le total en convertissant explicitement chaque valeur en nombre
                const total = context.dataset.data.reduce((acc: number, val: any) => acc + (Number(val) || 0), 0);
                const percentage = Math.round((value / total) * 100);
                return `${label}: ${value} (${percentage}%)`;
              }
            }
          }
        }
      }
    });
    console.log('Stage chart created successfully');
  } catch (error) {
    console.error('Error creating stage chart:', error);
  }
}

initTopClientsChart(): void {
  if (!this.topClientsChartRef) return;
  const ctx = this.topClientsChartRef.nativeElement.getContext('2d');
  if (!ctx) return;

  const labels = this.topClients.map(item => item.name);
  const data = this.topClients.map(item => item.count);

  new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Nombre de cas',
        data: data,
        backgroundColor: [
          '#0078D4', '#50E6FF', '#00B7C3', '#005B70', '#8764B8'
        ],
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      indexAxis: 'y', // Barres horizontales
      scales: {
        x: { beginAtZero: true }
      }
    }
  });
}

initTopTechniciansChart(): void {
  if (!this.topTechniciansChartRef) return;
  const ctx = this.topTechniciansChartRef.nativeElement.getContext('2d');
  if (!ctx) return;

  const labels = this.topTechnicians.map(item => item.name);
  const data = this.topTechnicians.map(item => item.count);

  new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Nombre de tickets',
        data: data,
        backgroundColor: [
          '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF'
        ],
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      indexAxis: 'y', // Barres horizontales
      scales: {
        x: { beginAtZero: true }
      }
    }
  });
}
}