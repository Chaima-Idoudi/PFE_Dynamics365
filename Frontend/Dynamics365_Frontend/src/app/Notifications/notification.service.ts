import { Injectable, NgZone } from '@angular/core';
import { AuthService } from '../login/services/auth.service';
import { environment } from '../../environments/environment';
import { BehaviorSubject } from 'rxjs';
import { HttpClient } from '@angular/common/http';


declare var $: any;

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private connection: any;
  private proxy: any;
  private notificationSubject = new BehaviorSubject<string>('');
  public notification$ = this.notificationSubject.asObservable();
  
  // Nouveau: Sujet pour les notifications stockées
  private storedNotificationsSubject = new BehaviorSubject<any[]>([]);
  public storedNotifications$ = this.storedNotificationsSubject.asObservable();

  constructor(
    private authService: AuthService, 
    private ngZone: NgZone,
    private http: HttpClient // Ajouté pour les requêtes HTTP
  ) {}

  // Fonction existante conservée
  public startConnection(): void {
    this.connection = $.hubConnection(`${environment.apiUrl}/signalr`, {
      useDefaultPath: false
    });
    
    this.proxy = this.connection.createHubProxy('notificationHub');

    this.proxy.on('receiveNotification', (message: string) => {
      this.ngZone.run(() => {
        this.notificationSubject.next(message);
      });
    });

    this.connection.start()
      .done(() => {
        console.log('SignalR Connected');
        this.registerUser();
      })
      .fail((error: any) => {
        console.error('Could not connect to SignalR', error);
        this.scheduleReconnect();
      });

    this.connection.disconnected(() => {
      console.log('SignalR Disconnected');
      this.scheduleReconnect();
    });
  }

  // Fonction existante conservée
  private registerUser(): void {
    const userId = this.authService.getUserId();
    if (userId) {
      this.proxy.invoke('registerUser', userId)
        .done(() => console.log('User registered'))
        .fail((err: any) => console.error('Error registering user', err));
    }
  }

  // Fonction existante conservée
  private scheduleReconnect(): void {
    setTimeout(() => {
      this.startConnection();
    }, 5000);
  }

  // Fonction existante conservée
  public stopConnection(): void {
    if (this.connection) {
      this.connection.stop();
    }
  }

  // NOUVEAU: Charger les notifications stockées
  public loadStoredNotifications(): void {
  const userId = this.authService.getUserId();
  if (userId) {
    this.http.get<any[]>(`${environment.apiUrl}/api/dynamics/notifications/${userId}`)
      .subscribe({
        next: (notifications) => {
          console.log('Notifications reçues:', notifications); // Ajoutez ce log
          this.storedNotificationsSubject.next(notifications);
        },
        error: (err) => console.error('Error loading stored notifications', err)
      });
  }
}

  // NOUVEAU: Marquer une notification comme lue
  public markNotificationAsRead(notificationId: string): void {
    this.http.patch(`${environment.apiUrl}/api/dynamics/notifications/${notificationId}/read`, {})
      .subscribe({
        error: (err) => console.error('Error marking notification as read', err)
      });
  }
}