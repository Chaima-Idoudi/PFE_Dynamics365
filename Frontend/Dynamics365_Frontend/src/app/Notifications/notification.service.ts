import { Injectable, NgZone } from '@angular/core';
import { AuthService } from '../login/services/auth.service';
import { environment } from '../../environments/environment.development';
import { BehaviorSubject } from 'rxjs';

declare var $: any; // Déclaration pour jQuery

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private connection: any;
  private proxy: any;
  private notificationSubject = new BehaviorSubject<string>('');
  public notification$ = this.notificationSubject.asObservable();

  constructor(private authService: AuthService, private ngZone: NgZone) {}

  public startConnection(): void {
    this.connection = $.hubConnection(`${environment.apiUrl}/signalr`, {
      useDefaultPath: false
    });
    
    this.proxy = this.connection.createHubProxy('notificationHub');

    // Définir les méthodes du hub
    this.proxy.on('receiveNotification', (message: string) => {
      this.ngZone.run(() => {
        this.notificationSubject.next(message);
      });
    });

    // Démarrer la connexion
    this.connection.start()
      .done(() => {
        console.log('SignalR Connected');
        this.registerUser();
      })
      .fail((error: any) => {
        console.error('Could not connect to SignalR', error);
        this.scheduleReconnect();
      });

    // Gestion des événements de connexion
    this.connection.disconnected(() => {
      console.log('SignalR Disconnected');
      this.scheduleReconnect();
    });

    this.connection.reconnecting(() => {
      console.log('SignalR Reconnecting');
    });

    this.connection.reconnected(() => {
      console.log('SignalR Reconnected');
      this.registerUser();
    });
  }

  private registerUser(): void {
    const userId = this.authService.getUserId();
    if (userId) {
      this.proxy.invoke('registerUser', userId)
        .done(() => console.log('User registered'))
        .fail((err: any) => console.error('Error registering user', err));
    }
  }

  private scheduleReconnect(): void {
    setTimeout(() => {
      this.startConnection();
    }, 5000);
  }

  public stopConnection(): void {
    if (this.connection) {
      this.connection.stop();
    }
  }
}