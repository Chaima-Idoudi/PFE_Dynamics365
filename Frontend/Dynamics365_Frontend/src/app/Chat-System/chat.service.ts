import { Injectable, NgZone } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AuthService } from '../login/services/auth.service';
import { environment } from '../../environments/environment';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { map, catchError, tap, timeout } from 'rxjs/operators';

declare var $: any;

interface ChatMessage {
  id: string;
  fromUserId: string;
  toUserId: string;
  message: string;
  timestamp: Date;
  isMe: boolean;
  isRead: boolean;
  status?: 'sending' | 'sent' | 'failed';
}

interface ChatContact {
  userId: string;
  fullName: string;
  email: string;
  photo: string;
  isConnected: boolean;
  isTechnician: boolean;
  isAdmin: boolean;
  unreadCount: number;
}

interface SignalRStateChange {
  oldState: 0 | 1 | 2 | 4;
  newState: 0 | 1 | 2 | 4;
}

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  private connection: any;
  private proxy: any;
  private messageSubject = new BehaviorSubject<{fromUserId: string, message: string}>({fromUserId: '', message: ''});
  private contactSubject = new BehaviorSubject<ChatContact[]>([]);
  private unreadCountSubject = new BehaviorSubject<number>(0);
  private contactsCache: ChatContact[] = [];
  private lastLoadTime: number = 0;
  private _reconnectTimeout: any = null;
  private _reconnectAttempts: number = 0;
  private _heartbeatInterval: any = null;
  private _isInitialized = false;

  public message$ = this.messageSubject.asObservable();
  public contacts$ = this.contactSubject.asObservable();
  public unreadCount$ = this.unreadCountSubject.asObservable();
  private typingStatusSubject = new BehaviorSubject<{userId: string, isTyping: boolean}>({userId: '', isTyping: false});
  public typingStatus$ = this.typingStatusSubject.asObservable();

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private ngZone: NgZone
  ) {}

  public initializeConnection(): void {
    if (this._isInitialized) {
      console.log('Chat service already initialized');
      return;
    }

    console.log('🚀 Initializing Chat SignalR connection...');
    const signalRUrl = this.getSignalRUrl();
    console.log('📍 SignalR URL:', signalRUrl);
    
    if (this.connection) {
      try {
        this.connection.stop();
      } catch (e) {
        console.warn('⚠️ Error stopping existing connection', e);
      }
    }
    
    this.connection = $.hubConnection(signalRUrl, {
      useDefaultPath: false,
      waitForPageLoad: false,
      timeout: 30000
    });
    
    this.connection.transportConnectTimeout = 30000;
    this.connection.disconnectTimeout = 30000;
    this.connection.reconnectDelay = 5000;
    this.connection.keepAliveData = {
      keepAliveInterval: 30000,
      timeout: 30000
    };
    this.connection.logging = true;
    
    this.connection.stateChanged((change: SignalRStateChange) => {
      const states = { 0: 'Connecting', 1: 'Connected', 2: 'Reconnecting', 4: 'Disconnected' };
      console.log(`🔄 SignalR connection state changed from ${states[change.oldState]} to ${states[change.newState]}`);
      
      if (change.newState === 1 && change.oldState === 2) {
        console.log('✅ Reconnected to SignalR, re-registering user...');
        this.registerUser();
      }
    });
    
    this.proxy = this.connection.createHubProxy('chatHub');
    this.registerHandlers();

    console.log('🔌 Starting SignalR connection...');
    this.connection.start({ keepAlive: true, waitForPageLoad: false })
      .done(() => {
        console.log('✅ Chat Hub Connected Successfully');
        this._isInitialized = true;
        
        // Test de connexion
        this.testConnection();
        
        this.registerUser();
        this.loadContacts(true);
        this.startHeartbeat();
        this.updateUnreadCounts();
      })
      .fail((error: any) => {
        console.error('❌ Could not connect to Chat Hub', error);
        this._isInitialized = false;
        this.scheduleReconnect();
      });

    this.connection.disconnected(() => {
      console.log('❌ Chat Hub Disconnected');
      this._isInitialized = false;
      this.scheduleReconnect();
    });
    
    this.connection.error((error: any) => {
      console.error('❌ SignalR connection error:', error);
    });
  }

  private registerHandlers(): void {
    this.proxy.on('receiveMessage', (fromUserId: string, message: string, messageId: string) => {
      console.log('📨 Message received via SignalR:', { fromUserId, message, messageId });
      this.ngZone.run(() => {
        this.messageSubject.next({fromUserId, message});
        this.updateUnreadCounts();
      });
    });

    this.proxy.on('registrationConfirmed', () => {
      console.log('✅ User registered successfully in chat hub');
    });

    this.proxy.on('registrationFailed', (error: string) => {
      console.error('❌ User registration failed:', error);
    });

    this.proxy.on('messageSent', (toUserId: string, messageId: string) => {
      console.log('✅ Message sent successfully via SignalR:', { toUserId, messageId });
    });

    this.proxy.on('sendError', (error: string) => {
      console.error('❌ Chat send error:', error);
    });

    this.proxy.on('pong', () => {
      console.log('🏓 Pong received from server');
    });

    this.proxy.on('echo', (message: string) => {
      console.log('🔄 Echo received:', message);
    });

    this.proxy.on('connectionInfo', (info: any) => {
      console.log('ℹ️ Connection info received:', info);
    });
    this.proxy.on('typingStatusUpdate', (userId: string, isTyping: boolean) => {
    console.log(`${isTyping ? '⌨️' : '🛑'} User ${userId} is ${isTyping ? 'typing' : 'not typing'}`);
    this.ngZone.run(() => {
      this.typingStatusSubject.next({userId, isTyping});
    });
  });
  }

  private getSignalRUrl(): string {
    let baseUrl = environment.apiUrl;
    if (baseUrl.endsWith('/')) {
      baseUrl = baseUrl.slice(0, -1);
    }
    return `${baseUrl}/signalr`;
  }

  private registerUser(): void {
    const userId = this.authService.getUserId();
    if (!userId) {
      console.error('❌ Cannot register user: No user ID available');
      return;
    }
    
    console.log(`🔐 Registering user ${userId} with SignalR...`);
    
    const attemptRegistration = (retryCount = 0) => {
      this.proxy.invoke('registerUser', userId)
        .done(() => {
          console.log('✅ User successfully registered with SignalR');
        })
        .fail((err: any) => {
          console.error('❌ Error registering user in chat', err);
          
          if (retryCount < 3) {
            const delay = Math.pow(2, retryCount) * 1000;
            console.log(`🔄 Retrying registration in ${delay}ms (attempt ${retryCount + 1})`);
            setTimeout(() => attemptRegistration(retryCount + 1), delay);
          }
        });
    };
    
    attemptRegistration();
  }

  private testConnection(): void {
    // Test de connexion simple
    this.proxy.invoke('TestConnection')
      .done((result: any) => { 
        console.log('✅ Test connection successful:', result); 
      })
      .fail((err: any) => { 
        console.error('❌ Test connection failed:', err); 
      });

    // Test Echo
    this.proxy.invoke('echo', 'test message')
      .done((result: any) => { 
        console.log('✅ Echo test successful:', result); 
      })
      .fail((err: any) => { 
        console.error('❌ Echo test failed:', err); 
      });
  }

  public loadContacts(forceReload: boolean = false): void {
    const cacheExpiry = 30000; // 30 seconds
    
    if (!forceReload && this.contactsCache.length > 0 && 
        (Date.now() - this.lastLoadTime) < cacheExpiry) {
      this.contactSubject.next([...this.contactsCache]);
      return;
    }

    const userId = this.authService.getUserId();
    if (!userId) {
      console.error('❌ User ID not available');
      return;
    }

    const headers = new HttpHeaders({
      'Authorization': userId
    });

    const url = this.buildApiUrl(`api/chat/contacts/${userId}`);

    this.http.get<any[]>(url, { headers })
      .pipe(
        map(employees => this.transformToChatContacts(employees)),
        catchError(error => {
          console.error('❌ Error loading contacts:', error);
          return of(this.contactsCache);
        })
      )
      .subscribe({
        next: contacts => {
          this.contactsCache = contacts;
          this.lastLoadTime = Date.now();
          this.contactSubject.next(contacts);
          this.updateUnreadCounts();
        },
        error: err => console.error('❌ Subscription error:', err)
      });
  }

  private buildApiUrl(endpoint: string): string {
    let baseUrl = environment.apiUrl;
    if (baseUrl.endsWith('/')) {
      baseUrl = baseUrl.slice(0, -1);
    }
    if (endpoint.startsWith('/')) {
      endpoint = endpoint.substring(1);
    }
    return `${baseUrl}/${endpoint}`;
  }

  private transformToChatContacts(employees: any[]): ChatContact[] {
    if (!employees || !Array.isArray(employees)) {
      return [];
    }

    return employees.map(employee => ({
      userId: employee.UserId || '',
      fullName: employee.FullName || 'Unknown',
      email: employee.Email || '',
      photo: employee.Photo || '',
      isConnected: employee.IsConnected || false,
      isTechnician: employee.IsTechnician || false,
      isAdmin: employee.IsAdmin || false,
      unreadCount: 0
    }));
  }

  public sendMessage(toUserId: string, message: string): Promise<boolean> {
  return new Promise(async (resolve, reject) => {
    const fromUserId = this.authService.getUserId();
    if (!fromUserId || !toUserId || !message.trim()) {
      console.error('❌ Invalid parameters for sendMessage', { fromUserId, toUserId, message });
      reject('Invalid parameters');
      return;
    }

    console.log('📤 Sending message via SignalR:', { toUserId, message: message.substring(0, 50) + '...' });
    
    // Vérifier l'état de la connexion
    if (!this._isInitialized || this.connection.state !== 1) {
      console.warn('⚠️ SignalR not connected, attempting to reconnect...');
      
      try {
        await this.ensureConnection();
      } catch (connErr) {
        console.error('❌ Failed to reconnect SignalR:', connErr);
        this.fallbackToApi(fromUserId, toUserId, message, resolve, reject);
        return;
      }
    }

    try {
      const timeoutId = setTimeout(() => {
        console.warn('⏰ SignalR sendMessage timed out, falling back to API');
        this.fallbackToApi(fromUserId, toUserId, message, resolve, reject);
      }, 15000); // 15 secondes timeout

      console.log('📡 Invoking sendMessage on SignalR hub...');
      
      // Ajouter des logs pour déboguer
      console.log('Connection state:', this.connection.state);
      console.log('Connection ID:', this.connection.id);
      
      this.proxy.invoke('sendMessage', fromUserId, toUserId, message)
        .done((messageId: string) => {
          clearTimeout(timeoutId);
          console.log('✅ Message sent successfully via SignalR, ID:', messageId);
          
          if (!messageId) {
            console.warn('⚠️ Empty messageId received from SignalR');
            this.fallbackToApi(fromUserId, toUserId, message, resolve, reject);
            return;
          }
          
          this.verifyMessageCreation(messageId)
            .then((verified) => {
              this.updateUnreadCounts();
              resolve(verified === true);
            })
            .catch(err => {
              console.error('❌ Message verification failed:', err);
              this.fallbackToApi(fromUserId, toUserId, message, resolve, reject);
            });
        })
        .fail((err: any) => {
          clearTimeout(timeoutId);
          console.error('❌ Error sending message via SignalR:', err);
          this.fallbackToApi(fromUserId, toUserId, message, resolve, reject);
        });
    } catch (error) {
      console.error('❌ Exception in sendMessage:', error);
      this.fallbackToApi(fromUserId, toUserId, message, resolve, reject);
    }
  });
}

  private async ensureConnection(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      if (this.connection.state === 1) {
        resolve();
        return;
      }
      
      const stateChangedCallback = (change: any) => {
        if (change.newState === 1) {
          this.connection.stateChanged.remove(stateChangedCallback);
          resolve();
        } else if (change.newState === 4) {
          this.connection.stateChanged.remove(stateChangedCallback);
          reject(new Error('Connection failed'));
        }
      };
      
      this.connection.stateChanged(stateChangedCallback);
      
      if (this.connection.state === 4) {
        this.connection.start()
          .fail((err: any) => {
            this.connection.stateChanged.remove(stateChangedCallback);
            reject(err);
          });
      }
      
      setTimeout(() => {
        this.connection.stateChanged.remove(stateChangedCallback);
        reject(new Error('Connection timeout'));
      }, 30000);
    });
  }

  private async fallbackToApi(fromUserId: string, toUserId: string, message: string, 
                             resolve: (value: boolean) => void, 
                             reject: (reason?: any) => void): Promise<void> {
    console.log('🔄 Attempting to send message via API fallback');
    try {
      const messageId = await this.sendMessageViaApi(toUserId, message);
      if (messageId) {
        console.log('✅ Message sent successfully via API fallback, ID:', messageId);
        this.updateUnreadCounts();
        resolve(true);
      } else {
        console.error('❌ API fallback returned empty message ID');
        reject('Failed to send message via API');
      }
    } catch (error) {
      console.error('❌ API fallback failed:', error);
      reject(error);
    }
  }

  private verifyMessageCreation(messageId: string): Promise<boolean> {
    if (!messageId) {
      return Promise.reject('Invalid message ID');
    }
    
    const userId = this.authService.getUserId();
    const headers = new HttpHeaders({
      'Authorization': userId || ''
    });
    
    const url = this.buildApiUrl(`api/chat/verify/${messageId}`);
    
    return this.http.get<boolean>(url, { headers })
      .pipe(
        timeout(30000),
        catchError(error => {
          console.error('❌ Message verification request failed:', error);
          return of(false);
        })
      )
      .toPromise()
      .then(result => result === true);
  }

  public getChatHistory(userId1: string, userId2: string): Observable<ChatMessage[]> {
    const userId = this.authService.getUserId();
    if (!userId) {
      return of([]);
    }

    const headers = new HttpHeaders({
      'Authorization': userId
    });

    const url = this.buildApiUrl(`api/chat/messages/${userId1}/${userId2}`);

    return this.http.get<any[]>(url, { headers })
      .pipe(
        map(messages => (messages || []).map(msg => ({
          id: msg.Id || Date.now().toString(),
          fromUserId: msg.FromUserId,
          toUserId: msg.ToUserId,
          message: msg.Message,
          timestamp: new Date(msg.Timestamp),
          isRead: msg.IsRead,
          isMe: msg.FromUserId === userId
        }))),
        catchError(error => {
          console.error('❌ Error loading chat history:', error);
          return of([]);
        })
      );
  }

  public markMessagesAsRead(messageIds: string[]): Observable<any> {
    if (!messageIds || !messageIds.length) {
      return of(null);
    }

    const userId = this.authService.getUserId();
    if (!userId) {
      return of(null);
    }

    const headers = new HttpHeaders({
      'Authorization': userId
    });

    const url = this.buildApiUrl('api/chat/messages/read');

    return this.http.patch(url, messageIds, { headers })
      .pipe(
        tap(() => this.updateUnreadCounts()),
        catchError(error => {
          console.error('❌ Error marking messages as read:', error);
          return of(null);
        })
      );
  }

  public updateUnreadCounts(): void {
    const userId = this.authService.getUserId();
    if (!userId) return;

    const headers = new HttpHeaders({
      'Authorization': userId
    });

    const url = this.buildApiUrl(`api/chat/unread/${userId}`);

    this.http.get<number>(url, { headers })
      .pipe(
        catchError(error => {
          console.error('❌ Error updating unread count:', error);
          return of(0);
        })
      )
      .subscribe({
        next: count => this.unreadCountSubject.next(count),
        error: err => console.error('❌ Subscription error:', err)
      });
  }

  private scheduleReconnect(): void {
    if (this._reconnectTimeout) {
      clearTimeout(this._reconnectTimeout);
    }
    
    const reconnectDelay = Math.min(
      5000 * Math.pow(2, this._reconnectAttempts), 
      30000
    );
    
    console.log(`🔄 Scheduling reconnect in ${reconnectDelay}ms (attempt ${this._reconnectAttempts + 1})`);
    
    this._reconnectTimeout = setTimeout(() => {
      this._reconnectAttempts++;
      console.log(`🔄 Attempting to reconnect (attempt ${this._reconnectAttempts})`);
      
      this.connection.start()
        .done(() => {
          console.log('✅ Successfully reconnected to SignalR');
          this._reconnectAttempts = 0;
          this._isInitialized = true;
          this.registerUser();
          this.startHeartbeat();
        })
        .fail((error: any) => {
          console.error('❌ Failed to reconnect to SignalR:', error);
          this.scheduleReconnect();
        });
    }, reconnectDelay);
  }

  private startHeartbeat(): void {
    if (this._heartbeatInterval) {
      clearInterval(this._heartbeatInterval);
    }
    
    this._heartbeatInterval = setInterval(() => {
      if (this.connection && this.connection.state === 1) {
        this.proxy.invoke('Ping')
          .fail((error: any) => {
            console.warn('⚠️ Heartbeat failed:', error);
            if (this.connection.state !== 2) {
              this.connection.stop();
            }
          });
      }
    }, 30000);
  }

  public disconnect(): void {
    console.log('🔌 Disconnecting chat service...');
    
    if (this._heartbeatInterval) {
      clearInterval(this._heartbeatInterval);
    }
    
    if (this._reconnectTimeout) {
      clearTimeout(this._reconnectTimeout);
    }
    
    if (this.connection) {
      this.connection.stop();
    }
    
    this._isInitialized = false;
  }

  public async sendMessageViaApi(toUserId: string, message: string): Promise<string> {
    const fromUserId = this.authService.getUserId();
    if (!fromUserId) {
      throw new Error('User not authenticated');
    }
    
    const url = this.buildApiUrl('api/chat/messages');
    const headers = new HttpHeaders({
      'Authorization': fromUserId
    });
    
    const messageDto = {
      FromUserId: fromUserId,
      ToUserId: toUserId,
      Message: message,
      Timestamp: new Date(),
      IsRead: false,
      Name: `Message from ${fromUserId} to ${toUserId}`
    };
    
    try {
      const messageId = await this.http.post<string>(url, messageDto, { headers })
        .pipe(timeout(30000))
        .toPromise();
          
      return messageId || '';
    } catch (error) {
      console.error('❌ Error sending message via API:', error);
      throw error;
    }
  }

  public sendTypingStatus(toUserId: string, isTyping: boolean): void {
  const fromUserId = this.authService.getUserId();
  if (!fromUserId || !toUserId) return;
  
  console.log(`${isTyping ? '⌨️' : '🛑'} Sending typing status: ${isTyping ? 'typing' : 'stopped typing'} to ${toUserId}`);
  
  // Check if SignalR is connected
  if (this.connection && this.connection.state === 1) {
    this.proxy.invoke('sendTypingStatus', fromUserId, toUserId, isTyping)
      .fail((error: any) => {
        console.error('❌ Error sending typing status:', error);
      });
  }
}
  
 
} 