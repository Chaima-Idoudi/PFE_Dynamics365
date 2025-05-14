import { Component } from '@angular/core';import { KanbanModule } from '@syncfusion/ej2-angular-kanban';

import { RouterLinkActive, RouterOutlet ,RouterLink} from '@angular/router';

@Component({
  selector: 'app-root',
  imports: [KanbanModule, RouterOutlet],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  title = 'Dynamics365_Frontend';
  
}
