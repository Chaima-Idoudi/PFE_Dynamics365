import { Injectable, NgZone } from '@angular/core';
import { AuthService } from '../login/services/auth.service';
import { environment } from '../../environments/environment';
import { BehaviorSubject } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { Case } from '../BackOffice/case-details/Models/case.model';

declare var $: any;

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private connection: any;
  private proxy: any;
  private notificationSubject = new BehaviorSubject<string>('');
  public notification$ = this.notificationSubject.asObservable();
  
  // Subject pour les assignations de tickets
  private ticketAssignmentSubject = new BehaviorSubject<Case | null>(null);
  public ticketAssignment$ = this.ticketAssignmentSubject.asObservable();
  
  // Subject pour les désassignations de tickets
  private ticketUnassignmentSubject = new BehaviorSubject<{ticketId: string, ticketTitle: string} | null>(null);
  public ticketUnassignment$ = this.ticketUnassignmentSubject.asObservable();
  
  // Subject pour les notifications stockées
  private storedNotificationsSubject = new BehaviorSubject<any[]>([]);
  public storedNotifications$ = this.storedNotificationsSubject.asObservable();

  constructor(
    private authService: AuthService, 
    private ngZone: NgZone,
    private http: HttpClient
  ) {}

  public startConnection(): void {
    // Éviter de créer plusieurs connexions
    if (this.connection && this.connection.state === $.signalR.connectionState.connected) {
      console.log('SignalR connection already established');
      return;
    }
    
    console.log('Starting SignalR connection...');
    
    this.connection = $.hubConnection(`${environment.apiUrl}/signalr`, {
      useDefaultPath: false
    });
    
    this.proxy = this.connection.createHubProxy('notificationHub');

    // Handler pour les notifications textuelles
    this.proxy.on('receiveNotification', (message: string) => {
      this.ngZone.run(() => {
        console.log('Received notification:', message);
        this.notificationSubject.next(message);
      });
    });
    
    // Handler pour les assignations de tickets
    this.proxy.on('receiveTicketAssignment', (ticketData: Case) => {
      this.ngZone.run(() => {
        console.log('Received ticket assignment:', ticketData);
        this.ticketAssignmentSubject.next(ticketData);
      });
    });

    

    this.connection.start()
      .done(() => {
        console.log('SignalR Connected successfully');
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

  private registerUser(): void {
    const userId = this.authService.getUserId();
    if (userId) {
      console.log('Registering user with ID:', userId);
      this.proxy.invoke('registerUser', userId)
        .done(() => console.log('User registered successfully'))
        .fail((err: any) => console.error('Error registering user', err));
    } else {
      console.warn('Cannot register user: No user ID available');
    }
  }

  private scheduleReconnect(): void {
    setTimeout(() => {
      console.log('Attempting to reconnect to SignalR...');
      this.startConnection();
    }, 5000);
  }

  public stopConnection(): void {
    if (this.connection) {
      console.log('Stopping SignalR connection');
      this.connection.stop();
    }
  }

  public loadStoredNotifications(): void {
    const userId = this.authService.getUserId();
    if (userId) {
      this.http.get<any[]>(`${environment.apiUrl}/api/dynamics/notifications/${userId}`)
        .subscribe({
          next: (notifications) => {
            console.log('Stored notifications loaded:', notifications);
            this.storedNotificationsSubject.next(notifications);
          },
          error: (err) => console.error('Error loading stored notifications', err)
        });
    }
  }

  public markNotificationAsRead(notificationId: string): void {
    this.http.patch(`${environment.apiUrl}/api/dynamics/notifications/${notificationId}/read`, {})
      .subscribe({
        next: () => console.log(`Notification ${notificationId} marked as read`),
        error: (err) => console.error('Error marking notification as read', err)
      });
  }
}