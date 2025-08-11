import { Component, HostListener, AfterViewInit } from '@angular/core';
import { Chart, registerables } from 'chart.js/auto';
import { NgPipesModule } from 'ngx-pipes';
import { HeaderComponent } from "../Components/header/header.component";
import { SidebarComponent } from '../Components/sidebar/sidebar.component';
import { RouterOutlet, RouterLink } from '@angular/router';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [NgPipesModule, HeaderComponent,SidebarComponent,RouterOutlet, RouterLink],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements AfterViewInit {
  
 

  constructor() {
    Chart.register(...registerables);
    
  }

  ngAfterViewInit() {
    this.renderCharts();
  }

  private renderCharts() {
    this.renderMainChart();
    this.renderPieChart();
  }

  private renderMainChart() {
    const ctx = document.getElementById('mainChart') as HTMLCanvasElement;
    new Chart(ctx, {
      type: 'line',
      data: {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
        datasets: [{
          label: 'Revenue',
          data: [12000, 19000, 3000, 5000, 2000, 3000],
          borderColor: '#2a5a9a',
          backgroundColor: 'rgba(42, 90, 154, 0.1)',
          tension: 0.4,
          fill: true
        }]
      },
      options: this.getChartOptions()
    });
  }

  private renderPieChart() {
    const ctx = document.getElementById('pieChart') as HTMLCanvasElement;
    new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Direct', 'Referral', 'Social', 'Organic'],
        datasets: [{
          data: [55, 25, 15, 5],
          backgroundColor: [
            '#2a5a9a',
            '#17a2b8',
            '#28a745',
            '#ffc107'
          ]
        }]
      },
      options: {
        ...this.getChartOptions(),
        cutout: '70%'
      }
    });
  }

  private getChartOptions() {
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: {
            color: '#ffffff'
          }
        }
      },
      scales: {
        x: {
          grid: {
            color: 'rgba(255, 255, 255, 0.1)'
          },
          ticks: {
            color: '#cccccc'
          }
        },
        y: {
          grid: {
            color: 'rgba(255, 255, 255, 0.1)'
          },
          ticks: {
            color: '#cccccc'
          }
        }
      }
    };
  }

  
}