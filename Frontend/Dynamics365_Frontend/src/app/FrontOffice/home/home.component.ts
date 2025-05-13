import { Component } from '@angular/core';
import { HeaderComponent } from '../Components/header/header.component';
import { SidebarComponent } from "../sidebar/sidebar.component";
import { RouterOutlet } from '@angular/router'

@Component({
  selector: 'app-home',
  imports: [HeaderComponent, SidebarComponent,RouterOutlet],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})
export class HomeComponent {
  
}
